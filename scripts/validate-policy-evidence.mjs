#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ID = {
  claim: /^CLAIM-[A-Z0-9_-]+$/u,
  flow: /^FLOW-[A-Z0-9_-]+$/u,
  enforcement: /^ENF-[A-Z0-9_-]+$/u,
  evidence: /^EVID-[A-Z0-9_-]+$/u,
};
const KINDS = new Set(["legal-applicability", "privacy", "retention", "disposal"]);
const LAYERS = new Set(["server", "database", "provider"]);
const EVIDENCE_KINDS = new Set(["negative-test", "provider-attestation", "independent-inspection"]);
const DISPOSAL_ASSERTIONS = new Set([
  "post-disposal-read-denied",
  "post-disposal-write-denied",
  "token-reuse-denied",
  "session-reuse-denied",
]);

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && !new Set(["TBD", "pending", "unknown"]).has(value);
}

function uniqueStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(text) && new Set(value).size === value.length;
}

function subset(values, allowed) {
  return values.every((value) => allowed.has(value));
}

function uniqueIds(items, pattern, label, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return new Map();
  }
  const map = new Map();
  for (const item of items) {
    if (!pattern.test(item?.id ?? "")) errors.push(`${label}: invalid ID ${item?.id ?? "unknown"}`);
    if (map.has(item?.id)) errors.push(`${label}: duplicate ID ${item?.id}`);
    map.set(item?.id, item);
  }
  return map;
}

function validateScope(scope, path, errors) {
  for (const field of ["services", "regions", "dataCategories"]) {
    if (!uniqueStrings(scope?.[field])) errors.push(`${path}.${field} must contain unique non-placeholder values`);
  }
}

function validateRefs(refs, target, path, errors) {
  if (!uniqueStrings(refs)) {
    errors.push(`${path} must contain unique references`);
    return;
  }
  for (const ref of refs) if (!target.has(ref)) errors.push(`${path} references missing ${ref}`);
}

export function validatePolicyEvidence(profile) {
  const errors = [];
  const blockers = [];
  if (profile?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  validateScope(profile?.scope, "scope", errors);
  const claims = uniqueIds(profile?.claims, ID.claim, "claims", errors);
  const flows = uniqueIds(profile?.dataFlows, ID.flow, "dataFlows", errors);
  const enforcements = uniqueIds(profile?.enforcements, ID.enforcement, "enforcements", errors);
  const evidence = uniqueIds(profile?.evidence, ID.evidence, "evidence", errors);
  const scopeServices = new Set(profile?.scope?.services ?? []);
  const scopeRegions = new Set(profile?.scope?.regions ?? []);
  const scopeCategories = new Set(profile?.scope?.dataCategories ?? []);

  for (const flow of flows.values()) {
    for (const field of ["source", "processingService", "region"]) {
      if (!text(flow?.[field])) errors.push(`${flow.id}.${field} is required`);
    }
    if (!uniqueStrings(flow?.dataCategories)) errors.push(`${flow.id}.dataCategories is required`);
    if (!uniqueStrings(flow?.destinations)) errors.push(`${flow.id}.destinations is required`);
    if (!scopeServices.has(flow.processingService)) errors.push(`${flow.id}.processingService is outside profile scope`);
    if (!scopeRegions.has(flow.region)) errors.push(`${flow.id}.region is outside profile scope`);
    if (!subset(flow.dataCategories ?? [], scopeCategories)) errors.push(`${flow.id}.dataCategories are outside profile scope`);
  }
  for (const enforcement of enforcements.values()) {
    if (!LAYERS.has(enforcement?.layer)) errors.push(`${enforcement.id}.layer must be server, database, or provider`);
    if (!text(enforcement?.mechanism)) errors.push(`${enforcement.id}.mechanism is required`);
    if (!text(enforcement?.sourceReference)) errors.push(`${enforcement.id}.sourceReference is required`);
  }
  for (const item of evidence.values()) {
    if (!EVIDENCE_KINDS.has(item?.kind)) errors.push(`${item.id}.kind is invalid`);
    for (const field of ["precondition", "action", "expectedFailure", "observedAt", "reference"]) {
      if (!text(item?.[field])) errors.push(`${item.id}.${field} is required and must be falsifiable`);
    }
    if (item?.result !== "PASS") errors.push(`${item.id}.result must be PASS`);
    validateRefs(item?.coversDataFlowRefs, flows, `${item.id}.coversDataFlowRefs`, errors);
    validateRefs(item?.coversEnforcementRefs, enforcements, `${item.id}.coversEnforcementRefs`, errors);
    if (!Array.isArray(item?.assertions) || !subset(item.assertions, DISPOSAL_ASSERTIONS)) {
      errors.push(`${item.id}.assertions contains an unsupported assertion`);
    }
  }

  for (const claim of claims.values()) {
    if (!KINDS.has(claim?.kind)) errors.push(`${claim.id}.kind is invalid`);
    if (!text(claim?.statement)) errors.push(`${claim.id}.statement is required`);
    validateScope(claim?.applicability, `${claim.id}.applicability`, errors);
    if (!subset(claim?.applicability?.services ?? [], scopeServices)) errors.push(`${claim.id}.applicability.services are outside scope`);
    if (!subset(claim?.applicability?.regions ?? [], scopeRegions)) errors.push(`${claim.id}.applicability.regions are outside scope`);
    if (!subset(claim?.applicability?.dataCategories ?? [], scopeCategories)) errors.push(`${claim.id}.applicability.dataCategories are outside scope`);
    const approval = claim?.ownerApproval;
    for (const field of ["role", "approvalReference", "reviewedAt", "validUntil"]) {
      if (!text(approval?.[field])) blockers.push(`${claim.id}.ownerApproval.${field}`);
    }
    if (text(approval?.reviewedAt) && text(approval?.validUntil) && approval.validUntil < approval.reviewedAt) {
      errors.push(`${claim.id}.ownerApproval.validUntil precedes reviewedAt`);
    }
    validateRefs(claim?.dataFlowRefs, flows, `${claim.id}.dataFlowRefs`, errors);
    validateRefs(claim?.enforcementRefs, enforcements, `${claim.id}.enforcementRefs`, errors);
    validateRefs(claim?.evidenceRefs, evidence, `${claim.id}.evidenceRefs`, errors);
    const referencedEvidence = (claim?.evidenceRefs ?? []).map((id) => evidence.get(id)).filter(Boolean);
    for (const ref of claim?.dataFlowRefs ?? []) {
      const flow = flows.get(ref);
      if (!flow) continue;
      if (!(claim.applicability?.services ?? []).includes(flow.processingService)) {
        errors.push(`${claim.id}: data flow ${ref} processing service differs from claim applicability`);
      }
      if (!(claim.applicability?.regions ?? []).includes(flow.region)) {
        errors.push(`${claim.id}: data flow ${ref} region differs from claim applicability`);
      }
      if (!subset(flow.dataCategories ?? [], new Set(claim.applicability?.dataCategories ?? []))) {
        errors.push(`${claim.id}: data flow ${ref} categories differ from claim applicability`);
      }
    }
    for (const ref of claim?.dataFlowRefs ?? []) {
      if (!referencedEvidence.some((item) => item.coversDataFlowRefs?.includes(ref))) errors.push(`${claim.id}: data flow ${ref} lacks claim evidence`);
    }
    for (const ref of claim?.enforcementRefs ?? []) {
      if (!referencedEvidence.some((item) => item.coversEnforcementRefs?.includes(ref))) errors.push(`${claim.id}: enforcement ${ref} lacks claim evidence`);
    }
    if (claim?.kind === "disposal") {
      const contract = claim?.disposalContract;
      if (!Number.isInteger(contract?.maxRevocationDelaySeconds) || contract.maxRevocationDelaySeconds < 0) {
        errors.push(`${claim.id}.disposalContract.maxRevocationDelaySeconds is required`);
      }
      if (!Array.isArray(contract?.requiredAssertions) || !subset([...DISPOSAL_ASSERTIONS], new Set(contract.requiredAssertions))) {
        errors.push(`${claim.id}.disposalContract must require read, write, token and session denial`);
      }
      const proven = new Set(referencedEvidence.flatMap((item) => item.assertions ?? []));
      if (!subset(contract?.requiredAssertions ?? [], proven)) errors.push(`${claim.id}: disposal assertions lack evidence`);
    } else if (claim?.disposalContract !== null) {
      errors.push(`${claim.id}.disposalContract must be null for non-disposal claims`);
    }
  }
  return {
    errors,
    blockers: [...new Set(blockers)],
    valid: errors.length === 0 && blockers.length === 0,
    legalConclusion: "NOT_EVALUATED",
    productionApprovalGranted: false,
  };
}

function main() {
  const path = process.argv[2];
  const expectation = process.argv[3];
  if (!path || !new Set(["--expect-valid", "--expect-invalid"]).has(expectation)) {
    process.stderr.write("Usage: validate-policy-evidence.mjs PROFILE (--expect-valid|--expect-invalid)\n");
    process.exit(2);
  }
  const result = validatePolicyEvidence(JSON.parse(readFileSync(resolve(path), "utf8")));
  const matched = expectation === "--expect-valid" ? result.valid : !result.valid;
  if (!matched) {
    process.stderr.write(`${[...result.errors, ...result.blockers].join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`Policy evidence: ${result.valid ? "VALID" : "INVALID"}; legal=NOT_EVALUATED; production=NOT_GRANTED\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
