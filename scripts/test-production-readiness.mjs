#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateProductionReadiness } from "./validate-production-readiness.mjs";

const template = JSON.parse(readFileSync(resolve("docs/templates/production-readiness.json"), "utf8"));
const blocked = validateProductionReadiness(template);
assert.equal(blocked.errors.length, 0);
assert.equal(blocked.ready, false);
assert.deepEqual(blocked.blockers, [
  "reviewedAt",
  "scope",
  "onboardingDecisions.legalPrivacyReview",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].category",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].purpose",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].retentionPeriod",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].disposal",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].legalHold",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].owner",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].status",
  "onboardingDecisions.retentionDisposalPolicy.dataCategories[0].evidence",
  "onboardingDecisions.retentionDisposalPolicy",
  "onboardingDecisions.multiInstanceRateLimit",
]);

const ready = structuredClone(template);
ready.reviewedAt = "2026-07-14";
ready.scope = "synthetic onboarding fixture";
for (const decision of Object.values(ready.onboardingDecisions)) {
  decision.status = "approved";
  decision.owner = "fixture-owner";
  decision.evidence = "synthetic reviewed evidence";
}
ready.onboardingDecisions.multiInstanceRateLimit.strategy = "shared synthetic limiter";
ready.onboardingDecisions.retentionDisposalPolicy.dataCategories = [
  {
    category: "synthetic account",
    purpose: "fixture authentication",
    retentionPeriod: "fixture lifetime",
    disposal: "delete fixture storage",
    legalHold: "not-applicable",
    owner: "fixture-owner",
    status: "approved",
    decisionDue: "before-production",
    evidence: "synthetic reviewed evidence",
  },
];
ready.productionDecision = "approved";
ready.decisionReason = "synthetic decisions are resolved";
assert.equal(validateProductionReadiness(ready).ready, true);

const falseApproval = structuredClone(template);
falseApproval.productionDecision = "approved";
assert.match(validateProductionReadiness(falseApproval).errors.join("\n"), /must have productionDecision blocked/);

const missingOwner = structuredClone(ready);
missingOwner.onboardingDecisions.legalPrivacyReview.owner = "";
assert.match(validateProductionReadiness(missingOwner).errors.join("\n"), /owner is required/);

const missingStrategy = structuredClone(ready);
missingStrategy.onboardingDecisions.multiInstanceRateLimit.strategy = "TBD";
assert.match(validateProductionReadiness(missingStrategy).errors.join("\n"), /cannot be resolved/);

const missingDisposal = structuredClone(ready);
missingDisposal.onboardingDecisions.retentionDisposalPolicy.dataCategories[0].disposal = "";
assert.match(validateProductionReadiness(missingDisposal).errors.join("\n"), /disposal is required/);

process.stdout.write("Production readiness onboarding positive and negative fixtures: PASS\n");
