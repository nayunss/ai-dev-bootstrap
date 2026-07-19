#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  handoffTraceabilityProjection,
  requiresManifestChange,
  validateTraceability,
} from "./validate-requirement-traceability.mjs";

const manifest = JSON.parse(readFileSync(".ai/manifests/requirement-traceability.json", "utf8"));
assert.deepEqual(validateTraceability(manifest), []);

const missing = structuredClone(manifest);
missing.requirementStates[0].requirementIds.shift();
assert.match(validateTraceability(missing).join("\n"), /missing requirement state: REQ-001/);

const duplicate = structuredClone(manifest);
duplicate.requirementStates[1].requirementIds.push("REQ-001");
assert.match(validateTraceability(duplicate).join("\n"), /duplicate requirement state: REQ-001/);

const statusDrift = structuredClone(manifest);
statusDrift.requirementStates[0].verificationStatus = "부분 검증";
assert.match(validateTraceability(statusDrift).join("\n"), /REQ-001: manifest implementation\/verification status differs/);

const unsafe = structuredClone(manifest);
unsafe.sources.requirements = ".env.example";
assert.match(validateTraceability(unsafe).join("\n"), /unsafe source path requirements/);

const invalidReleaseBaseline = structuredClone(manifest);
invalidReleaseBaseline.releaseBaseline = "latest";
assert.match(validateTraceability(invalidReleaseBaseline).join("\n"), /releaseBaseline must be an exact pilot/);

const taskClassDrift = structuredClone(manifest);
taskClassDrift.implementationTasks.find((task) => task.taskId === "REQ-047-one-click-adoption").status = "pending";
assert.match(validateTraceability(taskClassDrift).join("\n"), /implementationTasks task is absent from matching HANDOFF section/);

const invalidTaskRequirement = structuredClone(manifest);
invalidTaskRequirement.externalTasks[0].requirementIds = ["REQ-999"];
assert.match(validateTraceability(invalidTaskRequirement).join("\n"), /invalid requirementIds/);

const implementationFeedbackScopeDrift = structuredClone(manifest);
implementationFeedbackScopeDrift.implementationTasks
  .find((task) => task.taskId === "REQ-052-fullstack-locale-contract").feedbackIds = [];
assert.match(validateTraceability(implementationFeedbackScopeDrift).join("\n"), /feedback scope differs from feedback triage/);

const externalFeedbackScopeDrift = structuredClone(manifest);
externalFeedbackScopeDrift.externalTasks.at(-1).feedbackIds.pop();
assert.match(validateTraceability(externalFeedbackScopeDrift).join("\n"), /external feedback scope differs from HANDOFF/);

const missingFeedback = structuredClone(manifest);
missingFeedback.feedbackPrimaryMappings.pop();
assert.match(validateTraceability(missingFeedback).join("\n"), /missing feedback primary mapping: UF-013/);

const feedbackDrift = structuredClone(manifest);
feedbackDrift.feedbackPrimaryMappings[0].primaryRequirementId = "REQ-050";
assert.match(validateTraceability(feedbackDrift).join("\n"), /UF-001: primary requirement differs from feedback triage/);

assert.equal(requiresManifestChange(["docs/requirements.md"]), true);
assert.equal(requiresManifestChange(["docs/downstream-feedback-requirement-triage.md"]), true);
assert.equal(requiresManifestChange(["HANDOFF.md"]), true);
assert.equal(requiresManifestChange(["README.md"]), false);

const fixture = mkdtempSync(join(tmpdir(), "requirement-traceability-"));
for (const path of [
  ".ai/manifests/requirement-traceability.json",
  "scripts/validate-requirement-traceability.mjs",
  "docs/requirements.md",
  "docs/downstream-feedback-requirement-triage.md",
  ".ai/manifests/downstream-feedback-triage.json",
  "HANDOFF.md",
]) {
  const target = join(fixture, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
}
const git = (...args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
const validate = (...args) => spawnSync(process.execPath, ["scripts/validate-requirement-traceability.mjs", ...args], {
  cwd: fixture,
  encoding: "utf8",
});
git("init", "-q");
git("add", ".");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
const base = git("rev-parse", "HEAD").trim();
const originalHandoff = readFileSync("HANDOFF.md", "utf8");
writeFileSync(join(fixture, "HANDOFF.md"), `${originalHandoff}\n검증 증거 설명만 추가\n`);
git("add", "HANDOFF.md");
assert.equal(validate("staged").status, 0);
assert.deepEqual(
  handoffTraceabilityProjection(`${originalHandoff}\n검증 증거 설명만 추가\n`),
  handoffTraceabilityProjection(originalHandoff),
);
writeFileSync(
  join(fixture, "HANDOFF.md"),
  originalHandoff.replace(
    "### 공통 저장소에서 진행 가능",
    "### 공통 저장소에서 진행 가능\n\n1. [작업:REQ-047-new-reference] [공통 구현] REQ-047 추가 작업",
  ),
);
git("add", "HANDOFF.md");
assert.match(validate("staged").stderr, /traceability source changed without/);
writeFileSync(join(fixture, "HANDOFF.md"), originalHandoff);
git("add", "HANDOFF.md");
writeFileSync(
  join(fixture, ".ai/manifests/requirement-traceability.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
git("add", ".ai/manifests/requirement-traceability.json");
assert.equal(validate("staged").status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "synchronized");
assert.equal(validate("range", base).status, 0);

process.stdout.write("REQ-001–REQ-053 requirement status, task and UF traceability Eval: PASS\n");
