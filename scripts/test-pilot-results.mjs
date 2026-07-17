#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregatePilotResults,
  validatePilotCampaign,
  validatePilotResult,
} from "./pilot-results.mjs";

const fixtureRoot = resolve("evals/fixtures/distributed-pilot");
const campaignPath = resolve(fixtureRoot, "campaign.synthetic.json");
const alphaPath = resolve(fixtureRoot, "result-alpha.pass.json");
const betaPath = resolve(fixtureRoot, "result-beta.pass.json");
const campaign = JSON.parse(readFileSync(campaignPath, "utf8"));
const alpha = JSON.parse(readFileSync(alphaPath, "utf8"));
const beta = JSON.parse(readFileSync(betaPath, "utf8"));

assert.equal(validatePilotCampaign(campaign).valid, true);
assert.deepEqual(validatePilotResult(alpha, campaign), {
  errors: [],
  valid: true,
  computedStatus: "PASS",
  compatibilityEligible: true,
});
assert.equal(validatePilotResult(beta, campaign).valid, true);

const complete = aggregatePilotResults(campaign, [alpha, beta]);
const recordedAggregate = JSON.parse(
  readFileSync(resolve("evals/baselines/distributed-pilot-synthetic-aggregate.json"), "utf8"),
);
assert.deepEqual(complete, recordedAggregate);
assert.equal(complete.status, "SYNTHETIC_COMPLETE");
assert.equal(complete.supportDecisionEligible, false);
assert.equal(complete.compatibilityEligible, true);
assert.equal(complete.independentPassingTesters, 2);
assert.deepEqual(complete.counts, {
  assignments: 2,
  submitted: 2,
  pass: 2,
  incomplete: 0,
  invalid: 0,
});

const missing = aggregatePilotResults(campaign, [alpha]);
assert.equal(missing.status, "INCOMPLETE");
assert.equal(missing.counts.incomplete, 1);
assert.equal(missing.matrix.find((entry) => entry.pilotId === "SYN-BE-001").status, "MISSING");

const failed = structuredClone(beta);
failed.outcomes.find((outcome) => outcome.gate === "local-security").status = "FAIL";
failed.reportedStatus = "FAIL";
assert.equal(validatePilotResult(failed, campaign).valid, true);
assert.equal(aggregatePilotResults(campaign, [alpha, failed]).status, "INCOMPLETE");

const falsePass = structuredClone(failed);
falsePass.reportedStatus = "PASS";
assert.match(validatePilotResult(falsePass, campaign).errors.join("\n"), /does not match computed FAIL/);

const missingEvidence = structuredClone(alpha);
missingEvidence.outcomes[0].evidenceReferences = [];
assert.match(validatePilotResult(missingEvidence, campaign).errors.join("\n"), /requires evidence/);

const invalidEvidenceHash = structuredClone(alpha);
invalidEvidenceHash.outcomes[0].evidenceReferences[0].sha256 = "sha256:invalid";
assert.match(validatePilotResult(invalidEvidenceHash, campaign).errors.join("\n"), /sha256 must be SHA-256/);

const graderTamper = structuredClone(alpha);
graderTamper.attestation.graderAssetsModified = true;
assert.match(validatePilotResult(graderTamper, campaign).errors.join("\n"), /graderAssetsModified must be false/);

const priorResultAccess = structuredClone(alpha);
priorResultAccess.attestation.previousTesterResultsAccessed = true;
assert.match(validatePilotResult(priorResultAccess, campaign).errors.join("\n"), /previousTesterResultsAccessed must be false/);

const unregisteredReviewer = structuredClone(alpha);
unregisteredReviewer.review.reviewerId = "unregistered-reviewer";
assert.match(validatePilotResult(unregisteredReviewer, campaign).errors.join("\n"), /registered reviewer participant/);

const unverified = structuredClone(beta);
unverified.unverified = ["synthetic deploy provider"];
unverified.reportedStatus = "NOT-RUN";
assert.equal(validatePilotResult(unverified, campaign).valid, true);
assert.equal(aggregatePilotResults(campaign, [alpha, unverified]).status, "INCOMPLETE");

const upstreamDrift = structuredClone(alpha);
upstreamDrift.upstream.commitSha = "3333333333333333333333333333333333333333";
assert.match(validatePilotResult(upstreamDrift, campaign).errors.join("\n"), /does not exactly match campaign/);

const reusedWorkspace = structuredClone(beta);
reusedWorkspace.downstream.workspaceId = alpha.downstream.workspaceId;
const isolationViolation = aggregatePilotResults(campaign, [alpha, reusedWorkspace]);
assert.equal(isolationViolation.status, "INVALID");
assert.match(isolationViolation.errors.join("\n"), /workspaceId is reused/);

const duplicatePilot = structuredClone(alpha);
const duplicate = aggregatePilotResults(campaign, [alpha, duplicatePilot]);
assert.equal(duplicate.status, "INVALID");
assert.match(duplicate.errors.join("\n"), /same pilotId/);

const undisclosed = structuredClone(beta);
undisclosed.aiProvenance.evidenceLevel = "undisclosed";
assert.equal(validatePilotResult(undisclosed, campaign).valid, true);
const undisclosedAggregate = aggregatePilotResults(campaign, [alpha, undisclosed]);
assert.equal(undisclosedAggregate.status, "SYNTHETIC_COMPLETE");
assert.equal(undisclosedAggregate.compatibilityEligible, false);
assert.equal(undisclosedAggregate.supportDecisionEligible, false);

const withdrawn = structuredClone(campaign);
withdrawn.participants[1].status = "withdrawn";
withdrawn.participants[1].withdrawalReason = "TBD";
assert.match(validatePilotCampaign(withdrawn).errors.join("\n"), /requires withdrawalReason/);

const validateCli = spawnSync(
  process.execPath,
  [resolve("scripts/validate-pilot-result.mjs"), alphaPath, campaignPath],
  { encoding: "utf8" },
);
assert.equal(validateCli.status, 0);
assert.match(validateCli.stdout, /SYN-FE-001: PASS/);

const aggregateCli = spawnSync(
  process.execPath,
  [
    resolve("scripts/aggregate-pilot-results.mjs"),
    campaignPath,
    alphaPath,
    betaPath,
    "--expect-synthetic-complete",
  ],
  { encoding: "utf8" },
);
assert.equal(aggregateCli.status, 0);
assert.equal(JSON.parse(aggregateCli.stdout).status, "SYNTHETIC_COMPLETE");

const incompleteCli = spawnSync(
  process.execPath,
  [
    resolve("scripts/aggregate-pilot-results.mjs"),
    campaignPath,
    alphaPath,
    "--expect-complete",
  ],
  { encoding: "utf8" },
);
assert.equal(incompleteCli.status, 1);

process.stdout.write("REQ-046 multi-tester result schema, validator and aggregation Eval: PASS\n");
