#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runReleaseAdoption, validateReleaseAdoptionManifest } from "./release-adoption.mjs";
import { runCliAdoption, runWebAdoption } from "./release-adoption-surfaces.mjs";

const root = process.cwd();
const read = (version) => JSON.parse(readFileSync(`evals/fixtures/release-adoption/${version}.json`, "utf8"));
const target = (name) => mkdtempSync(join(tmpdir(), `release-adoption-${name}-`));
const v1 = read("v1");
const v2 = read("v2");

assert.equal(validateReleaseAdoptionManifest(v1, root).valid, true);
assert.equal(validateReleaseAdoptionManifest(v2, root).valid, true);

const clean = target("clean");
const cliPreview = runCliAdoption("preview", v1, root, clean);
const webPreview = runWebAdoption("preview", v1, root, clean);
assert.equal(cliPreview.status, "PREVIEW");
assert.equal(webPreview.status, "PREVIEW");
assert.deepEqual(webPreview.entries, cliPreview.entries);
assert.equal(webPreview.planSha256, cliPreview.planSha256);
assert.equal(existsSync(join(clean, "package.json")), false);
assert.deepEqual(cliPreview.execution, {
  network: "NOT_RUN",
  telemetry: "DISABLED",
  dependencyInstall: "NOT_RUN",
  databaseMigration: "NOT_RUN",
  providerWrite: "NOT_RUN",
  productionDeploy: "NOT_RUN",
});
let result = runReleaseAdoption("apply", v1, root, clean, { surface: "web" });
assert.equal(result.status, "APPROVAL_REQUIRED");
result = runReleaseAdoption("apply", v1, root, clean, { surface: "web", approved: true });
assert.equal(result.status, "PASS");
assert.equal(result.planSha256, cliPreview.planSha256);
assert.equal(existsSync(join(clean, "package.json")), true);
assert.equal(existsSync(join(clean, ".ai/skills/requirements/SKILL.md")), true);
assert.equal(existsSync(join(clean, ".codex/skills/frontend/SKILL.md")), true);
assert.equal(runReleaseAdoption("validate", v1, root, clean).status, "PASS");
result = runReleaseAdoption("rollback", v1, root, clean);
assert.equal(result.status, "APPROVAL_REQUIRED");
result = runReleaseAdoption("rollback", v1, root, clean, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(result.restoredRelease, null);
assert.equal(existsSync(join(clean, "package.json")), false);
assert.equal(existsSync(join(clean, ".ai/manifests/release-adoption.lock.json")), false);

const retrofit = target("retrofit");
const starter = JSON.parse(readFileSync("evals/fixtures/stack-profiles/react-vite.json", "utf8"));
const packageArtifact = starter.artifacts.find((artifact) => artifact.path === "package.json");
writeFileSync(join(retrofit, "package.json"), packageArtifact.content);
writeFileSync(join(retrofit, "owner.txt"), "preserve\n");
result = runReleaseAdoption("apply", v1, root, retrofit, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(result.entries.find((entry) => entry.path === "package.json").action, "preserve-identical");
result = runReleaseAdoption("rollback", v1, root, retrofit, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(readFileSync(join(retrofit, "package.json"), "utf8"), packageArtifact.content);
assert.equal(readFileSync(join(retrofit, "owner.txt"), "utf8"), "preserve\n");

const upgrade = target("upgrade");
assert.equal(runReleaseAdoption("apply", v1, root, upgrade, { approved: true }).status, "PASS");
const oldSkill = readFileSync(join(upgrade, ".ai/skills/requirements/SKILL.md"), "utf8");
result = runReleaseAdoption("upgrade", v2, root, upgrade, { surface: "cli" });
assert.equal(result.status, "APPROVAL_REQUIRED");
result = runReleaseAdoption("upgrade", v2, root, upgrade, { surface: "cli", approved: true });
assert.equal(result.status, "PASS");
assert.match(readFileSync(join(upgrade, ".ai/skills/requirements/SKILL.md"), "utf8"), /Reject completion claims/);
assert.equal(runReleaseAdoption("validate", v2, root, upgrade).status, "PASS");
result = runReleaseAdoption("rollback", v2, root, upgrade, { approved: true });
assert.equal(result.status, "PASS");
assert.equal(result.restoredRelease, "1.0.0");
assert.equal(readFileSync(join(upgrade, ".ai/skills/requirements/SKILL.md"), "utf8"), oldSkill);
assert.equal(runReleaseAdoption("validate", v1, root, upgrade).status, "PASS");

const collision = target("collision");
mkdirSync(join(collision, "src"), { recursive: true });
writeFileSync(join(collision, "src/main.tsx"), "owner content\n");
result = runReleaseAdoption("apply", v1, root, collision, { approved: true });
assert.equal(result.status, "BLOCKED");
assert.equal(readFileSync(join(collision, "src/main.tsx"), "utf8"), "owner content\n");
assert.equal(existsSync(join(collision, "package.json")), false);
assert.equal(existsSync(join(collision, ".ai/manifests/release-adoption.lock.json")), false);

const manifestTamper = structuredClone(v1);
manifestTamper.release.commit = "3".repeat(40);
assert.match(validateReleaseAdoptionManifest(manifestTamper, root).errors.join("\n"), /manifest checksum drift|archive checksum drift/);

const componentTamper = structuredClone(v1);
componentTamper.components.stackProfile.sha256 = `sha256:${"4".repeat(64)}`;
assert.match(validateReleaseAdoptionManifest(componentTamper, root).errors.join("\n"), /stack profile checksum drift/);

const executionEscalation = structuredClone(v1);
executionEscalation.execution.network = "RUN";
assert.match(validateReleaseAdoptionManifest(executionEscalation, root).errors.join("\n"), /execution boundary/);

const partial = target("partial");
let writes = 0;
const failingIo = {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync(path, bytes) {
    writes += 1;
    if (writes === 2) throw new Error("synthetic second write failure");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  },
};
result = runReleaseAdoption("apply", v1, root, partial, { approved: true, io: failingIo });
assert.equal(result.status, "FAIL");
assert.equal(existsSync(join(partial, "package.json")), false);
assert.equal(existsSync(join(partial, ".ai/skills/requirements/SKILL.md")), false);
assert.equal(existsSync(join(partial, ".ai/manifests/release-adoption.lock.json")), false);

const drift = target("drift");
assert.equal(runReleaseAdoption("apply", v1, root, drift, { approved: true }).status, "PASS");
writeFileSync(join(drift, "package.json"), "drift\n");
assert.match(runReleaseAdoption("validate", v1, root, drift).errors.join("\n"), /target drift/);
assert.equal(runReleaseAdoption("rollback", v1, root, drift, { approved: true }).status, "BLOCKED");
assert.equal(readFileSync(join(drift, "package.json"), "utf8"), "drift\n");

process.stdout.write("REQ-047 shared CLI/web release adoption clean, upgrade, rollback, tamper and partial-failure Eval: PASS\n");
