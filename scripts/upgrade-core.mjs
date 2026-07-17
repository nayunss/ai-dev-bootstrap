#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalContentHash,
  parseUpstreamLockYaml,
  serializeUpstreamLock,
  sha256,
  targetPath,
  validateLockedTarget,
  validateUpstreamLock,
} from "./upstream-lock.mjs";

const lockRelative = ".ai/manifests/upstream.lock.yaml";
const rollbackRelative = ".ai/manifests/upstream-upgrade.rollback.json";
const reserved = new Set([lockRelative, rollbackRelative]);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${label} must be valid JSON: ${path}`);
  }
}

function loadRelease(manifestValue, sourceValue) {
  const manifestPath = resolve(manifestValue);
  const source = resolve(sourceValue);
  const bytes = readFileSync(manifestPath);
  const manifest = readJson(manifestPath, "release manifest");
  if (manifest.schemaVersion !== 1) throw new Error("Release manifest schemaVersion must be 1");
  for (const field of ["repository", "release", "commit", "archiveSha256", "contentSha256"]) {
    if (typeof manifest[field] !== "string" || !manifest[field]) throw new Error(`Release manifest requires ${field}`);
  }
  if (!/^[a-f0-9]{40}$/u.test(manifest.commit)) throw new Error("Release manifest commit must be a 40-character lowercase SHA");
  if (!/^sha256:[a-f0-9]{64}$/u.test(manifest.archiveSha256)) throw new Error("Release manifest archiveSha256 must be SHA-256");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error("Release manifest requires files");
  const paths = new Set();
  const files = manifest.files.map((file) => {
    if (reserved.has(file.path)) throw new Error(`Release manifest contains reserved path: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`Duplicate release path: ${file.path}`);
    paths.add(file.path);
    if (!/^sha256:[a-f0-9]{64}$/u.test(file.sha256 ?? "")) throw new Error(`Invalid file hash: ${file.path}`);
    const path = targetPath(source, file.path);
    if (!existsSync(path)) throw new Error(`Missing release source: ${file.path}`);
    const fileBytes = readFileSync(path);
    if (sha256(fileBytes) !== file.sha256) throw new Error(`Release source hash drift: ${file.path}`);
    return { ...file, bytes: fileBytes };
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (canonicalContentHash(files) !== manifest.contentSha256) throw new Error("Release manifest content hash drift");
  const lock = {
    schemaVersion: 1,
    kind: "upstream-lock",
    source: {
      repository: manifest.repository,
      release: manifest.release,
      commit: manifest.commit,
      archiveSha256: manifest.archiveSha256,
    },
    manifestSha256: sha256(bytes),
    contentSha256: manifest.contentSha256,
    files: files.map(({ path, sha256: digest }) => ({ path, sha256: digest })),
  };
  const errors = validateUpstreamLock(lock);
  if (errors.length) throw new Error(errors.join("\n"));
  return { manifest, files, lock };
}

function requireCurrent(target, release) {
  const lockPath = targetPath(target, lockRelative);
  if (!existsSync(lockPath)) throw new Error(`Missing current lock: ${lockRelative}`);
  const current = parseUpstreamLockYaml(readFileSync(lockPath, "utf8"));
  if (serializeUpstreamLock(current) !== serializeUpstreamLock(release.lock)) {
    throw new Error("Current release arguments do not match target lock");
  }
  const errors = validateLockedTarget(current, target);
  if (errors.length) throw new Error(errors.join("\n"));
}

function upgradePlan(target, current, next) {
  const oldFiles = new Map(current.files.map((file) => [file.path, file]));
  const nextFiles = new Map(next.files.map((file) => [file.path, file]));
  const paths = [...new Set([...oldFiles.keys(), ...nextFiles.keys()])].sort();
  return paths.map((path) => {
    const oldFile = oldFiles.get(path);
    const nextFile = nextFiles.get(path);
    const destination = targetPath(target, path);
    if (oldFile && nextFile) {
      return {
        path,
        action: oldFile.sha256 === nextFile.sha256 ? "preserve-unchanged" : "update",
        fromSha256: oldFile.sha256,
        toSha256: nextFile.sha256,
      };
    }
    if (oldFile) return { path, action: "delete", fromSha256: oldFile.sha256, toSha256: null };
    if (!existsSync(destination)) return { path, action: "create", fromSha256: null, toSha256: nextFile.sha256 };
    if (sha256(readFileSync(destination)) === nextFile.sha256) {
      return { path, action: "preserve-preexisting-identical", fromSha256: null, toSha256: nextFile.sha256 };
    }
    return { path, action: "blocked-existing-different", fromSha256: null, toSha256: nextFile.sha256 };
  });
}

export function applyFileTransaction(operations, io = {
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
      try {
        if (snapshot.existed) {
          io.mkdirSync(dirname(snapshot.path), { recursive: true });
          io.writeFileSync(snapshot.path, snapshot.bytes);
        } else if (io.existsSync(snapshot.path)) {
          io.unlinkSync(snapshot.path);
        }
      } catch {
        throw new Error(`Upgrade transaction failed and rollback could not restore ${snapshot.path}: ${error.message}`);
      }
    }
    throw new Error(`Upgrade transaction failed and was restored: ${error.message}`);
  }
}

function rollbackRecord(current, next, plan) {
  const record = {
    schemaVersion: 1,
    kind: "upstream-upgrade-rollback",
    from: {
      release: current.manifest.release,
      manifestSha256: current.lock.manifestSha256,
      lockSha256: sha256(serializeUpstreamLock(current.lock)),
    },
    to: {
      release: next.manifest.release,
      manifestSha256: next.lock.manifestSha256,
      lockSha256: sha256(serializeUpstreamLock(next.lock)),
    },
    operations: plan.map(({ path, action, fromSha256, toSha256 }) => ({ path, action, fromSha256, toSha256 })),
  };
  return { ...record, recordSha256: sha256(JSON.stringify(record)) };
}

function validateRollbackRecord(record, current, next) {
  if (record?.schemaVersion !== 1 || record?.kind !== "upstream-upgrade-rollback") {
    throw new Error("Rollback record schema or kind is invalid");
  }
  const { recordSha256, ...payload } = record;
  if (recordSha256 !== sha256(JSON.stringify(payload))) throw new Error("Rollback record integrity drift");
  if (record.from?.release !== current.manifest.release
    || record.from?.manifestSha256 !== current.lock.manifestSha256
    || record.from?.lockSha256 !== sha256(serializeUpstreamLock(current.lock))
    || record.to?.release !== next.manifest.release
    || record.to?.manifestSha256 !== next.lock.manifestSha256
    || record.to?.lockSha256 !== sha256(serializeUpstreamLock(next.lock))) {
    throw new Error("Rollback record does not match supplied releases");
  }
  if (!Array.isArray(record.operations)) throw new Error("Rollback record operations are required");
  const oldFiles = new Map(current.files.map((file) => [file.path, file]));
  const nextFiles = new Map(next.files.map((file) => [file.path, file]));
  const paths = [...new Set([...oldFiles.keys(), ...nextFiles.keys()])].sort();
  if (record.operations.length !== paths.length) throw new Error("Rollback record operation inventory drift");
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    const operation = record.operations[index];
    const oldFile = oldFiles.get(path);
    const nextFile = nextFiles.get(path);
    if (operation?.path !== path
      || operation.fromSha256 !== (oldFile?.sha256 ?? null)
      || operation.toSha256 !== (nextFile?.sha256 ?? null)) {
      throw new Error(`Rollback record operation hash drift: ${path}`);
    }
    const allowed = oldFile && nextFile
      ? [oldFile.sha256 === nextFile.sha256 ? "preserve-unchanged" : "update"]
      : oldFile
        ? ["delete"]
        : ["create", "preserve-preexisting-identical"];
    if (!allowed.includes(operation.action)) throw new Error(`Rollback record action drift: ${path}`);
  }
}

function printPlan(title, current, next, plan) {
  process.stdout.write(`${title}: ${current.manifest.release} -> ${next.manifest.release}\n`);
  for (const operation of plan) process.stdout.write(`- ${operation.action}: ${operation.path}\n`);
}

function run() {
  const [mode, targetValue, currentManifest, currentSource, nextManifest, nextSource, approval] = process.argv.slice(2);
  if (!new Set(["preview", "apply", "rollback", "finalize"]).has(mode)
    || !targetValue || !currentManifest || !currentSource || !nextManifest || !nextSource) {
    fail("Usage: upgrade-core.mjs <preview|apply|rollback|finalize> TARGET CURRENT_MANIFEST CURRENT_SOURCE NEXT_MANIFEST NEXT_SOURCE [--approve]", 2);
  }
  const target = resolve(targetValue);
  let current;
  let next;
  try {
    current = loadRelease(currentManifest, currentSource);
    next = loadRelease(nextManifest, nextSource);
  } catch (error) {
    fail(error.message);
  }
  if (current.manifest.repository !== next.manifest.repository) fail("Cross-repository core upgrade is forbidden");
  const lockPath = targetPath(target, lockRelative);
  const recordPath = targetPath(target, rollbackRelative);

  if (mode === "finalize") {
    try {
      requireCurrent(target, next);
    } catch (error) {
      fail(error.message);
    }
    if (!existsSync(recordPath)) fail(`Missing rollback record: ${rollbackRelative}`);
    const record = readJson(recordPath, "rollback record");
    try {
      validateRollbackRecord(record, current, next);
    } catch (error) {
      fail(error.message);
    }
    process.stdout.write(`Core upgrade finalize preview: ${next.manifest.release}\n`);
    if (approval !== "--approve") fail("Core upgrade finalize requires explicit --approve", 2);
    unlinkSync(recordPath);
    process.stdout.write("Core upgrade finalize: PASS\n");
    return;
  }

  if (mode === "rollback") {
    try {
      requireCurrent(target, next);
    } catch (error) {
      fail(error.message);
    }
    if (!existsSync(recordPath)) fail(`Missing rollback record: ${rollbackRelative}`);
    const record = readJson(recordPath, "rollback record");
    try {
      validateRollbackRecord(record, current, next);
    } catch (error) {
      fail(error.message);
    }
    process.stdout.write(`Core rollback preview: ${next.manifest.release} -> ${current.manifest.release}\n`);
    for (const operation of record.operations) process.stdout.write(`- reverse-${operation.action}: ${operation.path}\n`);
    if (approval !== "--approve") fail("Core rollback requires explicit --approve", 2);
    const oldFiles = new Map(current.files.map((file) => [file.path, file]));
    const operations = [];
    for (const operation of record.operations) {
      const destination = targetPath(target, operation.path);
      if (operation.action === "create") operations.push({ kind: "remove", path: destination });
      else if (operation.action === "update" || operation.action === "delete") {
        operations.push({ kind: "write", path: destination, bytes: oldFiles.get(operation.path).bytes });
      }
    }
    operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(serializeUpstreamLock(current.lock)) });
    operations.push({ kind: "remove", path: recordPath });
    try {
      applyFileTransaction(operations);
      requireCurrent(target, current);
    } catch (error) {
      fail(error.message);
    }
    process.stdout.write("Core rollback: PASS\n");
    return;
  }

  try {
    requireCurrent(target, current);
  } catch (error) {
    fail(error.message);
  }
  if (existsSync(recordPath)) fail("An unfinished core upgrade rollback record already exists");
  const plan = upgradePlan(target, current, next);
  printPlan(`Core upgrade ${mode} preview`, current, next, plan);
  if (plan.some((operation) => operation.action === "blocked-existing-different")) {
    fail("Core upgrade blocked: a new release path collides with a downstream-owned file");
  }
  if (mode === "preview") return;
  if (approval !== "--approve") fail("Core upgrade apply requires explicit --approve", 2);
  const nextFiles = new Map(next.files.map((file) => [file.path, file]));
  const operations = [];
  for (const operation of plan) {
    const destination = targetPath(target, operation.path);
    if (operation.action === "update" || operation.action === "create") {
      operations.push({ kind: "write", path: destination, bytes: nextFiles.get(operation.path).bytes });
    } else if (operation.action === "delete") {
      operations.push({ kind: "remove", path: destination });
    }
  }
  const record = rollbackRecord(current, next, plan);
  operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(serializeUpstreamLock(next.lock)) });
  operations.push({ kind: "write", path: recordPath, bytes: Buffer.from(`${JSON.stringify(record, null, 2)}\n`) });
  try {
    applyFileTransaction(operations);
    requireCurrent(target, next);
  } catch (error) {
    fail(error.message);
  }
  process.stdout.write("Core upgrade apply: PASS\n");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) run();
