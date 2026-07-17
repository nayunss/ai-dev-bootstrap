#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = mkdtempSync(join(tmpdir(), "dependency-approval-"));
const validator = join(process.cwd(), "scripts/validate-dependency-upgrades.mjs");
mkdirSync(join(fixture, ".ai/approvals"), { recursive: true });

function git(...args) {
  return execFileSync("git", args, { cwd: fixture, encoding: "utf8" });
}
function writePackage(version) {
  writeFileSync(join(fixture, "package.json"), `${JSON.stringify({ name: "fixture", dependencies: { example: version } }, null, 2)}\n`);
}
function writeApprovals(entries) {
  writeFileSync(join(fixture, ".ai/approvals/dependency-upgrades.json"), `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\n`);
}
function approval(overrides) {
  return {
    id: "DEP-001",
    package: "example",
    manifest: "package.json",
    from: "1.0.0",
    to: "2.0.0",
    reason: "fixture",
    migration: "review API changes",
    validation: ["unit", "build"],
    rollback: "revert commit",
    approvedBy: "fixture-owner",
    approvedAt: "2026-07-11",
    expiresAt: "2099-12-31",
    status: "approved",
    ...overrides,
  };
}
function validate() {
  return spawnSync(process.execPath, [validator, "staged"], { cwd: fixture, encoding: "utf8" });
}
function sha(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

git("init", "-q");
writePackage("1.0.0");
writeFileSync(join(fixture, "package-lock.json"), "lock-one\n");
writeApprovals([]);
git("add", ".");
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "initial");

writePackage("2.0.0");
writeFileSync(join(fixture, "package-lock.json"), "lock-two\n");
git("add", "package.json", "package-lock.json");
const deniedVersion = validate();
assert.notEqual(deniedVersion.status, 0);
assert.match(deniedVersion.stderr, /Unapproved dependency version change/);

writeApprovals([approval()]);
git("add", ".ai/approvals/dependency-upgrades.json");
assert.equal(validate().status, 0);
git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "approved version");

const oldLock = "lock-two\n";
const newLock = "lock-three\n";
writeFileSync(join(fixture, "package-lock.json"), newLock);
writeApprovals([]);
git("add", "package-lock.json", ".ai/approvals/dependency-upgrades.json");
const deniedLock = validate();
assert.notEqual(deniedLock.status, 0);
assert.match(deniedLock.stderr, /Unapproved lockfile-only change/);

writeApprovals([
  approval({
    id: "DEP-LOCK-001",
    package: "__lockfile__",
    manifest: "package-lock.json",
    from: sha(oldLock),
    to: sha(newLock),
  }),
]);
git("add", ".ai/approvals/dependency-upgrades.json");
assert.equal(validate().status, 0);

git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qam", "approved lock");
writeApprovals([approval({ expiresAt: "2026-01-01" })]);
git("add", ".ai/approvals/dependency-upgrades.json");
assert.equal(validate().status, 0, "expired historical approval must not block unrelated changes");
git("reset", "-q", "HEAD", ".ai/approvals/dependency-upgrades.json");

writePackage("3.0.0");
writeApprovals([approval({ from: "2.0.0", to: "3.0.0", expiresAt: "2026-01-01" })]);
git("add", "package.json", ".ai/approvals/dependency-upgrades.json");
const expiredVersion = validate();
assert.notEqual(expiredVersion.status, 0);
assert.match(expiredVersion.stderr, /Unapproved dependency version change/);

process.stdout.write("Dependency upgrade approval regression tests: PASS\n");
