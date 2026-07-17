#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { aggregatePilotResults } from "./pilot-results.mjs";

const args = process.argv.slice(2);
const expectation = args.find((arg) => arg.startsWith("--expect-"));
const outputArgument = args.find((arg) => arg.startsWith("--output="));
const paths = args.filter((arg) => !arg.startsWith("--"));
if (paths.length < 1) {
  process.stderr.write(
    "Usage: aggregate-pilot-results.mjs CAMPAIGN.json [RESULT.json...] [--expect-complete|--expect-incomplete|--expect-synthetic-complete] [--output=FILE]\n",
  );
  process.exit(2);
}

try {
  const campaign = JSON.parse(readFileSync(resolve(paths[0]), "utf8"));
  const results = paths.slice(1).map((path) => JSON.parse(readFileSync(resolve(path), "utf8")));
  const aggregate = aggregatePilotResults(campaign, results);
  const serialized = `${JSON.stringify(aggregate, null, 2)}\n`;
  if (outputArgument) writeFileSync(resolve(outputArgument.slice("--output=".length)), serialized);
  process.stdout.write(serialized);

  const expectedStatus = {
    "--expect-complete": "COMPLETE",
    "--expect-incomplete": "INCOMPLETE",
    "--expect-synthetic-complete": "SYNTHETIC_COMPLETE",
  }[expectation];
  if (aggregate.status === "INVALID" || (expectedStatus && aggregate.status !== expectedStatus)) process.exit(1);
} catch (error) {
  process.stderr.write(`Pilot aggregation failed: ${error.message}\n`);
  process.exit(1);
}
