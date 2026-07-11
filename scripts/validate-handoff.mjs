#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const mode = process.argv[2] ?? "full";
const handoff = "HANDOFF.md";
const ignored = (file) => file === handoff || file.startsWith(".codesight/");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
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

const files = changedFiles();
const taskChanged = files.some((file) => !ignored(file));
if (taskChanged && !files.includes(handoff)) {
  throw new Error("This task changes repository files, but HANDOFF.md is not included. Update it before commit or merge.");
}

process.stdout.write(`Handoff validation (${mode}): PASS\n`);
