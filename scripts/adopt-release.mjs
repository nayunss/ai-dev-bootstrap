#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCliAdoption, runGuiAdoption } from "./release-adoption-surfaces.mjs";

function main() {
  const [mode, target, manifestPath, ...flags] = process.argv.slice(2);
  if (!["preview", "apply", "validate", "upgrade", "rollback"].includes(mode) || !target || !manifestPath) {
    process.stderr.write("Usage: adopt-release.mjs <preview|apply|validate|upgrade|rollback> TARGET MANIFEST.json [--surface=cli|gui] [--approve]\n");
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
  const surface = flags.find((flag) => flag.startsWith("--surface="))?.slice("--surface=".length) ?? "cli";
  if (!["cli", "gui"].includes(surface)) {
    process.stderr.write("Surface must be cli or gui.\n");
    process.exit(2);
  }
  const run = surface === "gui" ? runGuiAdoption : runCliAdoption;
  const result = run(mode, manifest, process.cwd(), target, {
    approved: flags.includes("--approve"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "APPROVAL_REQUIRED") process.exit(2);
  if (!["PREVIEW", "PASS"].includes(result.status)) process.exit(1);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
