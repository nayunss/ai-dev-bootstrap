#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = mkdtempSync(join(tmpdir(), "handoff-validator-"));
copyFileSync("scripts/validate-handoff.mjs", join(fixture, "validate-handoff.mjs"));

const validHandoff = `# Handoff

갱신: 2026-07-11 Asia/Seoul
상태: 진행 중

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

writeFileSync(join(fixture, "HANDOFF.md"), validHandoff.replace("- 초기화", "- 변경 완료"));
git("add", "HANDOFF.md");
assert.equal(validate("staged").status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "task");
assert.equal(validate("range", base).status, 0);

process.stdout.write("Handoff validator regression tests: PASS\n");
