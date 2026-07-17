#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";

const reportPath = process.argv[2];
const summaryPath = process.argv[3];
if (!reportPath) {
  console.error("Usage: evaluate-scancode-report.mjs <report.json>");
  process.exit(2);
}

function isReviewOnly(path) {
  const extension = extname(path).toLowerCase();
  return extension === ".md"
    || basename(path) === "package-lock.json"
    || (path.includes("/.ai/manifests/") && new Set([".json", ".yaml", ".yml"]).has(extension));
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (error) {
  console.error(`ScanCode report is unreadable: ${error.message}`);
  process.exit(1);
}

const headers = Array.isArray(report.headers) ? report.headers : [];
const files = Array.isArray(report.files) ? report.files.filter((entry) => entry.type === "file") : [];
const headerProblems = headers.flatMap((header) => [
  ...(header.errors ?? []),
  ...(header.warnings ?? []),
]);
const fileProblems = files.flatMap((file) => file.scan_errors ?? []);

if (headers.length === 0 || files.length === 0 || headerProblems.length > 0 || fileProblems.length > 0) {
  console.error("ScanCode gate: FAIL (empty or incomplete report)");
  process.exit(1);
}

const findings = files.flatMap((file) => {
  const expressions = [...new Set((file.license_detections ?? []).map((item) => item.license_expression))]
    .filter(Boolean);
  return expressions.length === 0 ? [] : [{ path: file.path, expressions }];
});
const sourceFindings = findings.filter((finding) => !isReviewOnly(finding.path));
const reviewFindings = findings.filter((finding) => isReviewOnly(finding.path));

if (summaryPath) {
  writeFileSync(summaryPath, `${JSON.stringify({
    scanner: headers.map(({ tool_name, tool_version }) => ({ tool_name, tool_version })),
    filesCount: files.length,
    reviewFindings,
    sourceFindings,
    errorsCount: headerProblems.length + fileProblems.length,
  }, null, 2)}\n`);
}

for (const finding of reviewFindings) {
  console.log(`MANUAL_REVIEW metadata/documentation: ${finding.path}: ${finding.expressions.join(", ")}`);
}
for (const finding of sourceFindings) {
  console.error(`BLOCKED source license finding: ${finding.path}: ${finding.expressions.join(", ")}`);
}

if (sourceFindings.length > 0) {
  console.error("ScanCode gate: BLOCKED (source finding requires human disposition)");
  process.exit(1);
}

console.log(`ScanCode gate: PASS (${files.length} files, ${reviewFindings.length} review-only findings)`);
