#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourcePaths = {
  requirements: "docs/requirements.md",
  triage: "docs/downstream-feedback-requirement-triage.md",
  handoff: "HANDOFF.md",
};

function section(source, heading, nextHeadingLevel = heading.match(/^#+/u)?.[0].length ?? 2) {
  const start = source.indexOf(`${heading}\n`);
  if (start < 0) return "";
  const bodyStart = start + heading.length + 1;
  const next = source.slice(bodyStart).search(new RegExp(`^#{1,${nextHeadingLevel}}\\s`, "mu"));
  return source.slice(bodyStart, next < 0 ? source.length : bodyStart + next);
}

function taskIds(source) {
  return new Set([...source.matchAll(/`([A-Za-z0-9][A-Za-z0-9:._-]+)`/gu)].map((match) => match[1]));
}

function metadataIds(source, label) {
  const value = source.match(new RegExp(`^${label}:\\s*(.+)$`, "mu"))?.[1];
  if (!value) return new Set();
  return new Set(value.split(",").map((item) => item.trim()).filter((item) => item && item !== "없음"));
}

function expandIds(source, prefix) {
  const found = new Set();
  const pattern = new RegExp(`${prefix}-(\\d{3})(?:[–-]${prefix}-(\\d{3})|[–-](\\d{3}))?`, "gu");
  for (const match of source.matchAll(pattern)) {
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[3] ?? match[1]);
    for (let value = from; value <= to; value += 1) {
      found.add(`${prefix}-${String(value).padStart(3, "0")}`);
    }
  }
  return found;
}

function listedTasks(source) {
  const tasks = new Map();
  const matches = [...source.matchAll(
    /^\d+\.\s+\[작업:([A-Za-z0-9:._-]+)\]([\s\S]*?)(?=^\d+\.\s+\[작업:|^###\s|$(?![\s\S]))/gmu,
  )];
  for (const match of matches) tasks.set(match[1], match[2]);
  return tasks;
}

function remainingTasks(handoff) {
  return listedTasks(section(handoff, "## 남은 작업"));
}

function classifiedRemainingTasks(handoff) {
  return {
    common: listedTasks(section(handoff, "### 공통 저장소에서 진행 가능", 3)),
    external: listedTasks(section(handoff, "### 외부 입력·실제 환경 대기", 3)),
  };
}

function requirementFollowUpTasks(requirements) {
  const review = section(requirements, "### 승인된 횡단 검토 기준", 3);
  const header = "| 검토 주제 | 반영 REQ | 구현 상태 | 검증 상태 | 후속 task | 상세 문서 |";
  if (!review.includes(header)) return { error: "requirements follow-up task table is missing", tasks: new Set() };
  const tasks = new Set();
  for (const line of review.split("\n").filter((value) => value.startsWith("|") && !value.includes("---"))) {
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    if (cells.length !== 6 || cells[0] === "검토 주제") continue;
    for (const id of taskIds(cells[4])) tasks.add(id);
  }
  return { error: null, tasks };
}

function triageContract(triage) {
  const mapping = section(triage, "## Primary REQ Mapping");
  const order = section(triage, "## 구현 순서");
  const reqToUfs = new Map();
  for (const line of mapping.split("\n").filter((value) => /^\|\s*UF-\d{3}\s*\|/u.test(value))) {
    const cells = line.split("|").slice(1, -1).map((value) => value.trim());
    const uf = cells[0];
    const req = cells[2];
    if (!reqToUfs.has(req)) reqToUfs.set(req, new Set());
    reqToUfs.get(req).add(uf);
  }
  const tasks = new Map();
  for (const match of order.matchAll(/^\d+\.\s+`([^`]+)`/gmu)) {
    const id = match[1];
    const requirements = expandIds(id, "REQ");
    const ufs = id.startsWith("UF-") ? expandIds(id, "UF") : new Set();
    if (id.startsWith("UF-")) {
      for (const req of reqToUfs.keys()) requirements.add(req);
    }
    for (const req of requirements) {
      for (const uf of reqToUfs.get(req) ?? []) ufs.add(uf);
    }
    tasks.set(id, { requirements, ufs });
  }
  return { reqToUfs, tasks };
}

export function validateRequirementHandoffTasks({ requirements, triage, handoff }) {
  const errors = [];
  const required = requirementFollowUpTasks(requirements);
  if (required.error) errors.push(required.error);
  const triageState = triageContract(triage);
  const expected = new Set([...required.tasks, ...triageState.tasks.keys()]);
  const remaining = remainingTasks(handoff);
  const classified = classifiedRemainingTasks(handoff);
  const completed = metadataIds(handoff, "완료 작업");

  for (const id of expected) {
    if (!remaining.has(id)) errors.push(`incomplete source task is missing from HANDOFF remaining work: ${id}`);
  }
  for (const id of completed) {
    if (expected.has(id)) errors.push(`source still marks completed HANDOFF task as incomplete: ${id}`);
    if (remaining.has(id)) errors.push(`completed task remains in HANDOFF remaining work: ${id}`);
  }

  for (const [id, contract] of triageState.tasks) {
    const handoffTask = remaining.get(id);
    if (!handoffTask) continue;
    const expectedClass = id.startsWith("UF-") ? "external" : "common";
    const wrongClass = expectedClass === "common" ? "external" : "common";
    if (!classified[expectedClass].has(id)) {
      errors.push(`${id}: must be listed in HANDOFF ${expectedClass} remaining-work section`);
    }
    if (classified[wrongClass].has(id)) {
      errors.push(`${id}: must not be listed in HANDOFF ${wrongClass} remaining-work section`);
    }
    const actualReqs = expandIds(`${id} ${handoffTask}`, "REQ");
    const actualUfs = expandIds(`${id} ${handoffTask}`, "UF");
    for (const req of contract.requirements) {
      if (!actualReqs.has(req)) errors.push(`${id}: HANDOFF is missing required scope ${req}`);
    }
    for (const req of actualReqs) {
      if (!contract.requirements.has(req)) errors.push(`${id}: HANDOFF has unexpected REQ scope ${req}`);
    }
    for (const uf of contract.ufs) {
      if (!actualUfs.has(uf)) errors.push(`${id}: HANDOFF is missing required scope ${uf}`);
    }
    if (!id.startsWith("UF-")) {
      for (const uf of actualUfs) {
        if (!contract.ufs.has(uf)) errors.push(`${id}: HANDOFF has unexpected UF scope ${uf}`);
      }
    }
  }

  for (const [req, ufs] of triageState.reqToUfs) {
    if (ufs.size === 0) errors.push(`${req}: triage primary mapping has no UF entries`);
  }
  for (const id of required.tasks) {
    if (triageState.tasks.has(id)) continue;
    if (!classified.common.has(id)) {
      errors.push(`${id}: requirements follow-up task must be listed in HANDOFF common remaining-work section`);
    }
    if (classified.external.has(id)) {
      errors.push(`${id}: requirements follow-up task must not be listed in HANDOFF external remaining-work section`);
    }
  }
  return errors;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
}

function main() {
  const mode = process.argv[2] ?? "full";
  const base = process.argv[3];
  if (!new Set(["full", "staged", "range"]).has(mode)) {
    process.stderr.write("Usage: validate-requirement-handoff-tasks.mjs <full|staged|range> [BASE]\n");
    process.exit(2);
  }
  for (const path of Object.values(sourcePaths)) if (!existsSync(path)) throw new Error(`${path} is required`);
  const input = Object.fromEntries(
    Object.entries(sourcePaths).map(([name, path]) => [name, readFileSync(path, "utf8")]),
  );
  const errors = validateRequirementHandoffTasks(input);
  if (mode !== "full") {
    if (mode === "range" && (!base || /^0+$/u.test(base))) throw new Error("A valid base commit is required for range mode");
    const files = mode === "staged"
      ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
      : git(["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`]);
    const sourceChanged = [sourcePaths.requirements, sourcePaths.triage].some((path) => files.includes(path));
    if (sourceChanged && !files.includes(sourcePaths.handoff)) {
      errors.push("requirements or feedback triage changed without HANDOFF.md");
    }
  }
  if (errors.length) {
    for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(`Requirement/HANDOFF task reconciliation (${mode}): PASS\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
