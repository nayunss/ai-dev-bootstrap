import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { applyFullStackTransaction } from "./fullstack-materializer.mjs";
import { runSkillDistribution } from "./skill-distribution.mjs";
import { runStackProfileFixture } from "./stack-profile-fixtures.mjs";

const LOCK = ".ai/manifests/release-adoption.lock.json";
const ROLLBACK = ".ai/manifests/release-adoption.rollback.json";
const STACK_LOCK = ".ai/manifests/stack-starter.lock.json";
const STACK_ROLLBACK = ".ai/manifests/stack-starter.rollback.json";
const SKILL_LOCK = ".ai/manifests/skills.lock.json";
const EXECUTION = {
  network: "NOT_RUN",
  telemetry: "DISABLED",
  dependencyInstall: "NOT_RUN",
  databaseMigration: "NOT_RUN",
  providerWrite: "NOT_RUN",
  productionDeploy: "NOT_RUN",
};

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.includes("\0")) throw new Error(`${label} must be a safe relative path`);
  const normalized = value.replaceAll("\\", "/");
  if (normalized === "." || normalized.split("/").some((part) => !part || part === ".." || part.startsWith(".env"))) {
    throw new Error(`${label} must not escape or reference .env*`);
  }
  return normalized;
}

function confined(root, value, label, rejectSymlink = false) {
  const normalized = safeRelative(value, label);
  const path = resolve(root, normalized);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes root`);
  if (rejectSymlink) {
    let current = root;
    for (const part of normalized.split("/").slice(0, -1)) {
      current = resolve(current, part);
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error(`${label} traverses symlink: ${value}`);
    }
  }
  return path;
}

function manifestDigest(manifest) {
  const copy = structuredClone(manifest);
  delete copy.release.manifestSha256;
  return sha256(JSON.stringify(copy));
}

function component(root, descriptor, label, errors) {
  try {
    const path = confined(root, descriptor?.path, label);
    if (!existsSync(path)) {
      errors.push(`missing ${label}`);
      return null;
    }
    const bytes = readFileSync(path);
    if (sha256(bytes) !== descriptor.sha256) errors.push(`${label} checksum drift`);
    return { path, bytes };
  } catch (error) {
    errors.push(error.message);
    return null;
  }
}

export function validateReleaseAdoptionManifest(manifest, sourceValue) {
  const source = resolve(sourceValue);
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^\d+\.\d+\.\d+$/u.test(manifest?.release?.version ?? "")) errors.push("release.version must be exact semver");
  if (!/^[a-f0-9]{40}$/u.test(manifest?.release?.commit ?? "")) errors.push("release.commit must be an exact commit");
  if (manifestDigest(manifest) !== manifest?.release?.manifestSha256) errors.push("release manifest checksum drift");
  try {
    const archivePath = confined(source, manifest?.release?.archivePath, "release archive");
    if (!existsSync(archivePath) || sha256(readFileSync(archivePath)) !== manifest?.release?.archiveSha256) errors.push("release archive checksum drift");
  } catch (error) {
    errors.push(error.message);
  }
  const stack = component(source, manifest?.components?.stackProfile, "stack profile", errors);
  const skills = component(source, manifest?.components?.skillDistribution, "skill distribution", errors);
  const adapters = manifest?.selection?.adapters ?? [];
  if (!Array.isArray(adapters) || new Set(adapters).size !== adapters.length || adapters.some((id) => !["codex", "claude-code", "github-copilot"].includes(id))) {
    errors.push("selection.adapters is invalid");
  }
  const optionalSkills = manifest?.selection?.optionalSkills ?? [];
  if (!Array.isArray(optionalSkills) || new Set(optionalSkills).size !== optionalSkills.length) errors.push("selection.optionalSkills is invalid");
  if (JSON.stringify(manifest?.execution) !== JSON.stringify(EXECUTION)) errors.push("adoption execution boundary is invalid");
  return { valid: errors.length === 0, errors, stack, skills };
}

function stageComponents(manifest, validation, sourceRoot) {
  const stage = mkdtempSync(resolve(tmpdir(), "release-adoption-stage-"));
  try {
    const stackProfile = JSON.parse(validation.stack.bytes);
    const skillManifest = JSON.parse(validation.skills.bytes);
    const stackResult = runStackProfileFixture("apply", stackProfile, stage, { approved: true });
    if (stackResult.status !== "PASS") return { status: "INVALID", errors: stackResult.errors ?? ["stack staging failed"], stage };
    const skillResult = runSkillDistribution(
      "apply",
      skillManifest,
      dirname(validation.skills.path),
      stage,
      {
        approved: true,
        optional: manifest.selection.optionalSkills,
        adapters: manifest.selection.adapters,
      },
    );
    if (skillResult.status !== "PASS") return { status: "INVALID", errors: skillResult.errors ?? ["skill staging failed"], stage };
    const stackLock = JSON.parse(readFileSync(resolve(stage, STACK_LOCK), "utf8"));
    const skillLock = JSON.parse(readFileSync(resolve(stage, SKILL_LOCK), "utf8"));
    const paths = [
      ...stackLock.files.map((file) => file.path),
      STACK_LOCK,
      STACK_ROLLBACK,
      ...skillLock.files.map((file) => file.path),
      SKILL_LOCK,
    ];
    const unique = [...new Set(paths)].sort();
    const files = unique.map((path) => {
      const bytes = readFileSync(confined(stage, path, "staged adoption file"));
      return { path, bytes, sha256: sha256(bytes) };
    });
    return { status: "PASS", files, stage };
  } catch (error) {
    return { status: "INVALID", errors: [error.message], stage };
  }
}

function readRecord(path, kind) {
  if (!existsSync(path)) throw new Error(`missing ${kind}`);
  const record = JSON.parse(readFileSync(path, "utf8"));
  const { recordSha256, ...payload } = record;
  if (record?.kind !== kind || recordSha256 !== sha256(JSON.stringify(payload))) throw new Error(`${kind} integrity drift`);
  return record;
}

function seal(payload) {
  return { ...payload, recordSha256: sha256(JSON.stringify(payload)) };
}

export function inspectReleaseAdoption(targetValue) {
  const target = resolve(targetValue);
  const lockPath = confined(target, LOCK, "adoption lock", true);
  if (!existsSync(lockPath)) return { status: "EMPTY", release: null };
  try {
    const lock = readRecord(lockPath, "release-adoption-lock");
    const drift = lock.files.filter((file) => {
      const path = confined(target, file.path, "locked adoption target", true);
      return !existsSync(path) || sha256(readFileSync(path)) !== file.sha256;
    });
    if (drift.length) return {
      status: "INVALID",
      release: lock.release,
      errors: drift.map((file) => `target drift: ${file.path}`),
    };
    return { status: "INSTALLED", release: lock.release };
  } catch (error) {
    return { status: "INVALID", release: null, errors: [error.message] };
  }
}

function planFiles(files, target, currentLock) {
  const owned = new Map((currentLock?.files ?? []).map((file) => [file.path, file]));
  return files.map((file) => {
    const targetPath = confined(target, file.path, "adoption target", true);
    if (!existsSync(targetPath)) return { ...file, targetPath, action: "create", managed: true, currentSha256: null };
    const current = sha256(readFileSync(targetPath));
    if (current === file.sha256) return { ...file, targetPath, action: "preserve-identical", managed: owned.get(file.path)?.managed ?? false, currentSha256: current };
    if (owned.get(file.path)?.managed && current === owned.get(file.path).sha256) return { ...file, targetPath, action: "update-managed", managed: true, currentSha256: current };
    return { ...file, targetPath, action: "blocked-existing-different", managed: false, currentSha256: current };
  });
}

function planSummary(plan, removals, manifestSha256) {
  const entries = [
    ...plan.map(({ path, action, currentSha256, sha256: desiredSha256 }) => ({
      path,
      action,
      beforeSha256: currentSha256,
      afterSha256: desiredSha256,
    })),
    ...removals.map(({ path, action, currentSha256 }) => ({
      path,
      action,
      beforeSha256: currentSha256,
      afterSha256: null,
    })),
  ].sort((a, b) => a.path.localeCompare(b.path));
  return {
    entries,
    planSha256: sha256(JSON.stringify({ manifestSha256, entries })),
  };
}

export function runReleaseAdoption(mode, manifest, sourceValue, targetValue, options = {}) {
  const source = resolve(sourceValue);
  const target = resolve(targetValue);
  const surface = options.surface ?? "cli";
  if (!["cli", "web"].includes(surface)) return { status: "INVALID", errors: ["surface must be cli or web"] };
  const validation = validateReleaseAdoptionManifest(manifest, source);
  if (!validation.valid) return { status: "INVALID", errors: validation.errors, execution: EXECUTION };
  const lockPath = confined(target, LOCK, "adoption lock", true);
  const rollbackPath = confined(target, ROLLBACK, "adoption rollback", true);
  let currentLock = null;
  if (existsSync(lockPath)) {
    try {
      currentLock = readRecord(lockPath, "release-adoption-lock");
    } catch (error) {
      return { status: "INVALID", errors: [error.message], execution: EXECUTION };
    }
  }

  if (["preview", "apply", "upgrade"].includes(mode)) {
    if (mode === "upgrade" && !currentLock) return { status: "BLOCKED", errors: ["upgrade requires an installed release"], execution: EXECUTION };
    if (mode !== "upgrade" && currentLock) return { status: "BLOCKED", errors: ["release adoption lock already exists"], execution: EXECUTION };
    const staged = stageComponents(manifest, validation, source);
    try {
      if (staged.status !== "PASS") return { status: staged.status, errors: staged.errors, execution: EXECUTION };
      const plan = planFiles(staged.files, target, currentLock);
      const desiredPaths = new Set(plan.map((file) => file.path));
      const removals = (currentLock?.files ?? []).filter((file) => !desiredPaths.has(file.path)).map((file) => {
        const targetPath = confined(target, file.path, "removed adoption target", true);
        const current = existsSync(targetPath) ? sha256(readFileSync(targetPath)) : null;
        return {
          ...file,
          targetPath,
          currentSha256: current,
          action: file.managed && current === file.sha256 ? "remove-managed" : "preserve-removed-drifted",
        };
      });
      const summary = planSummary(plan, removals, manifest.release.manifestSha256);
      if (plan.some((file) => file.action === "blocked-existing-different")) {
        return { status: "BLOCKED", ...summary, errors: ["existing target differs; no files changed"], execution: EXECUTION };
      }
      if (mode === "preview") return { status: "PREVIEW", surface, ...summary, execution: EXECUTION };
      if (options.expectedPlanSha256 && options.expectedPlanSha256 !== summary.planSha256) {
        return { status: "BLOCKED", surface, ...summary, errors: ["approved plan differs from current target; no files changed"], execution: EXECUTION };
      }
      if (options.approved !== true) return { status: "APPROVAL_REQUIRED", surface, ...summary, execution: EXECUTION };
      const lock = seal({
        schemaVersion: 1,
        kind: "release-adoption-lock",
        release: manifest.release,
        selection: manifest.selection,
        files: plan.map((file) => ({ path: file.path, sha256: file.sha256, managed: file.managed })),
        planSha256: summary.planSha256,
        execution: EXECUTION,
      });
      const previousFiles = (currentLock?.files ?? []).filter((file) => file.managed && existsSync(confined(target, file.path, "previous adoption target", true)))
        .map((file) => ({ path: file.path, bytesBase64: readFileSync(confined(target, file.path, "previous adoption target", true)).toString("base64") }));
      const rollback = seal({
        schemaVersion: 1,
        kind: "release-adoption-rollback",
        fromLock: currentLock,
        previousFiles,
        toLockSha256: lock.recordSha256,
      });
      const operations = [
        ...plan.filter((file) => ["create", "update-managed"].includes(file.action)).map((file) => ({ kind: "write", path: file.targetPath, bytes: file.bytes })),
        ...removals.filter((file) => file.action === "remove-managed").map((file) => ({ kind: "remove", path: file.targetPath })),
        { kind: "write", path: lockPath, bytes: Buffer.from(canonical(lock)) },
        { kind: "write", path: rollbackPath, bytes: Buffer.from(canonical(rollback)) },
      ];
      try {
        applyFullStackTransaction(operations, options.io);
      } catch (error) {
        return { status: "FAIL", errors: [error.message], surface, ...summary, execution: EXECUTION };
      }
      return { status: "PASS", surface, ...summary, execution: EXECUTION };
    } finally {
      rmSync(staged.stage, { recursive: true, force: true });
    }
  }

  if (!currentLock) return { status: "INVALID", errors: ["installed release adoption lock is required"], execution: EXECUTION };
  const drift = currentLock.files.filter((file) => {
    const path = confined(target, file.path, "locked adoption target", true);
    return !existsSync(path) || sha256(readFileSync(path)) !== file.sha256;
  });
  if (mode === "validate") {
    if (currentLock.release.manifestSha256 !== manifest.release.manifestSha256) return { status: "INVALID", errors: ["installed release differs from manifest"], execution: EXECUTION };
    return drift.length ? { status: "INVALID", errors: drift.map((file) => `target drift: ${file.path}`), execution: EXECUTION } : { status: "PASS", execution: EXECUTION };
  }
  if (mode !== "rollback") return { status: "INVALID", errors: [`unsupported mode: ${mode}`], execution: EXECUTION };
  if (!existsSync(rollbackPath)) return { status: "INVALID", errors: ["missing release adoption rollback"], execution: EXECUTION };
  if (options.approved !== true) return { status: "APPROVAL_REQUIRED", execution: EXECUTION };
  let rollback;
  try {
    rollback = readRecord(rollbackPath, "release-adoption-rollback");
  } catch (error) {
    return { status: "INVALID", errors: [error.message], execution: EXECUTION };
  }
  if (rollback.toLockSha256 !== currentLock.recordSha256 || drift.length) return { status: "BLOCKED", errors: ["target or rollback binding drift"], execution: EXECUTION };
  const previous = new Map(rollback.previousFiles.map((file) => [file.path, Buffer.from(file.bytesBase64, "base64")]));
  const previousPaths = new Set(rollback.fromLock?.files.map((file) => file.path) ?? []);
  const operations = currentLock.files.filter((file) => file.managed && !previousPaths.has(file.path))
    .map((file) => ({ kind: "remove", path: confined(target, file.path, "rollback remove", true) }));
  for (const [path, bytes] of previous) operations.push({ kind: "write", path: confined(target, path, "rollback restore", true), bytes });
  if (rollback.fromLock) operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(canonical(rollback.fromLock)) });
  else operations.push({ kind: "remove", path: lockPath });
  operations.push({ kind: "remove", path: rollbackPath });
  try {
    applyFullStackTransaction(operations, options.io);
  } catch (error) {
    return { status: "FAIL", errors: [error.message], execution: EXECUTION };
  }
  return { status: "PASS", restoredRelease: rollback.fromLock?.release.version ?? null, execution: EXECUTION };
}
