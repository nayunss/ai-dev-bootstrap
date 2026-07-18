#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadDevelopmentProfile } from "./development-profile.mjs";
import {
  applyDevelopmentProfileMaterialization,
  planDevelopmentProfileMaterialization,
} from "./materialize-development-profile.mjs";

const profile = loadDevelopmentProfile("evals/fixtures/development-profile/single-frontend.profile.yaml");
const populateRepository = (root) => {
  mkdirSync(join(root, "web"), { recursive: true });
  writeFileSync(join(root, "web/package.json"), "{}\n");
  writeFileSync(join(root, "web/package-lock.json"), "{}\n");
};

const initial = mkdtempSync(join(tmpdir(), "profile-materializer-initial-"));
const preview = planDevelopmentProfileMaterialization(initial, profile);
assert.equal(preview.mode, "initial");
assert.equal(preview.action, "create");
assert.equal(existsSync(join(initial, preview.destination)), false);
assert.deepEqual(preview.changes, [{ operation: "create", path: "docs/development-environment.profile.yaml" }]);
assert.deepEqual([...new Set(preview.questions.map((item) => item.category))], ["project", "personal", "review"]);
assert.equal(preview.externalActions.providerWrite, "NOT_RUN");
assert.equal(preview.externalActions.dependencyInstall, "NOT_RUN");

const applied = applyDevelopmentProfileMaterialization(initial, profile);
assert.equal(applied.action, "create");
const destination = join(initial, applied.destination);
assert.equal(existsSync(destination), true);
const canonical = readFileSync(destination, "utf8");
assert.equal(canonical, readFileSync("evals/fixtures/development-profile/single-frontend.profile.yaml", "utf8"));

const preserved = applyDevelopmentProfileMaterialization(initial, profile);
assert.equal(preserved.mode, "retrofit");
assert.equal(preserved.action, "preserve");
assert.equal(readFileSync(destination, "utf8"), canonical);

const retrofit = mkdtempSync(join(tmpdir(), "profile-materializer-retrofit-"));
populateRepository(retrofit);
writeFileSync(join(retrofit, "owner-source.txt"), "preserve me\n");
const retrofitPlan = planDevelopmentProfileMaterialization(retrofit, profile);
assert.equal(retrofitPlan.mode, "retrofit");
assert.equal(existsSync(join(retrofit, retrofitPlan.destination)), false);
applyDevelopmentProfileMaterialization(retrofit, profile);
assert.equal(readFileSync(join(retrofit, "owner-source.txt"), "utf8"), "preserve me\n");

const conflictProfile = structuredClone(profile);
conflictProfile.profileId = "different-profile";
const beforeConflict = readFileSync(destination, "utf8");
const conflict = applyDevelopmentProfileMaterialization(initial, conflictProfile);
assert.equal(conflict.action, "blocked");
assert.match(conflict.blockers.map((item) => item.code).join("\n"), /PROFILE_EXISTING_CONFLICT/);
assert.equal(readFileSync(destination, "utf8"), beforeConflict);

const weakened = structuredClone(profile);
weakened.settings.teamRequired = weakened.settings.teamRequired.filter((item) => item !== "gate/security");
const weakPlan = planDevelopmentProfileMaterialization(retrofit, weakened);
assert.equal(weakPlan.action, "blocked");
assert.match(weakPlan.blockers.map((item) => item.code).join("\n"), /PROFILE_TEAM_BASELINE_MISSING/);

const boundaryConflict = structuredClone(profile);
boundaryConflict.settings.personalChoice.push("gate/security");
const boundaryPlan = planDevelopmentProfileMaterialization(retrofit, boundaryConflict);
assert.equal(boundaryPlan.action, "blocked");
assert.match(boundaryPlan.blockers.map((item) => item.code).join("\n"), /PROFILE_SETTING_BOUNDARY_CONFLICT/);

const cliRoot = mkdtempSync(join(tmpdir(), "profile-materializer-cli-"));
populateRepository(cliRoot);
const input = join(cliRoot, "profile.json");
writeFileSync(input, `${JSON.stringify(profile, null, 2)}\n`);
const cli = resolve("scripts/materialize-development-profile.mjs");
let result = spawnSync(process.execPath, [cli, cliRoot, input, "--json"], { encoding: "utf8" });
assert.equal(result.status, 0);
assert.equal(existsSync(join(cliRoot, "docs/development-environment.profile.yaml")), false);
assert.equal(JSON.parse(result.stdout).action, "create");
result = spawnSync(process.execPath, [cli, cliRoot, input, "--approve", "--json"], { encoding: "utf8" });
assert.equal(result.status, 0);
assert.equal(existsSync(join(cliRoot, "docs/development-environment.profile.yaml")), true);

const collisionRoot = mkdtempSync(join(tmpdir(), "profile-materializer-collision-"));
populateRepository(collisionRoot);
mkdirSync(join(collisionRoot, "docs"), { recursive: true });
writeFileSync(join(collisionRoot, "docs/development-environment.profile.yaml"), "owner content\n");
const collisionInput = join(collisionRoot, "profile.json");
writeFileSync(collisionInput, `${JSON.stringify(profile)}\n`);
result = spawnSync(process.execPath, [cli, collisionRoot, collisionInput, "--approve", "--json"], { encoding: "utf8" });
assert.equal(result.status, 1);
assert.equal(readFileSync(join(collisionRoot, "docs/development-environment.profile.yaml"), "utf8"), "owner content\n");

process.stdout.write("REQ-020–REQ-021 initial, retrofit, question, settings-boundary and collision materialization fixtures: PASS\n");
