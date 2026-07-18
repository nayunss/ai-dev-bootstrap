#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const evaluator = join(root, "scripts", "evaluate-scancode-report.mjs");
const fixtureRoot = mkdtempSync(join(tmpdir(), "scancode-evaluator-"));
const reviewExpression = "review-expression";
const blockedExpression = "blocked-expression";

function evaluate(name, report) {
  const path = join(fixtureRoot, `${name}.json`);
  const summary = join(fixtureRoot, `${name}.summary.json`);
  writeFileSync(path, JSON.stringify(report));
  const result = spawnSync(process.execPath, [evaluator, path, summary], { encoding: "utf8" });
  return {
    ...result,
    summary: existsSync(summary) ? JSON.parse(readFileSync(summary, "utf8")) : null,
  };
}

function report(files, header = {}) {
  return {
    headers: [{ errors: [], warnings: [], ...header }],
    files: files.map((file) => ({ type: "file", scan_errors: [], license_detections: [], ...file })),
  };
}

let result = evaluate("clean", report([{ path: "input/src/app.js" }]));
assert.equal(result.status, 0);
assert.match(result.stdout, /ScanCode gate: PASS/);

result = evaluate("documentation", report([{
  path: "input/docs/policy.md",
  license_detections: [{ license_expression: reviewExpression }],
}]));
assert.equal(result.status, 0);
assert.match(result.stdout, /MANUAL_REVIEW metadata\/documentation/);
assert.deepEqual(result.summary.reviewFindings, [{ path: "input/docs/policy.md", expressions: [reviewExpression] }]);

result = evaluate("skill-manifest-metadata", report([{
  path: "input/evals/fixtures/skill-distribution/releases/v1/manifest.json",
  license_detections: [{ license_expression: reviewExpression }],
}]));
assert.equal(result.status, 0);
assert.deepEqual(result.summary.reviewFindings, [{
  path: "input/evals/fixtures/skill-distribution/releases/v1/manifest.json",
  expressions: [reviewExpression],
}]);

result = evaluate("arbitrary-source-manifest", report([{
  path: "input/src/manifest.json",
  license_detections: [{ license_expression: blockedExpression }],
}]));
assert.equal(result.status, 1);
assert.match(result.stderr, /BLOCKED source license finding/);

result = evaluate("source-finding", report([{
  path: "input/src/copied.ts",
  license_detections: [{ license_expression: blockedExpression }],
}]));
assert.equal(result.status, 1);
assert.match(result.stderr, /BLOCKED source license finding/);
assert.equal(result.summary.sourceFindings.length, 1);

result = evaluate("unclassified-finding", report([{
  path: "input/bin/generated-parser",
  license_detections: [{ license_expression: "unknown-license-reference" }],
}]));
assert.equal(result.status, 1);
assert.match(result.stderr, /BLOCKED source license finding/);

result = evaluate("scanner-warning", report([{ path: "input/src/app.js" }], { warnings: ["partial scan"] }));
assert.equal(result.status, 1);
assert.match(result.stderr, /empty or incomplete report/);

result = evaluate("empty", { headers: [{ errors: [], warnings: [] }], files: [] });
assert.equal(result.status, 1);

console.log("ScanCode report evaluator tests: PASS");
