#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UF = /^UF-\d{3}$/u;
const REQ = /^REQ-\d{3}$/u;
const TASK = /^[A-Za-z0-9][A-Za-z0-9:._-]+$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const forbiddenKeys = new Set([
  "downstreamRepository",
  "project",
  "projectName",
  "provider",
  "stack",
  "sourceExcerpt",
  "sourcePath",
]);
const allowedKeys = {
  root: new Set(["schemaVersion", "reviewedAt", "sanitization", "releaseBaseline", "findings"]),
  sanitization: new Set(["projectSpecificDetailsRemoved", "sourceExcerptIncluded", "secretsIncluded"]),
  baseline: new Set(["repository", "release", "commitSha", "archiveSha256"]),
  finding: new Set([
    "id",
    "generalizedCause",
    "primaryRequirementId",
    "duplicateOf",
    "implementationTaskId",
    "revalidationTaskId",
    "status",
  ]),
};

function unique(values) {
  return new Set(values).size === values.length;
}

function unexpectedKeys(value, allowed, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${label}.${key}: unexpected field`);
}

function forbiddenFields(value, path = "$", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => forbiddenFields(item, `${path}[${index}]`, errors));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key) || key.startsWith(".env")) errors.push(`${path}.${key}: project-specific or sensitive field is forbidden`);
      forbiddenFields(item, `${path}.${key}`, errors);
    }
  }
  return errors;
}

export function validateDownstreamFeedbackTriage(document, {
  traceability = null,
} = {}) {
  const errors = forbiddenFields(document);
  unexpectedKeys(document, allowedKeys.root, "$", errors);
  if (document?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(document?.reviewedAt ?? "")) errors.push("reviewedAt must be an ISO date");
  const sanitization = document?.sanitization;
  unexpectedKeys(sanitization, allowedKeys.sanitization, "$.sanitization", errors);
  if (
    sanitization?.projectSpecificDetailsRemoved !== true
    || sanitization?.sourceExcerptIncluded !== false
    || sanitization?.secretsIncluded !== false
  ) errors.push("sanitization attestation must remove project details, source excerpts and secrets");
  const baseline = document?.releaseBaseline;
  unexpectedKeys(baseline, allowedKeys.baseline, "$.releaseBaseline", errors);
  if (!/^https:\/\/[^\s]+$/u.test(baseline?.repository ?? "")) errors.push("releaseBaseline.repository must be HTTPS");
  if (typeof baseline?.release !== "string" || !baseline.release || baseline.release === "latest") errors.push("releaseBaseline.release must be pinned");
  if (!SHA1.test(baseline?.commitSha ?? "")) errors.push("releaseBaseline.commitSha must be a full SHA-1");
  if (!SHA256.test(baseline?.archiveSha256 ?? "")) errors.push("releaseBaseline.archiveSha256 must be SHA-256");
  if (!Array.isArray(document?.findings) || document.findings.length === 0) return [...errors, "findings must be a non-empty array"];

  const ids = document.findings.map((finding) => finding?.id);
  if (!unique(ids)) errors.push("finding IDs must be unique");
  const findings = new Map(document.findings.map((finding) => [finding?.id, finding]));
  for (const finding of document.findings) {
    unexpectedKeys(finding, allowedKeys.finding, `$.findings.${finding?.id ?? "unknown"}`, errors);
    if (!UF.test(finding?.id ?? "")) errors.push(`${finding?.id ?? "unknown"}: invalid finding ID`);
    if (typeof finding?.generalizedCause !== "string" || finding.generalizedCause.trim().length < 12) {
      errors.push(`${finding?.id}: generalizedCause must contain a reusable cause`);
    } else if (/https?:\/\/|(?:^|\s)(?:\/|[A-Za-z]:\\)|\.env/iu.test(finding.generalizedCause)) {
      errors.push(`${finding.id}: generalizedCause must not contain URLs, local paths or secret-file names`);
    }
    if (!REQ.test(finding?.primaryRequirementId ?? "")) errors.push(`${finding?.id}: exactly one primaryRequirementId is required`);
    if (!TASK.test(finding?.implementationTaskId ?? "")) errors.push(`${finding?.id}: implementationTaskId is invalid`);
    if (!TASK.test(finding?.revalidationTaskId ?? "")) errors.push(`${finding?.id}: revalidationTaskId is invalid`);
    if (finding?.implementationTaskId === finding?.revalidationTaskId) errors.push(`${finding?.id}: implementation and revalidation tasks must be separate`);
    if (finding?.status !== "triaged") errors.push(`${finding?.id}: status must remain triaged until downstream revalidation`);
    if (finding?.duplicateOf !== null) {
      const primary = findings.get(finding.duplicateOf);
      if (!primary || primary.id === finding.id) errors.push(`${finding.id}: duplicateOf must reference another finding`);
      else {
        if (primary.duplicateOf !== null) errors.push(`${finding.id}: duplicateOf chains are forbidden`);
        if (
          primary.primaryRequirementId !== finding.primaryRequirementId
          || primary.implementationTaskId !== finding.implementationTaskId
        ) errors.push(`${finding.id}: duplicate must share primary REQ and implementation task`);
      }
    }
  }

  if (traceability) {
    const primary = new Map(
      (traceability.feedbackPrimaryMappings ?? []).map((mapping) => [mapping.feedbackId, mapping.primaryRequirementId]),
    );
    const implementation = new Map();
    for (const task of traceability.implementationTasks ?? []) {
      for (const id of task.feedbackIds ?? []) implementation.set(id, task.taskId);
    }
    const revalidation = new Map();
    for (const task of traceability.externalTasks ?? []) {
      for (const id of task.feedbackIds ?? []) {
        if (task.taskId.startsWith("UF-")) revalidation.set(id, task.taskId);
        else if (!implementation.has(id)) implementation.set(id, task.taskId);
      }
    }
    const findingIds = new Set(document.findings.map((finding) => finding.id));
    for (const id of primary.keys()) if (!findingIds.has(id)) errors.push(`${id}: traceability finding is missing from triage`);
    for (const finding of document.findings) {
      if (primary.get(finding.id) !== finding.primaryRequirementId) errors.push(`${finding.id}: primary REQ differs from traceability`);
      if (implementation.get(finding.id) !== finding.implementationTaskId) {
        errors.push(`${finding.id}: implementation task differs from traceability`);
      }
      if (revalidation.get(finding.id) !== finding.revalidationTaskId) errors.push(`${finding.id}: revalidation task differs from traceability`);
    }
  }
  return errors;
}

function main() {
  const mode = process.argv[2] ?? "full";
  const base = process.argv[3];
  if (!new Set(["full", "staged", "range"]).has(mode)) {
    process.stderr.write("Usage: validate-downstream-feedback-triage.mjs <full|staged|range> [BASE]\n");
    process.exit(2);
  }
  const path = ".ai/manifests/downstream-feedback-triage.json";
  const document = JSON.parse(readFileSync(path, "utf8"));
  const traceability = JSON.parse(readFileSync(".ai/manifests/requirement-traceability.json", "utf8"));
  const errors = validateDownstreamFeedbackTriage(document, { traceability });
  if (mode !== "full") {
    if (mode === "range" && (!base || /^0+$/u.test(base))) throw new Error("A valid base commit is required for range mode");
    const files = execFileSync("git", mode === "staged"
      ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
      : ["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    const sourceChanged = files.includes("docs/downstream-feedback-requirement-triage.md")
      || files.includes(".ai/manifests/requirement-traceability.json");
    if (sourceChanged && !files.includes(path)) errors.push(`triage source changed without ${path}`);
  }
  if (errors.length) {
    errors.forEach((error) => process.stderr.write(`FAIL: ${error}\n`));
    process.exit(1);
  }
  process.stdout.write(`Downstream feedback triage validation (${mode}): PASS\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
