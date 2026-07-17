#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const manager = join(root, "scripts", "manage-adapters.mjs");
const sourceRoot = join(root, "adapters");

function fixture(name) {
  const target = mkdtempSync(join(tmpdir(), `adapter-${name}-`));
  mkdirSync(join(target, ".ai/manifests"), { recursive: true });
  return target;
}

function run(target, ...args) {
  return spawnSync(process.execPath, [manager, ...args, `--source-root=${sourceRoot}`], {
    cwd: root,
    encoding: "utf8",
  });
}

const previewTarget = fixture("preview");
let result = run(previewTarget, "preview", previewTarget, "codex");
assert.equal(result.status, 0);
assert.match(result.stdout, /create: AGENTS\.md/);
assert.equal(existsSync(join(previewTarget, "AGENTS.md")), false);
assert.equal(existsSync(join(previewTarget, ".ai/manifests/adapters.lock.json")), false);

const selectedTarget = fixture("selected");
result = run(selectedTarget, "apply", selectedTarget, "codex", "--approve");
assert.equal(result.status, 0);
assert.equal(existsSync(join(selectedTarget, "AGENTS.md")), true);
assert.equal(existsSync(join(selectedTarget, ".codex/hooks.json")), true);
assert.equal(existsSync(join(selectedTarget, "CLAUDE.md")), false);
const lock = JSON.parse(readFileSync(join(selectedTarget, ".ai/manifests/adapters.lock.json"), "utf8"));
assert.equal(lock.generatorVersion, "1.0.0");
assert.deepEqual(lock.adapters.map((adapter) => adapter.name), ["codex"]);
assert.match(lock.adapters[0].sourceHash, /^sha256:[a-f0-9]{64}$/);
assert.equal(lock.adapters[0].files.every((file) => /^sha256:[a-f0-9]{64}$/.test(file.targetSha256)), true);
assert.equal(run(selectedTarget, "validate", selectedTarget).status, 0);

writeFileSync(join(selectedTarget, "AGENTS.md"), "# user customization\n");
result = run(selectedTarget, "validate", selectedTarget);
assert.equal(result.status, 1);
assert.match(result.stderr, /target drift: AGENTS\.md/);
result = run(selectedTarget, "uninstall", selectedTarget, "codex");
assert.equal(result.status, 2);
assert.equal(readFileSync(join(selectedTarget, "AGENTS.md"), "utf8"), "# user customization\n");
result = run(selectedTarget, "uninstall", selectedTarget, "codex", "--approve");
assert.equal(result.status, 0);
assert.equal(readFileSync(join(selectedTarget, "AGENTS.md"), "utf8"), "# user customization\n");
assert.equal(existsSync(join(selectedTarget, ".codex/hooks.json")), false);
assert.deepEqual(JSON.parse(readFileSync(join(selectedTarget, ".ai/manifests/adapters.lock.json"), "utf8")).adapters, []);

const collisionTarget = fixture("collision");
writeFileSync(join(collisionTarget, "AGENTS.md"), "# existing owner file\n");
result = run(collisionTarget, "apply", collisionTarget, "codex", "--approve");
assert.equal(result.status, 1);
assert.match(result.stderr, /existing files differ/);
assert.equal(readFileSync(join(collisionTarget, "AGENTS.md"), "utf8"), "# existing owner file\n");
assert.equal(existsSync(join(collisionTarget, ".codex/hooks.json")), false);

const identicalTarget = fixture("identical");
cpSync(join(sourceRoot, "claude-code/files/CLAUDE.md"), join(identicalTarget, "CLAUDE.md"));
result = run(identicalTarget, "apply", identicalTarget, "claude-code", "--approve");
assert.equal(result.status, 0);
const identicalLock = JSON.parse(readFileSync(join(identicalTarget, ".ai/manifests/adapters.lock.json"), "utf8"));
assert.equal(identicalLock.adapters[0].files.find((file) => file.path === "CLAUDE.md").managed, false);
result = run(identicalTarget, "uninstall", identicalTarget, "claude-code", "--approve");
assert.equal(result.status, 0);
assert.equal(existsSync(join(identicalTarget, "CLAUDE.md")), true);
assert.equal(existsSync(join(identicalTarget, ".claude/settings.json")), false);

const sourceDriftTarget = fixture("source-drift");
const copiedSources = mkdtempSync(join(tmpdir(), "adapter-sources-"));
cpSync(sourceRoot, copiedSources, { recursive: true });
result = spawnSync(process.execPath, [manager, "apply", sourceDriftTarget, "codex", "--approve", `--source-root=${copiedSources}`], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(result.status, 0);
writeFileSync(join(copiedSources, "codex/files/AGENTS.md"), "# changed generator source\n");
result = spawnSync(process.execPath, [manager, "validate", sourceDriftTarget, `--source-root=${copiedSources}`], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(result.status, 1);
assert.match(result.stderr, /source drift: codex/);

console.log("Adapter manager preview/hash/drift/uninstall Eval: PASS");
