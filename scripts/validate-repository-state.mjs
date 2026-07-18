#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA256 = /^sha256:[a-f0-9]{64}$/u;

function hash(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function safePath(root, path) {
  if (
    typeof path !== "string"
    || !path
    || isAbsolute(path)
    || path.split(/[\\/]/u).includes("..")
    || path.split(/[\\/]/u).some((part) => part.startsWith(".env"))
  ) throw new Error(`unsafe repository path: ${path}`);
  const target = resolve(root, path);
  const rel = relative(root, target);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`path escapes repository: ${path}`);
  try {
    if (lstatSync(target).isSymbolicLink()) {
      const real = realpathSync(target);
      const realRel = relative(root, real);
      if (realRel.startsWith("..") || isAbsolute(realRel)) throw new Error(`symlink escapes repository: ${path}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return target;
}

function git(root, args, options = {}) {
  return execFileSync("git", args, { cwd: root, ...options });
}

function stagedBytes(root, path) {
  safePath(root, path);
  try {
    return git(root, ["show", `:${path}`], { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error(`path is not present in the staged tree: ${path}`);
  }
}

export function validateRepositoryState(profile, root = process.cwd()) {
  const errors = [];
  if (profile?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(profile?.generatedArtifacts)) errors.push("generatedArtifacts must be an array");
  if (
    !Array.isArray(profile?.checkOnlySourcePaths)
    || profile.checkOnlySourcePaths.length === 0
    || new Set(profile.checkOnlySourcePaths).size !== profile.checkOnlySourcePaths.length
  ) errors.push("checkOnlySourcePaths must contain unique paths");
  for (const path of profile?.checkOnlySourcePaths ?? []) {
    try {
      safePath(root, path);
      git(root, ["ls-files", "--error-unmatch", "--", path], { stdio: "pipe" });
    } catch (error) {
      errors.push(error.message.includes("unsafe") ? error.message : `check-only source is not tracked: ${path}`);
    }
  }
  const artifactPaths = new Set();
  for (const artifact of profile?.generatedArtifacts ?? []) {
    if (artifactPaths.has(artifact?.path)) errors.push(`duplicate generated artifact: ${artifact?.path}`);
    artifactPaths.add(artifact?.path);
    if (artifact?.tree !== "staged") errors.push(`${artifact?.path}: tree must be staged`);
    if (!SHA256.test(artifact?.sha256 ?? "")) errors.push(`${artifact?.path}: sha256 is invalid`);
    try {
      if (hash(stagedBytes(root, artifact.path)) !== artifact.sha256) errors.push(`${artifact.path}: staged artifact hash differs`);
    } catch (error) {
      errors.push(error.message);
    }
    if (!Array.isArray(artifact?.sourceHashes) || artifact.sourceHashes.length === 0) {
      errors.push(`${artifact?.path}: sourceHashes requires at least one staged source`);
      continue;
    }
    const sourcePaths = new Set();
    for (const source of artifact.sourceHashes) {
      if (sourcePaths.has(source?.path)) errors.push(`${artifact.path}: duplicate source path ${source?.path}`);
      sourcePaths.add(source?.path);
      if (!SHA256.test(source?.sha256 ?? "")) errors.push(`${artifact.path}: invalid source hash ${source?.path}`);
      try {
        if (hash(stagedBytes(root, source.path)) !== source.sha256) {
          errors.push(`${artifact.path}: staged source hash differs for ${source.path}`);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  return { errors, valid: errors.length === 0 };
}

export function captureTrackedState(root, paths) {
  if (!Array.isArray(paths) || paths.length === 0 || new Set(paths).size !== paths.length) {
    throw new Error("tracked source paths must be unique and non-empty");
  }
  const state = new Map();
  for (const path of paths) {
    const target = safePath(root, path);
    try {
      git(root, ["ls-files", "--error-unmatch", "--", path], { stdio: "pipe" });
    } catch {
      throw new Error(`check-only source is not tracked: ${path}`);
    }
    state.set(path, hash(readFileSync(target)));
  }
  return state;
}

export function compareCheckOnlyState(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  const mutations = [...paths].filter((path) => before.get(path) !== after.get(path)).sort();
  return { mutations, unchanged: mutations.length === 0 };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write("Usage: validate-repository-state.mjs PROFILE.json\n");
    process.exit(2);
  }
  const result = validateRepositoryState(JSON.parse(readFileSync(resolve(path), "utf8")));
  if (!result.valid) {
    result.errors.forEach((error) => process.stderr.write(`FAIL: ${error}\n`));
    process.exit(1);
  }
  process.stdout.write("Repository staged-tree invariants: PASS\n");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
