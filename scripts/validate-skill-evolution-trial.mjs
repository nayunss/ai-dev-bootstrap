#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const exactTarget = /^[a-z0-9][a-z0-9._-]*@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/iu;
const digest = /^sha256:[a-f0-9]{64}$/u;
const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

function safePath(root, relative) {
  if (
    typeof relative !== "string"
    || !relative
    || relative.startsWith("/")
    || relative.split(/[\\/]/u).includes("..")
    || relative.split(/[\\/]/u).some((part) => part.startsWith(".env"))
  ) return null;
  const path = resolve(root, relative);
  return path === root || path.startsWith(`${root}${sep}`) ? path : null;
}

export function validateTrialPlan(plan, { root = process.cwd(), release = false } = {}) {
  const errors = [];
  const blockers = [];
  if (plan?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!plan?.experimentId) errors.push("experimentId is required");
  if (!new Set(["offline-dry-run", "live-trial"]).has(plan?.mode)) errors.push("mode must be offline-dry-run or live-trial");
  for (const field of ["model", "harness", "adapter"]) {
    if (!exactTarget.test(plan?.target?.[field] ?? "")) errors.push(`target.${field} must be an exact name@version`);
  }

  const execution = plan?.execution ?? {};
  if (execution.network !== (plan?.mode === "offline-dry-run" ? "deny" : "approved-only")) {
    errors.push("network must be deny for offline dry-run and approved-only for live trial");
  }
  if (execution.credentialAccess !== "deny") errors.push("credentialAccess must be deny");
  if (execution.customerData !== "deny") errors.push("customerData must be deny");
  for (const field of ["maxTrials", "maxTokensPerTrial", "timeoutSeconds"]) {
    if (!Number.isInteger(execution[field]) || execution[field] < 1) errors.push(`execution.${field} must be a positive integer`);
  }
  if (!Number.isFinite(execution.maxTotalCostUsd) || execution.maxTotalCostUsd < 0) {
    errors.push("execution.maxTotalCostUsd must be a non-negative number");
  }
  if (plan?.mode === "offline-dry-run" && execution.maxTotalCostUsd !== 0) {
    errors.push("offline dry-run cost must be zero");
  }
  if (
    !Array.isArray(execution.seeds)
    || execution.seeds.length !== execution.maxTrials
    || new Set(execution.seeds).size !== execution.seeds.length
    || execution.seeds.some((seed) => !Number.isInteger(seed))
  ) errors.push("execution.seeds must contain one distinct integer per trial");

  for (const split of ["train", "selection", "test"]) {
    const path = safePath(root, plan?.datasets?.[split]?.path);
    if (!path || !existsSync(path)) errors.push(`datasets.${split}.path must reference a safe existing file`);
  }
  if (plan?.datasets?.test?.accessibleDuringTrial !== false) errors.push("held-out test must be inaccessible during trials");
  if (plan?.datasets?.test?.lockedUntilHumanApproval !== true) errors.push("held-out test must remain locked until human approval");

  const approval = plan?.approval ?? {};
  if (release) {
    if (plan?.mode !== "live-trial") errors.push("release requires a live-trial plan");
    if (approval.status !== "approved") blockers.push("approval.status");
    if (!digest.test(approval.candidateSha256 ?? "")) blockers.push("approval.candidateSha256");
    if (!approval.approver || approval.approver === "TBD") blockers.push("approval.approver");
    if (!utc.test(approval.approvedAt ?? "")) blockers.push("approval.approvedAt");
    if (!approval.evidenceReference || approval.evidenceReference === "TBD") blockers.push("approval.evidenceReference");
  } else if (approval.status !== "pending") {
    errors.push("pre-trial plan approval must remain pending");
  }
  return { valid: errors.length === 0 && blockers.length === 0, errors, blockers };
}

function main() {
  const [file, expectation = "--expect-dry-run"] = process.argv.slice(2);
  if (!file || !new Set(["--expect-dry-run", "--expect-release-approved"]).has(expectation)) {
    process.stderr.write("Usage: validate-skill-evolution-trial.mjs PLAN (--expect-dry-run|--expect-release-approved)\n");
    process.exit(2);
  }
  const result = validateTrialPlan(JSON.parse(readFileSync(resolve(file), "utf8")), {
    release: expectation === "--expect-release-approved",
  });
  if (!result.valid) {
    process.stderr.write(`${[...result.errors, ...result.blockers.map((item) => `blocked: ${item}`)].join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(expectation === "--expect-dry-run"
    ? "Skill evolution offline harness plan: PASS; no model call performed\n"
    : "Skill evolution release approval gate: PASS\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
