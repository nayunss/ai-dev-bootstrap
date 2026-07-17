#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DECISIONS = [
  "legalPrivacyReview",
  "retentionDisposalPolicy",
  "multiInstanceRateLimit",
  "productionProviderRestore",
];
const STATUSES = new Set(["approved", "not-applicable", "TBD"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/u;

export function validateProductionReadiness(profile) {
  const errors = [];
  const blockers = [];
  if (profile?.schemaVersion !== 2) {
    errors.push("schemaVersion must be 2; migrate the profile without overwriting its existing decisions");
  }
  for (const field of ["reviewedAt", "scope", "decisionReason"]) {
    requireText(profile, field, errors);
    blockTbd(profile?.[field], field, blockers);
  }

  for (const name of DECISIONS) {
    const prefix = `onboardingDecisions.${name}`;
    const decision = profile?.onboardingDecisions?.[name];
    if (!decision || !STATUSES.has(decision.status)) {
      errors.push(`${prefix}.status must be approved, not-applicable, or TBD`);
      blockers.push(prefix);
      continue;
    }
    for (const field of ["owner", "decisionDue"]) {
      requireText(decision, field, errors, prefix);
      blockTbd(decision[field], `${prefix}.${field}`, blockers);
    }
    validateEvidence(decision.evidence, `${prefix}.evidence`, errors, blockers);
    if (decision.status !== "approved") blockers.push(prefix);

    if (name === "retentionDisposalPolicy") {
      validateDataCategories(decision.dataCategories, errors, blockers);
    }
    if (name === "multiInstanceRateLimit") {
      validateMultiInstance(decision, prefix, errors, blockers);
    }
    if (name === "productionProviderRestore") {
      validateProviderRestore(decision, prefix, errors, blockers);
    }
  }

  const approval = profile?.productionApproval;
  if (!approval || !new Set(["approved", "pending"]).has(approval.status)) {
    errors.push("productionApproval.status must be approved or pending");
    blockers.push("productionApproval");
  } else {
    if (approval.status !== "approved") blockers.push("productionApproval");
    for (const field of ["approver", "evidenceReference"]) {
      requireText(approval, field, errors, "productionApproval");
      blockTbd(approval[field], `productionApproval.${field}`, blockers);
    }
    requireText(approval, "approvedAt", errors, "productionApproval");
    validateDate(approval.approvedAt, "productionApproval.approvedAt", errors, blockers);
  }

  if (!new Set(["approved", "blocked"]).has(profile?.productionDecision)) {
    errors.push("productionDecision must be approved or blocked");
  }
  const unresolved = errors.length > 0 || blockers.length > 0;
  if (!unresolved && profile.productionDecision !== "approved") {
    errors.push("ready profile must have productionDecision approved");
  }
  if (unresolved && profile?.productionDecision !== "blocked") {
    errors.push("unresolved profile must have productionDecision blocked");
  }
  return {
    errors,
    blockers: [...new Set(blockers)],
    ready: errors.length === 0 && blockers.length === 0,
  };
}

function requireText(object, field, errors, prefix = "") {
  if (typeof object?.[field] !== "string" || object[field].trim().length === 0) {
    errors.push(`${prefix ? `${prefix}.` : ""}${field} is required`);
  }
}

function blockTbd(value, path, blockers) {
  if (value === "TBD" || value === null || value === undefined) blockers.push(path);
}

function validateDate(value, path, errors, blockers) {
  blockTbd(value, path, blockers);
  if (value !== "TBD" && typeof value === "string" && !ISO_DATE.test(value)) {
    errors.push(`${path} must be an ISO date or UTC timestamp`);
  }
}

function validateEvidence(evidence, prefix, errors, blockers) {
  for (const field of ["reference", "reviewer", "reviewedAt"]) {
    requireText(evidence, field, errors, prefix);
    if (field === "reviewedAt") validateDate(evidence?.[field], `${prefix}.${field}`, errors, blockers);
    else blockTbd(evidence?.[field], `${prefix}.${field}`, blockers);
  }
}

function validateDataCategories(categories, errors, blockers) {
  const root = "onboardingDecisions.retentionDisposalPolicy.dataCategories";
  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push(`${root} requires at least one entry`);
    blockers.push(root);
    return;
  }
  categories.forEach((category, index) => {
    const prefix = `${root}[${index}]`;
    for (const field of [
      "category",
      "purpose",
      "retentionPeriod",
      "disposal",
      "legalHold",
      "owner",
      "decisionDue",
    ]) {
      requireText(category, field, errors, prefix);
      blockTbd(category?.[field], `${prefix}.${field}`, blockers);
    }
    if (!STATUSES.has(category?.status)) errors.push(`${prefix}.status must be approved, not-applicable, or TBD`);
    if (category?.status !== "approved") blockers.push(`${prefix}.status`);
    validateEvidence(category?.evidence, `${prefix}.evidence`, errors, blockers);
  });
}

function validateMultiInstance(decision, prefix, errors, blockers) {
  for (const field of ["deploymentMode", "strategy", "enforcementLayer"]) {
    requireText(decision, field, errors, prefix);
    blockTbd(decision?.[field], `${prefix}.${field}`, blockers);
  }
  if (decision.status === "approved" && decision.deploymentMode !== "multi-instance") {
    errors.push(`${prefix}.deploymentMode must be multi-instance for approval`);
  }
  if (!Number.isInteger(decision.instanceCount) || decision.instanceCount < 2) {
    blockers.push(`${prefix}.instanceCount`);
    if (decision.instanceCount !== null) errors.push(`${prefix}.instanceCount must be an integer of at least 2`);
  }
  const bypass = decision.distributedBypassTest;
  if (!bypass || !new Set(["passed", "failed", "TBD"]).has(bypass.status)) {
    errors.push(`${prefix}.distributedBypassTest.status must be passed, failed, or TBD`);
    blockers.push(`${prefix}.distributedBypassTest`);
    return;
  }
  if (bypass.status !== "passed") blockers.push(`${prefix}.distributedBypassTest.status`);
  requireText(bypass, "testedAt", errors, `${prefix}.distributedBypassTest`);
  validateDate(bypass.testedAt, `${prefix}.distributedBypassTest.testedAt`, errors, blockers);
  requireText(bypass, "evidenceReference", errors, `${prefix}.distributedBypassTest`);
  blockTbd(bypass.evidenceReference, `${prefix}.distributedBypassTest.evidenceReference`, blockers);
}

function validateProviderRestore(decision, prefix, errors, blockers) {
  for (const field of ["provider", "backupSource", "restoreTarget", "isolationBoundary", "integrityCheck"]) {
    requireText(decision, field, errors, prefix);
    blockTbd(decision?.[field], `${prefix}.${field}`, blockers);
  }
  validateDate(decision.rehearsalAt, `${prefix}.rehearsalAt`, errors, blockers);
  if (decision.status === "approved" && decision.backupSource === decision.restoreTarget) {
    errors.push(`${prefix}.restoreTarget must differ from backupSource`);
  }
  if (decision.status === "approved" && decision.integrityCheck !== "passed") {
    errors.push(`${prefix}.integrityCheck must be passed for approval`);
  }
  for (const field of ["rpoTargetMinutes", "rpoObservedMinutes", "rtoTargetMinutes", "rtoObservedMinutes"]) {
    const value = decision[field];
    if (!Number.isFinite(value) || value < 0) {
      blockers.push(`${prefix}.${field}`);
      if (value !== null) errors.push(`${prefix}.${field} must be a non-negative number`);
    }
  }
  if (
    Number.isFinite(decision.rpoTargetMinutes)
    && Number.isFinite(decision.rpoObservedMinutes)
    && decision.rpoObservedMinutes > decision.rpoTargetMinutes
  ) {
    errors.push(`${prefix}.rpoObservedMinutes exceeds target`);
  }
  if (
    Number.isFinite(decision.rtoTargetMinutes)
    && Number.isFinite(decision.rtoObservedMinutes)
    && decision.rtoObservedMinutes > decision.rtoTargetMinutes
  ) {
    errors.push(`${prefix}.rtoObservedMinutes exceeds target`);
  }
}

function main() {
  const file = process.argv[2];
  const expectation = process.argv[3];
  const json = process.argv.includes("--json");
  if (!file || !new Set(["--expect-ready", "--expect-blocked", "--check-consistency"]).has(expectation)) {
    process.stderr.write(
      "Usage: validate-production-readiness.mjs PROFILE (--expect-ready|--expect-blocked|--check-consistency) [--json]\n",
    );
    process.exit(2);
  }
  const result = validateProductionReadiness(JSON.parse(readFileSync(resolve(file), "utf8")));
  if (result.errors.length > 0) {
    process.stderr.write(`${result.errors.join("\n")}\n`);
    process.exit(1);
  }
  if (expectation !== "--check-consistency") {
    const matches = expectation === "--expect-ready" ? result.ready : !result.ready;
    if (!matches) {
      process.stderr.write(`Unexpected production readiness: ${result.ready ? "ready" : "blocked"}\n`);
      process.exit(1);
    }
  }
  if (json) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      profile: resolve(file),
      decision: result.ready ? "READY" : "BLOCKED",
      blockers: result.blockers,
    }, null, 2)}\n`);
  } else {
    process.stdout.write(`Production readiness: ${result.ready ? "READY" : "BLOCKED"}`);
    if (result.blockers.length > 0) process.stdout.write(` (${result.blockers.join(", ")})`);
    process.stdout.write("\n");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
