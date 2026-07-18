#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProviderProfile } from "./provider-profile-adapters.mjs";

function main() {
  const [path, expectation, output] = process.argv.slice(2);
  if (!path || !["--expect-valid", "--expect-invalid"].includes(expectation) || (output && output !== "--json")) {
    process.stderr.write("Usage: validate-provider-profile.mjs PROFILE (--expect-valid|--expect-invalid) [--json]\n");
    process.exit(2);
  }
  const result = validateProviderProfile(JSON.parse(readFileSync(resolve(path), "utf8")));
  const matched = expectation === "--expect-valid" ? result.valid : !result.valid;
  if (output === "--json") process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`Provider profile: ${result.valid ? "VALID" : "BLOCKED"}; support=${result.supportLevel}; external-actions=NOT_RUN\n`);
  if (!matched) process.exit(1);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
