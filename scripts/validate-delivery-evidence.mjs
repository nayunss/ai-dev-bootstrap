#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STAGES = [
  "created",
  "pushed",
  "ci-triggered",
  "ci-passed",
  "deployed",
  "healthy",
  "behavior-verified",
  "production-approved",
];
const STATUSES = new Set(["PASS", "FAIL", "BLOCKED", "NOT-RUN"]);
const EXPECTED_EVIDENCE = new Map([
  ["created", "commit-record"],
  ["pushed", "remote-receipt"],
  ["ci-triggered", "ci-run"],
  ["ci-passed", "ci-conclusion"],
  ["deployed", "deployment-record"],
  ["healthy", "health-assertion"],
  ["behavior-verified", "behavior-assertion"],
  ["production-approved", "human-approval"],
]);

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && !new Set(["TBD", "pending", "unknown"]).has(value);
}

export function validateDeliveryEvidence(document) {
  const errors = [];
  if (document?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^DELIVERY-[A-Z0-9_-]+$/u.test(document?.deliveryId ?? "")) errors.push("deliveryId is invalid");
  if (!text(document?.deliveryRef)) errors.push("deliveryRef is required");
  if (!Array.isArray(document?.states) || document.states.length !== STAGES.length) {
    return { errors: [...errors, "states must contain exactly eight stages"], valid: false, decision: "EVIDENCE_INVALID" };
  }
  const actualStages = document.states.map((state) => state?.stage);
  if (actualStages.join(",") !== STAGES.join(",")) errors.push("states must be complete, unique and ordered");
  let previousPassTime = null;
  for (let index = 0; index < document.states.length; index += 1) {
    const state = document.states[index];
    const prefix = state?.stage ?? `states[${index}]`;
    if (!STATUSES.has(state?.status)) errors.push(`${prefix}.status is invalid`);
    if (!Array.isArray(state?.evidence)) errors.push(`${prefix}.evidence must be an array`);
    const evidence = Array.isArray(state?.evidence) ? state.evidence : [];
    if (state?.status === "PASS") {
      if (index > 0 && document.states[index - 1]?.status !== "PASS") {
        errors.push(`${prefix} cannot PASS before ${STAGES[index - 1]} PASS`);
      }
      if (evidence.length === 0) errors.push(`${prefix} PASS requires evidence`);
      if (!evidence.some((item) => item?.kind === EXPECTED_EVIDENCE.get(state.stage))) {
        errors.push(`${prefix} PASS requires ${EXPECTED_EVIDENCE.get(state.stage)} evidence`);
      }
    } else if (state?.status === "FAIL") {
      if (!evidence.some((item) => item?.kind === "failure-record")) errors.push(`${prefix} FAIL requires failure-record evidence`);
    } else if (evidence.length > 0) {
      errors.push(`${prefix} ${state.status} must not claim evidence`);
    }
    if (state?.status === "BLOCKED" && !text(state?.blockedReason)) errors.push(`${prefix} BLOCKED requires blockedReason`);
    if (state?.status !== "BLOCKED" && state?.blockedReason !== null) errors.push(`${prefix}.blockedReason must be null`);
    for (const item of evidence) {
      for (const field of ["reference", "observedAt", "scope", "deliveryRef"]) {
        if (!text(item?.[field])) errors.push(`${prefix}.evidence.${field} is required`);
      }
      if (item?.deliveryRef !== document.deliveryRef) errors.push(`${prefix}.evidence deliveryRef differs`);
      if (state.status === "PASS" && previousPassTime && item.observedAt < previousPassTime) {
        errors.push(`${prefix}.evidence time precedes prior PASS`);
      }
    }
    if (state.status === "PASS" && evidence.length > 0) {
      previousPassTime = evidence.map((item) => item.observedAt).sort().at(-1);
    }
    if (state.stage === "behavior-verified" && state.status === "PASS") {
      for (const field of ["precondition", "input", "negativePath", "cleanup"]) {
        if (!text(state?.behavior?.[field])) errors.push(`${prefix}.behavior.${field} is required`);
      }
      if (!Array.isArray(state?.behavior?.assertions) || state.behavior.assertions.length === 0) {
        errors.push(`${prefix}.behavior.assertions is required`);
      }
    } else if (state?.behavior !== null) {
      errors.push(`${prefix}.behavior must be null unless behavior-verified PASS`);
    }
    if (state.stage === "production-approved" && state.status === "PASS") {
      if (state?.approval?.humanAttestation !== true) errors.push(`${prefix}.approval requires humanAttestation`);
      for (const field of ["reviewerRole", "reviewerId", "approvalReference", "approvedAt"]) {
        if (!text(state?.approval?.[field])) errors.push(`${prefix}.approval.${field} is required`);
      }
    } else if (state?.approval !== null) {
      errors.push(`${prefix}.approval must be null unless production-approved PASS`);
    }
  }
  return {
    errors,
    valid: errors.length === 0,
    decision: errors.length === 0 ? "EVIDENCE_VALID_ONLY" : "EVIDENCE_INVALID",
  };
}

function main() {
  const path = process.argv[2];
  const expectation = process.argv[3];
  if (!path || !new Set(["--expect-valid", "--expect-invalid"]).has(expectation)) {
    process.stderr.write("Usage: validate-delivery-evidence.mjs PROFILE (--expect-valid|--expect-invalid)\n");
    process.exit(2);
  }
  const result = validateDeliveryEvidence(JSON.parse(readFileSync(resolve(path), "utf8")));
  const matched = expectation === "--expect-valid" ? result.valid : !result.valid;
  if (!matched) {
    result.errors.forEach((error) => process.stderr.write(`FAIL: ${error}\n`));
    process.exit(1);
  }
  process.stdout.write(`Delivery evidence: ${result.valid ? "VALID" : "INVALID"}; decision=${result.decision}\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
