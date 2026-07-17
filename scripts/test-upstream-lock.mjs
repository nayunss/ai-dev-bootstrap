#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  parseUpstreamLockYaml,
  serializeUpstreamLock,
  sha256,
} from "./upstream-lock.mjs";

const root = process.cwd();
const generator = resolve("scripts/generate-release-manifest.mjs");
const migrator = resolve("scripts/migrate-upstream-lock.mjs");
const validator = resolve("scripts/validate-upstream-lock.mjs");
const source = mkdtempSync(join(tmpdir(), "upstream-lock-source-"));
mkdirSync(join(source, ".ai/standards"), { recursive: true });
writeFileSync(join(source, ".ai/standards/engineering.md"), "# engineering\n");
writeFileSync(join(source, "HANDOFF.md"), "# handoff\n");
const inventory = join(source, "inventory.json");
writeFileSync(inventory, `${JSON.stringify({
  schemaVersion: 1,
  files: ["HANDOFF.md", ".ai/standards/engineering.md"],
}, null, 2)}\n`);
const manifestPath = join(source, "release-manifest.json");
const repository = "https://example.invalid/common-project.git";
const release = "v1.0.0-fixture";
const commit = "b".repeat(40);
const archivePath = join(source, "release.tar.gz");
writeFileSync(archivePath, "fixture release archive");
const archive = sha256(readFileSync(archivePath));
const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  encoding: "utf8",
});

let result = run(
  generator,
  source,
  inventory,
  manifestPath,
  `--repository=${repository}`,
  `--release=${release}`,
  `--commit=${commit}`,
  `--archive=${archivePath}`,
);
assert.equal(result.status, 0, result.stderr);
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes);
assert.deepEqual(manifest.files.map((file) => file.path), [
  ".ai/standards/engineering.md",
  "HANDOFF.md",
]);
assert.equal(manifest.repository, repository);
assert.equal(manifest.archiveSha256, archive);
assert.match(manifest.contentSha256, /^sha256:[a-f0-9]{64}$/);
assert.notEqual(run(generator, source, inventory, manifestPath).status, 0);
const secondManifestPath = join(source, "release-manifest-second.json");
result = run(
  generator,
  source,
  inventory,
  secondManifestPath,
  `--repository=${repository}`,
  `--release=${release}`,
  `--commit=${commit}`,
  `--archive=${archivePath}`,
);
assert.equal(result.status, 0);
assert.equal(readFileSync(secondManifestPath, "utf8"), readFileSync(manifestPath, "utf8"));

const legacyPath = join(source, "upstream.lock.json");
writeFileSync(legacyPath, `${JSON.stringify({
  schemaVersion: 1,
  release: manifest.release,
  commit: manifest.commit,
  archiveSha256: manifest.archiveSha256,
  contentSha256: manifest.contentSha256,
  files: manifest.files,
}, null, 2)}\n`);
const yamlPath = join(source, "upstream.lock.yaml");
result = run(
  migrator,
  legacyPath,
  yamlPath,
  `--manifest=${manifestPath}`,
  `--repository=${repository}`,
);
assert.equal(result.status, 0, result.stderr);
const yaml = readFileSync(yamlPath, "utf8");
const lock = parseUpstreamLockYaml(yaml);
assert.equal(lock.source.release, release);
assert.equal(lock.source.repository, repository);
assert.equal(lock.manifestSha256, sha256(manifestBytes));
assert.equal(serializeUpstreamLock(lock), yaml);
assert.equal(run(validator, yamlPath, source).status, 0);

writeFileSync(join(source, "HANDOFF.md"), "# drift\n");
result = run(validator, yamlPath, source);
assert.equal(result.status, 1);
assert.match(result.stderr, /locked target drift: HANDOFF\.md/);

const unsafeInventory = join(source, "unsafe-inventory.json");
writeFileSync(unsafeInventory, JSON.stringify({ schemaVersion: 1, files: [".env.production"] }));
result = run(
  generator,
  source,
  unsafeInventory,
  join(source, "unsafe-manifest.json"),
  `--repository=${repository}`,
  `--release=${release}`,
  `--commit=${commit}`,
  `--archive=${archivePath}`,
);
assert.equal(result.status, 1);
assert.match(result.stderr, /Unsafe inventory path/);

const tamperedLegacy = JSON.parse(readFileSync(legacyPath, "utf8"));
tamperedLegacy.release = "v0.0.0-tampered";
const tamperedPath = join(source, "tampered.lock.json");
writeFileSync(tamperedPath, JSON.stringify(tamperedLegacy));
result = run(
  migrator,
  tamperedPath,
  join(source, "tampered.yaml"),
  `--manifest=${manifestPath}`,
  `--repository=${repository}`,
);
assert.equal(result.status, 1);
assert.match(result.stderr, /differ: release/);

process.stdout.write("Canonical YAML lock schema, migration and release manifest generation Eval: PASS\n");
