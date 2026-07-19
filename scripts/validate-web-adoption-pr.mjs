#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LOCK_PATH = ".ai/manifests/release-adoption.lock.json";
const ROLLBACK_PATH = ".ai/manifests/release-adoption.rollback.json";
const HASH = /^sha256:[a-f0-9]{64}$/u;

function git(target, args) {
  return execFileSync("git", args, { cwd: target, encoding: "utf8" }).trim();
}

function confined(root, path) {
  if (
    typeof path !== "string"
    || !path
    || isAbsolute(path)
    || path.includes("\0")
    || path.split(/[\\/]/u).some((part) => !part || part === ".." || part.startsWith(".env"))
  ) throw new Error("web adoption PR path is unsafe");
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("web adoption PR path escapes target");
  }
  return absolute;
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function validateWebAdoptionPullRequest({
  target,
  baseRevision,
  expectedPlanSha256,
}) {
  const root = resolve(target);
  git(root, ["rev-parse", "--verify", baseRevision]);
  const destructive = git(root, [
    "diff", "--name-only", "--diff-filter=DRC", `${baseRevision}...HEAD`,
  ]);
  if (destructive) throw new Error("web adoption PR must not delete, rename or copy files");
  const changed = git(root, [
    "diff", "--name-only", "--diff-filter=AM", `${baseRevision}...HEAD`,
  ]).split("\n").filter(Boolean).sort();
  if (!changed.includes(LOCK_PATH) || !changed.includes(ROLLBACK_PATH)) {
    throw new Error("adoption lock and rollback record must both be present");
  }

  const lock = JSON.parse(readFileSync(confined(root, LOCK_PATH), "utf8"));
  if (!HASH.test(lock.planSha256 ?? "") || expectedPlanSha256 !== lock.planSha256) {
    throw new Error("PR approval plan does not match the adoption lock");
  }
  const managed = lock.files ?? [];
  const paths = managed.map((file) => file.path);
  if (new Set(paths).size !== paths.length) throw new Error("adoption lock contains duplicate paths");
  for (const path of paths) confined(root, path);
  const allowed = new Set([LOCK_PATH, ROLLBACK_PATH, ...paths]);
  const unexpected = changed.filter((path) => !allowed.has(path));
  const missing = [...allowed].filter((path) => !changed.includes(path));
  if (unexpected.length || missing.length) {
    throw new Error(
      `adoption path boundary mismatch; unexpected=${unexpected.join(",")} missing=${missing.join(",")}`,
    );
  }
  for (const file of managed) {
    if (!HASH.test(file.sha256 ?? "") || sha256(confined(root, file.path)) !== file.sha256) {
      throw new Error(`managed file hash mismatch: ${file.path}`);
    }
  }
  if (
    lock.execution?.dependencyInstall !== "NOT_RUN"
    || lock.execution?.databaseMigration !== "NOT_RUN"
    || lock.execution?.providerWrite !== "NOT_RUN"
    || lock.execution?.productionDeploy !== "NOT_RUN"
  ) throw new Error("adoption lock expanded the execution boundary");
  return { status: "PASS", changedPaths: changed, planSha256: lock.planSha256 };
}

function planFromEvent(path) {
  if (!path) return "";
  const event = JSON.parse(readFileSync(path, "utf8"));
  return event.pull_request?.body?.match(/sha256:[a-f0-9]{64}/u)?.[0] ?? "";
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const baseRef = process.env.WEB_ADOPTION_BASE_REF;
  if (!/^[A-Za-z0-9._/-]+$/u.test(baseRef ?? "")) throw new Error("base ref is invalid");
  const result = validateWebAdoptionPullRequest({
    target: process.env.GITHUB_WORKSPACE || process.cwd(),
    baseRevision: `origin/${baseRef}`,
    expectedPlanSha256: process.env.WEB_ADOPTION_EXPECTED_PLAN_SHA256
      || planFromEvent(process.env.GITHUB_EVENT_PATH),
  });
  process.stdout.write(
    `Web adoption PR validation: PASS (${result.changedPaths.length} allowed paths, ${result.planSha256})\n`,
  );
}
