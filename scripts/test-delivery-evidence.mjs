#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateDeliveryEvidence } from "./validate-delivery-evidence.mjs";

const valid = JSON.parse(readFileSync("evals/fixtures/delivery-evidence/behavior-verified.json", "utf8"));
const evaluate = (document) => validateDeliveryEvidence(document);
assert.deepEqual(evaluate(valid), { errors: [], valid: true, decision: "EVIDENCE_VALID_ONLY" });

const approvedRecord = structuredClone(valid);
approvedRecord.states[7] = {
  stage: "production-approved",
  status: "PASS",
  blockedReason: null,
  evidence: [{
    kind: "human-approval",
    reference: "fixture://approval/human-reviewed",
    observedAt: "2026-07-18T00:07:00Z",
    scope: "synthetic approval record",
    deliveryRef: valid.deliveryRef,
  }],
  behavior: null,
  approval: {
    humanAttestation: true,
    reviewerRole: "synthetic-release-reviewer",
    reviewerId: "fixture-reviewer-1",
    approvalReference: "fixture://approval/human-reviewed",
    approvedAt: "2026-07-18T00:07:00Z",
  },
};
assert.deepEqual(evaluate(approvedRecord), { errors: [], valid: true, decision: "EVIDENCE_VALID_ONLY" });

const pushAsCi = structuredClone(valid);
pushAsCi.states[2].evidence[0].kind = "remote-receipt";
assert.match(evaluate(pushAsCi).errors.join("\n"), /ci-triggered PASS requires ci-run evidence/);

const deployAsBehavior = structuredClone(valid);
deployAsBehavior.states[6].evidence[0].kind = "health-assertion";
assert.match(evaluate(deployAsBehavior).errors.join("\n"), /behavior-verified PASS requires behavior-assertion evidence/);

const skippedCi = structuredClone(valid);
skippedCi.states[2].status = "NOT-RUN";
skippedCi.states[2].evidence = [];
assert.match(evaluate(skippedCi).errors.join("\n"), /ci-passed cannot PASS before ci-triggered PASS/);

const wrongRef = structuredClone(valid);
wrongRef.states[4].evidence[0].deliveryRef = "commit:different";
assert.match(evaluate(wrongRef).errors.join("\n"), /evidence deliveryRef differs/);

const reverseTime = structuredClone(valid);
reverseTime.states[5].evidence[0].observedAt = "2026-07-17T00:00:00Z";
assert.match(evaluate(reverseTime).errors.join("\n"), /evidence time precedes prior PASS/);

const missingNegativePath = structuredClone(valid);
missingNegativePath.states[6].behavior.negativePath = "TBD";
assert.match(evaluate(missingNegativePath).errors.join("\n"), /behavior.negativePath is required/);

const autoProduction = structuredClone(valid);
autoProduction.states[7].status = "PASS";
autoProduction.states[7].evidence = [{
  kind: "human-approval",
  reference: "fixture://approval/1",
  observedAt: "2026-07-18T00:07:00Z",
  scope: "synthetic production",
  deliveryRef: valid.deliveryRef,
}];
assert.match(evaluate(autoProduction).errors.join("\n"), /approval requires humanAttestation/);

const blockedWithoutReason = structuredClone(valid);
blockedWithoutReason.states[7].status = "BLOCKED";
assert.match(evaluate(blockedWithoutReason).errors.join("\n"), /BLOCKED requires blockedReason/);

process.stdout.write("REQ-051 provider-neutral delivery state and evidence separation Eval: PASS\n");
