#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { discoverApplications, readDeclaredInventory } from "./application-inventory.mjs";

const root = resolve(process.argv[2] ?? ".");
const discovered = discoverApplications(root);
const inventory = readDeclaredInventory(root);
const declared = new Set((inventory?.applications ?? []).map((application) => application.manifest));
const decisionProfiles = [
  ["Production readiness", "docs/production-readiness.json"],
  ["Skill evolution trial", "docs/skill-evolution-trial.json"],
  ["Upstream adoption", "docs/upstream-adoption.json"],
];

process.stdout.write("Application inventory preview\n");
for (const application of discovered) {
  const status = declared.has(application.manifest) ? "declared" : "undeclared";
  process.stdout.write(`- ${application.manifest} (root: ${application.root}, ${status})\n`);
}
if (discovered.length < 2) process.stdout.write("- Mode: single application; recursive stack drift gate not activated\n");
else if (!inventory) process.stdout.write("- Drift: multi-application repository requires docs/development-environment.md JSON inventory\n");
else {
  const missing = discovered.filter((application) => !declared.has(application.manifest));
  process.stdout.write(`- Drift: ${missing.length === 0 ? "no undeclared manifests" : `${missing.length} undeclared manifest(s)`}\n`);
  process.stdout.write("- Shared review: CodeSight, EditorConfig, adapters, hook, CI and deploy evidence\n");
}
let missingDecisionProfile = false;
for (const [label, profile] of decisionProfiles) {
  if (existsSync(join(root, profile))) {
    process.stdout.write(`- ${label}: ${profile} exists; preserve and validate it\n`);
  } else {
    missingDecisionProfile = true;
    process.stdout.write(`- ${label}: ${profile} is missing; project-specific decisions remain unresolved\n`);
  }
}
if (missingDecisionProfile) process.stdout.write(`- Initial/retrofit remediation: scripts/bootstrap onboarding ${root}\n`);
