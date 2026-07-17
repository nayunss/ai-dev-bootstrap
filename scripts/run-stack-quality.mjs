#!/usr/bin/env node
import { resolve } from "node:path";
import { previewQualityProfile, readQualityProfile, runQualityProfile } from "./stack-quality-adapters.mjs";

const [mode, targetValue, ...flags] = process.argv.slice(2);
const approval = flags.includes("--approve");
if (!new Set(["preview", "run"]).has(mode) || !targetValue) {
  process.stderr.write("Usage: run-stack-quality.mjs <preview|run> TARGET [--approve]\n");
  process.exit(2);
}

try {
  const target = resolve(targetValue);
  const profile = readQualityProfile(resolve(target, ".ai/manifests/stack-quality-adapters.json"));
  if (mode === "run" && !approval) {
    process.stderr.write("Stack quality execution requires --approve after preview\n");
    process.exit(2);
  }
  if (mode === "run" && process.env.QUALITY_NETWORK_ENFORCED !== "1") {
    process.stderr.write("Stack quality execution requires caller-enforced network-none sandbox\n");
    process.exit(2);
  }
  const result = mode === "preview"
    ? previewQualityProfile(profile, target)
    : runQualityProfile(profile, target, { networkEnforced: true });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "INVALID" || result.status === "FAIL" || result.status === "BLOCKED") process.exit(1);
} catch (error) {
  process.stderr.write(`Stack quality adapter failed: ${error.message}\n`);
  process.exit(1);
}
