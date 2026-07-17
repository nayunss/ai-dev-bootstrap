#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetRoot = resolve(process.argv[2] ?? "");
const source = join(harnessRoot, "docs/templates/production-readiness.json");
const destination = join(targetRoot, "docs/production-readiness.json");

if (!process.argv[2]) {
  process.stderr.write("Usage: materialize-production-readiness.mjs TARGET\n");
  process.exit(2);
}
if (!existsSync(targetRoot)) {
  process.stderr.write(`Target does not exist: ${targetRoot}\n`);
  process.exit(1);
}
if (existsSync(destination)) {
  process.stderr.write(`Refusing to overwrite existing readiness profile: ${destination}\n`);
  process.exit(1);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
process.stdout.write(`Created blocked readiness profile: ${destination}\n`);
process.stdout.write(
  "Production remains blocked until legal/privacy, retention/disposal, multi-instance rate-limit and provider restore evidence pass --expect-ready.\n",
);
