#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateTrialPlan } from "./validate-skill-evolution-trial.mjs";

const root = process.cwd();
const fixture = resolve("evals/fixtures/skill-evolution/trial-plan.offline.json");
const plan = JSON.parse(readFileSync(fixture, "utf8"));
assert.equal(validateTrialPlan(plan, { root }).valid, true);

const network = structuredClone(plan);
network.execution.network = "approved-only";
assert.match(validateTrialPlan(network, { root }).errors.join("\n"), /network must be deny/);

const exposed = structuredClone(plan);
exposed.datasets.test.accessibleDuringTrial = true;
assert.match(validateTrialPlan(exposed, { root }).errors.join("\n"), /held-out test must be inaccessible/);

const duplicateSeeds = structuredClone(plan);
duplicateSeeds.execution.seeds = [1, 1, 1];
assert.match(validateTrialPlan(duplicateSeeds, { root }).errors.join("\n"), /distinct integer/);

const forgedApproval = structuredClone(plan);
forgedApproval.approval.status = "approved";
assert.match(validateTrialPlan(forgedApproval, { root }).errors.join("\n"), /approval must remain pending/);

const release = validateTrialPlan(plan, { root, release: true });
assert.equal(release.valid, false);
assert.match([...release.errors, ...release.blockers].join("\n"), /live-trial|approval\.status|candidateSha256/);

const result = spawnSync(process.execPath, [
  resolve("scripts/validate-skill-evolution-trial.mjs"),
  fixture,
  "--expect-dry-run",
], { cwd: root, encoding: "utf8" });
assert.equal(result.status, 0);
assert.match(result.stdout, /no model call performed/);

process.stdout.write("REQ-041 offline harness and live-call approval gate Eval: PASS\n");
