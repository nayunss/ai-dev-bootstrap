#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const manifestRelative = ".ai/manifests/requirement-traceability.json";
const expectedIds = Array.from({ length: 6 }, (_, index) => `REQ-${String(index + 19).padStart(3, "0")}`);
const pathFields = ["normativeSources", "implementationSources", "verificationSources"];

function safePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !isAbsolute(path)
    && !path.split(/[\\/]/u).includes("..")
    && !path.split(/[\\/]/u).some((part) => part.startsWith(".env"));
}

export function validateTraceability(manifest, {
  exists = existsSync,
  read = (path) => readFileSync(path, "utf8"),
  root = process.cwd(),
} = {}) {
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (manifest?.scope?.from !== "REQ-019" || manifest?.scope?.to !== "REQ-024") errors.push("scope must be REQ-019 through REQ-024");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(manifest?.reviewedAt ?? "")) errors.push("reviewedAt must be an ISO date");
  if (!Array.isArray(manifest?.requirements)) return [...errors, "requirements must be an array"];
  const ids = new Set();
  for (const requirement of manifest.requirements) {
    if (!expectedIds.includes(requirement?.id)) errors.push(`unexpected requirement id: ${requirement?.id}`);
    if (ids.has(requirement?.id)) errors.push(`duplicate requirement id: ${requirement?.id}`);
    ids.add(requirement?.id);
    if (!new Set(["applied", "partial", "design"]).has(requirement?.status)) errors.push(`${requirement?.id}: invalid status`);
    for (const field of pathFields) {
      if (!Array.isArray(requirement?.[field]) || requirement[field].length === 0) {
        errors.push(`${requirement?.id}: ${field} requires at least one path`);
        continue;
      }
      for (const path of requirement[field]) {
        if (!safePath(path)) errors.push(`${requirement?.id}: unsafe ${field} path: ${path}`);
        else if (!exists(resolve(root, path))) errors.push(`${requirement?.id}: missing ${field} path: ${path}`);
      }
    }
    const impact = requirement?.tokenProfileImpact;
    if (!new Set(["common-required", "differentiated"]).has(impact?.mode) || typeof impact?.rationale !== "string" || !impact.rationale) {
      errors.push(`${requirement?.id}: tokenProfileImpact mode and rationale are required`);
    }
    if (!Array.isArray(requirement?.externalGates)) errors.push(`${requirement?.id}: externalGates must be an array`);
  }
  for (const id of expectedIds) if (!ids.has(id)) errors.push(`missing requirement id: ${id}`);
  if (manifest.requirements.map((item) => item.id).join(",") !== expectedIds.join(",")) errors.push("requirements must be sorted and complete");
  const requirementsPath = resolve(root, "docs/requirements.md");
  if (exists(requirementsPath)) {
    const source = read(requirementsPath);
    for (const id of expectedIds) if (!source.includes(`### ${id}:`)) errors.push(`requirements source is missing heading: ${id}`);
  }
  return errors;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
}

export function requiresManifestChange(files) {
  return files.includes("docs/requirements.md");
}

function main() {
  const mode = process.argv[2] ?? "full";
  const base = process.argv[3];
  if (!new Set(["full", "staged", "range"]).has(mode)) {
    process.stderr.write("Usage: validate-requirement-traceability.mjs <full|staged|range> [BASE]\n");
    process.exit(2);
  }
  if (!existsSync(manifestRelative)) throw new Error(`${manifestRelative} is required`);
  const manifest = JSON.parse(readFileSync(manifestRelative, "utf8"));
  const errors = validateTraceability(manifest);
  if (mode !== "full") {
    if (mode === "range" && (!base || /^0+$/u.test(base))) throw new Error("A valid base commit is required for range mode");
    const files = mode === "staged"
      ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
      : git(["diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`]);
    if (requiresManifestChange(files) && !files.includes(manifestRelative)) {
      errors.push(`docs/requirements.md changed without ${manifestRelative}`);
    }
  }
  if (errors.length) {
    for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(`Requirement traceability validation (${mode}): PASS\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
