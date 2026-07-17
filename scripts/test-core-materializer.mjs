#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const runner = join(root, "scripts/materialize-core.mjs");
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const source = mkdtempSync(join(tmpdir(), "core-source-"));
mkdirSync(join(source, ".ai/standards"), { recursive: true });
writeFileSync(join(source, ".ai/standards/engineering.md"), "# pinned engineering\n");
writeFileSync(join(source, "HANDOFF.md"), "# pinned handoff\n");
const files = [".ai/standards/engineering.md", "HANDOFF.md"].map((path) => ({
  path,
  sha256: sha256(readFileSync(join(source, path))),
}));
const manifest = {
  schemaVersion: 1,
  repository: "https://example.invalid/upstream.git",
  release: "v9.9.9-fixture",
  commit: "a".repeat(40),
  archiveSha256: sha256("fixture archive"),
  contentSha256: sha256(files.map(({ path, sha256: digest }) => `${path}\0${digest}\n`).sort().join("")),
  files,
};
const manifestPath = join(source, "manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const target = mkdtempSync(join(tmpdir(), "core-target-"));
const run = (...args) => spawnSync(process.execPath, [runner, ...args], { cwd: root, encoding: "utf8" });

let result = run("preview", target, manifestPath, source);
assert.equal(result.status, 0);
assert.match(result.stdout, /create: HANDOFF\.md/);
assert.equal(existsSync(join(target, "HANDOFF.md")), false);
assert.equal(run("apply", target, manifestPath, source).status, 2);
assert.equal(run("apply", target, manifestPath, source, "--approve").status, 0);
assert.equal(existsSync(join(target, ".ai/manifests/upstream.lock.yaml")), true);
assert.equal(existsSync(join(target, ".ai/manifests/upstream.lock.json")), false);
assert.equal(run("validate", target, manifestPath, source).status, 0);

writeFileSync(join(target, "HANDOFF.md"), "# downstream drift\n");
result = run("validate", target, manifestPath, source);
assert.equal(result.status, 1);
assert.match(result.stderr, /locked target drift: HANDOFF\.md/);

const collision = mkdtempSync(join(tmpdir(), "core-collision-"));
writeFileSync(join(collision, "HANDOFF.md"), "# existing owner file\n");
result = run("apply", collision, manifestPath, source, "--approve");
assert.equal(result.status, 1);
assert.equal(readFileSync(join(collision, "HANDOFF.md"), "utf8"), "# existing owner file\n");
assert.equal(existsSync(join(collision, ".ai/standards/engineering.md")), false);

writeFileSync(join(source, "HANDOFF.md"), "# source drift\n");
result = run("preview", mkdtempSync(join(tmpdir(), "core-drift-")), manifestPath, source);
assert.equal(result.status, 1);
assert.match(result.stderr, /Release source hash drift/);

process.stdout.write("Release-level core materializer preview/hash/collision/drift Eval: PASS\n");
