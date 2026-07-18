#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevelopmentProfile, validateDevelopmentProfile } from "./development-profile.mjs";

function main() {
  const args = process.argv.slice(2);
  const profilePath = args.shift();
  const mode = args.shift();
  let stage = null;
  let repositoryRoot = null;
  let json = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === "--stage") stage = args.shift();
    else if (arg === "--repository") repositoryRoot = args.shift();
    else if (arg === "--json") json = true;
    else {
      process.stderr.write(`Unknown option: ${arg}\n`);
      process.exit(2);
    }
  }
  if (!profilePath || !new Set(["schema", "semantic", "repository", "readiness"]).has(mode)) {
    process.stderr.write("Usage: validate-development-environment-profile.mjs PROFILE (schema|semantic|repository|readiness) [--stage local|ci|production] [--repository ROOT] [--json]\n");
    process.exit(2);
  }
  try {
    const profile = loadDevelopmentProfile(resolve(profilePath));
    const result = validateDevelopmentProfile(profile, { mode, stage, repositoryRoot });
    if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else process.stdout.write(`Development profile: ${result.valid ? "PASS" : "BLOCKED"}; mode=${mode}; blockers=${result.blockers.length}; read-only=true\n`);
    if (!result.valid) process.exit(1);
  } catch (error) {
    const result = { schemaVersion: 1, mode, stage, valid: false, ready: false, readOnly: true, blockers: [{ code: "PROFILE_PARSE", path: profilePath, message: error.message }] };
    if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
