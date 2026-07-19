#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { validateRequirementHandoffTasks } from "./validate-requirement-handoff-tasks.mjs";

const input = {
  requirements: readFileSync("docs/requirements.md", "utf8"),
  triage: readFileSync("docs/downstream-feedback-requirement-triage.md", "utf8"),
  handoff: readFileSync("HANDOFF.md", "utf8"),
};

assert.deepEqual(validateRequirementHandoffTasks(input), []);

const missingTask = {
  ...input,
  requirements: input.requirements.replace(
    /^\| 비개발자 도입 \| REQ-047 \|.+\| `REQ-047-gui-installer-delivery` \|/mu,
    "| 비개발자 도입 | REQ-047 | 미완료 fixture | NOT-RUN | `REQ-047-one-click-adoption`, `REQ-047-gui-installer-delivery` |",
  ),
};
assert.match(validateRequirementHandoffTasks(missingTask).join("\n"), /missing from HANDOFF remaining work: REQ-047-one-click-adoption/);

const completedTask = {
  ...missingTask,
};
assert.match(validateRequirementHandoffTasks(completedTask).join("\n"), /marks completed HANDOFF task as incomplete/);

const commonTaskInExternal = {
  ...missingTask,
  handoff: input.handoff.replace(
    "### 외부 입력·실제 환경 대기\n",
    "### 외부 입력·실제 환경 대기\n\n0. [작업:REQ-047-one-click-adoption] 잘못 분류된 공통 구현\n",
  ),
};
assert.match(validateRequirementHandoffTasks(commonTaskInExternal).join("\n"), /REQ-047-one-click-adoption: requirements follow-up task must be listed in HANDOFF common|must not be listed in HANDOFF external/);

const missingReqScope = {
  ...input,
  handoff: input.handoff.replace("REQ-049–REQ-052와\n   REQ-046 보강", "REQ-049–REQ-052 보강"),
};
assert.match(validateRequirementHandoffTasks(missingReqScope).join("\n"), /UF-001-013-downstream-revalidation: HANDOFF is missing required scope REQ-046/);

const unexpectedReqScope = {
  ...input,
  handoff: input.handoff.replace("REQ-049–REQ-052와\n   REQ-046 보강", "REQ-048–REQ-052와\n   REQ-046 보강"),
};
assert.match(validateRequirementHandoffTasks(unexpectedReqScope).join("\n"), /UF-001-013-downstream-revalidation: HANDOFF has unexpected REQ scope REQ-048/);

const revalidationInCommon = {
  ...input,
  handoff: input.handoff
    .replace(
      /\d+\. \[작업:UF-001-013-downstream-revalidation\]([\s\S]*?해결 처리하지 않는다\.)\n/u,
      "",
    )
    .replace(
      "### 공통 저장소에서 진행 가능\n",
      "### 공통 저장소에서 진행 가능\n\n0. [작업:UF-001-013-downstream-revalidation] REQ-049–REQ-052와 REQ-046, UF-001–UF-013\n",
    ),
};
assert.match(validateRequirementHandoffTasks(revalidationInCommon).join("\n"), /UF-001-013-downstream-revalidation: must be listed in HANDOFF external/);

const fixture = mkdtempSync(join(tmpdir(), "requirement-handoff-tasks-"));
for (const path of [
  "scripts/validate-requirement-handoff-tasks.mjs",
  "docs/requirements.md",
  "docs/downstream-feedback-requirement-triage.md",
  "HANDOFF.md",
]) {
  const target = join(fixture, path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(path, target);
}
const git = (...args) => execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
const validate = (...args) => spawnSync(process.execPath, ["scripts/validate-requirement-handoff-tasks.mjs", ...args], {
  cwd: fixture,
  encoding: "utf8",
});
git("init", "-q");
git("add", ".");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
const base = git("rev-parse", "HEAD").trim();
writeFileSync(join(fixture, "docs/requirements.md"), `${input.requirements}\n`);
git("add", "docs/requirements.md");
assert.match(validate("staged").stderr, /changed without HANDOFF\.md/);
writeFileSync(join(fixture, "HANDOFF.md"), `${input.handoff}\n`);
git("add", "HANDOFF.md");
assert.equal(validate("staged").status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "synchronized");
assert.equal(validate("range", base).status, 0);

process.stdout.write("Requirement/HANDOFF task reconciliation negative fixtures: PASS\n");
