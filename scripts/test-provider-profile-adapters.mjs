#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateProviderProfile } from "./provider-profile-adapters.mjs";

const read = (name) => JSON.parse(readFileSync(`evals/fixtures/provider-profiles/${name}.json`, "utf8"));
for (const name of ["github", "gitlab", "generic", "none"]) {
  const result = validateProviderProfile(read(name));
  assert.equal(result.valid, true, `${name}: ${JSON.stringify(result.blockers)}`);
  assert.equal(result.supportLevel, "SYNTHETIC_CONTRACT_ONLY");
  assert.deepEqual(result.externalActions, {
    providerWrite: "NOT_RUN",
    credentialUse: "NOT_RUN",
    push: "NOT_RUN",
    policyChange: "NOT_RUN",
    deployment: "NOT_RUN",
  });
}

const adapterMismatch = read("github");
adapterMismatch.hosting.provider = "gitlab";
assert.match(validateProviderProfile(adapterMismatch).blockers.map((item) => item.code).join("\n"), /PROVIDER_ADAPTER_MISMATCH/);

const embeddedCredential = read("github");
embeddedCredential.hosting.fetchUrl = "https://user:password@github.com/example/repo.git";
assert.match(validateProviderProfile(embeddedCredential).blockers.map((item) => item.code).join("\n"), /PROVIDER_URL_CREDENTIAL/);

const broadPermission = read("github");
broadPermission.ci.permissions.push("write-all");
assert.match(validateProviderProfile(broadPermission).blockers.map((item) => item.code).join("\n"), /PROVIDER_CI_PERMISSION/);

const missingOutcome = read("gitlab");
missingOutcome.ci.requiredOutcomes = missingOutcome.ci.requiredOutcomes.filter((item) => item !== "fail-closed");
assert.match(validateProviderProfile(missingOutcome).blockers.map((item) => item.code).join("\n"), /PROVIDER_CI_OUTCOME_MISSING/);

const falseReview = read("github");
const security = falseReview.branchReview.riskPolicies.find((item) => item.risk === "security");
security.requiredRoles = ["maintainer"];
security.selfReview = true;
assert.match(validateProviderProfile(falseReview).blockers.map((item) => item.code).join("\n"), /PROVIDER_HIGH_RISK_REVIEW/);

const emergency = read("gitlab");
emergency.branchReview.emergency.rollbackRef = null;
assert.match(validateProviderProfile(emergency).blockers.map((item) => item.code).join("\n"), /PROVIDER_EMERGENCY_INCOMPLETE/);

const artifact = read("github");
artifact.artifacts.retentionDays = 0;
assert.match(validateProviderProfile(artifact).blockers.map((item) => item.code).join("\n"), /PROVIDER_ARTIFACT_EVIDENCE/);

const production = read("github");
production.deployments[0].promotion = "automatic-preview";
assert.match(validateProviderProfile(production).blockers.map((item) => item.code).join("\n"), /PROVIDER_PRODUCTION_PROMOTION/);

const noneIntegration = read("none");
noneIntegration.hosting.host = "github.com";
assert.match(validateProviderProfile(noneIntegration).blockers.map((item) => item.code).join("\n"), /PROVIDER_NONE_INTEGRATION/);

const genericExpansion = read("generic");
genericExpansion.adapter.capabilities.push("change-request-preview");
assert.match(validateProviderProfile(genericExpansion).blockers.map((item) => item.code).join("\n"), /PROVIDER_GENERIC_UNSUPPORTED/);

const secretField = read("github");
secretField.ci.apiToken = "forbidden";
assert.match(validateProviderProfile(secretField).blockers.map((item) => item.code).join("\n"), /PROVIDER_SECRET_FIELD/);

process.stdout.write("REQ-033–REQ-035 GitHub, GitLab, generic and none provider profile adapter fixtures: PASS\n");
