#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateFastApiContract, readJson } from "./fastapi-contract-adapter.mjs";

const fixture = resolve("evals/fixtures/fastapi-contract");
const baselinePath = resolve(fixture, "baseline.openapi.json");
const compatiblePath = resolve(fixture, "current.compatible.openapi.json");
const breakingPath = resolve(fixture, "current.breaking.openapi.json");
const routesPath = resolve(fixture, "routes.compatible.json");
const undocumentedPath = resolve(fixture, "routes.undocumented.json");
const profilePath = resolve(fixture, "profile.production-disabled.json");
const baseline = readJson(baselinePath);
const compatible = readJson(compatiblePath);
const routes = readJson(routesPath);
const profile = readJson(profilePath);

const pass = evaluateFastApiContract({ baseline, current: compatible, routes, profile });
assert.equal(pass.status, "PASS");
assert.equal(Object.values(pass.gates).every((gate) => gate.status === "PASS"), true);

const breaking = evaluateFastApiContract({
  baseline,
  current: readJson(breakingPath),
  routes,
  profile,
});
assert.equal(breaking.status, "FAIL");
assert.equal(breaking.gates.breaking.status, "FAIL");
assert.match(JSON.stringify(breaking.gates.breaking.findings), /operation-removed/);
assert.match(JSON.stringify(breaking.gates.breaking.findings), /success-response-removed/);
assert.match(JSON.stringify(breaking.gates.breaking.findings), /required-parameter-added/);
assert.match(JSON.stringify(breaking.gates.breaking.findings), /component-schema-removed/);

const undocumented = evaluateFastApiContract({
  baseline,
  current: compatible,
  routes: readJson(undocumentedPath),
  profile,
});
assert.equal(undocumented.gates.implementationDrift.status, "FAIL");
assert.match(undocumented.gates.implementationDrift.findings.join("\n"), /undocumented: DELETE/);

const staleRoutes = structuredClone(routes);
staleRoutes.routes = staleRoutes.routes.filter((route) => route.path !== "/health");
const stale = evaluateFastApiContract({ baseline, current: compatible, routes: staleRoutes, profile });
assert.match(stale.gates.implementationDrift.findings.join("\n"), /stale: GET \/health/);

const exposed = structuredClone(profile);
exposed.productionDocs.observedEndpoints[1] = {
  path: "/docs",
  unauthenticatedStatus: 200,
  authorizedStatus: 200,
};
const exposure = evaluateFastApiContract({ baseline, current: compatible, routes, profile: exposed });
assert.equal(exposure.gates.productionDocs.status, "FAIL");
assert.match(exposure.gates.productionDocs.findings.join("\n"), /must be 404: \/docs/);

const tryItOut = structuredClone(profile);
tryItOut.productionDocs.mode = "public-approved";
tryItOut.productionDocs.tryItOutEnabled = true;
tryItOut.productionDocs.observedEndpoints = tryItOut.productionDocs.observedEndpoints.map((endpoint) => ({
  ...endpoint,
  unauthenticatedStatus: 200,
  authorizedStatus: 200,
}));
const writeExposure = evaluateFastApiContract({ baseline, current: compatible, routes, profile: tryItOut });
assert.match(writeExposure.gates.productionDocs.findings.join("\n"), /Try it out/);

const externalAssets = structuredClone(profile);
externalAssets.productionDocs.externalAssetHosts = ["cdn.example.invalid"];
assert.match(
  evaluateFastApiContract({ baseline, current: compatible, routes, profile: externalAssets })
    .gates.productionDocs.findings.join("\n"),
  /external assets/,
);

const sensitive = structuredClone(compatible);
sensitive.info.description = "internal endpoint http://service.internal:8000";
assert.match(
  evaluateFastApiContract({ baseline, current: sensitive, routes, profile }).gates.syntax.findings.join("\n"),
  /internal metadata/,
);

const duplicateOperation = structuredClone(compatible);
duplicateOperation.paths["/health"].get.operationId = "list_items";
assert.match(
  evaluateFastApiContract({ baseline, current: duplicateOperation, routes, profile }).gates.syntax.findings.join("\n"),
  /duplicate operationId/,
);

const cli = spawnSync(
  process.execPath,
  [
    resolve("scripts/evaluate-fastapi-contract.mjs"),
    baselinePath,
    compatiblePath,
    routesPath,
    profilePath,
    "--expect-pass",
  ],
  { encoding: "utf8" },
);
assert.equal(cli.status, 0, cli.stderr);
assert.equal(JSON.parse(cli.stdout).status, "PASS");

process.stdout.write("REQ-044 FastAPI/OpenAPI drift and production docs exposure synthetic Eval: PASS\n");
