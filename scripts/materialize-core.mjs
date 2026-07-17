#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const lockRelative = ".ai/manifests/upstream.lock.json";
const modes = new Set(["preview", "apply", "validate"]);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function safe(root, relative) {
  if (
    typeof relative !== "string"
    || !relative
    || relative.startsWith("/")
    || relative.split(/[\\/]/u).includes("..")
    || relative.split(/[\\/]/u).some((part) => part.startsWith(".env"))
  ) fail(`Unsafe core path: ${relative}`);
  const path = resolve(root, relative);
  if (path !== root && !path.startsWith(`${root}${sep}`)) fail(`Core path escapes root: ${relative}`);
  return path;
}

function readManifest(path) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest.schemaVersion !== 1) fail("Release manifest schemaVersion must be 1");
  for (const field of ["release", "commit", "archiveSha256", "contentSha256"]) {
    if (typeof manifest[field] !== "string" || !manifest[field]) fail(`Release manifest requires ${field}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail("Release manifest requires files");
  const paths = new Set();
  for (const file of manifest.files) {
    if (paths.has(file.path)) fail(`Duplicate core path: ${file.path}`);
    paths.add(file.path);
    if (!/^sha256:[a-f0-9]{64}$/u.test(file.sha256 ?? "")) fail(`Invalid file hash: ${file.path}`);
  }
  const canonical = manifest.files
    .map(({ path: file, sha256: digest }) => `${file}\0${digest}\n`)
    .sort()
    .join("");
  if (sha256(canonical) !== manifest.contentSha256) fail("Release manifest content hash drift");
  return manifest;
}

function sourceFiles(source, manifest) {
  return manifest.files.map((file) => {
    const path = safe(source, file.path);
    if (!existsSync(path)) fail(`Missing release source: ${file.path}`);
    const bytes = readFileSync(path);
    if (sha256(bytes) !== file.sha256) fail(`Release source hash drift: ${file.path}`);
    return { ...file, bytes };
  });
}

function plan(target, files) {
  return files.map((file) => {
    const destination = safe(target, file.path);
    if (!existsSync(destination)) return { ...file, action: "create" };
    if (sha256(readFileSync(destination)) === file.sha256) return { ...file, action: "preserve-identical" };
    return { ...file, action: "blocked-existing-different" };
  });
}

function lockFor(manifest) {
  return {
    schemaVersion: 1,
    release: manifest.release,
    commit: manifest.commit,
    archiveSha256: manifest.archiveSha256,
    contentSha256: manifest.contentSha256,
    files: manifest.files,
  };
}

const [mode, targetValue, manifestValue, sourceValue, approval] = process.argv.slice(2);
if (!modes.has(mode) || !targetValue || !manifestValue || !sourceValue) {
  fail("Usage: materialize-core.mjs <preview|apply|validate> TARGET MANIFEST SOURCE [--approve]", 2);
}
const target = resolve(targetValue);
const source = resolve(sourceValue);
if (!existsSync(target) || !existsSync(source)) fail("Target and source must exist");
const manifest = readManifest(resolve(manifestValue));
const files = sourceFiles(source, manifest);

if (mode === "validate") {
  const lockPath = safe(target, lockRelative);
  if (!existsSync(lockPath)) fail(`Missing core lock: ${lockRelative}`);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (JSON.stringify(lock) !== JSON.stringify(lockFor(manifest))) fail("Core lock drift");
  for (const file of files) {
    const destination = safe(target, file.path);
    if (!existsSync(destination) || sha256(readFileSync(destination)) !== file.sha256) {
      fail(`Core target drift: ${file.path}`);
    }
  }
  process.stdout.write(`Core validation: PASS (${manifest.release})\n`);
  process.exit(0);
}

const changes = plan(target, files);
process.stdout.write(`Core ${mode} preview (${manifest.release})\n`);
for (const file of changes) process.stdout.write(`- ${file.action}: ${file.path}\n`);
if (changes.some((file) => file.action === "blocked-existing-different")) {
  fail("Core materialization blocked: existing files differ; no files were changed");
}
if (mode === "preview") process.exit(0);
if (approval !== "--approve") fail("Core apply requires explicit --approve after preview", 2);
for (const file of changes) {
  if (file.action !== "create") continue;
  const destination = safe(target, file.path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, file.bytes);
}
const lockPath = safe(target, lockRelative);
mkdirSync(dirname(lockPath), { recursive: true });
writeFileSync(lockPath, `${JSON.stringify(lockFor(manifest), null, 2)}\n`);
process.stdout.write("Core materialization: PASS\n");
