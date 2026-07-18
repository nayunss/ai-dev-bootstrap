#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePolicyEvidence } from "./validate-policy-evidence.mjs";

const valid = JSON.parse(readFileSync("evals/fixtures/policy-evidence/valid.json", "utf8"));
const clientOnly = JSON.parse(readFileSync("evals/fixtures/policy-evidence/client-only.json", "utf8"));
const evaluate = (profile) => validatePolicyEvidence(profile);

const accepted = evaluate(valid);
assert.deepEqual(accepted.errors, []);
assert.deepEqual(accepted.blockers, []);
assert.equal(accepted.valid, true);
assert.equal(accepted.legalConclusion, "NOT_EVALUATED");
assert.equal(accepted.productionApprovalGranted, false);

assert.match(evaluate(clientOnly).errors.join("\n"), /layer must be server, database, or provider/);

const missingOwner = structuredClone(valid);
missingOwner.claims[0].ownerApproval.role = "TBD";
assert.equal(evaluate(missingOwner).valid, false);
assert.match(evaluate(missingOwner).blockers.join("\n"), /ownerApproval.role/);

const regionDrift = structuredClone(valid);
regionDrift.dataFlows[0].region = "different-region";
assert.match(evaluate(regionDrift).errors.join("\n"), /region is outside profile scope/);

const serviceDrift = structuredClone(valid);
serviceDrift.dataFlows[0].processingService = "different-service";
assert.match(evaluate(serviceDrift).errors.join("\n"), /processingService is outside profile scope/);

const claimRegionDrift = structuredClone(valid);
claimRegionDrift.scope.regions.push("synthetic-region-2");
claimRegionDrift.claims[0].applicability.regions = ["synthetic-region-2"];
assert.match(evaluate(claimRegionDrift).errors.join("\n"), /region differs from claim applicability/);

const missingFlowLink = structuredClone(valid);
missingFlowLink.claims[0].dataFlowRefs = ["FLOW-MISSING"];
assert.match(evaluate(missingFlowLink).errors.join("\n"), /references missing FLOW-MISSING/);

const missingEnforcementEvidence = structuredClone(valid);
missingEnforcementEvidence.evidence[0].coversEnforcementRefs = ["ENF-MISSING"];
assert.match(evaluate(missingEnforcementEvidence).errors.join("\n"), /enforcement ENF-ACCOUNT-DISPOSAL lacks claim evidence/);

const vagueEvidence = structuredClone(valid);
vagueEvidence.evidence[0].expectedFailure = "TBD";
assert.match(evaluate(vagueEvidence).errors.join("\n"), /expectedFailure is required and must be falsifiable/);

const failedEvidence = structuredClone(valid);
failedEvidence.evidence[0].result = "FAIL";
assert.match(evaluate(failedEvidence).errors.join("\n"), /result must be PASS/);

const missingDisposalAssertion = structuredClone(valid);
missingDisposalAssertion.evidence[0].assertions.pop();
assert.match(evaluate(missingDisposalAssertion).errors.join("\n"), /disposal assertions lack evidence/);

const missingRevocationBound = structuredClone(valid);
delete missingRevocationBound.claims[0].disposalContract.maxRevocationDelaySeconds;
assert.match(evaluate(missingRevocationBound).errors.join("\n"), /maxRevocationDelaySeconds is required/);

const expiredApproval = structuredClone(valid);
expiredApproval.claims[0].ownerApproval.validUntil = "2025-01-01";
assert.match(evaluate(expiredApproval).errors.join("\n"), /validUntil precedes reviewedAt/);

process.stdout.write("REQ-049 policy claim, enforcement, data-flow and falsifiable evidence Eval: PASS\n");
