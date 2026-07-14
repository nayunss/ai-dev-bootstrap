#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DECISIONS = ["legalPrivacyReview", "retentionDisposalPolicy", "multiInstanceRateLimit"];
const STATUSES = new Set(["approved", "not-applicable", "TBD"]);

export function validateProductionReadiness(profile) {
  const errors = [];
  const blockers = [];
  if (profile.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["reviewedAt", "scope", "decisionReason"]) {
    requireText(profile, field, errors);
    if (profile[field] === "TBD") blockers.push(field);
  }

  for (const name of DECISIONS) {
    const decision = profile.onboardingDecisions?.[name];
    if (!decision || !STATUSES.has(decision.status)) {
      errors.push(`onboardingDecisions.${name}.status must be approved, not-applicable, or TBD`);
      continue;
    }
    for (const field of ["owner", "decisionDue", "evidence"]) {
      requireText(decision, field, errors, `onboardingDecisions.${name}`);
    }
    if (name === "multiInstanceRateLimit") {
      requireText(decision, "strategy", errors, `onboardingDecisions.${name}`);
    }
    if (name === "retentionDisposalPolicy") {
      validateDataCategories(decision.dataCategories, errors, blockers);
    }
    if (decision.status === "TBD") blockers.push(`onboardingDecisions.${name}`);
    if (decision.status !== "TBD" && hasTbdValue(decision)) {
      errors.push(`onboardingDecisions.${name} cannot be resolved while required fields are TBD`);
    }
  }

  if (!new Set(["approved", "blocked"]).has(profile.productionDecision)) {
    errors.push("productionDecision must be approved or blocked");
  }
  const ready = errors.length === 0 && blockers.length === 0;
  if (ready && profile.productionDecision !== "approved") {
    errors.push("ready profile must have productionDecision approved");
  }
  if (!ready && profile.productionDecision !== "blocked") {
    errors.push("unresolved profile must have productionDecision blocked");
  }
  return { errors, blockers: [...new Set(blockers)], ready: errors.length === 0 && blockers.length === 0 };
}

function requireText(object, field, errors, prefix = "") {
  if (typeof object?.[field] !== "string" || object[field].trim().length === 0) {
    errors.push(`${prefix ? `${prefix}.` : ""}${field} is required`);
  }
}

function hasTbdValue(decision) {
  return Object.values(decision).some((value) => value === "TBD");
}

function validateDataCategories(categories, errors, blockers) {
  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push("onboardingDecisions.retentionDisposalPolicy.dataCategories requires at least one entry");
    return;
  }
  categories.forEach((category, index) => {
    const prefix = `onboardingDecisions.retentionDisposalPolicy.dataCategories[${index}]`;
    for (const field of [
      "category",
      "purpose",
      "retentionPeriod",
      "disposal",
      "legalHold",
      "owner",
      "status",
      "decisionDue",
      "evidence",
    ]) {
      requireText(category, field, errors, prefix);
      if (category[field] === "TBD") blockers.push(`${prefix}.${field}`);
    }
  });
}

function main() {
  const file = process.argv[2];
  const expectation = process.argv[3];
  if (!file || !new Set(["--expect-ready", "--expect-blocked"]).has(expectation)) {
    process.stderr.write("Usage: validate-production-readiness.mjs PROFILE (--expect-ready|--expect-blocked)\n");
    process.exit(2);
  }
  const result = validateProductionReadiness(JSON.parse(readFileSync(resolve(file), "utf8")));
  if (result.errors.length > 0) {
    process.stderr.write(`${result.errors.join("\n")}\n`);
    process.exit(1);
  }
  const matches = expectation === "--expect-ready" ? result.ready : !result.ready;
  if (!matches) {
    process.stderr.write(`Unexpected production readiness: ${result.ready ? "ready" : "blocked"}\n`);
    process.exit(1);
  }
  process.stdout.write(`Production readiness onboarding: ${result.ready ? "READY" : "BLOCKED"}`);
  if (result.blockers.length > 0) process.stdout.write(` (${result.blockers.join(", ")})`);
  process.stdout.write("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
