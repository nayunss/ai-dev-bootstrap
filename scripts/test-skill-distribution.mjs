#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runSkillDistribution, validateSkillDistribution } from "./skill-distribution.mjs";

const release = (version) => resolve(`evals/fixtures/skill-distribution/releases/${version}`);
const manifest = (version) => JSON.parse(readFileSync(join(release(version), "manifest.json"), "utf8"));
const target = (name) => mkdtempSync(join(tmpdir(), `skill-distribution-${name}-`));

const v1 = manifest("v1");
const v2 = manifest("v2");
assert.equal(validateSkillDistribution(v1, release("v1")).valid, true);
assert.equal(validateSkillDistribution(v2, release("v2")).valid, true);

const coreOnly = target("core-only");
let result = runSkillDistribution("preview", v1, release("v1"), coreOnly);
assert.equal(result.status, "PREVIEW");
assert.equal(result.plan.every((item) => item.skillId === "requirements"), true);
assert.equal(existsSync(join(coreOnly, ".ai/skills/requirements/SKILL.md")), false);
result = runSkillDistribution("apply", v1, release("v1"), coreOnly);
assert.equal(result.status, "APPROVAL_REQUIRED");
result = runSkillDistribution("apply", v1, release("v1"), coreOnly, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(existsSync(join(coreOnly, ".ai/skills/requirements/SKILL.md")), true);
assert.equal(existsSync(join(coreOnly, ".ai/skills/frontend/SKILL.md")), false);
assert.equal(existsSync(join(coreOnly, ".plugins/synthetic-review-plugin")), false);
assert.equal(runSkillDistribution("validate", v1, release("v1"), coreOnly).status, "PASS");
assert.equal(runSkillDistribution("uninstall", v1, release("v1"), coreOnly, { approved: true }).status, "PASS");
assert.equal(existsSync(join(coreOnly, ".ai/skills/requirements/SKILL.md")), false);

const combined = target("combined");
const selection = { approved: true, optional: ["frontend"], adapters: ["codex", "claude-code", "github-copilot"] };
result = runSkillDistribution("apply", v1, release("v1"), combined, selection);
assert.equal(result.status, "PASS");
for (const root of [".ai/skills", ".codex/skills", ".claude/skills", ".github/skills"]) {
  assert.equal(existsSync(join(combined, root, "requirements/SKILL.md")), true);
  assert.equal(existsSync(join(combined, root, "frontend/SKILL.md")), true);
}
const combinedLock = JSON.parse(readFileSync(join(combined, ".ai/manifests/skills.lock.json"), "utf8"));
assert.deepEqual(combinedLock.skillIds, ["frontend", "requirements"]);
assert.deepEqual(combinedLock.adapterIds, ["claude-code", "codex", "github-copilot"]);
assert.equal(combinedLock.pluginExecution, "NOT_RUN");
assert.deepEqual(combinedLock.reviewedPluginIds, ["synthetic-review-plugin"]);
assert.equal(runSkillDistribution("validate", v1, release("v1"), combined, selection).status, "PASS");

result = runSkillDistribution("upgrade", v2, release("v2"), combined, selection);
assert.equal(result.status, "PASS");
assert.match(readFileSync(join(combined, ".ai/skills/requirements/SKILL.md"), "utf8"), /Reject completion claims/);
assert.equal(existsSync(join(combined, ".ai/manifests/skills.rollback.json")), true);
assert.equal(runSkillDistribution("validate", v2, release("v2"), combined, selection).status, "PASS");
result = runSkillDistribution("rollback", v2, release("v2"), combined, { ...selection, approved: false });
assert.equal(result.status, "APPROVAL_REQUIRED");
result = runSkillDistribution("rollback", v2, release("v2"), combined, { ...selection, approved: true });
assert.equal(result.status, "PASS");
assert.doesNotMatch(readFileSync(join(combined, ".ai/skills/requirements/SKILL.md"), "utf8"), /Reject completion claims/);
assert.equal(runSkillDistribution("validate", v1, release("v1"), combined, selection).status, "PASS");

writeFileSync(join(combined, ".codex/skills/frontend/SKILL.md"), "# user customization\n");
result = runSkillDistribution("uninstall", v1, release("v1"), combined, { approved: true });
assert.equal(result.status, "PASS");
assert.deepEqual(result.preservedDrifted, [".codex/skills/frontend/SKILL.md"]);
assert.equal(readFileSync(join(combined, ".codex/skills/frontend/SKILL.md"), "utf8"), "# user customization\n");
assert.equal(existsSync(join(combined, ".ai/manifests/skills.lock.json")), false);

const identical = target("identical");
const existing = readFileSync(join(release("v1"), "core/requirements/SKILL.md"));
mkdirSync(join(identical, ".ai/skills/requirements"), { recursive: true });
writeFileSync(join(identical, ".ai/skills/requirements/SKILL.md"), existing);
result = runSkillDistribution("apply", v1, release("v1"), identical, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(JSON.parse(readFileSync(join(identical, ".ai/manifests/skills.lock.json"), "utf8")).files[0].managed, false);
assert.equal(runSkillDistribution("uninstall", v1, release("v1"), identical, { approved: true }).status, "PASS");
assert.equal(existsSync(join(identical, ".ai/skills/requirements/SKILL.md")), true);

const collision = target("collision");
mkdirSync(join(collision, ".ai/skills/requirements"), { recursive: true });
writeFileSync(join(collision, ".ai/skills/requirements/SKILL.md"), "# owner file\n");
result = runSkillDistribution("apply", v1, release("v1"), collision, { approved: true, adapters: ["codex"] });
assert.equal(result.status, "BLOCKED");
assert.equal(existsSync(join(collision, ".codex/skills/requirements/SKILL.md")), false);
assert.equal(existsSync(join(collision, ".ai/manifests/skills.lock.json")), false);

const hashDrift = structuredClone(v1);
hashDrift.core[0].files[0].sha256 = `sha256:${"1".repeat(64)}`;
assert.match(validateSkillDistribution(hashDrift, release("v1")).errors.join("\n"), /file hash drift/);

const frontmatterMismatch = structuredClone(v1);
frontmatterMismatch.core[0].id = "wrong-requirements";
assert.match(validateSkillDistribution(frontmatterMismatch, release("v1")).errors.join("\n"), /invalid SKILL\.md frontmatter/);

const cycle = structuredClone(v1);
cycle.optional[0].dependencies = [{ id: "frontend", version: "1.0.0" }];
assert.match(validateSkillDistribution(cycle, release("v1")).errors.join("\n"), /dependency cycle/);

const incompatible = structuredClone(v1);
incompatible.optional[0].dependencies[0].version = "9.9.9";
assert.match(validateSkillDistribution(incompatible, release("v1")).errors.join("\n"), /incompatible dependency/);

const executablePlugin = structuredClone(v1);
executablePlugin.reviewedPlugins[0].installApproved = true;
assert.match(validateSkillDistribution(executablePlugin, release("v1")).errors.join("\n"), /plugin catalog must remain non-executable/);

const adapterDrift = structuredClone(v1);
adapterDrift.toolAdapters[0].targetRoot = ".codex/other";
assert.match(validateSkillDistribution(adapterDrift, release("v1")).errors.join("\n"), /tool adapter hash drift/);

const partial = target("partial");
let writes = 0;
const failingIo = {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync(path, bytes) {
    writes += 1;
    if (writes === 2) throw new Error("synthetic second write failure");
    writeFileSync(path, bytes);
  },
};
result = runSkillDistribution("apply", v1, release("v1"), partial, { approved: true, adapters: ["codex"], io: failingIo });
assert.equal(result.status, "FAIL");
assert.equal(existsSync(join(partial, ".ai/skills/requirements/SKILL.md")), false);
assert.equal(existsSync(join(partial, ".codex/skills/requirements/SKILL.md")), false);
assert.equal(existsSync(join(partial, ".ai/manifests/skills.lock.json")), false);

process.stdout.write("REQ-005–REQ-008 core/optional skill bundle, adapter, catalog, upgrade and preservation Eval: PASS\n");
