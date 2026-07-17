import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const LANGUAGES = new Set(["javascript", "java", "python"]);
const GATE_NAMES = ["formatter", "linter", "typecheck", "accessibility"];
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "TBD";
}

function unique(values) {
  return new Set(values).size === values.length;
}

function safeRelative(value, label, allowDot = false) {
  if (!text(value) || isAbsolute(value) || value.includes("\0")) throw new Error(`${label} must be a safe relative path`);
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized.split("/");
  if ((!allowDot && normalized === ".") || parts.some((part) => part === "" || part === "..")) {
    throw new Error(`${label} must not escape the project`);
  }
  if (parts.some((part) => part.startsWith(".env"))) throw new Error(`${label} must not reference .env*`);
  return normalized;
}

function confined(root, value, label) {
  const path = resolve(root, value);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes target`);
  return path;
}

function inventory(root) {
  const records = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = join(directory, entry.name);
      const rel = relative(root, absolute).split(sep).join("/");
      if (rel === ".tools" || rel.startsWith(".tools/")) continue;
      if (entry.isSymbolicLink()) throw new Error(`application contains unsupported symlink: ${rel}`);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) {
        const bytes = readFileSync(absolute);
        records.push([rel, bytes.length, createHash("sha256").update(bytes).digest("hex")]);
      }
    }
  }
  walk(root);
  return records;
}

function validateGate(gate, application, gateName, target, errors) {
  const prefix = `${application.id}.${gateName}`;
  if (gateName === "accessibility" && gate?.mode === "not-applicable") {
    if (application.web) errors.push(`${prefix} is required for web applications`);
    if (!text(gate.rationale)) errors.push(`${prefix}.rationale is required`);
    return;
  }
  if (gate?.mode !== "required") {
    errors.push(`${prefix}.mode must be required`);
    return;
  }
  if (!text(gate.tool)) errors.push(`${prefix}.tool is required`);
  if (!VERSION.test(gate.version ?? "")) errors.push(`${prefix}.version must be exact semver`);
  let executable;
  try {
    const executableRelative = safeRelative(gate.executable, `${prefix}.executable`);
    if (!executableRelative.startsWith(".tools/quality/bin/")) {
      errors.push(`${prefix}.executable must be project-local under .tools/quality/bin`);
    }
    executable = confined(target, executableRelative, `${prefix}.executable`);
    if (!existsSync(executable) || !lstatSync(executable).isFile()) errors.push(`${prefix}.executable is unavailable`);
  } catch (error) {
    errors.push(error.message);
  }
  for (const [field, values] of [["versionArgs", gate.versionArgs], ["args", gate.args]]) {
    if (!Array.isArray(values) || values.length === 0 || values.some((value) => !text(value))) {
      errors.push(`${prefix}.${field} must be a non-empty argv array`);
    }
  }
  if (!Number.isInteger(gate.timeoutMs) || gate.timeoutMs < 1 || gate.timeoutMs > 120000) {
    errors.push(`${prefix}.timeoutMs is invalid`);
  }
  return executable;
}

export function validateQualityProfile(profile, targetValue) {
  const target = resolve(targetValue);
  const errors = [];
  const plans = [];
  if (profile?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (profile?.network !== "deny") errors.push("network must be deny");
  const applications = Array.isArray(profile?.applications) ? profile.applications : [];
  if (applications.length === 0 || !unique(applications.map((application) => application?.id))) {
    errors.push("applications require unique entries");
  }
  for (const application of applications) {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(application?.id ?? "")) errors.push("application id is invalid");
    if (!LANGUAGES.has(application?.language)) errors.push(`${application?.id ?? "unknown"}.language is invalid`);
    if (typeof application?.web !== "boolean") errors.push(`${application?.id ?? "unknown"}.web must be boolean`);
    let root;
    try {
      root = confined(target, safeRelative(application?.root, `${application?.id}.root`, true), `${application?.id}.root`);
      if (!existsSync(root) || !lstatSync(root).isDirectory()) errors.push(`${application.id}.root is unavailable`);
    } catch (error) {
      errors.push(error.message);
    }
    const gates = application?.gates;
    if (!gates || Object.keys(gates).sort().join(",") !== [...GATE_NAMES].sort().join(",")) {
      errors.push(`${application?.id ?? "unknown"}.gates must contain formatter, linter, typecheck and accessibility`);
      continue;
    }
    const gatePlans = [];
    for (const gateName of GATE_NAMES) {
      const executable = validateGate(gates[gateName], application, gateName, target, errors);
      gatePlans.push({ name: gateName, ...gates[gateName], executablePath: executable });
    }
    plans.push({ ...application, rootPath: root, gatePlans });
  }
  return { errors, plans, valid: errors.length === 0 };
}

export function runQualityProfile(profile, targetValue, options = {}) {
  const target = resolve(targetValue);
  const validation = validateQualityProfile(profile, target);
  if (!validation.valid) return { schemaVersion: 1, status: "INVALID", errors: validation.errors };
  if (options.networkEnforced !== true) {
    return {
      schemaVersion: 1,
      status: "BLOCKED",
      errors: ["network deny must be enforced by the caller sandbox before quality tools execute"],
    };
  }
  const applications = [];
  for (const plan of validation.plans) {
    const before = inventory(plan.rootPath);
    const gates = [];
    let applicationStatus = "PASS";
    for (const gate of plan.gatePlans) {
      if (gate.mode === "not-applicable") {
        gates.push({ gate: gate.name, status: "NOT-APPLICABLE", rationale: gate.rationale });
        continue;
      }
      const versionResult = spawnSync(gate.executablePath, gate.versionArgs, {
        cwd: plan.rootPath,
        encoding: "utf8",
        timeout: gate.timeoutMs,
        env: { PATH: "/usr/bin:/bin", HOME: join(target, ".tools/quality/home"), QUALITY_NETWORK: "deny" },
      });
      const detectedVersion = `${versionResult.stdout ?? ""}${versionResult.stderr ?? ""}`.trim();
      if (versionResult.status !== 0 || detectedVersion !== gate.version) {
        gates.push({ gate: gate.name, status: "FAIL", reason: "version-mismatch", expectedVersion: gate.version, detectedVersion });
        applicationStatus = "FAIL";
        break;
      }
      const started = process.hrtime.bigint();
      const result = spawnSync(gate.executablePath, gate.args, {
        cwd: plan.rootPath,
        encoding: "utf8",
        timeout: gate.timeoutMs,
        env: { PATH: "/usr/bin:/bin", HOME: join(target, ".tools/quality/home"), QUALITY_NETWORK: "deny" },
      });
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      const timedOut = result.error?.code === "ETIMEDOUT";
      const status = !timedOut && result.status === 0 ? "PASS" : "FAIL";
      gates.push({
        gate: gate.name,
        status,
        exitStatus: timedOut ? null : result.status,
        durationMs: Number(durationMs.toFixed(3)),
        stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
        stderrBytes: Buffer.byteLength(result.stderr ?? ""),
        ...(timedOut ? { reason: "timeout" } : {}),
      });
      if (status === "FAIL") {
        applicationStatus = "FAIL";
        break;
      }
    }
    const after = inventory(plan.rootPath);
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    if (changed) applicationStatus = "FAIL";
    applications.push({
      id: plan.id,
      language: plan.language,
      web: plan.web,
      status: applicationStatus,
      sourceChanged: changed,
      gates,
    });
  }
  return {
    schemaVersion: 1,
    status: applications.every((application) => application.status === "PASS") ? "PASS" : "FAIL",
    network: "deny-enforced-by-caller",
    applications,
  };
}

export function previewQualityProfile(profile, targetValue) {
  const validation = validateQualityProfile(profile, targetValue);
  if (!validation.valid) return { schemaVersion: 1, status: "INVALID", errors: validation.errors };
  return {
    schemaVersion: 1,
    status: "PREVIEW",
    network: "deny",
    applications: validation.plans.map((plan) => ({
      id: plan.id,
      root: plan.root,
      language: plan.language,
      web: plan.web,
      gates: plan.gatePlans.map((gate) => gate.mode === "not-applicable"
        ? { gate: gate.name, mode: gate.mode, rationale: gate.rationale }
        : {
            gate: gate.name,
            mode: gate.mode,
            tool: gate.tool,
            version: gate.version,
            cwd: plan.root,
            argv: [gate.executable, ...gate.args],
          }),
    })),
  };
}

export function readQualityProfile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
