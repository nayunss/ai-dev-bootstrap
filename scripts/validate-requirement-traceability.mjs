#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestRelative = ".ai/manifests/requirement-traceability.json";
const expectedIds = Array.from({ length: 52 }, (_, index) => `REQ-${String(index + 1).padStart(3, "0")}`);
const expectedFeedbackIds = Array.from({ length: 13 }, (_, index) => `UF-${String(index + 1).padStart(3, "0")}`);

function safePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !isAbsolute(path)
    && !path.split(/[\\/]/u).includes("..")
    && !path.split(/[\\/]/u).some((part) => part.startsWith(".env"));
}

function expandIds(source, prefix) {
  const ids = [];
  const pattern = new RegExp(`${prefix}-(\\d{3})(?:[–-]${prefix}-(\\d{3})|[–-](\\d{3}))?`, "gu");
  for (const match of source.matchAll(pattern)) {
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[3] ?? match[1]);
    for (let value = from; value <= to; value += 1) ids.push(`${prefix}-${String(value).padStart(3, "0")}`);
  }
  return ids;
}

function parseStatusTable(source) {
  const states = new Map();
  for (const line of source.split("\n")) {
    if (!/^\|\s*REQ-\d{3}/u.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    if (cells.length !== 4) continue;
    for (const id of expandIds(cells[0], "REQ")) {
      states.set(id, { implementationStatus: cells[1], verificationStatus: cells[2] });
    }
  }
  return states;
}

function parseHandoffTasks(source, heading) {
  const start = source.indexOf(`${heading}\n`);
  if (start < 0) return new Set();
  const bodyStart = start + heading.length + 1;
  const next = source.slice(bodyStart).search(/^###\s|^##\s/mu);
  const body = source.slice(bodyStart, next < 0 ? source.length : bodyStart + next);
  return new Set([...body.matchAll(/^\d+\.\s+\[작업:([A-Za-z0-9:._-]+)\]/gmu)].map((match) => match[1]));
}

function handoffMetadataIds(source, label) {
  const value = source.match(new RegExp(`^${label}:\\s*(.+)$`, "mu"))?.[1] ?? "";
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function parseHandoffTaskScopes(source, heading) {
  const start = source.indexOf(`${heading}\n`);
  if (start < 0) return new Map();
  const bodyStart = start + heading.length + 1;
  const next = source.slice(bodyStart).search(/^###\s|^##\s/mu);
  const body = source.slice(bodyStart, next < 0 ? source.length : bodyStart + next);
  const scopes = new Map();
  for (const match of body.matchAll(
    /^\d+\.\s+\[작업:([A-Za-z0-9:._-]+)\]([\s\S]*?)(?=^\d+\.\s+\[작업:|$(?![\s\S]))/gmu,
  )) {
    const content = `${match[1]} ${match[2]}`;
    scopes.set(match[1], {
      requirementIds: new Set(expandIds(content, "REQ")),
      feedbackIds: new Set(expandIds(content, "UF")),
    });
  }
  return scopes;
}

function parseFeedbackMappings(source) {
  const mappings = new Map();
  for (const line of source.split("\n")) {
    if (!/^\|\s*UF-\d{3}\s*\|/u.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    mappings.set(cells[0], cells[2]);
  }
  return mappings;
}

function addTaskScope(scopes, taskId, requirementIds = [], feedbackIds = []) {
  if (!scopes.has(taskId)) scopes.set(taskId, { requirementIds: new Set(), feedbackIds: new Set() });
  const scope = scopes.get(taskId);
  for (const id of requirementIds) scope.requirementIds.add(id);
  for (const id of feedbackIds) scope.feedbackIds.add(id);
}

function parseImplementationTaskScopes(requirements, triage, feedbackManifest) {
  const scopes = new Map();
  for (const line of requirements.split("\n")) {
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    if (
      cells.length !== 6
      || cells[0] === "Downstream 검증 피드백 일반화"
      || !cells[1].includes("REQ-")
      || !cells[4].includes("`")
    ) continue;
    const requirementIds = expandIds(cells[1], "REQ");
    for (const match of cells[4].matchAll(/`([^`]+)`/gu)) {
      if (!match[1].startsWith("UF-")) addTaskScope(scopes, match[1], requirementIds);
    }
  }
  const primary = parseFeedbackMappings(triage);
  const reqToFeedback = new Map();
  for (const [feedbackId, requirementId] of primary) {
    if (!reqToFeedback.has(requirementId)) reqToFeedback.set(requirementId, []);
    reqToFeedback.get(requirementId).push(feedbackId);
  }
  for (const line of triage.split("\n")) {
    const taskId = line.match(/^\d+\.\s+`([^`]+)`/u)?.[1];
    if (!taskId || taskId.startsWith("UF-")) continue;
    const requirementIds = expandIds(taskId, "REQ");
    const feedbackIds = requirementIds.flatMap((id) => reqToFeedback.get(id) ?? []);
    addTaskScope(scopes, taskId, requirementIds, feedbackIds);
  }
  for (const finding of feedbackManifest?.findings ?? []) {
    if (finding.implementationTaskId === "REQ-046") continue;
    addTaskScope(
      scopes,
      finding.implementationTaskId,
      [finding.primaryRequirementId],
      [finding.id],
    );
  }
  return scopes;
}

function sameIds(actual, expected) {
  return [...new Set(actual)].sort().join(",") === [...expected].sort().join(",");
}

function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}

export function validateTraceability(manifest, {
  exists = existsSync,
  read = (path) => readFileSync(path, "utf8"),
  root = process.cwd(),
} = {}) {
  const errors = [];
  if (manifest?.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  if (manifest?.scope?.from !== "REQ-001" || manifest?.scope?.to !== "REQ-052") {
    errors.push("scope must be REQ-001 through REQ-052");
  }
  if (!/^v\d+\.\d+\.\d+-pilot(?:-rc)?$/u.test(manifest?.releaseBaseline ?? "")) {
    errors.push("releaseBaseline must be an exact pilot or pilot RC version");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(manifest?.reviewedAt ?? "")) errors.push("reviewedAt must be an ISO date");
  for (const [name, path] of Object.entries(manifest?.sources ?? {})) {
    if (!safePath(path)) errors.push(`unsafe source path ${name}: ${path}`);
    else if (!exists(resolve(root, path))) errors.push(`missing source path ${name}: ${path}`);
  }
  for (const name of ["requirements", "handoff", "feedbackTriage", "feedbackManifest"]) {
    if (!(name in (manifest?.sources ?? {}))) errors.push(`sources.${name} is required`);
  }
  const readableSource = (name, fallback) => {
    const path = manifest?.sources?.[name];
    return safePath(path) && exists(resolve(root, path)) ? resolve(root, path) : resolve(root, fallback);
  };

  const stateIds = [];
  for (const group of manifest?.requirementStates ?? []) {
    if (!Array.isArray(group?.requirementIds) || group.requirementIds.length === 0) {
      errors.push("requirement state group requires requirementIds");
      continue;
    }
    if (typeof group?.implementationStatus !== "string" || !group.implementationStatus) errors.push("implementationStatus is required");
    if (typeof group?.verificationStatus !== "string" || !group.verificationStatus) errors.push("verificationStatus is required");
    stateIds.push(...group.requirementIds);
  }
  for (const id of duplicates(stateIds)) errors.push(`duplicate requirement state: ${id}`);
  for (const id of expectedIds) if (!stateIds.includes(id)) errors.push(`missing requirement state: ${id}`);
  for (const id of stateIds) if (!expectedIds.includes(id)) errors.push(`unexpected requirement state: ${id}`);

  const requirementsSource = read(readableSource("requirements", "docs/requirements.md"));
  const feedbackSource = read(readableSource("feedbackTriage", "docs/downstream-feedback-requirement-triage.md"));
  const feedbackManifest = JSON.parse(
    read(readableSource("feedbackManifest", ".ai/manifests/downstream-feedback-triage.json")),
  );
  const documentedStates = parseStatusTable(requirementsSource);
  const manifestStates = new Map();
  for (const group of manifest?.requirementStates ?? []) {
    for (const id of group.requirementIds ?? []) {
      manifestStates.set(id, {
        implementationStatus: group.implementationStatus,
        verificationStatus: group.verificationStatus,
      });
    }
  }
  for (const id of expectedIds) {
    if (!requirementsSource.includes(`### ${id}:`)) errors.push(`requirements source is missing heading: ${id}`);
    if (!documentedStates.has(id)) errors.push(`requirements status table is missing: ${id}`);
    else if (JSON.stringify(documentedStates.get(id)) !== JSON.stringify(manifestStates.get(id))) {
      errors.push(`${id}: manifest implementation/verification status differs from requirements`);
    }
  }

  const taskIds = new Set();
  const handoffSource = read(readableSource("handoff", "HANDOFF.md"));
  const commonTasks = parseHandoffTasks(handoffSource, "### 공통 저장소에서 진행 가능");
  const externalTasks = parseHandoffTasks(handoffSource, "### 외부 입력·실제 환경 대기");
  const completedTasks = handoffMetadataIds(handoffSource, "완료 작업");
  for (const [field, expectedClass] of [["implementationTasks", commonTasks], ["externalTasks", externalTasks]]) {
    if (!Array.isArray(manifest?.[field])) {
      errors.push(`${field} must be an array`);
      continue;
    }
    for (const task of manifest[field]) {
      if (taskIds.has(task?.taskId)) errors.push(`duplicate task mapping: ${task?.taskId}`);
      taskIds.add(task?.taskId);
      const allowedStatuses = field === "implementationTasks" ? new Set(["pending", "completed"]) : new Set(["waiting"]);
      if (!allowedStatuses.has(task?.status)) errors.push(`${task?.taskId}: invalid task status`);
      if (task?.status === "completed") {
        if (!completedTasks.has(task?.taskId)) errors.push(`${task?.taskId}: completed task is absent from HANDOFF completed metadata`);
      } else if (!expectedClass.has(task?.taskId)) {
        errors.push(`${field} task is absent from matching HANDOFF section: ${task?.taskId}`);
      }
      if (!Array.isArray(task?.requirementIds) || task.requirementIds.some((id) => !expectedIds.includes(id))) {
        errors.push(`${task?.taskId}: invalid requirementIds`);
      }
      if (!Array.isArray(task?.feedbackIds) || task.feedbackIds.some((id) => !expectedFeedbackIds.includes(id))) {
        errors.push(`${task?.taskId}: invalid feedbackIds`);
      }
    }
  }
  const expectedImplementationScopes = parseImplementationTaskScopes(
    requirementsSource,
    feedbackSource,
    feedbackManifest,
  );
  const actualImplementationScopes = new Map(
    (manifest?.implementationTasks ?? []).map((task) => [task.taskId, task]),
  );
  for (const [taskId, expected] of expectedImplementationScopes) {
    const actual = actualImplementationScopes.get(taskId);
    if (!actual) {
      errors.push(`missing implementation task mapping: ${taskId}`);
      continue;
    }
    if (!sameIds(actual.requirementIds ?? [], expected.requirementIds)) {
      errors.push(`${taskId}: requirement scope differs from requirements/triage`);
    }
    if (!sameIds(actual.feedbackIds ?? [], expected.feedbackIds)) {
      errors.push(`${taskId}: feedback scope differs from feedback triage`);
    }
  }
  for (const taskId of actualImplementationScopes.keys()) {
    const task = actualImplementationScopes.get(taskId);
    if (!expectedImplementationScopes.has(taskId) && task?.status !== "completed") {
      errors.push(`unexpected implementation task mapping: ${taskId}`);
    }
  }
  const expectedExternalScopes = parseHandoffTaskScopes(
    handoffSource,
    "### 외부 입력·실제 환경 대기",
  );
  for (const task of manifest?.externalTasks ?? []) {
    const expected = expectedExternalScopes.get(task.taskId);
    if (!expected) continue;
    if (!sameIds(task.requirementIds ?? [], expected.requirementIds)) {
      errors.push(`${task.taskId}: external requirement scope differs from HANDOFF`);
    }
    if (!sameIds(task.feedbackIds ?? [], expected.feedbackIds)) {
      errors.push(`${task.taskId}: external feedback scope differs from HANDOFF`);
    }
  }

  const mappings = manifest?.feedbackPrimaryMappings ?? [];
  const mappingIds = mappings.map((mapping) => mapping?.feedbackId);
  for (const id of duplicates(mappingIds)) errors.push(`duplicate feedback primary mapping: ${id}`);
  for (const id of expectedFeedbackIds) if (!mappingIds.includes(id)) errors.push(`missing feedback primary mapping: ${id}`);
  const documentedMappings = parseFeedbackMappings(feedbackSource);
  for (const mapping of mappings) {
    if (!expectedIds.includes(mapping?.primaryRequirementId)) errors.push(`${mapping?.feedbackId}: invalid primaryRequirementId`);
    if (documentedMappings.get(mapping?.feedbackId) !== mapping?.primaryRequirementId) {
      errors.push(`${mapping?.feedbackId}: primary requirement differs from feedback triage`);
    }
  }
  return errors;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
}

export function requiresManifestChange(files) {
  return files.includes("docs/requirements.md")
    || files.includes("docs/downstream-feedback-requirement-triage.md")
    || files.includes(".ai/manifests/downstream-feedback-triage.json")
    || files.includes("HANDOFF.md");
}

function main() {
  const mode = process.argv[2] ?? "full";
  const base = process.argv[3];
  if (!new Set(["full", "staged", "range"]).has(mode)) {
    process.stderr.write("Usage: validate-requirement-traceability.mjs <full|staged|range> [BASE]\n");
    process.exit(2);
  }
  if (!existsSync(manifestRelative)) throw new Error(`${manifestRelative} is required`);
  const manifest = JSON.parse(readFileSync(manifestRelative, "utf8"));
  const errors = validateTraceability(manifest);
  if (mode !== "full") {
    if (mode === "range" && (!base || /^0+$/u.test(base))) throw new Error("A valid base commit is required for range mode");
    const files = mode === "staged"
      ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
      : git(["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`]);
    if (requiresManifestChange(files) && !files.includes(manifestRelative)) {
      errors.push(`traceability source changed without ${manifestRelative}`);
    }
  }
  if (errors.length) {
    for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(`Requirement traceability validation (${mode}): PASS\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
