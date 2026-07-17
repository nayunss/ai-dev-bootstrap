#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validatePilotResult } from "./pilot-results.mjs";

const resultPath = process.argv[2];
const campaignPath = process.argv[3];
if (!resultPath || !campaignPath) {
  process.stderr.write("Usage: validate-pilot-result.mjs RESULT.json CAMPAIGN.json\n");
  process.exit(2);
}

try {
  const result = JSON.parse(readFileSync(resolve(resultPath), "utf8"));
  const campaign = JSON.parse(readFileSync(resolve(campaignPath), "utf8"));
  const validation = validatePilotResult(result, campaign);
  if (!validation.valid) {
    for (const error of validation.errors) process.stderr.write(`FAIL: ${error}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `Pilot result ${result.pilotId}: ${validation.computedStatus}; compatibility evidence: ${
      validation.compatibilityEligible ? "eligible" : "excluded"
    }\n`,
  );
} catch (error) {
  process.stderr.write(`Pilot result validation failed: ${error.message}\n`);
  process.exit(1);
}
