#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalContentHash,
  serializeUpstreamLock,
  sha256,
  validateUpstreamLock,
} from "./upstream-lock.mjs";

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function option(name) {
  return process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const [inputValue, outputValue] = process.argv.slice(2);
const manifestValue = option("manifest");
const repository = option("repository");
if (!inputValue || !outputValue || !manifestValue || !repository) {
  fail("Usage: migrate-upstream-lock.mjs INPUT.json OUTPUT.yaml --manifest=MANIFEST.json --repository=URL", 2);
}
const input = resolve(inputValue);
const output = resolve(outputValue);
const manifestPath = resolve(manifestValue);
if (!existsSync(input) || !existsSync(manifestPath)) fail("Input JSON lock and release manifest must exist");
if (existsSync(output)) fail(`Refusing to overwrite canonical lock: ${output}`);

const legacy = JSON.parse(readFileSync(input, "utf8"));
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes);
for (const field of ["release", "commit", "archiveSha256", "contentSha256"]) {
  if (legacy?.[field] !== manifest?.[field]) fail(`Legacy lock and release manifest differ: ${field}`);
}
if (JSON.stringify(legacy?.files) !== JSON.stringify(manifest?.files)) {
  fail("Legacy lock and release manifest differ: files");
}
const files = [...manifest.files].sort((left, right) => left.path.localeCompare(right.path));
if (canonicalContentHash(files) !== manifest.contentSha256) fail("Release manifest content hash drift");
const lock = {
  schemaVersion: 1,
  kind: "upstream-lock",
  source: {
    repository,
    release: manifest.release,
    commit: manifest.commit,
    archiveSha256: manifest.archiveSha256,
  },
  manifestSha256: sha256(manifestBytes),
  contentSha256: manifest.contentSha256,
  files,
};
const errors = validateUpstreamLock(lock);
if (errors.length) fail(errors.join("\n"));
writeFileSync(output, serializeUpstreamLock(lock), { flag: "wx" });
process.stdout.write(`Upstream lock migration: PASS (${legacy.schemaVersion} JSON -> ${lock.schemaVersion} YAML)\n`);
