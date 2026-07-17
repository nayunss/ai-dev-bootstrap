#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateProductionReadiness } from "./validate-production-readiness.mjs";

const template = JSON.parse(readFileSync(resolve("docs/templates/production-readiness.json"), "utf8"));
const blocked = validateProductionReadiness(template);
assert.equal(blocked.errors.length, 0);
assert.equal(blocked.ready, false);
for (const requiredBlocker of [
  "onboardingDecisions.legalPrivacyReview",
  "onboardingDecisions.retentionDisposalPolicy",
  "onboardingDecisions.multiInstanceRateLimit",
  "onboardingDecisions.productionProviderRestore",
  "onboardingDecisions.multiInstanceRateLimit.instanceCount",
  "onboardingDecisions.productionProviderRestore.rpoObservedMinutes",
  "productionApproval",
]) {
  assert.ok(blocked.blockers.includes(requiredBlocker), `missing blocker: ${requiredBlocker}`);
}

function evidence(reference) {
  return {
    reference,
    reviewer: "synthetic-fixture-reviewer",
    reviewedAt: "2026-07-17",
  };
}

const ready = structuredClone(template);
ready.reviewedAt = "2026-07-17";
ready.scope = "synthetic Production gate fixture";
ready.onboardingDecisions.legalPrivacyReview = {
  status: "approved",
  owner: "synthetic-legal-owner",
  decisionDue: "before-production",
  evidence: evidence("fixture://legal-review"),
};
ready.onboardingDecisions.retentionDisposalPolicy = {
  status: "approved",
  owner: "synthetic-retention-owner",
  decisionDue: "before-production",
  evidence: evidence("fixture://retention-policy"),
  dataCategories: [{
    category: "synthetic account",
    purpose: "fixture authentication",
    retentionPeriod: "fixture lifetime",
    disposal: "delete fixture storage",
    legalHold: "not-applicable-to-synthetic-data",
    owner: "synthetic-retention-owner",
    status: "approved",
    decisionDue: "before-production",
    evidence: evidence("fixture://retention-account"),
  }],
};
ready.onboardingDecisions.multiInstanceRateLimit = {
  status: "approved",
  owner: "synthetic-platform-owner",
  decisionDue: "before-production",
  deploymentMode: "multi-instance",
  strategy: "shared synthetic atomic counter",
  enforcementLayer: "synthetic gateway",
  instanceCount: 2,
  distributedBypassTest: {
    status: "passed",
    testedAt: "2026-07-17T00:00:00Z",
    evidenceReference: "fixture://distributed-rate-limit",
  },
  evidence: evidence("fixture://rate-limit-review"),
};
ready.onboardingDecisions.productionProviderRestore = {
  status: "approved",
  owner: "synthetic-recovery-owner",
  decisionDue: "before-production",
  provider: "synthetic-provider",
  backupSource: "fixture-production-backup",
  restoreTarget: "fixture-isolated-restore",
  isolationBoundary: "separate synthetic account and region",
  rehearsalAt: "2026-07-17T00:00:00Z",
  rpoTargetMinutes: 60,
  rpoObservedMinutes: 30,
  rtoTargetMinutes: 120,
  rtoObservedMinutes: 45,
  integrityCheck: "passed",
  evidence: evidence("fixture://provider-restore"),
};
ready.productionApproval = {
  status: "approved",
  approver: "synthetic-production-approver",
  approvedAt: "2026-07-17T00:00:00Z",
  evidenceReference: "fixture://production-approval",
};
ready.productionDecision = "approved";
ready.decisionReason = "synthetic evidence satisfies every hard gate";
assert.equal(validateProductionReadiness(ready).ready, true);

const falseApproval = structuredClone(template);
falseApproval.productionDecision = "approved";
assert.match(validateProductionReadiness(falseApproval).errors.join("\n"), /must have productionDecision blocked/);

const missingHumanApproval = structuredClone(ready);
missingHumanApproval.productionApproval = structuredClone(template.productionApproval);
missingHumanApproval.productionDecision = "blocked";
assert.equal(validateProductionReadiness(missingHumanApproval).ready, false);

const legacyApproval = structuredClone(ready);
legacyApproval.schemaVersion = 1;
assert.match(validateProductionReadiness(legacyApproval).errors.join("\n"), /schemaVersion must be 2/);

const missingLegalOwner = structuredClone(ready);
missingLegalOwner.onboardingDecisions.legalPrivacyReview.owner = "";
assert.match(validateProductionReadiness(missingLegalOwner).errors.join("\n"), /owner is required/);

const missingLegalEvidence = structuredClone(ready);
missingLegalEvidence.onboardingDecisions.legalPrivacyReview.evidence.reference = "TBD";
missingLegalEvidence.productionDecision = "blocked";
assert.equal(validateProductionReadiness(missingLegalEvidence).ready, false);

const missingRetentionEvidence = structuredClone(ready);
missingRetentionEvidence.onboardingDecisions.retentionDisposalPolicy.dataCategories[0].evidence.reference = "TBD";
missingRetentionEvidence.productionDecision = "blocked";
assert.equal(validateProductionReadiness(missingRetentionEvidence).ready, false);

const singleInstance = structuredClone(ready);
singleInstance.onboardingDecisions.multiInstanceRateLimit.deploymentMode = "single-instance";
assert.match(validateProductionReadiness(singleInstance).errors.join("\n"), /must be multi-instance/);

const oneInstance = structuredClone(ready);
oneInstance.onboardingDecisions.multiInstanceRateLimit.instanceCount = 1;
assert.match(validateProductionReadiness(oneInstance).errors.join("\n"), /at least 2/);

const bypassFailed = structuredClone(ready);
bypassFailed.onboardingDecisions.multiInstanceRateLimit.distributedBypassTest.status = "failed";
bypassFailed.productionDecision = "blocked";
assert.equal(validateProductionReadiness(bypassFailed).ready, false);

const sameRestoreTarget = structuredClone(ready);
sameRestoreTarget.onboardingDecisions.productionProviderRestore.restoreTarget =
  sameRestoreTarget.onboardingDecisions.productionProviderRestore.backupSource;
assert.match(validateProductionReadiness(sameRestoreTarget).errors.join("\n"), /must differ from backupSource/);

const restoreIntegrityFailed = structuredClone(ready);
restoreIntegrityFailed.onboardingDecisions.productionProviderRestore.integrityCheck = "failed";
assert.match(validateProductionReadiness(restoreIntegrityFailed).errors.join("\n"), /must be passed/);

const rpoMissed = structuredClone(ready);
rpoMissed.onboardingDecisions.productionProviderRestore.rpoObservedMinutes = 61;
assert.match(validateProductionReadiness(rpoMissed).errors.join("\n"), /rpoObservedMinutes exceeds target/);

const rtoMissed = structuredClone(ready);
rtoMissed.onboardingDecisions.productionProviderRestore.rtoObservedMinutes = 121;
assert.match(validateProductionReadiness(rtoMissed).errors.join("\n"), /rtoObservedMinutes exceeds target/);

process.stdout.write("Production readiness evidence hard-gate positive and negative fixtures: PASS\n");
