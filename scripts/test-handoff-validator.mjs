#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = mkdtempSync(join(tmpdir(), "handoff-validator-"));
copyFileSync("scripts/validate-handoff.mjs", join(fixture, "validate-handoff.mjs"));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const validHandoff = `# Handoff

갱신: ${today} Asia/Seoul
상태: 진행 중
Git 기준: 현재 작업 상태는 로컬 Git이 단일 진실 원천이며 \`git status --short --branch\`와 \`git rev-parse HEAD\`로 확인한다. 원격 동기화 상태는 \`git fetch\` 후 remote-tracking reference와 대조한다.
완료 작업: bootstrap
다음 작업: validator

## 목표

검증

## 완료

- 초기화

## 현재 상태

- fixture

## 검증

- validator

## 남은 작업

1. 없음

## 다음 시작점

- 상태 확인
`;

function git(...args) {
  return execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
}

function validate(...args) {
  return spawnSync(process.execPath, ["validate-handoff.mjs", ...args], {
    cwd: fixture,
    encoding: "utf8",
  });
}

git("init", "-q");
writeFileSync(join(fixture, "HANDOFF.md"), validHandoff);
writeFileSync(join(fixture, "app.js"), "export const value = 1;\n");
git("add", ".");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
const base = git("rev-parse", "HEAD").trim();

writeFileSync(join(fixture, "app.js"), "export const value = 2;\n");
git("add", "app.js");
const missing = validate("staged");
assert.notEqual(missing.status, 0);
assert.match(missing.stderr, /HANDOFF\.md is not included/);

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace("상태: 진행 중", "상태: 검토 중"));
git("add", "HANDOFF.md");
const cosmetic = validate("staged");
assert.notEqual(cosmetic.status, 0);
assert.match(cosmetic.stderr, /non-semantic content/);

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace(`갱신: ${today}`, "갱신: 2000-01-01"));
git("add", "HANDOFF.md");
const staleDate = validate("staged");
assert.notEqual(staleDate.status, 0);
assert.match(staleDate.stderr, /current Asia\/Seoul date/);

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace("- fixture", "- branch: stale-branch"));
git("add", "HANDOFF.md");
const staleGit = validate("staged");
assert.notEqual(staleGit.status, 0);
assert.match(staleGit.stderr, /must not cache volatile branch or commit/);

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace("다음 작업: validator", "다음 작업: bootstrap"));
git("add", "HANDOFF.md");
const completedAsNext = validate("staged");
assert.notEqual(completedAsNext.status, 0);
assert.match(completedAsNext.stderr, /lists completed work as next work/);

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace("- 초기화", "- 변경 완료"));
git("add", "HANDOFF.md");
assert.equal(validate("staged").status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "task");
assert.equal(validate("range", base).status, 0);

process.stdout.write("Handoff validator regression tests: PASS\n");
