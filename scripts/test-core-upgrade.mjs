#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { applyFileTransaction } from "./upgrade-core.mjs";

const root = process.cwd();
const materializer = join(root, "scripts/materialize-core.mjs");
const upgrader = join(root, "scripts/upgrade-core.mjs");
const recordValidator = join(root, "scripts/validate-core-upgrade-record.mjs");
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function release(name, commit, entries) {
  const source = mkdtempSync(join(tmpdir(), `upgrade-${name}-`));
  for (const [path, value] of Object.entries(entries)) {
    mkdirSync(dirname(join(source, path)), { recursive: true });
    writeFileSync(join(source, path), value);
  }
  const files = Object.keys(entries).sort().map((path) => ({ path, sha256: digest(readFileSync(join(source, path))) }));
  const manifest = {
    schemaVersion: 1,
    repository: "https://example.invalid/upstream.git",
    release: name,
    commit,
    archiveSha256: digest(`${name} archive`),
    contentSha256: digest(files.map((file) => `${file.path}\0${file.sha256}\n`).join("")),
    files,
  };
  const manifestPath = join(source, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { source, manifestPath, entries };
}

const oldRelease = release("v1.0.0", "a".repeat(40), {
  "shared.md": "shared old\n",
  "removed.md": "removed old\n",
  "same.md": "same\n",
});
const nextRelease = release("v2.0.0", "b".repeat(40), {
  "shared.md": "shared new\n",
  "created.md": "created new\n",
  "same.md": "same\n",
  "preexisting.md": "preexisting identical\n",
});
const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
const args = (mode, target, approval) => [
  mode,
  target,
  oldRelease.manifestPath,
  oldRelease.source,
  nextRelease.manifestPath,
  nextRelease.source,
  ...(approval ? ["--approve"] : []),
];

const target = mkdtempSync(join(tmpdir(), "upgrade-target-"));
assert.equal(run(materializer, "apply", target, oldRelease.manifestPath, oldRelease.source, "--approve").status, 0);
writeFileSync(join(target, "preexisting.md"), "preexisting identical\n");
let result = run(upgrader, ...args("preview", target));
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /update: shared\.md/);
assert.match(result.stdout, /delete: removed\.md/);
assert.match(result.stdout, /create: created\.md/);
assert.match(result.stdout, /preserve-preexisting-identical: preexisting\.md/);
assert.equal(readFileSync(join(target, "shared.md"), "utf8"), "shared old\n");
assert.equal(run(upgrader, ...args("apply", target)).status, 2);
assert.equal(run(upgrader, ...args("apply", target, true)).status, 0);
assert.equal(readFileSync(join(target, "shared.md"), "utf8"), "shared new\n");
assert.equal(existsSync(join(target, "removed.md")), false);
assert.equal(existsSync(join(target, ".ai/manifests/upstream-upgrade.rollback.json")), true);
assert.equal(run(materializer, "validate", target, nextRelease.manifestPath, nextRelease.source).status, 0);
assert.equal(run(recordValidator, target).status, 0);

const recordPath = join(target, ".ai/manifests/upstream-upgrade.rollback.json");
const validRecord = readFileSync(recordPath);
const tamperedRecord = JSON.parse(validRecord);
tamperedRecord.operations.find((operation) => operation.path === "preexisting.md").action = "create";
writeFileSync(recordPath, `${JSON.stringify(tamperedRecord, null, 2)}\n`);
result = run(upgrader, ...args("rollback", target, true));
assert.equal(result.status, 1);
assert.match(result.stderr, /integrity drift/);
assert.notEqual(run(recordValidator, target).status, 0);
assert.equal(readFileSync(join(target, "preexisting.md"), "utf8"), "preexisting identical\n");
writeFileSync(recordPath, validRecord);

result = run(upgrader, ...args("rollback", target));
assert.equal(result.status, 2);
assert.equal(run(upgrader, ...args("rollback", target, true)).status, 0);
assert.equal(readFileSync(join(target, "shared.md"), "utf8"), "shared old\n");
assert.equal(readFileSync(join(target, "removed.md"), "utf8"), "removed old\n");
assert.equal(existsSync(join(target, "created.md")), false);
assert.equal(readFileSync(join(target, "preexisting.md"), "utf8"), "preexisting identical\n");
assert.equal(run(materializer, "validate", target, oldRelease.manifestPath, oldRelease.source).status, 0);

const finalizeTarget = mkdtempSync(join(tmpdir(), "upgrade-finalize-"));
assert.equal(run(materializer, "apply", finalizeTarget, oldRelease.manifestPath, oldRelease.source, "--approve").status, 0);
assert.equal(run(upgrader, ...args("apply", finalizeTarget, true)).status, 0);
assert.equal(run(upgrader, ...args("finalize", finalizeTarget)).status, 2);
assert.equal(run(upgrader, ...args("finalize", finalizeTarget, true)).status, 0);
assert.equal(existsSync(join(finalizeTarget, ".ai/manifests/upstream-upgrade.rollback.json")), false);

const collision = mkdtempSync(join(tmpdir(), "upgrade-collision-"));
assert.equal(run(materializer, "apply", collision, oldRelease.manifestPath, oldRelease.source, "--approve").status, 0);
writeFileSync(join(collision, "created.md"), "downstream owner\n");
result = run(upgrader, ...args("apply", collision, true));
assert.equal(result.status, 1);
assert.match(result.stderr, /collides with a downstream-owned file/);
assert.equal(readFileSync(join(collision, "shared.md"), "utf8"), "shared old\n");

const drift = mkdtempSync(join(tmpdir(), "upgrade-drift-"));
assert.equal(run(materializer, "apply", drift, oldRelease.manifestPath, oldRelease.source, "--approve").status, 0);
writeFileSync(join(drift, "shared.md"), "downstream drift\n");
result = run(upgrader, ...args("preview", drift));
assert.equal(result.status, 1);
assert.match(result.stderr, /locked target drift/);

const sourceDrift = mkdtempSync(join(tmpdir(), "upgrade-source-drift-"));
assert.equal(run(materializer, "apply", sourceDrift, oldRelease.manifestPath, oldRelease.source, "--approve").status, 0);
writeFileSync(join(nextRelease.source, "shared.md"), "tampered release source\n");
result = run(upgrader, ...args("preview", sourceDrift));
assert.equal(result.status, 1);
assert.match(result.stderr, /Release source hash drift/);
writeFileSync(join(nextRelease.source, "shared.md"), "shared new\n");

const transactionTarget = mkdtempSync(join(tmpdir(), "upgrade-transaction-"));
const first = join(transactionTarget, "first");
const second = join(transactionTarget, "second");
writeFileSync(first, "before\n");
let writes = 0;
assert.throws(() => applyFileTransaction([
  { kind: "write", path: first, bytes: Buffer.from("after\n") },
  { kind: "write", path: second, bytes: Buffer.from("new\n") },
], {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync: (path, bytes) => {
    writes += 1;
    if (writes === 2) throw new Error("fixture write failure");
    writeFileSync(path, bytes);
  },
}), /was restored/);
assert.equal(readFileSync(first, "utf8"), "before\n");
assert.equal(existsSync(second), false);

process.stdout.write("Release core upgrade, migration, rollback and transaction failure Eval: PASS\n");
