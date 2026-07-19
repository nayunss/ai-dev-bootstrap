#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectReleaseAdoption } from "./release-adoption.mjs";
import { runWebAdoption } from "./release-adoption-surfaces.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASES = {
  "reference-v1": "evals/fixtures/release-adoption/v1.json",
  "reference-v2": "evals/fixtures/release-adoption/v2.json",
};
const EXECUTION = {
  network: "NOT_RUN",
  telemetry: "DISABLED",
  dependencyInstall: "NOT_RUN",
  databaseMigration: "NOT_RUN",
  providerWrite: "NOT_RUN",
  productionDeploy: "NOT_RUN",
};
const HASH = /^sha256:[a-f0-9]{64}$/u;

function git(target, args, options = {}) {
  return execFileSync("git", args, {
    cwd: target,
    encoding: options.encoding ?? "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}

function changedPaths(target) {
  const raw = git(target, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (!raw) return [];
  return raw.split("\0").filter(Boolean).map((record) => {
    const status = record.slice(0, 2);
    if (/[RC]/u.test(status)) throw new Error("rename or copy is outside the web adoption boundary");
    return record.slice(3).replaceAll("\\", "/");
  }).sort();
}

function confined(root, relativePath) {
  if (
    typeof relativePath !== "string"
    || !relativePath
    || isAbsolute(relativePath)
    || relativePath.includes("\0")
    || relativePath.split(/[\\/]/u).some((part) => !part || part === ".." || part.startsWith(".env"))
  ) throw new Error("web adoption path is unsafe");
  const path = resolve(root, relativePath);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("web adoption path escapes target");
  return path;
}

function blocked(message) {
  return {
    status: "BLOCKED",
    surface: "web",
    errors: [message],
    execution: EXECUTION,
    delivery: {
      commit: "NOT_RUN",
      push: "NOT_RUN",
      pullRequest: "NOT_RUN",
      merge: "NOT_RUN",
    },
  };
}

export function runGitHubActionsAdoption({
  mode,
  release,
  source = ROOT,
  target,
  expectedPlanSha256,
  stage = false,
}) {
  const sourceRoot = resolve(source);
  const targetRoot = resolve(target);
  if (!["preview", "apply"].includes(mode)) return blocked("GitHub Actions P0 supports preview or apply only");
  const manifestRelative = RELEASES[release];
  if (!manifestRelative) return blocked("release is not in the reviewed P0 allowlist");
  try {
    git(targetRoot, ["rev-parse", "--show-toplevel"]);
  } catch {
    return blocked("target must be a Git working tree");
  }
  if (changedPaths(targetRoot).length) return blocked("target checkout must be clean before web adoption");
  if (mode === "apply" && !HASH.test(expectedPlanSha256 ?? "")) {
    return blocked("apply requires the exact preview plan SHA-256");
  }
  const manifestPath = confined(sourceRoot, manifestRelative);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const installed = inspectReleaseAdoption(targetRoot);
  if (installed.status === "INVALID") return blocked("installed release state is changed or invalid");
  const upgrade = installed.status === "INSTALLED"
    && installed.release.manifestSha256 !== manifest.release.manifestSha256;
  if (
    installed.status === "INSTALLED"
    && installed.release.manifestSha256 === manifest.release.manifestSha256
  ) return blocked("selected release is already installed");
  const coreMode = upgrade ? "upgrade" : mode;
  let result = runWebAdoption(coreMode, manifest, sourceRoot, targetRoot, {
    approved: mode === "apply",
    expectedPlanSha256,
  });
  if (mode === "preview" && upgrade && result.status === "APPROVAL_REQUIRED") {
    result = { ...result, status: "PREVIEW" };
  }
  if (mode === "preview") {
    if (changedPaths(targetRoot).length) throw new Error("preview changed the target checkout");
    return {
      ...result,
      delivery: {
        commit: "NOT_RUN",
        push: "NOT_RUN",
        pullRequest: "NOT_RUN",
        merge: "NOT_RUN",
      },
    };
  }
  if (result.status !== "PASS") return {
    ...result,
    delivery: {
      commit: "NOT_RUN",
      push: "NOT_RUN",
      pullRequest: "NOT_RUN",
      merge: "NOT_RUN",
    },
  };
  const actual = changedPaths(targetRoot);
  const allowed = new Set([
    ...(result.entries ?? []).map((entry) => entry.path),
    ".ai/manifests/release-adoption.lock.json",
    ".ai/manifests/release-adoption.rollback.json",
  ]);
  const unexpected = actual.filter((path) => !allowed.has(path));
  if (unexpected.length) throw new Error(`web adoption produced unexpected paths: ${unexpected.join(", ")}`);
  if (stage) {
    for (const path of actual) confined(targetRoot, path);
    if (actual.length) git(targetRoot, ["add", "--", ...actual]);
  }
  return {
    ...result,
    changedPaths: actual,
    delivery: {
      commit: "STAGED_NOT_RUN",
      push: "NOT_RUN",
      pullRequest: "NOT_RUN",
      merge: "NOT_RUN",
    },
  };
}

function runnerOutput(result) {
  const resultPath = resolve(process.env.RUNNER_TEMP || tmpdir(), "web-adoption-result.json");
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${result.status}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `plan_sha256=${result.planSha256 ?? ""}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `result_path=${resultPath}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Web adoption ${result.status}\n\nPlan: ${result.planSha256 ?? "없음"}\n\nCommit, push, PR, merge: ${JSON.stringify(result.delivery)}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!["PREVIEW", "PASS"].includes(result.status)) process.exitCode = 1;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  runnerOutput(runGitHubActionsAdoption({
    mode: process.env.WEB_ADOPTION_MODE,
    release: process.env.WEB_ADOPTION_RELEASE,
    expectedPlanSha256: process.env.WEB_ADOPTION_EXPECTED_PLAN_SHA256,
    source: ROOT,
    target: process.env.GITHUB_WORKSPACE || process.cwd(),
    stage: process.env.WEB_ADOPTION_STAGE === "true",
  }));
}
