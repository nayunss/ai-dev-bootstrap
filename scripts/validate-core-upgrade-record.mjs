#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseUpstreamLockYaml, serializeUpstreamLock, sha256, safeRelativePath } from "./upstream-lock.mjs";

const target = resolve(process.argv[2] ?? ".");
const lockPath = resolve(target, ".ai/manifests/upstream.lock.yaml");
const recordPath = resolve(target, ".ai/manifests/upstream-upgrade.rollback.json");
const digest = /^sha256:[a-f0-9]{64}$/u;
const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

if (!existsSync(lockPath) || !existsSync(recordPath)) fail("Core lock and rollback record are required");
let lock;
let record;
try {
  lock = parseUpstreamLockYaml(readFileSync(lockPath, "utf8"));
  record = JSON.parse(readFileSync(recordPath, "utf8"));
} catch (error) {
  fail(`Core upgrade record invalid: ${error.message}`);
}
if (record.schemaVersion !== 1 || record.kind !== "upstream-upgrade-rollback") fail("Core upgrade record schema or kind is invalid");
const { recordSha256, ...payload } = record;
if (recordSha256 !== sha256(JSON.stringify(payload))) fail("Core upgrade record integrity drift");
if (record.to?.lockSha256 !== sha256(serializeUpstreamLock(lock))) fail("Core upgrade record does not match current lock");
for (const side of ["from", "to"]) {
  if (typeof record[side]?.release !== "string" || !record[side].release) fail(`Core upgrade record ${side}.release is required`);
  if (!digest.test(record[side]?.manifestSha256 ?? "") || !digest.test(record[side]?.lockSha256 ?? "")) fail(`Core upgrade record ${side} hashes are invalid`);
}
if (!Array.isArray(record.operations) || record.operations.length === 0) fail("Core upgrade record operations are required");
const paths = new Set();
const currentFiles = new Map(lock.files.map((file) => [file.path, file.sha256]));
for (const operation of record.operations) {
  if (!safeRelativePath(operation?.path) || paths.has(operation.path)) fail(`Core upgrade record unsafe or duplicate path: ${operation?.path}`);
  paths.add(operation.path);
  if (!new Set(["preserve-unchanged", "update", "delete", "create", "preserve-preexisting-identical"]).has(operation.action)) fail(`Core upgrade record action is invalid: ${operation.path}`);
  if (operation.fromSha256 !== null && !digest.test(operation.fromSha256 ?? "")) fail(`Core upgrade record from hash is invalid: ${operation.path}`);
  if (operation.toSha256 !== null && !digest.test(operation.toSha256 ?? "")) fail(`Core upgrade record to hash is invalid: ${operation.path}`);
  if (currentFiles.has(operation.path) && currentFiles.get(operation.path) !== operation.toSha256) fail(`Core upgrade record current hash drift: ${operation.path}`);
}
if (JSON.stringify([...paths]) !== JSON.stringify([...paths].sort())) fail("Core upgrade record operations must be sorted");
process.stdout.write(`Core upgrade rollback record validation: PASS (${record.from.release} -> ${record.to.release})\n`);
