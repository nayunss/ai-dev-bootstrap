#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  loadDevelopmentProfile,
  parseDevelopmentProfileYaml,
  serializeDevelopmentProfile,
  validateDevelopmentProfile,
} from "./development-profile.mjs";

const fixtureRoot = resolve("evals/fixtures/development-profile");
const profiles = [
  "single-frontend.profile.yaml",
  "backend.profile.yaml",
  "full-stack.profile.yaml",
  "workspace-monorepo.profile.yaml",
];
const now = new Date("2026-07-18T00:00:00Z");
const digest = (root) => {
  const hash = createHash("sha256");
  for (const path of ["profile.yaml", "web/package.json", "web/package-lock.json", "api/pom.xml", "api/dependency-lock.json", "api/pyproject.toml", "api/uv.lock", "apps/web/package.json", "packages/shared/package.json", "package-lock.json", "workspace-lock.json"]) {
    try { hash.update(path).update(readFileSync(join(root, path))); } catch {}
  }
  return hash.digest("hex");
};
const populate = (root, profile) => {
  writeFileSync(join(root, "profile.yaml"), serializeDevelopmentProfile(profile));
  for (const app of profile.applications) {
    mkdirSync(join(root, app.root), { recursive: true });
    for (const path of [app.manifest, app.lockfile]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), "{}\n");
    }
  }
};

for (const name of profiles) {
  const source = readFileSync(join(fixtureRoot, name), "utf8");
  const profile = parseDevelopmentProfileYaml(source);
  assert.equal(serializeDevelopmentProfile(profile), source);
  assert.equal(validateDevelopmentProfile(profile, { mode: "schema", now }).valid, true, name);
  assert.equal(validateDevelopmentProfile(profile, { mode: "semantic", now }).valid, true, name);
  const repository = mkdtempSync(join(tmpdir(), "development-profile-"));
  populate(repository, profile);
  const before = digest(repository);
  assert.equal(validateDevelopmentProfile(profile, { mode: "repository", repositoryRoot: repository, now }).valid, true, name);
  assert.equal(validateDevelopmentProfile(profile, { mode: "readiness", stage: "ci", repositoryRoot: repository, now }).ready, true, name);
  assert.equal(digest(repository), before, `${name} repository validation must be read-only`);
  const production = validateDevelopmentProfile(profile, { mode: "readiness", stage: "production", repositoryRoot: repository, now });
  assert.equal(production.ready, false);
  assert.match(production.blockers.map((item) => item.code).join("\n"), /PROFILE_PRODUCTION_SEPARATE_GATE/);
}

const valid = loadDevelopmentProfile(join(fixtureRoot, profiles[0]));
const evaluate = (profile, options = {}) => validateDevelopmentProfile(profile, { mode: "semantic", now, ...options });

const missingApplication = structuredClone(valid);
missingApplication.applications = [];
assert.match(evaluate(missingApplication).blockers.map((item) => item.code).join("\n"), /PROFILE_APPLICATION_REQUIRED/);

const pathEscape = structuredClone(valid);
pathEscape.applications[0].manifest = "../package.json";
assert.match(evaluate(pathEscape).blockers.map((item) => item.code).join("\n"), /PROFILE_UNSAFE_PATH/);

const envPath = structuredClone(valid);
envPath.applications[0].lockfile = "web/.env.example";
assert.match(evaluate(envPath).blockers.map((item) => item.code).join("\n"), /PROFILE_UNSAFE_PATH/);

const shellCommand = structuredClone(valid);
shellCommand.applications[0].commands.test.executable = "npm test && curl";
assert.match(evaluate(shellCommand).blockers.map((item) => item.code).join("\n"), /PROFILE_COMMAND_EXECUTABLE/);

const falseApproval = structuredClone(valid);
falseApproval.decisions[0].ownerRef = null;
assert.match(evaluate(falseApproval).blockers.map((item) => item.code).join("\n"), /PROFILE_FALSE_APPROVAL/);

const expired = structuredClone(valid);
expired.decisions[0].expiresAt = "2026-07-17";
assert.match(evaluate(expired).blockers.map((item) => item.code).join("\n"), /PROFILE_APPROVAL_EXPIRED/);

const versionDrift = structuredClone(valid);
versionDrift.applications[0].runtime.version = "latest";
assert.match(evaluate(versionDrift).blockers.map((item) => item.code).join("\n"), /PROFILE_VERSION_NOT_EXACT/);

const secret = structuredClone(valid);
secret.extensions["example.com"].apiToken = "forbidden";
assert.match(evaluate(secret).blockers.map((item) => item.code).join("\n"), /PROFILE_SECRET_FIELD/);

const futureVersion = structuredClone(valid);
futureVersion.schemaVersion = 2;
assert.match(evaluate(futureVersion).blockers.map((item) => item.code).join("\n"), /PROFILE_SCHEMA_VERSION/);

const driftRoot = mkdtempSync(join(tmpdir(), "development-profile-drift-"));
populate(driftRoot, valid);
writeFileSync(join(driftRoot, valid.applications[0].manifest), "");
assert.equal(evaluate(valid, { mode: "repository", repositoryRoot: driftRoot }).valid, true);
const missingRoot = mkdtempSync(join(tmpdir(), "development-profile-missing-"));
populate(missingRoot, valid);
const missingProfile = structuredClone(valid);
missingProfile.applications[0].manifest = "web/missing.json";
assert.match(evaluate(missingProfile, { mode: "repository", repositoryRoot: missingRoot }).blockers.map((item) => item.code).join("\n"), /PROFILE_REPOSITORY_MISSING/);

const symlinkRoot = mkdtempSync(join(tmpdir(), "development-profile-link-"));
cpSync(driftRoot, symlinkRoot, { recursive: true });
const symlinkProfile = structuredClone(valid);
symlinkProfile.applications[0].manifest = "web/outside.json";
symlinkSync("/tmp", join(symlinkRoot, "web/outside.json"));
assert.match(evaluate(symlinkProfile, { mode: "repository", repositoryRoot: symlinkRoot }).blockers.map((item) => item.code).join("\n"), /PROFILE_REPOSITORY_ESCAPE|PROFILE_FILE_TYPE/);

assert.throws(() => parseDevelopmentProfileYaml("schemaVersion: 1\nschemaVersion: 1\n"), /PROFILE_YAML_DUPLICATE_KEY/);
assert.throws(() => parseDevelopmentProfileYaml("schemaVersion: 1 \n"), /PROFILE_YAML_NON_CANONICAL/);

process.stdout.write("REQ-048 canonical development profile schema, semantic, repository drift and readiness fixtures: PASS\n");
