#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseUpstreamLockYaml, validateLockedTarget } from "./upstream-lock.mjs";

const [lockValue, targetValue] = process.argv.slice(2);
if (!lockValue || !targetValue) {
  process.stderr.write("Usage: validate-upstream-lock.mjs LOCK.yaml TARGET\n");
  process.exit(2);
}
try {
  const lock = parseUpstreamLockYaml(readFileSync(resolve(lockValue), "utf8"));
  const errors = validateLockedTarget(lock, resolve(targetValue));
  if (errors.length) throw new Error(errors.join("\n"));
  process.stdout.write(`Upstream lock validation: PASS (${lock.source.release}, ${lock.files.length} files)\n`);
} catch (error) {
  process.stderr.write(`Upstream lock validation: FAIL\n${error.message}\n`);
  process.exit(1);
}
