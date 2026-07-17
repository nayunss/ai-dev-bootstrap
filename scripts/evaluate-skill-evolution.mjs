#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredHardGates = ["correctness", "security", "permission", "regression"];
const allowedOperations = new Set(["add", "delete", "replace"]);

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function lexicalTokens(value) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function safePath(root, relativePath) {
  if (
    typeof relativePath !== "string"
    || !relativePath
    || relativePath.startsWith("/")
    || relativePath.split(/[\\/]/u).includes("..")
    || relativePath.split(/[\\/]/u).some((part) => part.startsWith(".env"))
  ) {
    throw new Error(`unsafe protected path: ${relativePath}`);
  }
  const path = resolve(root, relativePath);
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error(`path escapes repository: ${relativePath}`);
  return path;
}

function readProtected(root, relativePath) {
  const path = safePath(root, relativePath);
  if (!existsSync(path)) throw new Error(`missing protected asset: ${relativePath}`);
  return readFileSync(path);
}

function exactVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value);
}

function exactPinnedIdentifier(value) {
  return typeof value === "string"
    && /^[a-z0-9][a-z0-9._-]*@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/iu.test(value);
}

function applyOperations(baseline, operations, errors) {
  let output = baseline;
  for (const [index, operation] of operations.entries()) {
    if (!allowedOperations.has(operation.operation)) {
      errors.push(`patch operation ${index + 1} must be add, delete, or replace`);
      continue;
    }
    if (typeof operation.scope !== "string" || !operation.scope) errors.push(`patch operation ${index + 1} requires scope`);
    if (typeof operation.match !== "string" || !operation.match) {
      errors.push(`patch operation ${index + 1} requires a non-empty exact match`);
      continue;
    }
    const occurrences = output.split(operation.match).length - 1;
    if (occurrences !== 1) {
      errors.push(`patch operation ${index + 1} match must occur exactly once`);
      continue;
    }
    const content = typeof operation.content === "string" ? operation.content : "";
    if (operation.operation === "add") output = output.replace(operation.match, `${operation.match}${content}`);
    if (operation.operation === "delete") {
      if (content) errors.push(`delete operation ${index + 1} content must be empty`);
      output = output.replace(operation.match, "");
    }
    if (operation.operation === "replace") {
      if (!content) errors.push(`replace operation ${index + 1} requires content`);
      output = output.replace(operation.match, content);
    }
  }
  return output;
}

function gradeTrials(label, evaluation, errors) {
  if (!evaluation || !Array.isArray(evaluation.trials) || evaluation.trials.length < 2) {
    errors.push(`${label} requires at least two trials`);
    return null;
  }
  if (typeof evaluation.minimumImprovement !== "number" || evaluation.minimumImprovement <= 0) {
    errors.push(`${label} minimumImprovement must be greater than zero`);
    return null;
  }
  const trialIds = new Set();
  let baselineTotal = 0;
  let candidateTotal = 0;
  for (const trial of evaluation.trials) {
    if (!trial.id || trialIds.has(trial.id)) errors.push(`${label} trial IDs must be non-empty and unique`);
    trialIds.add(trial.id);
    if (!Number.isFinite(trial.baselineScore) || !Number.isFinite(trial.candidateScore)) {
      errors.push(`${label} trial scores must be finite numbers`);
      continue;
    }
    baselineTotal += trial.baselineScore;
    candidateTotal += trial.candidateScore;
    for (const gate of requiredHardGates) {
      if (trial.hardGates?.[gate] !== true) errors.push(`${label} trial ${trial.id || "unknown"} hard gate failed: ${gate}`);
    }
  }
  const baselineMean = baselineTotal / evaluation.trials.length;
  const candidateMean = candidateTotal / evaluation.trials.length;
  const improvement = candidateMean - baselineMean;
  if (!(improvement > 0)) errors.push(`${label} tie or regression is rejected`);
  if (improvement < evaluation.minimumImprovement) {
    errors.push(`${label} improvement ${improvement.toFixed(4)} is below minimum ${evaluation.minimumImprovement}`);
  }
  return { baselineMean, candidateMean, improvement, trials: evaluation.trials.length };
}

export function evaluateSkillEvolution(record, options = {}) {
  const root = resolve(options.root ?? repositoryRoot);
  const errors = [];
  if (record?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!record?.experimentId || !record?.candidateId) errors.push("experimentId and candidateId are required");
  if (!new Set(["selection", "test"]).has(record?.phase)) errors.push("phase must be selection or test");

  for (const field of ["model", "aiTool", "harness"]) {
    if (!exactPinnedIdentifier(record?.target?.[field])) {
      errors.push(`target.${field} must be a named exact version`);
    }
  }
  for (const field of ["toolManifestSha256", "evaluatorSha256"]) {
    if (!/^sha256:[a-f0-9]{64}$/u.test(record?.target?.[field] ?? "")) errors.push(`target.${field} must be SHA-256`);
  }
  try {
    if (sha256(readProtected(root, record?.target?.toolManifestPath)) !== record?.target?.toolManifestSha256) {
      errors.push("tool manifest hash drift");
    }
  } catch (error) {
    errors.push(error.message);
  }

  const splitIds = ["train", "selection", "test"].map((name) => record?.datasets?.[name]?.id);
  if (splitIds.some((id) => typeof id !== "string" || !id) || new Set(splitIds).size !== 3) {
    errors.push("train, selection, and test split IDs must be non-empty and distinct");
  }
  for (const name of ["train", "selection", "test"]) {
    if (!/^sha256:[a-f0-9]{64}$/u.test(record?.datasets?.[name]?.sha256 ?? "")) {
      errors.push(`datasets.${name}.sha256 must be SHA-256`);
    }
  }
  if (record?.datasets?.test?.locked !== true) errors.push("test split must remain locked");
  if (record?.reuseTestAsTraining === true) errors.push("test results cannot be reused as training signal");
  for (const name of ["train", "selection"]) {
    try {
      if (sha256(readProtected(root, record?.datasets?.[name]?.path)) !== record?.datasets?.[name]?.sha256) {
        errors.push(`${name} split hash drift`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  let baseline = "";
  let candidate = "";
  try {
    baseline = readProtected(root, record?.skill?.baselinePath).toString("utf8");
    candidate = readProtected(root, record?.skill?.candidatePath).toString("utf8");
  } catch (error) {
    errors.push(error.message);
  }
  if (baseline && sha256(baseline) !== record?.skill?.baselineSha256) errors.push("baseline skill hash drift");
  if (candidate && sha256(candidate) !== record?.skill?.candidateSha256) errors.push("candidate skill hash drift");
  if (!exactVersion(record?.skill?.fromVersion)) errors.push("skill.fromVersion must be an exact version");

  const operations = Array.isArray(record?.patch?.operations) ? record.patch.operations : [];
  const maxAtomicEdits = record?.budget?.maxAtomicEdits;
  if (!Number.isInteger(maxAtomicEdits) || maxAtomicEdits < 1) errors.push("budget.maxAtomicEdits must be a positive integer");
  if (operations.length < 1 || operations.length > maxAtomicEdits) errors.push("patch exceeds or omits the atomic edit budget");
  const maxSkillTokens = record?.budget?.maxSkillTokens;
  if (!Number.isInteger(maxSkillTokens) || maxSkillTokens < 1) errors.push("budget.maxSkillTokens must be a positive integer");
  if (candidate && lexicalTokens(candidate) > maxSkillTokens) errors.push("candidate exceeds the deterministic lexical token budget");
  if (baseline && candidate) {
    const transformed = applyOperations(baseline, operations, errors);
    if (transformed !== candidate) errors.push("candidate is not the exact result of the declared atomic patch");
  }

  const patchText = JSON.stringify(operations);
  for (const pattern of [/ignore (?:all |any )?(?:previous|prior) instructions/iu, /\.env(?:[./\s]|$)/u, /-----BEGIN [A-Z ]*PRIVATE KEY-----/u]) {
    if (pattern.test(patchText)) errors.push("patch contains prohibited untrusted or sensitive content");
  }
  if (!record?.patch?.rationale || !record?.patch?.sourceTrust) errors.push("patch rationale and sourceTrust are required");

  const protectedRoles = new Set();
  for (const asset of record?.protectedAssets ?? []) {
    protectedRoles.add(asset.role);
    try {
      if (sha256(readProtected(root, asset.path)) !== asset.sha256) errors.push(`protected asset drift: ${asset.role}`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  for (const role of ["grader", "fixture", "expectedOutcome", "baseline", "approvalRecord"]) {
    if (!protectedRoles.has(role)) errors.push(`missing protected asset role: ${role}`);
  }
  const evaluatorPath = safePath(root, "scripts/evaluate-skill-evolution.mjs");
  if (sha256(readFileSync(evaluatorPath)) !== record?.target?.evaluatorSha256) errors.push("evaluator hash drift");

  const selection = gradeTrials("selection", record?.evaluation?.selection, errors);
  let test = null;
  if (record?.phase === "selection" && record?.evaluation?.test !== undefined) {
    errors.push("locked test results cannot be present during selection");
  }
  if (record?.phase === "test") {
    if (
      record?.approval?.status !== "approved"
      || !record?.approval?.approver
      || !record?.approval?.approvedAt
      || !record?.approval?.candidateSha256
    ) {
      errors.push("test phase requires explicit candidate-bound human approval");
    }
    if (record?.approval?.candidateSha256 !== record?.skill?.candidateSha256) {
      errors.push("approval is not bound to the candidate hash");
    }
    try {
      if (sha256(readProtected(root, record?.datasets?.test?.path)) !== record?.datasets?.test?.sha256) {
        errors.push("test split hash drift");
      }
    } catch (error) {
      errors.push(error.message);
    }
    test = gradeTrials("test", record?.evaluation?.test, errors);
  }

  return {
    schemaVersion: 1,
    experimentId: record?.experimentId ?? "unknown",
    candidateId: record?.candidateId ?? "unknown",
    phase: record?.phase ?? "unknown",
    decision: errors.length ? "rejected" : record?.phase === "test" ? "approved" : "selected",
    hashes: {
      baseline: record?.skill?.baselineSha256 ?? "missing",
      candidate: record?.skill?.candidateSha256 ?? "missing",
      evaluator: record?.target?.evaluatorSha256 ?? "missing",
    },
    aggregate: { selection, test },
    rejectionReasons: errors,
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const recordPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!recordPath) {
    console.error("Usage: evaluate-skill-evolution.mjs RECORD.json [sanitized-result.json]");
    process.exit(2);
  }
  let record;
  try {
    record = JSON.parse(readFileSync(recordPath, "utf8"));
  } catch (error) {
    console.error(`Skill evolution record is unreadable: ${error.message}`);
    process.exit(1);
  }
  const result = evaluateSkillEvolution(record);
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) writeFileSync(outputPath, serialized);
  process.stdout.write(serialized);
  if (result.decision === "rejected") process.exit(1);
}
