#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  feedbackTraceabilityProjection,
  validateDownstreamFeedbackTriage,
} from "./validate-downstream-feedback-triage.mjs";

const document = JSON.parse(readFileSync(".ai/manifests/downstream-feedback-triage.json", "utf8"));
const traceability = JSON.parse(readFileSync(".ai/manifests/requirement-traceability.json", "utf8"));
const validate = (candidate) => validateDownstreamFeedbackTriage(candidate, { traceability }).join("\n");

assert.equal(validate(document), "");

const projectLeak = structuredClone(document);
projectLeak.findings[0].projectName = "private-project";
assert.match(validate(projectLeak), /project-specific or sensitive field is forbidden/);

const sourceLeak = structuredClone(document);
sourceLeak.findings[0].sourceExcerpt = "untrusted downstream text";
assert.match(validate(sourceLeak), /project-specific or sensitive field is forbidden/);

const generalizedPathLeak = structuredClone(document);
generalizedPathLeak.findings[0].generalizedCause = "공통 원인은 /private/project/source 경로에서 발생한다";
assert.match(validate(generalizedPathLeak), /must not contain URLs, local paths or secret-file names/);

const duplicateChain = structuredClone(document);
duplicateChain.findings[2].duplicateOf = "UF-002";
assert.match(validate(duplicateChain), /duplicateOf chains are forbidden/);

const duplicateScopeDrift = structuredClone(document);
duplicateScopeDrift.findings[1].primaryRequirementId = "REQ-050";
assert.match(validate(duplicateScopeDrift), /duplicate must share primary REQ/);

const taskCollapse = structuredClone(document);
taskCollapse.findings[0].revalidationTaskId = taskCollapse.findings[0].implementationTaskId;
assert.match(validate(taskCollapse), /implementation and revalidation tasks must be separate/);

const movingBaseline = structuredClone(document);
movingBaseline.releaseBaseline.release = "latest";
assert.match(validate(movingBaseline), /releaseBaseline.release must be pinned/);

const missingChecksum = structuredClone(document);
missingChecksum.releaseBaseline.archiveSha256 = "not-published";
assert.match(validate(missingChecksum), /releaseBaseline.archiveSha256 must be SHA-256/);

const falseResolution = structuredClone(document);
falseResolution.findings[0].status = "resolved";
assert.match(validate(falseResolution), /status must remain triaged until downstream revalidation/);

const traceabilityDrift = structuredClone(document);
traceabilityDrift.findings.at(-1).primaryRequirementId = "REQ-049";
assert.match(validate(traceabilityDrift), /primary REQ differs from traceability/);

const missingFinding = structuredClone(document);
missingFinding.findings.pop();
assert.match(validate(missingFinding), /UF-013: traceability finding is missing from triage/);

const fixture = mkdtempSync(join(tmpdir(), "downstream-feedback-triage-"));
for (const path of [
  ".ai/manifests/downstream-feedback-triage.json",
  ".ai/manifests/requirement-traceability.json",
  "docs/downstream-feedback-requirement-triage.md",
  "scripts/validate-downstream-feedback-triage.mjs",
]) {
  const target = join(fixture, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
}
const git = (...args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
const run = (...args) => spawnSync(process.execPath, ["scripts/validate-downstream-feedback-triage.mjs", ...args], {
  cwd: fixture,
  encoding: "utf8",
});
git("init", "-q");
git("add", ".");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
const base = git("rev-parse", "HEAD").trim();
const traceabilityPath = join(fixture, ".ai/manifests/requirement-traceability.json");
const releaseOnly = structuredClone(traceability);
releaseOnly.releaseBaseline = "v0.2.9-pilot-rc";
assert.deepEqual(
  feedbackTraceabilityProjection(releaseOnly),
  feedbackTraceabilityProjection(traceability),
);
writeFileSync(traceabilityPath, `${JSON.stringify(releaseOnly, null, 2)}\n`);
git("add", ".ai/manifests/requirement-traceability.json");
assert.equal(run("staged").status, 0);
writeFileSync(traceabilityPath, `${JSON.stringify(traceability, null, 2)}\n`);
git("add", ".ai/manifests/requirement-traceability.json");

const feedbackScopeChange = structuredClone(traceability);
feedbackScopeChange.feedbackPrimaryMappings[0].primaryRequirementId = "REQ-050";
writeFileSync(traceabilityPath, `${JSON.stringify(feedbackScopeChange, null, 2)}\n`);
git("add", ".ai/manifests/requirement-traceability.json");
assert.match(run("staged").stderr, /triage source changed without/);
writeFileSync(traceabilityPath, `${JSON.stringify(traceability, null, 2)}\n`);
git("add", ".ai/manifests/requirement-traceability.json");

const triagePath = join(fixture, "docs/downstream-feedback-requirement-triage.md");
writeFileSync(triagePath, `${readFileSync(triagePath, "utf8")}\n`);
git("add", "docs/downstream-feedback-requirement-triage.md");
assert.match(run("staged").stderr, /triage source changed without/);
const manifestPath = join(fixture, ".ai/manifests/downstream-feedback-triage.json");
writeFileSync(manifestPath, `${JSON.stringify(document, null, 2)}\n`);
git("add", ".ai/manifests/downstream-feedback-triage.json");
assert.equal(run("staged").status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "synchronized");
assert.equal(run("range", base).status, 0);

process.stdout.write("Downstream feedback triage schema, sanitization and traceability Eval: PASS\n");
