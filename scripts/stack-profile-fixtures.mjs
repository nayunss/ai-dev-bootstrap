import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { applyFullStackTransaction } from "./fullstack-materializer.mjs";

const LOCK = ".ai/manifests/stack-starter.lock.json";
const ROLLBACK = ".ai/manifests/stack-starter.rollback.json";
const P0 = new Set([
  "react-vite",
  "node-express-postgresql",
  "next-postgresql",
  "react-node-postgresql-workspace",
]);
const EXACT = /^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][A-Za-z0-9.-]+)?$/u;

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeRelative(value) {
  return typeof value === "string"
    && value.length > 0
    && !isAbsolute(value)
    && !value.includes("\0")
    && !value.split(/[\\/]/u).includes("..")
    && !value.split(/[\\/]/u).some((part) => part === "" || part.startsWith(".env"));
}

function confined(root, value) {
  if (!safeRelative(value)) throw new Error(`unsafe stack artifact path: ${value}`);
  const path = resolve(root, value);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`stack artifact escapes target: ${value}`);
  return path;
}

function add(errors, code, path, message) {
  errors.push({ code, path, message });
}

export function validateStackProfile(profile) {
  const errors = [];
  if (profile?.schemaVersion !== 1) add(errors, "STACK_SCHEMA_VERSION", "schemaVersion", "schemaVersion must be 1");
  if (!["P0", "P1", "P2", "P3"].includes(profile?.priority)) add(errors, "STACK_PRIORITY", "priority", "priority is invalid");
  if (profile?.priority === "P0" && !P0.has(profile?.profileId)) add(errors, "STACK_P0_PROFILE", "profileId", "unknown P0 stack profile");
  if (!["single-project", "workspace-monorepo"].includes(profile?.topology)) add(errors, "STACK_TOPOLOGY", "topology", "topology is invalid");
  const applications = profile?.applications ?? [];
  if (!Array.isArray(applications) || applications.length === 0) add(errors, "STACK_APPLICATION_REQUIRED", "applications", "application is required");
  if (profile?.topology === "workspace-monorepo" && applications.length < 2) add(errors, "STACK_WORKSPACE_APPLICATIONS", "applications", "workspace requires at least two applications");
  if (profile?.topology === "single-project" && applications.some((application) => application.root !== ".")) {
    add(errors, "STACK_SINGLE_ROOT", "applications", "single-project applications must use root dot");
  }
  const ids = new Set();
  const roots = new Set();
  for (const [index, application] of applications.entries()) {
    const base = `applications[${index}]`;
    if (!/^[a-z][a-z0-9-]*$/u.test(application?.id ?? "") || ids.has(application.id)) add(errors, "STACK_APPLICATION_ID", `${base}.id`, "application ID is invalid or duplicated");
    ids.add(application?.id);
    if (application?.root !== "." && !safeRelative(application?.root)) add(errors, "STACK_APPLICATION_ROOT", `${base}.root`, "application root is unsafe");
    if (roots.has(application?.root)) add(errors, "STACK_APPLICATION_ROOT", `${base}.root`, "application root is duplicated");
    roots.add(application?.root);
    for (const tool of ["runtime", "framework", "packageManager"]) {
      if (!application?.[tool]?.name || !EXACT.test(application?.[tool]?.version ?? "")) {
        add(errors, "STACK_VERSION_EXACT", `${base}.${tool}`, `${tool} requires an exact version`);
      }
    }
  }
  const database = profile?.database;
  if (database?.product === "none") {
    if (database.version !== null || database.role !== "none" || database.migrationPairs?.length !== 0 || database.restoreEvidenceRef !== null) {
      add(errors, "STACK_DATABASE_NONE", "database", "database none must not contain migration or restore configuration");
    }
  } else {
    if (!EXACT.test(database?.version ?? "") || database?.role !== "primary") add(errors, "STACK_DATABASE_VERSION", "database", "database requires exact version and primary role");
    if (!safeRelative(database?.restoreEvidenceRef)) add(errors, "STACK_DATABASE_RESTORE", "database.restoreEvidenceRef", "restore evidence reference is required");
    if (!Array.isArray(database?.migrationPairs) || database.migrationPairs.length === 0) add(errors, "STACK_MIGRATION_REQUIRED", "database.migrationPairs", "database requires paired migrations");
  }
  const artifacts = profile?.artifacts ?? [];
  const paths = new Set();
  for (const [index, artifact] of artifacts.entries()) {
    if (!safeRelative(artifact?.path) || paths.has(artifact.path)) add(errors, "STACK_ARTIFACT_PATH", `artifacts[${index}].path`, "artifact path is unsafe or duplicated");
    paths.add(artifact?.path);
    if (typeof artifact?.content !== "string") add(errors, "STACK_ARTIFACT_CONTENT", `artifacts[${index}].content`, "artifact content must be a string");
  }
  for (const [index, pair] of (database?.migrationPairs ?? []).entries()) {
    if (!safeRelative(pair?.up) || !safeRelative(pair?.down) || pair.up === pair.down || !paths.has(pair.up) || !paths.has(pair.down)) {
      add(errors, "STACK_MIGRATION_PAIR", `database.migrationPairs[${index}]`, "migration pair must reference distinct starter artifacts");
    }
  }
  for (const field of ["dependencyInstall", "databaseMigration", "providerWrite", "productionDeploy"]) {
    if (profile?.execution?.[field] !== "NOT_RUN") add(errors, "STACK_EXECUTION_BOUNDARY", `execution.${field}`, `${field} must remain NOT_RUN`);
  }
  return { valid: errors.length === 0, errors };
}

function recordHash(record, field) {
  const { [field]: ignored, ...payload } = record;
  return sha256(JSON.stringify(payload));
}

export function runStackProfileFixture(mode, profile, targetValue, options = {}) {
  const target = resolve(targetValue);
  const validation = validateStackProfile(profile);
  if (!validation.valid) return { status: "INVALID", errors: validation.errors, execution: profile?.execution };
  const lockPath = confined(target, LOCK);
  const rollbackPath = confined(target, ROLLBACK);
  if (mode === "preview" || mode === "apply") {
    if (existsSync(lockPath) || existsSync(rollbackPath)) return { status: "BLOCKED", errors: ["existing stack starter record"] };
    const plans = profile.artifacts.map((artifact) => {
      const path = confined(target, artifact.path);
      const bytes = Buffer.from(artifact.content);
      if (!existsSync(path)) return { ...artifact, path, bytes, action: "create", managed: true };
      if (sha256(readFileSync(path)) === sha256(bytes)) return { ...artifact, path, bytes, action: "preserve-identical", managed: false };
      return { ...artifact, path, bytes, action: "blocked-existing-different", managed: false };
    });
    const summary = plans.map(({ path, action }) => ({ path: relative(target, path), action }));
    if (plans.some((plan) => plan.action === "blocked-existing-different")) {
      return { status: "BLOCKED", errors: ["existing starter target differs"], plan: summary, execution: profile.execution };
    }
    if (mode === "preview") return { status: "PREVIEW", plan: summary, execution: profile.execution };
    if (options.approved !== true) return { status: "APPROVAL_REQUIRED", plan: summary, execution: profile.execution };
    const payload = {
      schemaVersion: 1,
      kind: "stack-starter-lock",
      profileId: profile.profileId,
      profileSha256: sha256(canonical(profile)),
      files: plans.map((plan) => ({ path: relative(target, plan.path), sha256: sha256(plan.bytes), managed: plan.managed })),
      execution: profile.execution,
    };
    const lock = { ...payload, lockSha256: sha256(JSON.stringify(payload)) };
    const rollbackPayload = { schemaVersion: 1, kind: "stack-starter-rollback", lockSha256: lock.lockSha256, files: lock.files };
    const rollback = { ...rollbackPayload, rollbackSha256: sha256(JSON.stringify(rollbackPayload)) };
    const operations = plans.filter((plan) => plan.managed).map((plan) => ({ kind: "write", path: plan.path, bytes: plan.bytes }));
    operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(canonical(lock)) });
    operations.push({ kind: "write", path: rollbackPath, bytes: Buffer.from(canonical(rollback)) });
    try {
      applyFullStackTransaction(operations, options.io);
    } catch (error) {
      return { status: "FAIL", errors: [error.message], execution: profile.execution };
    }
    return { status: "PASS", plan: summary, execution: profile.execution };
  }
  if (!existsSync(lockPath) || !existsSync(rollbackPath)) return { status: "INVALID", errors: ["stack starter lock and rollback record are required"] };
  let lock;
  let rollback;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
    rollback = JSON.parse(readFileSync(rollbackPath, "utf8"));
    if (lock.lockSha256 !== recordHash(lock, "lockSha256") || rollback.rollbackSha256 !== recordHash(rollback, "rollbackSha256")) throw new Error("stack starter record integrity drift");
    if (rollback.lockSha256 !== lock.lockSha256 || lock.profileSha256 !== sha256(canonical(profile))) throw new Error("stack starter profile drift");
  } catch (error) {
    return { status: "INVALID", errors: [error.message] };
  }
  const drift = lock.files.filter((file) => !existsSync(confined(target, file.path)) || sha256(readFileSync(confined(target, file.path))) !== file.sha256);
  if (drift.length) return { status: "INVALID", errors: drift.map((file) => `stack starter target drift: ${file.path}`) };
  if (mode === "validate") return { status: "PASS", execution: lock.execution };
  if (mode !== "rollback") return { status: "INVALID", errors: [`unsupported mode: ${mode}`] };
  if (options.approved !== true) return { status: "APPROVAL_REQUIRED", execution: lock.execution };
  const operations = lock.files.filter((file) => file.managed).map((file) => ({ kind: "remove", path: confined(target, file.path) }));
  operations.push({ kind: "remove", path: lockPath }, { kind: "remove", path: rollbackPath });
  try {
    applyFullStackTransaction(operations, options.io);
  } catch (error) {
    return { status: "FAIL", errors: [error.message], execution: lock.execution };
  }
  return { status: "PASS", rollback: "FILES_ONLY", databaseRollback: "ARTIFACT_ONLY_NOT_EXECUTED", execution: lock.execution };
}
