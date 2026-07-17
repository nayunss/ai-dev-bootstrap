#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTask, runCapabilityTask } from "./capability-suite.mjs";

const args = process.argv.slice(2);
const path = args.find((argument) => !argument.startsWith("--"));
const output = args.find((argument) => argument.startsWith("--output="));
const expectation = args.find((argument) => argument.startsWith("--expect-"));
if (!path) {
  process.stderr.write("Usage: run-capability-task.mjs TASK.json [--expect-pass|--expect-fail] [--output=FILE]\n");
  process.exit(2);
}

try {
  const result = runCapabilityTask(loadTask(resolve(path)));
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (output) writeFileSync(resolve(output.slice("--output=".length)), serialized);
  process.stdout.write(serialized);
  const expected = { "--expect-pass": "PASS", "--expect-fail": "FAIL" }[expectation];
  if (result.status === "INVALID" || (expected && result.status !== expected)) process.exit(1);
} catch (error) {
  process.stderr.write(`Capability task failed: ${error.message}\n`);
  process.exit(1);
}
