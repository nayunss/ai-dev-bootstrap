#!/usr/bin/env node
import { resolve } from "node:path";
import { discoverApplications, readDeclaredInventory } from "./application-inventory.mjs";

const root = resolve(process.argv[2] ?? ".");
const discovered = discoverApplications(root);
const inventory = readDeclaredInventory(root);
const declared = new Set((inventory?.applications ?? []).map((application) => application.manifest));

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
