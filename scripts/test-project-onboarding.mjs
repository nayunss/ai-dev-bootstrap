#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const materializer = resolve("scripts/materialize-project-onboarding.mjs");
const run = (target) => spawnSync(process.execPath, [materializer, target], {
  cwd: root,
  encoding: "utf8",
});

const initial = mkdtempSync(join(tmpdir(), "project-onboarding-initial-"));
let result = run(initial);
assert.equal(result.status, 0);
for (const file of [
  "docs/production-readiness.json",
  "docs/skill-evolution-trial.json",
  "docs/upstream-adoption.json",
]) assert.equal(existsSync(join(initial, file)), true);
assert.match(result.stdout, /legal\/privacy owner/);
assert.match(result.stdout, /exact model, harness and adapter version/);
assert.match(result.stdout, /upstream release\/tag/);
assert.equal(JSON.parse(readFileSync(join(initial, "docs/production-readiness.json"))).productionDecision, "blocked");
assert.equal(JSON.parse(readFileSync(join(initial, "docs/skill-evolution-trial.json"))).status, "TBD");
assert.equal(JSON.parse(readFileSync(join(initial, "docs/upstream-adoption.json"))).approval.status, "pending");

writeFileSync(join(initial, "docs/skill-evolution-trial.json"), "{\"owner\":\"preserved\"}\n");
result = run(initial);
assert.equal(result.status, 0);
assert.match(result.stdout, /preserve existing: docs\/skill-evolution-trial\.json/);
assert.equal(readFileSync(join(initial, "docs/skill-evolution-trial.json"), "utf8"), "{\"owner\":\"preserved\"}\n");

const retrofit = mkdtempSync(join(tmpdir(), "project-onboarding-retrofit-"));
writeFileSync(join(retrofit, "existing.txt"), "owner project\n");
result = run(retrofit);
assert.equal(result.status, 0);
assert.equal(readFileSync(join(retrofit, "existing.txt"), "utf8"), "owner project\n");
assert.match(result.stdout, /created blocked template/);

process.stdout.write("Project initial onboarding and existing-project retrofit fixtures: PASS\n");
