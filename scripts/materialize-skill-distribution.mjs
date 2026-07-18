#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSkillDistribution } from "./skill-distribution.mjs";

function values(argument) {
  return argument ? [...new Set(argument.split(",").map((value) => value.trim()).filter(Boolean))] : [];
}

function main() {
  const [mode, target, manifestPath, ...flags] = process.argv.slice(2);
  if (!["preview", "apply", "validate", "upgrade", "rollback", "uninstall"].includes(mode) || !target || !manifestPath) {
    process.stderr.write("Usage: materialize-skill-distribution.mjs <preview|apply|validate|upgrade|rollback|uninstall> TARGET MANIFEST.json [--optional=a,b] [--adapters=a,b] [--approve]\n");
    process.exit(2);
  }
  const absoluteManifest = resolve(manifestPath);
  const manifest = JSON.parse(readFileSync(absoluteManifest, "utf8"));
  const result = runSkillDistribution(mode, manifest, dirname(absoluteManifest), target, {
    approved: flags.includes("--approve"),
    optional: values(flags.find((flag) => flag.startsWith("--optional="))?.slice("--optional=".length)),
    adapters: values(flags.find((flag) => flag.startsWith("--adapters="))?.slice("--adapters=".length)),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "APPROVAL_REQUIRED") process.exit(2);
  if (!["PREVIEW", "PASS"].includes(result.status)) process.exit(1);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
