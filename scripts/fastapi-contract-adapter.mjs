import { readFileSync } from "node:fs";

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);
const DOC_PATHS = ["/openapi.json", "/docs", "/redoc"];

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "TBD";
}

function operationKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

function operations(contract) {
  const result = new Map();
  for (const [path, pathItem] of Object.entries(contract?.paths ?? {})) {
    for (const method of METHODS) {
      if (pathItem?.[method]) result.set(operationKey(method, path), pathItem[method]);
    }
  }
  return result;
}

function successfulResponses(operation) {
  return Object.keys(operation?.responses ?? {}).filter((status) => /^2(?:\d{2}|XX)$/iu.test(status));
}

function requiredParameters(operation) {
  return new Set(
    (operation?.parameters ?? [])
      .filter((parameter) => parameter?.required === true)
      .map((parameter) => `${parameter.in}:${parameter.name}`),
  );
}

function validateContract(contract, label) {
  const errors = [];
  if (!/^3\.(?:0|1)\.\d+$/u.test(contract?.openapi ?? "")) errors.push(`${label} must use OpenAPI 3.0 or 3.1`);
  if (!text(contract?.info?.title) || !text(contract?.info?.version)) errors.push(`${label} info title/version are required`);
  if (!contract?.paths || typeof contract.paths !== "object" || Array.isArray(contract.paths)) {
    errors.push(`${label} paths must be an object`);
  }
  const seenOperationIds = new Set();
  for (const [key, operation] of operations(contract)) {
    if (!text(operation?.operationId)) errors.push(`${label} ${key} requires operationId`);
    else if (seenOperationIds.has(operation.operationId)) errors.push(`${label} duplicate operationId: ${operation.operationId}`);
    else seenOperationIds.add(operation.operationId);
    if (successfulResponses(operation).length === 0) errors.push(`${label} ${key} requires a 2xx response`);
  }
  const serialized = JSON.stringify(contract);
  for (const pattern of [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{12,}/iu,
    /https?:\/\/(?:localhost|127\.0\.0\.1|[^/" ]+\.internal)(?::\d+)?/iu,
  ]) {
    if (pattern.test(serialized)) errors.push(`${label} contains secret-like or internal metadata`);
  }
  return errors;
}

function breakingChanges(baseline, current) {
  const changes = [];
  const before = operations(baseline);
  const after = operations(current);
  for (const [key, baselineOperation] of before) {
    const currentOperation = after.get(key);
    if (!currentOperation) {
      changes.push({ type: "operation-removed", operation: key });
      continue;
    }
    const beforeSuccess = successfulResponses(baselineOperation);
    const afterSuccess = new Set(successfulResponses(currentOperation));
    for (const status of beforeSuccess) {
      if (!afterSuccess.has(status)) changes.push({ type: "success-response-removed", operation: key, status });
    }
    const beforeRequired = requiredParameters(baselineOperation);
    for (const parameter of requiredParameters(currentOperation)) {
      if (!beforeRequired.has(parameter)) changes.push({ type: "required-parameter-added", operation: key, parameter });
    }
  }
  const beforeSchemas = baseline?.components?.schemas ?? {};
  const afterSchemas = current?.components?.schemas ?? {};
  for (const [name, schema] of Object.entries(beforeSchemas)) {
    const currentSchema = afterSchemas[name];
    if (!currentSchema) {
      changes.push({ type: "component-schema-removed", schema: name });
      continue;
    }
    const currentRequired = new Set(currentSchema.required ?? []);
    for (const field of schema.required ?? []) {
      if (!currentRequired.has(field)) changes.push({ type: "required-response-field-removed", schema: name, field });
    }
    for (const field of Object.keys(schema.properties ?? {})) {
      if (!Object.hasOwn(currentSchema.properties ?? {}, field)) {
        changes.push({ type: "schema-property-removed", schema: name, field });
      }
    }
  }
  return changes;
}

function validateRoutes(routeInventory, contract, profile) {
  const errors = [];
  if (routeInventory?.framework !== "fastapi") errors.push("route inventory framework must be fastapi");
  const routes = Array.isArray(routeInventory?.routes) ? routeInventory.routes : [];
  const routeKeys = routes.map((route) => operationKey(route?.method ?? "", route?.path ?? ""));
  if (routes.length === 0 || new Set(routeKeys).size !== routeKeys.length) errors.push("route inventory requires unique routes");
  for (const route of routes) {
    if (!METHODS.includes(String(route?.method ?? "").toLowerCase()) || !text(route?.path) || !route.path.startsWith("/")) {
      errors.push("route inventory contains an invalid route");
    }
  }
  const ignored = new Set(
    (profile?.ignoredOperations ?? []).map((entry) => operationKey(entry.method, entry.path)),
  );
  const contractKeys = new Set(operations(contract).keys());
  const routeSet = new Set(routeKeys);
  const undocumented = routeKeys.filter((key) => !contractKeys.has(key) && !ignored.has(key)).sort();
  const stale = [...contractKeys].filter((key) => !routeSet.has(key) && !ignored.has(key)).sort();
  return { errors, undocumented, stale };
}

function validateProfile(profile, contract) {
  const errors = [];
  if (profile?.schemaVersion !== 1) errors.push("profile schemaVersion must be 1");
  if (profile?.framework !== "fastapi") errors.push("profile framework must be fastapi");
  if (!new Set(["local", "test", "staging", "production"]).has(profile?.environment)) errors.push("profile environment is invalid");
  if (!new Set(["contract-first", "code-first"]).has(profile?.sourceOfTruth)) errors.push("profile sourceOfTruth is invalid");
  const docs = profile?.productionDocs;
  if (!new Set(["disabled", "authenticated", "network-restricted", "public-approved"]).has(docs?.mode)) {
    errors.push("productionDocs.mode is invalid");
  }
  const observed = Array.isArray(docs?.observedEndpoints) ? docs.observedEndpoints : [];
  if (
    observed.length !== DOC_PATHS.length
    || new Set(observed.map((entry) => entry?.path)).size !== DOC_PATHS.length
    || DOC_PATHS.some((path) => !observed.some((entry) => entry.path === path))
  ) errors.push("productionDocs must record each schema/docs endpoint exactly once");
  for (const endpoint of observed) {
    if (
      !Number.isInteger(endpoint?.unauthenticatedStatus)
      || endpoint.unauthenticatedStatus < 100
      || endpoint.unauthenticatedStatus > 599
      || (endpoint.authorizedStatus !== null
        && (!Number.isInteger(endpoint.authorizedStatus)
          || endpoint.authorizedStatus < 100
          || endpoint.authorizedStatus > 599))
    ) errors.push(`productionDocs observed status is invalid: ${endpoint?.path ?? "unknown"}`);
  }
  if (!Array.isArray(docs?.externalAssetHosts)) errors.push("productionDocs.externalAssetHosts must be an array");
  if (typeof docs?.tryItOutEnabled !== "boolean") errors.push("productionDocs.tryItOutEnabled must be boolean");
  if (!Array.isArray(profile?.ignoredOperations)) errors.push("ignoredOperations must be an array");
  for (const ignored of profile?.ignoredOperations ?? []) {
    if (!METHODS.includes(String(ignored?.method ?? "").toLowerCase()) || !text(ignored?.path) || !text(ignored?.rationale)) {
      errors.push("ignoredOperations entries require method, path and rationale");
    }
  }

  if (profile?.environment === "production") {
    if (docs?.mode === "disabled") {
      for (const endpoint of observed) {
        if (endpoint.unauthenticatedStatus !== 404 || endpoint.authorizedStatus !== null) {
          errors.push(`disabled production docs endpoint must be 404: ${endpoint.path}`);
        }
      }
    } else if (docs?.mode === "authenticated") {
      for (const endpoint of observed) {
        if (![401, 403].includes(endpoint.unauthenticatedStatus) || endpoint.authorizedStatus !== 200) {
          errors.push(`authenticated production docs endpoint policy failed: ${endpoint.path}`);
        }
      }
    } else if (docs?.mode === "network-restricted") {
      for (const endpoint of observed) {
        if (![403, 404].includes(endpoint.unauthenticatedStatus) || endpoint.authorizedStatus !== 200) {
          errors.push(`network-restricted production docs endpoint policy failed: ${endpoint.path}`);
        }
      }
    }
    const hasWrites = [...operations(contract).keys()].some((key) => WRITE_METHODS.has(key.split(" ")[0].toLowerCase()));
    if (hasWrites && docs?.tryItOutEnabled) errors.push("production Try it out must be disabled when write operations exist");
    if ((docs?.externalAssetHosts?.length ?? 0) > 0) errors.push("production docs external assets require a separately approved allowlist");
  }
  return errors;
}

export function evaluateFastApiContract({ baseline, current, routes, profile }) {
  const syntaxErrors = [
    ...validateContract(baseline, "baseline"),
    ...validateContract(current, "current"),
  ];
  const breaking = breakingChanges(baseline, current);
  const routeResult = validateRoutes(routes, current, profile);
  const exposureErrors = validateProfile(profile, current);
  const gates = {
    syntax: { status: syntaxErrors.length === 0 ? "PASS" : "FAIL", findings: syntaxErrors },
    breaking: { status: breaking.length === 0 ? "PASS" : "FAIL", findings: breaking },
    implementationDrift: {
      status: routeResult.errors.length === 0 && routeResult.undocumented.length === 0 && routeResult.stale.length === 0 ? "PASS" : "FAIL",
      findings: [...routeResult.errors, ...routeResult.undocumented.map((item) => `undocumented: ${item}`), ...routeResult.stale.map((item) => `stale: ${item}`)],
    },
    productionDocs: { status: exposureErrors.length === 0 ? "PASS" : "FAIL", findings: exposureErrors },
  };
  return {
    schemaVersion: 1,
    adapter: "fastapi-openapi",
    environment: profile?.environment ?? null,
    status: Object.values(gates).every((gate) => gate.status === "PASS") ? "PASS" : "FAIL",
    gates,
  };
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
