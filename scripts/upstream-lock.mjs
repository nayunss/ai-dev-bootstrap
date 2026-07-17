import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function safeRelativePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.split(/[\\/]/u).includes("..")
    && !path.split(/[\\/]/u).some((part) => part.startsWith(".env"));
}

export function targetPath(root, path) {
  if (!safeRelativePath(path)) throw new Error(`unsafe upstream file path: ${path}`);
  const destination = resolve(root, path);
  if (destination !== root && !destination.startsWith(`${root}${sep}`)) {
    throw new Error(`upstream file path escapes target: ${path}`);
  }
  return destination;
}

export function canonicalContentHash(files) {
  return sha256(
    [...files]
      .map(({ path, sha256: digest }) => `${path}\0${digest}\n`)
      .sort()
      .join(""),
  );
}

export function validateUpstreamLock(lock) {
  const errors = [];
  if (lock?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (lock?.kind !== "upstream-lock") errors.push("kind must be upstream-lock");
  for (const field of ["repository", "release"]) {
    if (typeof lock?.source?.[field] !== "string" || !lock.source[field]) errors.push(`source.${field} is required`);
  }
  if (!COMMIT.test(lock?.source?.commit ?? "")) errors.push("source.commit must be a 40-character lowercase SHA");
  for (const [path, value] of [
    ["source.archiveSha256", lock?.source?.archiveSha256],
    ["manifestSha256", lock?.manifestSha256],
    ["contentSha256", lock?.contentSha256],
  ]) if (!SHA256.test(value ?? "")) errors.push(`${path} must be SHA-256`);

  if (!Array.isArray(lock?.files) || lock.files.length === 0) {
    errors.push("files requires at least one entry");
  } else {
    const paths = new Set();
    for (const file of lock.files) {
      if (!safeRelativePath(file?.path)) errors.push(`unsafe file path: ${file?.path}`);
      if (paths.has(file?.path)) errors.push(`duplicate file path: ${file?.path}`);
      paths.add(file?.path);
      if (!SHA256.test(file?.sha256 ?? "")) errors.push(`invalid file hash: ${file?.path}`);
    }
    if (canonicalContentHash(lock.files) !== lock.contentSha256) errors.push("contentSha256 drift");
    const sorted = [...lock.files].sort((a, b) => a.path.localeCompare(b.path));
    if (JSON.stringify(sorted) !== JSON.stringify(lock.files)) errors.push("files must be sorted by path");
  }
  return errors;
}

function scalar(value) {
  return JSON.stringify(value);
}

export function serializeUpstreamLock(lock) {
  const errors = validateUpstreamLock(lock);
  if (errors.length) throw new Error(errors.join("\n"));
  const lines = [
    `schemaVersion: ${lock.schemaVersion}`,
    `kind: ${scalar(lock.kind)}`,
    "source:",
    `  repository: ${scalar(lock.source.repository)}`,
    `  release: ${scalar(lock.source.release)}`,
    `  commit: ${scalar(lock.source.commit)}`,
    `  archiveSha256: ${scalar(lock.source.archiveSha256)}`,
    `manifestSha256: ${scalar(lock.manifestSha256)}`,
    `contentSha256: ${scalar(lock.contentSha256)}`,
    "files:",
  ];
  for (const file of lock.files) {
    lines.push(`  - path: ${scalar(file.path)}`);
    lines.push(`    sha256: ${scalar(file.sha256)}`);
  }
  return `${lines.join("\n")}\n`;
}

function quoted(line, prefix, lineNumber) {
  if (!line.startsWith(prefix)) throw new Error(`invalid canonical YAML at line ${lineNumber}`);
  try {
    const value = JSON.parse(line.slice(prefix.length));
    if (typeof value !== "string") throw new Error();
    return value;
  } catch {
    throw new Error(`invalid quoted scalar at line ${lineNumber}`);
  }
}

export function parseUpstreamLockYaml(value) {
  const lines = value.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length < 12 || lines[0] !== "schemaVersion: 1" || lines[2] !== "source:" || lines[9] !== "files:") {
    throw new Error("invalid canonical upstream lock YAML structure");
  }
  const lock = {
    schemaVersion: 1,
    kind: quoted(lines[1], "kind: ", 2),
    source: {
      repository: quoted(lines[3], "  repository: ", 4),
      release: quoted(lines[4], "  release: ", 5),
      commit: quoted(lines[5], "  commit: ", 6),
      archiveSha256: quoted(lines[6], "  archiveSha256: ", 7),
    },
    manifestSha256: quoted(lines[7], "manifestSha256: ", 8),
    contentSha256: quoted(lines[8], "contentSha256: ", 9),
    files: [],
  };
  const fileLines = lines.slice(10);
  if (fileLines.length % 2 !== 0) throw new Error("canonical YAML file entries must use two lines");
  for (let index = 0; index < fileLines.length; index += 2) {
    lock.files.push({
      path: quoted(fileLines[index], "  - path: ", index + 11),
      sha256: quoted(fileLines[index + 1], "    sha256: ", index + 12),
    });
  }
  const errors = validateUpstreamLock(lock);
  if (errors.length) throw new Error(errors.join("\n"));
  if (serializeUpstreamLock(lock) !== value) throw new Error("upstream lock YAML is not canonical");
  return lock;
}

export function validateLockedTarget(lock, root) {
  const errors = [];
  for (const file of lock.files) {
    let path;
    try {
      path = targetPath(root, file.path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (!existsSync(path)) errors.push(`missing locked file: ${file.path}`);
    else if (sha256(readFileSync(path)) !== file.sha256) errors.push(`locked target drift: ${file.path}`);
  }
  return errors;
}
