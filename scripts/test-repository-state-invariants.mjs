#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureTrackedState,
  compareCheckOnlyState,
  validateRepositoryState,
} from "./validate-repository-state.mjs";

const root = mkdtempSync(join(tmpdir(), "repository-state-invariants-"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
git("init", "-q");
writeFileSync(join(root, "source.txt"), "staged source\n");
writeFileSync(join(root, "generated.txt"), "generated from staged source\n");
git("add", "source.txt", "generated.txt");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");

const profile = {
  schemaVersion: 1,
  generatedArtifacts: [{
    path: "generated.txt",
    tree: "staged",
    sha256: digest("generated from staged source\n"),
    sourceHashes: [{ path: "source.txt", sha256: digest("staged source\n") }],
  }],
  checkOnlySourcePaths: ["source.txt"],
};
assert.deepEqual(validateRepositoryState(profile, root), { errors: [], valid: true });

writeFileSync(join(root, "source.txt"), "unstaged source mutation\n");
const partialCommit = structuredClone(profile);
partialCommit.generatedArtifacts[0].sourceHashes[0].sha256 = digest("unstaged source mutation\n");
assert.match(validateRepositoryState(partialCommit, root).errors.join("\n"), /staged source hash differs/);

const workingTreeArtifact = structuredClone(profile);
writeFileSync(join(root, "generated.txt"), "generated from working tree\n");
workingTreeArtifact.generatedArtifacts[0].sha256 = digest("generated from working tree\n");
assert.match(validateRepositoryState(workingTreeArtifact, root).errors.join("\n"), /staged artifact hash differs/);

writeFileSync(join(root, "source.txt"), "staged source\n");
const before = captureTrackedState(root, profile.checkOnlySourcePaths);
const unchanged = captureTrackedState(root, profile.checkOnlySourcePaths);
assert.deepEqual(compareCheckOnlyState(before, unchanged), { mutations: [], unchanged: true });

writeFileSync(join(root, "source.txt"), "check command mutated source\n");
const afterMutation = captureTrackedState(root, profile.checkOnlySourcePaths);
assert.deepEqual(compareCheckOnlyState(before, afterMutation), {
  mutations: ["source.txt"],
  unchanged: false,
});

const unsafe = structuredClone(profile);
unsafe.checkOnlySourcePaths = [".env.example"];
assert.match(validateRepositoryState(unsafe, root).errors.join("\n"), /unsafe repository path/);

const missing = structuredClone(profile);
missing.generatedArtifacts[0].path = "missing.txt";
assert.match(validateRepositoryState(missing, root).errors.join("\n"), /not present in the staged tree/);

process.stdout.write("REQ-050 staged generated artifact, partial commit and check-only mutation Eval: PASS\n");
