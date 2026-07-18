#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runStackProfileFixture } from "./stack-profile-fixtures.mjs";

function main() {
  const [mode, target, profilePath, approval] = process.argv.slice(2);
  if (!["preview", "apply", "validate", "rollback"].includes(mode) || !target || !profilePath || (approval && approval !== "--approve")) {
    process.stderr.write("Usage: materialize-stack-profile-fixture.mjs <preview|apply|validate|rollback> TARGET PROFILE.json [--approve]\n");
    process.exit(2);
  }
  const profile = JSON.parse(readFileSync(resolve(profilePath), "utf8"));
  const result = runStackProfileFixture(mode, profile, target, { approved: approval === "--approve" });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "APPROVAL_REQUIRED") process.exit(2);
  if (!["PREVIEW", "PASS"].includes(result.status)) process.exit(1);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
