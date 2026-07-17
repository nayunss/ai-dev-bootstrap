#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const mode = process.argv[2] ?? "full";
const base = process.argv[3];
const approvalPath = ".ai/approvals/dependency-upgrades.json";
const dependencyFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const lockfiles = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);

function git(args, allowFailure = false) {
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function refFor(side) {
  if (mode === "staged") return side === "before" ? "HEAD" : ":";
  if (mode === "range") return side === "before" ? base : "HEAD";
  return null;
}

function content(ref, path) {
  if (!ref) return existsSync(path) ? readFileSync(path, "utf8") : null;
  const spec = ref === ":" ? `:${path}` : `${ref}:${path}`;
  return git(["show", spec], true);
}

function files() {
  if (mode === "staged") return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).split("\0").filter(Boolean);
  if (mode === "range") {
    if (!base || /^0+$/.test(base)) throw new Error("A valid base commit is required for range mode.");
    return git(["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`]).split("\0").filter(Boolean);
  }
  return [];
}

function approvals() {
  const raw = content(refFor("after"), approvalPath);
  if (!raw) throw new Error(`${approvalPath} is required.`);
  const manifest = JSON.parse(raw);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new Error("Invalid dependency approval manifest schema.");
  const ids = new Set();
  for (const entry of manifest.entries) {
    for (const field of ["id", "package", "manifest", "from", "to", "reason", "migration", "rollback", "approvedBy", "approvedAt", "expiresAt", "status"]) {
      if (!entry[field]) throw new Error(`Dependency approval entry is missing ${field}.`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate dependency approval id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.status !== "approved") throw new Error(`${entry.id}: status must be approved.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.approvedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expiresAt)) throw new Error(`${entry.id}: invalid approval date.`);
    if (!Array.isArray(entry.validation) || entry.validation.length === 0) throw new Error(`${entry.id}: validation plan is required.`);
  }
  return manifest.entries;
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function active(entry) {
  return entry.expiresAt >= new Date().toISOString().slice(0, 10);
}

const entries = approvals();
const changed = files();
const versionChanges = [];
for (const path of changed.filter((file) => file.endsWith("package.json"))) {
  const beforeRaw = content(refFor("before"), path);
  const afterRaw = content(refFor("after"), path);
  if (!beforeRaw || !afterRaw) continue;
  const before = JSON.parse(beforeRaw);
  const after = JSON.parse(afterRaw);
  for (const field of dependencyFields) {
    const oldDependencies = before[field] ?? {};
    const newDependencies = after[field] ?? {};
    for (const name of Object.keys(oldDependencies)) {
      if (name in newDependencies && oldDependencies[name] !== newDependencies[name]) {
        versionChanges.push({ package: name, manifest: path, from: oldDependencies[name], to: newDependencies[name] });
      }
    }
  }
}

for (const change of versionChanges) {
  const approved = entries.some((entry) => active(entry) &&
    entry.package === change.package && entry.manifest === change.manifest && entry.from === change.from && entry.to === change.to,
  );
  if (!approved) throw new Error(`Unapproved dependency version change: ${change.manifest} ${change.package} ${change.from} -> ${change.to}`);
}

for (const path of changed.filter((file) => lockfiles.has(file.split("/").at(-1)))) {
  if (versionChanges.some((change) => change.manifest.startsWith(path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : ""))) continue;
  const before = content(refFor("before"), path);
  const after = content(refFor("after"), path);
  if (before === null || after === null || before === after) continue;
  const approved = entries.some((entry) => active(entry) &&
    entry.package === "__lockfile__" && entry.manifest === path && entry.from === sha256(before) && entry.to === sha256(after),
  );
  if (!approved) throw new Error(`Unapproved lockfile-only change: ${path} ${sha256(before)} -> ${sha256(after)}`);
}

process.stdout.write(`Dependency upgrade approval validation (${mode}): PASS\n`);
