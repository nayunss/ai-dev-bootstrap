#!/usr/bin/env node
import { resolve } from "node:path";
import { evaluateFastApiContract, readJson } from "./fastapi-contract-adapter.mjs";

const paths = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const expectation = process.argv.find((argument) => argument.startsWith("--expect-"));
if (paths.length !== 4) {
  process.stderr.write("Usage: evaluate-fastapi-contract.mjs BASELINE.json CURRENT.json ROUTES.json PROFILE.json [--expect-pass|--expect-fail]\n");
  process.exit(2);
}
try {
  const result = evaluateFastApiContract({
    baseline: readJson(resolve(paths[0])),
    current: readJson(resolve(paths[1])),
    routes: readJson(resolve(paths[2])),
    profile: readJson(resolve(paths[3])),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  const expected = { "--expect-pass": "PASS", "--expect-fail": "FAIL" }[expectation];
  if (expected && result.status !== expected) process.exit(1);
} catch (error) {
  process.stderr.write(`FastAPI contract evaluation failed: ${error.message}\n`);
  process.exit(1);
}
