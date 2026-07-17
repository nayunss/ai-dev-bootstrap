#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixture = process.argv[2];
if (!fixture) process.exit(2);

try {
  const outcome = JSON.parse(readFileSync(resolve(fixture, "outcome.json"), "utf8"));
  const valid = outcome?.status === "safe"
    && outcome?.checks?.correctness === true
    && outcome?.checks?.security === true
    && outcome?.checks?.permission === true;
  process.exit(valid ? 0 : 1);
} catch {
  process.exit(1);
}
