#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  applyFullStackTransaction,
  readProfile,
  runFullStackMaterializer,
} from "./fullstack-materializer.mjs";

const fixture = resolve("evals/fixtures/fullstack-materializer");
const source = resolve(fixture, "source");
const profilePath = resolve(fixture, "profile.json");
const profile = readProfile(profilePath);
const cli = resolve("scripts/materialize-fullstack.mjs");
const target = mkdtempSync(join(tmpdir(), "fullstack-target-"));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

let result = run("preview", target, profilePath, source);
assert.equal(result.status, 0, result.stderr);
const preview = JSON.parse(result.stdout);
assert.equal(preview.status, "PREVIEW");
assert.equal(preview.databaseExecution, "NOT-RUN");
assert.deepEqual(new Set(preview.plan.map((item) => item.layer)), new Set(["frontend", "backend", "shared", "migration"]));
assert.equal(existsSync(join(target, "apps/frontend/app.txt")), false);

result = run("apply", target, profilePath, source);
assert.equal(result.status, 2);
assert.equal(run("apply", target, profilePath, source, "--approve").status, 0);
for (const path of [
  "apps/frontend/app.txt",
  "apps/backend/app.txt",
  "shared/api.json",
  "database/migrations/001_create_items.up.sql",
  "database/migrations/001_create_items.down.sql",
]) assert.equal(existsSync(join(target, path)), true);
assert.equal(existsSync(join(target, ".ai/manifests/fullstack-materialization.lock.json")), true);
assert.equal(existsSync(join(target, ".ai/manifests/fullstack-materialization.rollback.json")), true);
assert.equal(run("validate", target, profilePath, source).status, 0);

result = run("rollback", target, profilePath, source);
assert.equal(result.status, 2);
result = run("rollback", target, profilePath, source, "--approve");
assert.equal(result.status, 0, result.stderr);
const rollback = JSON.parse(result.stdout);
assert.equal(rollback.databaseExecution, "NOT-RUN");
assert.equal(rollback.databaseRollback, "ARTIFACT_ONLY");
assert.equal(existsSync(join(target, "apps/frontend/app.txt")), false);

const preserved = mkdtempSync(join(tmpdir(), "fullstack-preserved-"));
mkdirSync(join(preserved, "shared"), { recursive: true });
writeFileSync(join(preserved, "shared/api.json"), readFileSync(join(source, "shared/api.json")));
assert.equal(run("apply", preserved, profilePath, source, "--approve").status, 0);
assert.equal(run("rollback", preserved, profilePath, source, "--approve").status, 0);
assert.equal(existsSync(join(preserved, "shared/api.json")), true);

const collision = mkdtempSync(join(tmpdir(), "fullstack-collision-"));
mkdirSync(join(collision, "apps/frontend"), { recursive: true });
writeFileSync(join(collision, "apps/frontend/app.txt"), "downstream owner\n");
result = run("apply", collision, profilePath, source, "--approve");
assert.equal(result.status, 1);
assert.match(result.stdout, /existing target differs/);
assert.equal(existsSync(join(collision, "apps/backend/app.txt")), false);

const unsafe = structuredClone(profile);
unsafe.files[0].target = "../outside";
assert.match(
  runFullStackMaterializer("preview", unsafe, source, mkdtempSync(join(tmpdir(), "fullstack-unsafe-")))
    .errors.join("\n"),
  /safe relative path/,
);

const missingRollback = structuredClone(profile);
missingRollback.databaseMigrations[0].rollbackTarget = "database/migrations/missing.down.sql";
assert.match(
  runFullStackMaterializer("preview", missingRollback, source, mkdtempSync(join(tmpdir(), "fullstack-pair-")))
    .errors.join("\n"),
  /must reference materialized up and rollback files/,
);

const forbiddenExecution = structuredClone(profile);
forbiddenExecution.databaseMigrations[0].execution = "execute";
assert.match(
  runFullStackMaterializer("preview", forbiddenExecution, source, mkdtempSync(join(tmpdir(), "fullstack-db-")))
    .errors.join("\n"),
  /execution must remain not authorized/,
);

const transactionTarget = mkdtempSync(join(tmpdir(), "fullstack-transaction-"));
const first = join(transactionTarget, "first");
const second = join(transactionTarget, "second");
writeFileSync(first, "before\n");
let writes = 0;
assert.throws(() => applyFullStackTransaction([
  { kind: "write", path: first, bytes: Buffer.from("after\n") },
  { kind: "write", path: second, bytes: Buffer.from("created\n") },
], {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync: (path, bytes) => {
    writes += 1;
    if (writes === 2) throw new Error("synthetic partial failure");
    writeFileSync(path, bytes);
  },
}), /was restored/);
assert.equal(readFileSync(first, "utf8"), "before\n");
assert.equal(existsSync(second), false);

const driftTarget = mkdtempSync(join(tmpdir(), "fullstack-drift-"));
assert.equal(run("apply", driftTarget, profilePath, source, "--approve").status, 0);
writeFileSync(join(driftTarget, "apps/backend/app.txt"), "drift\n");
assert.match(
  runFullStackMaterializer("validate", profile, source, driftTarget).errors.join("\n"),
  /locked target drift/,
);

process.stdout.write("REQ-045 initial full-stack materialization, transaction restore and DB rollback contract Eval: PASS\n");
