#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  previewQualityProfile,
  runQualityProfile,
  validateQualityProfile,
} from "./stack-quality-adapters.mjs";

const fixture = mkdtempSync(join(tmpdir(), "stack-quality-"));
const toolRoot = join(fixture, ".tools/quality/bin");
mkdirSync(toolRoot, { recursive: true });
mkdirSync(join(fixture, ".ai/manifests"), { recursive: true });
for (const language of ["javascript", "java", "python"]) {
  cpSync(resolve("evals/fixtures/stack-quality", language), join(fixture, language), { recursive: true });
}

const versions = {
  formatter: "1.0.0",
  linter: "2.0.0",
  typecheck: "3.0.0",
  accessibility: "4.0.0",
  "linter-fail": "2.0.0",
  mutator: "1.0.0",
};
for (const [name, version] of Object.entries(versions)) {
  const failure = name === "linter-fail" ? "exit 1" : name === "mutator" ? "printf drift >> source.js" : "exit 0";
  const path = join(toolRoot, name);
  writeFileSync(path, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "${version}"; exit 0; fi\n${failure}\n`);
  chmodSync(path, 0o755);
}

function gate(name, executable = name) {
  return {
    mode: "required",
    tool: `fixture-${name}`,
    version: versions[executable],
    executable: `.tools/quality/bin/${executable}`,
    versionArgs: ["--version"],
    args: ["--check", "."],
    timeoutMs: 5000,
  };
}

function application(id, language, web) {
  return {
    id,
    root: language,
    language,
    web,
    gates: {
      formatter: gate("formatter"),
      linter: gate("linter"),
      typecheck: gate("typecheck"),
      accessibility: web
        ? gate("accessibility")
        : { mode: "not-applicable", rationale: "Synthetic backend fixture has no user interface." },
    },
  };
}

const profile = {
  schemaVersion: 1,
  network: "deny",
  applications: [
    application("javascript-web", "javascript", true),
    application("java-service", "java", false),
    application("python-worker", "python", false),
  ],
};

try {
  assert.deepEqual(validateQualityProfile(profile, fixture).errors, []);
  const preview = previewQualityProfile(profile, fixture);
  assert.equal(preview.status, "PREVIEW");
  assert.equal(preview.applications.length, 3);
  assert.equal(preview.applications[0].gates.length, 4);

  assert.equal(runQualityProfile(profile, fixture).status, "BLOCKED");
  const result = runQualityProfile(profile, fixture, { networkEnforced: true });
  assert.equal(result.status, "PASS");
  assert.equal(result.applications.length, 3);
  assert.equal(result.applications[0].gates.filter((item) => item.status === "PASS").length, 4);
  assert.equal(result.applications[1].gates.at(-1).status, "NOT-APPLICABLE");
  assert.equal(result.applications.every((item) => item.sourceChanged === false), true);

  const missingAccessibility = structuredClone(profile);
  missingAccessibility.applications[0].gates.accessibility = {
    mode: "not-applicable",
    rationale: "Skipped",
  };
  assert.match(validateQualityProfile(missingAccessibility, fixture).errors.join("\n"), /required for web/);

  const network = structuredClone(profile);
  network.network = "allow";
  assert.match(validateQualityProfile(network, fixture).errors.join("\n"), /network must be deny/);

  const unsafe = structuredClone(profile);
  unsafe.applications[0].root = "../outside";
  assert.match(validateQualityProfile(unsafe, fixture).errors.join("\n"), /must not escape/);

  const globalTool = structuredClone(profile);
  globalTool.applications[0].gates.linter.executable = "/usr/bin/true";
  assert.match(validateQualityProfile(globalTool, fixture).errors.join("\n"), /safe relative path/);

  const versionDrift = structuredClone(profile);
  versionDrift.applications[0].gates.linter.version = "2.0.1";
  const driftResult = runQualityProfile(versionDrift, fixture, { networkEnforced: true });
  assert.equal(driftResult.status, "FAIL");
  assert.equal(driftResult.applications[0].gates.at(-1).reason, "version-mismatch");

  const failureFixture = JSON.parse(
    readFileSync(resolve("evals/fixtures/stack-quality/failure.json"), "utf8"),
  );
  const failed = structuredClone(profile);
  const failedApplication = failed.applications.find((item) => item.language === failureFixture.applicationId);
  failedApplication.gates[failureFixture.gate] = gate("linter", "linter-fail");
  const failedResult = runQualityProfile(failed, fixture, { networkEnforced: true });
  const pythonResult = failedResult.applications.find((item) => item.language === "python");
  assert.equal(failedResult.status, failureFixture.expectedStatus);
  assert.equal(pythonResult.gates.at(-1).gate, failureFixture.gate);
  assert.equal(pythonResult.gates.at(-1).exitStatus, failureFixture.expectedExitStatus);
  assert.equal(pythonResult.gates.some((item) => item.gate === "typecheck"), false);

  const mutating = structuredClone(profile);
  mutating.applications[0].gates.formatter = gate("formatter", "mutator");
  const mutationResult = runQualityProfile(mutating, fixture, { networkEnforced: true });
  assert.equal(mutationResult.status, "FAIL");
  assert.equal(mutationResult.applications[0].sourceChanged, true);

  writeFileSync(
    join(fixture, ".ai/manifests/stack-quality-adapters.json"),
    `${JSON.stringify(profile, null, 2)}\n`,
  );
  let cli = spawnSync(process.execPath, [resolve("scripts/run-stack-quality.mjs"), "preview", fixture], {
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).status, "PREVIEW");
  cli = spawnSync(process.execPath, [resolve("scripts/run-stack-quality.mjs"), "run", fixture], {
    encoding: "utf8",
  });
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /requires --approve/);
  cli = spawnSync(
    process.execPath,
    [resolve("scripts/run-stack-quality.mjs"), "run", fixture, "--approve"],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /network-none sandbox/);
  cli = spawnSync(
    process.execPath,
    [resolve("scripts/run-stack-quality.mjs"), "run", fixture, "--approve"],
    { encoding: "utf8", env: { ...process.env, QUALITY_NETWORK_ENFORCED: "1" } },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).status, "PASS");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

process.stdout.write("REQ-009~014 JavaScript, Java and Python stack quality adapter Eval: PASS\n");
