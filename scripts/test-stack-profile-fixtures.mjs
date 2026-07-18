#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runStackProfileFixture, validateStackProfile } from "./stack-profile-fixtures.mjs";

const names = ["react-vite", "node-express-postgresql", "next-postgresql", "react-node-postgresql-workspace"];
const read = (name) => JSON.parse(readFileSync(`evals/fixtures/stack-profiles/${name}.json`, "utf8"));
for (const name of names) {
  const profile = read(name);
  assert.equal(validateStackProfile(profile).valid, true, name);
  const target = mkdtempSync(join(tmpdir(), `stack-${name}-`));
  let result = runStackProfileFixture("preview", profile, target);
  assert.equal(result.status, "PREVIEW");
  assert.equal(result.plan.every((item) => item.action === "create"), true);
  assert.equal(existsSync(join(target, profile.artifacts[0].path)), false);
  assert.deepEqual(result.execution, { dependencyInstall: "NOT_RUN", databaseMigration: "NOT_RUN", providerWrite: "NOT_RUN", productionDeploy: "NOT_RUN" });
  result = runStackProfileFixture("apply", profile, target);
  assert.equal(result.status, "APPROVAL_REQUIRED");
  result = runStackProfileFixture("apply", profile, target, { approved: true });
  assert.equal(result.status, "PASS");
  assert.equal(runStackProfileFixture("validate", profile, target).status, "PASS");
  result = runStackProfileFixture("rollback", profile, target, { approved: true });
  assert.equal(result.status, "PASS");
  assert.equal(result.databaseRollback, "ARTIFACT_ONLY_NOT_EXECUTED");
  assert.equal(existsSync(join(target, profile.artifacts[0].path)), false);
}

const retrofitProfile = read("react-node-postgresql-workspace");
const retrofit = mkdtempSync(join(tmpdir(), "stack-retrofit-"));
const preservedArtifact = retrofitProfile.artifacts.find((artifact) => artifact.path === "apps/web/package.json");
mkdirSync(dirname(join(retrofit, preservedArtifact.path)), { recursive: true });
writeFileSync(join(retrofit, preservedArtifact.path), preservedArtifact.content);
writeFileSync(join(retrofit, "owner.txt"), "preserve\n");
let result = runStackProfileFixture("apply", retrofitProfile, retrofit, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(result.plan.find((item) => item.path === preservedArtifact.path).action, "preserve-identical");
assert.equal(runStackProfileFixture("rollback", retrofitProfile, retrofit, { approved: true }).status, "PASS");
assert.equal(readFileSync(join(retrofit, preservedArtifact.path), "utf8"), preservedArtifact.content);
assert.equal(readFileSync(join(retrofit, "owner.txt"), "utf8"), "preserve\n");

const collision = mkdtempSync(join(tmpdir(), "stack-collision-"));
mkdirSync(join(collision, "apps/web"), { recursive: true });
writeFileSync(join(collision, "apps/web/package.json"), "owner content\n");
result = runStackProfileFixture("apply", retrofitProfile, collision, { approved: true });
assert.equal(result.status, "BLOCKED");
assert.equal(existsSync(join(collision, "apps/api/package.json")), false);
assert.equal(readFileSync(join(collision, "apps/web/package.json"), "utf8"), "owner content\n");

const missingPair = read("node-express-postgresql");
missingPair.database.migrationPairs[0].down = "database/missing.down.sql";
assert.match(validateStackProfile(missingPair).errors.map((item) => item.code).join("\n"), /STACK_MIGRATION_PAIR/);

const dependencyExecution = read("react-vite");
dependencyExecution.execution.dependencyInstall = "RUN";
assert.match(validateStackProfile(dependencyExecution).errors.map((item) => item.code).join("\n"), /STACK_EXECUTION_BOUNDARY/);

const invalidWorkspace = read("react-node-postgresql-workspace");
invalidWorkspace.applications.pop();
assert.match(validateStackProfile(invalidWorkspace).errors.map((item) => item.code).join("\n"), /STACK_WORKSPACE_APPLICATIONS/);

const driftProfile = read("next-postgresql");
const drift = mkdtempSync(join(tmpdir(), "stack-drift-"));
assert.equal(runStackProfileFixture("apply", driftProfile, drift, { approved: true }).status, "PASS");
writeFileSync(join(drift, "package.json"), "drift\n");
assert.match(runStackProfileFixture("validate", driftProfile, drift).errors.join("\n"), /target drift/);

process.stdout.write("REQ-026–REQ-045 P0 stack/DB clean, retrofit, collision and rollback fixture Eval: PASS\n");
