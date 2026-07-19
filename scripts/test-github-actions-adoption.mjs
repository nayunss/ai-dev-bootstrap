#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGitHubActionsAdoption } from "./github-actions-adoption.mjs";

const root = process.cwd();
const target = mkdtempSync(join(tmpdir(), "github-actions-adoption-"));
const git = (...args) => execFileSync("git", args, { cwd: target, encoding: "utf8" }).trim();
git("init", "-q");
writeFileSync(join(target, "owner.txt"), "preserve\n");
git("add", "owner.txt");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
const initial = git("rev-parse", "HEAD");

let result = runGitHubActionsAdoption({
  mode: "preview",
  release: "reference-v1",
  source: root,
  target,
});
assert.equal(result.status, "PREVIEW");
assert.match(result.planSha256, /^sha256:[a-f0-9]{64}$/u);
assert.equal(git("status", "--porcelain"), "");
assert.equal(git("rev-parse", "HEAD"), initial);

const planSha256 = result.planSha256;
result = runGitHubActionsAdoption({
  mode: "apply",
  release: "reference-v1",
  source: root,
  target,
});
assert.equal(result.status, "BLOCKED");
assert.equal(git("status", "--porcelain"), "");

result = runGitHubActionsAdoption({
  mode: "apply",
  release: "reference-v1",
  source: root,
  target,
  expectedPlanSha256: `sha256:${"0".repeat(64)}`,
  stage: true,
});
assert.equal(result.status, "BLOCKED");
assert.equal(git("status", "--porcelain"), "");

result = runGitHubActionsAdoption({
  mode: "apply",
  release: "reference-v1",
  source: root,
  target,
  expectedPlanSha256: planSha256,
  stage: true,
});
assert.equal(result.status, "PASS");
assert.equal(git("rev-parse", "HEAD"), initial);
assert.equal(git("diff", "--name-only"), "");
const staged = git("diff", "--cached", "--name-only").split("\n");
assert.equal(staged.includes("owner.txt"), false);
assert.equal(staged.includes("package.json"), true);
assert.equal(staged.includes(".ai/manifests/release-adoption.lock.json"), true);
assert.equal(readFileSync(join(target, "owner.txt"), "utf8"), "preserve\n");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "apply v1");
result = runGitHubActionsAdoption({
  mode: "preview",
  release: "reference-v2",
  source: root,
  target,
});
assert.equal(result.status, "PREVIEW");
assert.equal(result.counts?.update > 0 || result.entries.some((entry) => entry.action === "update-managed"), true);
result = runGitHubActionsAdoption({
  mode: "apply",
  release: "reference-v2",
  source: root,
  target,
  expectedPlanSha256: result.planSha256,
  stage: true,
});
assert.equal(result.status, "PASS");
assert.equal(git("diff", "--cached", "--name-only").includes(".ai/skills/requirements/SKILL.md"), true);

const dirty = mkdtempSync(join(tmpdir(), "github-actions-dirty-"));
const dirtyGit = (...args) => execFileSync("git", args, { cwd: dirty, encoding: "utf8" }).trim();
dirtyGit("init", "-q");
writeFileSync(join(dirty, "owner.txt"), "clean\n");
dirtyGit("add", "owner.txt");
dirtyGit("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");
writeFileSync(join(dirty, "owner.txt"), "dirty\n");
result = runGitHubActionsAdoption({
  mode: "preview",
  release: "reference-v1",
  source: root,
  target: dirty,
});
assert.equal(result.status, "BLOCKED");
assert.equal(readFileSync(join(dirty, "owner.txt"), "utf8"), "dirty\n");
result = runGitHubActionsAdoption({
  mode: "preview",
  release: "../../unreviewed",
  source: root,
  target: dirty,
});
assert.equal(result.status, "BLOCKED");

const workflow = readFileSync("docs/templates/github-actions-web-adoption-p0.yml", "utf8");
const action = readFileSync(".github/actions/release-adoption/action.yml", "utf8");
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /operation:[\s\S]*type: choice/);
assert.match(workflow, /preview:[\s\S]*permissions:[\s\S]*contents: read/);
assert.match(workflow, /apply:[\s\S]*permissions:[\s\S]*contents: write[\s\S]*pull-requests: write/);
assert.match(workflow, /environment: web-adoption-apply/);
assert.match(workflow, /github\.ref_name == github\.event\.repository\.default_branch/);
assert.match(workflow, /REPLACE_WITH_EXACT_UPSTREAM_COMMIT/);
assert.match(workflow, /gh pr create/);
assert.doesNotMatch(workflow, /pull_request_target|write-all|git push origin (?:main|master)|gh pr merge|secrets\./u);
assert.match(action, /using: composite/);
assert.doesNotMatch(action, /\$\{\{\s*secrets\./u);

process.stdout.write("REQ-047 GitHub Actions preview, approval, staged PR and least-privilege workflow fixture: PASS\n");
