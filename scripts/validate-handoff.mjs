#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const mode = process.argv[2] ?? "full";
const handoff = "HANDOFF.md";
const ignored = (file) => file === handoff || file.startsWith(".codesight/");

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function taskIds(label) {
  const match = content.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  if (!match) throw new Error(`HANDOFF.md is missing required task metadata: ${label}`);
  return new Set(match[1].split(",").map((value) => value.trim()).filter((value) => value && value !== "없음"));
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
}

function gitText(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function changedFiles() {
  if (mode === "staged") {
    return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  }
  if (mode === "range") {
    const base = process.argv[3];
    if (!base || /^0+$/.test(base)) throw new Error("A valid base commit is required for range mode.");
    return git(["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`]);
  }
  return [];
}

if (!existsSync(handoff)) throw new Error("HANDOFF.md is required at the repository root.");
const content = readFileSync(handoff, "utf8");
const required = ["# Handoff", "갱신:", "상태:", "## 목표", "## 완료", "## 현재 상태", "## 검증", "## 남은 작업", "## 다음 시작점"];
for (const marker of required) {
  if (!content.includes(marker)) throw new Error(`HANDOFF.md is missing required marker: ${marker}`);
}
if (!content.endsWith("\n")) throw new Error("HANDOFF.md must end with a newline.");
if (/^(?:<{7}|={7}|>{7})/m.test(content)) throw new Error("HANDOFF.md contains an unresolved conflict marker.");
if (!/^갱신:\s*\d{4}-\d{2}-\d{2}(?:\s+.+)?$/m.test(content)) {
  throw new Error("HANDOFF.md 갱신 metadata must start with an ISO date (YYYY-MM-DD).");
}
const updated = content.match(/^갱신:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
if ((mode === "staged" || mode === "range") && updated !== seoulDate()) {
  throw new Error(`HANDOFF.md 갱신 date must match the current Asia/Seoul date (${seoulDate()}).`);
}
if (!/^Git 기준:\s*현재 작업 상태는 로컬 Git이 단일 진실 원천이며 `git status --short --branch`와 `git rev-parse HEAD`로 확인한다\. 원격 동기화 상태는 `git fetch` 후 remote-tracking reference와 대조한다\.$/m.test(content)) {
  throw new Error("HANDOFF.md must distinguish the local Git work state from separately fetched remote synchronization state.");
}
if (/^-\s*(?:현재\s+)?branch\s*:|^-\s*(?:현재\s+branch\s+)?(?:최신\s+)?commit\s*:/mi.test(content)) {
  throw new Error("HANDOFF.md must not cache volatile branch or commit snapshots; use the Git authority declaration.");
}
const completedTasks = taskIds("완료 작업");
const nextTasks = taskIds("다음 작업");
const staleNextTasks = [...completedTasks].filter((task) => nextTasks.has(task));
if (staleNextTasks.length > 0) {
  throw new Error(`HANDOFF.md lists completed work as next work: ${staleNextTasks.join(", ")}`);
}

const files = changedFiles();
const taskChanged = files.some((file) => !ignored(file));
if (taskChanged && !files.includes(handoff)) {
  throw new Error("This task changes repository files, but HANDOFF.md is not included. Update it before commit or merge.");
}

if (taskChanged) {
  const base = mode === "range" ? process.argv[3] : "HEAD";
  let previous = "";
  try {
    previous = gitText(["show", `${base}:${handoff}`]);
  } catch {
    previous = "";
  }
  const semanticSections = ["완료", "현재 상태", "검증", "남은 작업", "다음 시작점"];
  const section = (source, name) => {
    const marker = `## ${name}\n`;
    const start = source.indexOf(marker);
    if (start < 0) return "";
    const bodyStart = start + marker.length;
    const next = source.indexOf("\n## ", bodyStart);
    return source.slice(bodyStart, next < 0 ? source.length : next).trim();
  };
  const semanticChanged = semanticSections.some((name) => section(previous, name) !== section(content, name));
  if (!semanticChanged) {
    throw new Error("HANDOFF.md changed only metadata or non-semantic content; update completion, state, validation, remaining work, or next start.");
  }
}

process.stdout.write(`Handoff validation (${mode}): PASS\n`);
