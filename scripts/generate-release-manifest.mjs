#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalContentHash,
  safeRelativePath,
  sha256,
  targetPath,
} from "./upstream-lock.mjs";

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function option(name) {
  return process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const [sourceValue, inventoryValue, outputValue] = process.argv.slice(2);
if (!sourceValue || !inventoryValue || !outputValue) {
  fail(
    "Usage: generate-release-manifest.mjs SOURCE INVENTORY.json OUTPUT.json "
    + "--repository=URL --release=TAG --commit=SHA --archive=RELEASE_ARCHIVE",
    2,
  );
}
const source = resolve(sourceValue);
const inventoryPath = resolve(inventoryValue);
const output = resolve(outputValue);
if (!existsSync(source) || !existsSync(inventoryPath)) fail("Source and inventory must exist");
if (existsSync(output)) fail(`Refusing to overwrite release manifest: ${output}`);

const repository = option("repository");
const release = option("release");
const commit = option("commit");
const archiveValue = option("archive");
if (!repository || !release) fail("repository and release are required");
if (!/^[a-f0-9]{40}$/u.test(commit ?? "")) fail("commit must be a 40-character lowercase SHA");
if (!archiveValue || !existsSync(resolve(archiveValue))) fail("release archive must exist");
const archiveSha256 = sha256(readFileSync(resolve(archiveValue)));

const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.files) || inventory.files.length === 0) {
  fail("Inventory must have schemaVersion 1 and at least one file");
}
const unique = new Set();
const files = [];
for (const path of inventory.files) {
  if (!safeRelativePath(path)) fail(`Unsafe inventory path: ${path}`);
  if (unique.has(path)) fail(`Duplicate inventory path: ${path}`);
  unique.add(path);
  const sourcePath = targetPath(source, path);
  if (!existsSync(sourcePath)) fail(`Missing inventory source: ${path}`);
  files.push({ path, sha256: sha256(readFileSync(sourcePath)) });
}
files.sort((left, right) => left.path.localeCompare(right.path));
const manifest = {
  schemaVersion: 1,
  repository,
  release,
  commit,
  archiveSha256,
  contentSha256: canonicalContentHash(files),
  files,
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`Release manifest generation: PASS (${release}, ${files.length} files)\n`);
