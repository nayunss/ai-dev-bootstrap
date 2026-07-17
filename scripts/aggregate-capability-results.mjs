#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { aggregateCapabilityResults } from "./capability-suite.mjs";

const args = process.argv.slice(2);
const paths = args.filter((argument) => !argument.startsWith("--"));
const output = args.find((argument) => argument.startsWith("--output="));
const expectation = args.find((argument) => argument.startsWith("--expect-"));
if (paths.length === 0) {
  process.stderr.write("Usage: aggregate-capability-results.mjs RESULT.json... [--expect-pass|--expect-fail] [--output=FILE]\n");
  process.exit(2);
}

try {
  const results = paths.map((path) => JSON.parse(readFileSync(resolve(path), "utf8")));
  const aggregate = aggregateCapabilityResults(results);
  const serialized = `${JSON.stringify(aggregate, null, 2)}\n`;
  if (output) writeFileSync(resolve(output.slice("--output=".length)), serialized);
  process.stdout.write(serialized);
  const expected = { "--expect-pass": "PASS", "--expect-fail": "FAIL" }[expectation];
  if (aggregate.status === "INVALID" || (expected && aggregate.status !== expected)) process.exit(1);
} catch (error) {
  process.stderr.write(`Capability aggregation failed: ${error.message}\n`);
  process.exit(1);
}
