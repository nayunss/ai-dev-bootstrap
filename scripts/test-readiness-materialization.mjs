#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const target = mkdtempSync(join(tmpdir(), "readiness-materialization-"));
const preview = spawnSync(process.execPath, [resolve("scripts/preview-applications.mjs"), target], {
  encoding: "utf8",
});
assert.equal(preview.status, 0);
assert.match(preview.stdout, /docs\/production-readiness\.json is missing/);
assert.match(preview.stdout, /scripts\/bootstrap readiness/);

const materialize = spawnSync(process.execPath, [resolve("scripts/materialize-production-readiness.mjs"), target], {
  encoding: "utf8",
});
assert.equal(materialize.status, 0);
const profile = join(target, "docs/production-readiness.json");
assert.equal(
  readFileSync(profile, "utf8"),
  readFileSync(join(root, "docs/templates/production-readiness.json"), "utf8"),
);
const materialized = JSON.parse(readFileSync(profile, "utf8"));
assert.equal(materialized.schemaVersion, 2);
assert.equal(materialized.onboardingDecisions.productionProviderRestore.status, "TBD");

const validate = spawnSync(
  process.execPath,
  [resolve("scripts/validate-production-readiness.mjs"), profile, "--expect-blocked"],
  { encoding: "utf8" },
);
assert.equal(validate.status, 0);
assert.match(validate.stdout, /BLOCKED/);
const productionGate = spawnSync(
  process.execPath,
  [resolve("scripts/validate-production-readiness.mjs"), profile, "--expect-ready"],
  { encoding: "utf8" },
);
assert.notEqual(productionGate.status, 0);
assert.match(productionGate.stderr, /Unexpected production readiness: blocked/);

const preserve = spawnSync(process.execPath, [resolve("scripts/materialize-production-readiness.mjs"), target], {
  encoding: "utf8",
});
assert.notEqual(preserve.status, 0);
assert.match(preserve.stderr, /Refusing to overwrite/);

process.stdout.write("Production readiness retrofit materialization fixtures: PASS\n");
