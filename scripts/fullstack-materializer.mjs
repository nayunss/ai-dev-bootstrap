import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const LOCK_RELATIVE = ".ai/manifests/fullstack-materialization.lock.json";
const ROLLBACK_RELATIVE = ".ai/manifests/fullstack-materialization.rollback.json";
const LAYERS = ["frontend", "backend", "shared", "migration"];
const ROOT_FOR_LAYER = { frontend: "frontend", backend: "backend", shared: "shared", migration: "migrations" };

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "TBD";
}

function safeRelative(value, label) {
  if (!text(value) || isAbsolute(value) || value.includes("\0")) throw new Error(`${label} must be a safe relative path`);
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized === "."
    || normalized.split("/").some((part) => part === "" || part === ".." || part.startsWith(".env"))
  ) throw new Error(`${label} must be a safe relative path and must not reference .env*`);
  return normalized;
}

function confined(root, value, label) {
  const path = resolve(root, value);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes root`);
  return path;
}

function within(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function validateFullStackProfile(profile, sourceValue, targetValue) {
  const source = resolve(sourceValue);
  const target = resolve(targetValue);
  const errors = [];
  if (profile?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (profile?.mode !== "initial-full-stack") errors.push("mode must be initial-full-stack");
  const roots = {};
  for (const name of ["frontend", "backend", "shared", "migrations"]) {
    try {
      roots[name] = safeRelative(profile?.roots?.[name], `roots.${name}`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (new Set(Object.values(roots)).size !== 4) errors.push("layer roots must be distinct");

  const files = Array.isArray(profile?.files) ? profile.files : [];
  if (files.length < 4) errors.push("files must include frontend, backend, shared and migration artifacts");
  const targetPaths = new Set();
  const sourcePaths = new Set();
  const plans = [];
  for (const file of files) {
    if (!LAYERS.includes(file?.layer)) errors.push(`invalid file layer: ${file?.layer ?? "unknown"}`);
    let sourceRelative;
    let targetRelative;
    try {
      sourceRelative = safeRelative(file?.source, "file.source");
      targetRelative = safeRelative(file?.target, "file.target");
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (sourcePaths.has(sourceRelative)) errors.push(`duplicate source path: ${sourceRelative}`);
    if (targetPaths.has(targetRelative)) errors.push(`duplicate target path: ${targetRelative}`);
    sourcePaths.add(sourceRelative);
    targetPaths.add(targetRelative);
    const expectedRoot = roots[ROOT_FOR_LAYER[file.layer]];
    if (expectedRoot && !within(targetRelative, expectedRoot)) {
      errors.push(`${file.layer} target must be under ${expectedRoot}: ${targetRelative}`);
    }
    const sourcePath = confined(source, sourceRelative, "file.source");
    const targetPath = confined(target, targetRelative, "file.target");
    if (!existsSync(sourcePath)) errors.push(`missing source artifact: ${sourceRelative}`);
    else {
      const bytes = readFileSync(sourcePath);
      if (!/^sha256:[a-f0-9]{64}$/u.test(file?.sha256 ?? "") || sha256(bytes) !== file.sha256) {
        errors.push(`source hash drift: ${sourceRelative}`);
      }
      plans.push({ ...file, sourceRelative, targetRelative, sourcePath, targetPath, bytes });
    }
  }
  for (const layer of LAYERS) {
    if (!files.some((file) => file.layer === layer)) errors.push(`missing ${layer} file`);
  }

  const migrations = Array.isArray(profile?.databaseMigrations) ? profile.databaseMigrations : [];
  if (migrations.length === 0) errors.push("databaseMigrations requires at least one pair");
  const migrationIds = new Set();
  for (const migration of migrations) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/u.test(migration?.id ?? "") || migrationIds.has(migration.id)) {
      errors.push(`invalid or duplicate migration id: ${migration?.id ?? "unknown"}`);
    }
    migrationIds.add(migration?.id);
    let up;
    let rollback;
    try {
      up = safeRelative(migration?.upTarget, "migration.upTarget");
      rollback = safeRelative(migration?.rollbackTarget, "migration.rollbackTarget");
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (up === rollback) errors.push(`migration ${migration.id} up and rollback targets must differ`);
    if (!targetPaths.has(up) || !targetPaths.has(rollback)) {
      errors.push(`migration ${migration.id} must reference materialized up and rollback files`);
    }
    if (migration?.execution !== "artifact-only-not-authorized") {
      errors.push(`migration ${migration.id} execution must remain not authorized`);
    }
  }
  if (
    profile?.rollback?.applicationFiles !== "transaction-record"
    || profile?.rollback?.database !== "paired-artifact-no-execution"
  ) errors.push("rollback contract is invalid");
  return { errors, plans, roots, valid: errors.length === 0 };
}

function materializationPlan(validation) {
  return validation.plans.map((file) => {
    if (!existsSync(file.targetPath)) return { ...file, action: "create", managed: true };
    if (sha256(readFileSync(file.targetPath)) === file.sha256) {
      return { ...file, action: "preserve-identical", managed: false };
    }
    return { ...file, action: "blocked-existing-different", managed: false };
  });
}

export function applyFullStackTransaction(operations, io = {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
}) {
  const snapshots = [];
  try {
    for (const operation of operations) {
      const existed = io.existsSync(operation.path);
      snapshots.push({ path: operation.path, existed, bytes: existed ? io.readFileSync(operation.path) : null });
      if (operation.kind === "remove") {
        if (existed) io.unlinkSync(operation.path);
      } else {
        io.mkdirSync(dirname(operation.path), { recursive: true });
        io.writeFileSync(operation.path, operation.bytes);
      }
    }
  } catch (error) {
    for (const snapshot of snapshots.reverse()) {
      if (snapshot.existed) {
        io.mkdirSync(dirname(snapshot.path), { recursive: true });
        io.writeFileSync(snapshot.path, snapshot.bytes);
      } else if (io.existsSync(snapshot.path)) {
        io.unlinkSync(snapshot.path);
      }
    }
    throw new Error(`Full-stack transaction failed and was restored: ${error.message}`);
  }
}

function records(profile, plan) {
  return plan.map((file) => ({
    layer: file.layer,
    target: file.targetRelative,
    sha256: file.sha256,
    managed: file.managed,
  }));
}

function buildLock(profile, plan) {
  const payload = {
    schemaVersion: 1,
    kind: "fullstack-materialization-lock",
    mode: profile.mode,
    profileSha256: sha256(canonical(profile)),
    files: records(profile, plan),
    databaseMigrations: profile.databaseMigrations,
    databaseExecution: "NOT-RUN",
  };
  return { ...payload, lockSha256: sha256(JSON.stringify(payload)) };
}

function buildRollback(lock) {
  const payload = {
    schemaVersion: 1,
    kind: "fullstack-materialization-rollback",
    lockSha256: lock.lockSha256,
    files: lock.files,
    database: {
      status: "NOT-RUN",
      action: "use paired rollback artifact only after separate DB approval",
    },
  };
  return { ...payload, recordSha256: sha256(JSON.stringify(payload)) };
}

function validateIntegrity(record, kind, hashField) {
  const { [hashField]: digest, ...payload } = record ?? {};
  if (record?.schemaVersion !== 1 || record?.kind !== kind || digest !== sha256(JSON.stringify(payload))) {
    throw new Error(`${kind} integrity drift`);
  }
}

export function runFullStackMaterializer(mode, profile, sourceValue, targetValue, options = {}) {
  const source = resolve(sourceValue);
  const target = resolve(targetValue);
  const validation = validateFullStackProfile(profile, source, target);
  if (!validation.valid) return { status: "INVALID", errors: validation.errors };
  const lockPath = confined(target, LOCK_RELATIVE, "lock");
  const rollbackPath = confined(target, ROLLBACK_RELATIVE, "rollback");

  if (mode === "preview" || mode === "apply") {
    if (existsSync(lockPath) || existsSync(rollbackPath)) {
      return { status: "BLOCKED", errors: ["an unfinished or existing full-stack materialization record exists"] };
    }
    const plan = materializationPlan(validation);
    if (plan.some((file) => file.action === "blocked-existing-different")) {
      return {
        status: "BLOCKED",
        errors: plan.filter((file) => file.action === "blocked-existing-different")
          .map((file) => `existing target differs: ${file.targetRelative}`),
        plan: plan.map(({ layer, targetRelative: path, action }) => ({ layer, path, action })),
      };
    }
    const summary = plan.map(({ layer, targetRelative: path, action }) => ({ layer, path, action }));
    if (mode === "preview") return { status: "PREVIEW", databaseExecution: "NOT-RUN", plan: summary };
    if (options.approved !== true) return { status: "APPROVAL_REQUIRED", databaseExecution: "NOT-RUN", plan: summary };
    const lock = buildLock(profile, plan);
    const rollback = buildRollback(lock);
    const operations = plan.filter((file) => file.action === "create")
      .map((file) => ({ kind: "write", path: file.targetPath, bytes: file.bytes }));
    operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(canonical(lock)) });
    operations.push({ kind: "write", path: rollbackPath, bytes: Buffer.from(canonical(rollback)) });
    try {
      applyFullStackTransaction(operations, options.io);
    } catch (error) {
      return { status: "FAIL", databaseExecution: "NOT-RUN", errors: [error.message] };
    }
    return { status: "PASS", databaseExecution: "NOT-RUN", plan: summary };
  }

  if (!existsSync(lockPath) || !existsSync(rollbackPath)) {
    return { status: "INVALID", errors: ["materialization lock and rollback record are required"] };
  }
  let lock;
  let rollback;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
    rollback = JSON.parse(readFileSync(rollbackPath, "utf8"));
    validateIntegrity(lock, "fullstack-materialization-lock", "lockSha256");
    validateIntegrity(rollback, "fullstack-materialization-rollback", "recordSha256");
    if (rollback.lockSha256 !== lock.lockSha256 || lock.profileSha256 !== sha256(canonical(profile))) {
      throw new Error("materialization record does not match profile");
    }
  } catch (error) {
    return { status: "INVALID", errors: [error.message] };
  }
  const drift = [];
  for (const file of lock.files) {
    const path = confined(target, file.target, "locked target");
    if (!existsSync(path) || sha256(readFileSync(path)) !== file.sha256) drift.push(file.target);
  }
  if (drift.length > 0) return { status: "INVALID", errors: drift.map((path) => `locked target drift: ${path}`) };
  if (mode === "validate") return { status: "PASS", databaseExecution: lock.databaseExecution };
  if (mode !== "rollback") return { status: "INVALID", errors: [`unsupported mode: ${mode}`] };
  if (options.approved !== true) return { status: "APPROVAL_REQUIRED", databaseExecution: "NOT-RUN" };
  const operations = lock.files.filter((file) => file.managed)
    .map((file) => ({ kind: "remove", path: confined(target, file.target, "rollback target") }));
  operations.push({ kind: "remove", path: lockPath });
  operations.push({ kind: "remove", path: rollbackPath });
  try {
    applyFullStackTransaction(operations, options.io);
  } catch (error) {
    return { status: "FAIL", databaseExecution: "NOT-RUN", errors: [error.message] };
  }
  return { status: "PASS", databaseExecution: "NOT-RUN", databaseRollback: "ARTIFACT_ONLY" };
}

export function readProfile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
