#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  aggregateCapabilityResults,
  hashFixture,
  loadTask,
  runCapabilityTask,
  validateCapabilityTask,
} from "./capability-suite.mjs";

const root = resolve(".");
const taskPath = resolve("evals/tasks/deterministic-capability-smoke.json");
const task = loadTask(taskPath);
assert.equal(task.fixture.sha256, hashFixture(resolve(task.fixture.path)));
assert.deepEqual(validateCapabilityTask(task, root), { errors: [], valid: true });

const result = runCapabilityTask(task, root);
assert.equal(result.status, "PASS");
assert.equal(result.deterministic, true);
assert.equal(result.trials.length, 2);
assert.equal(result.metrics.toolCalls, 2);
assert.equal(result.metrics.diffBytes, 0);
assert.equal(result.metrics.tokens, 0);
assert.equal(result.metrics.costUsd, 0);
assert.equal(result.modelTrial.executed, false);

const aggregate = aggregateCapabilityResults([result]);
assert.equal(aggregate.status, "PASS");
assert.equal(aggregate.hardGatePassed, true);
assert.deepEqual(aggregate.counts, { tasks: 1, pass: 1, fail: 0 });
assert.equal(aggregate.metrics.totalToolCalls, 2);
assert.equal(aggregate.metrics.totalTokens, 0);
assert.equal(aggregate.metrics.totalCostUsd, 0);

const unsafeFixture = structuredClone(task);
unsafeFixture.fixture.path = "../outside";
assert.match(validateCapabilityTask(unsafeFixture, root).errors.join("\n"), /safe repository-relative path/);

const secretFixture = structuredClone(task);
secretFixture.fixture.path = "evals/fixtures/.env.example";
assert.match(validateCapabilityTask(secretFixture, root).errors.join("\n"), /\.env/);

const network = structuredClone(task);
network.permissions.network = "allow";
assert.match(validateCapabilityTask(network, root).errors.join("\n"), /network must be deny/);

const modelBudget = structuredClone(task);
modelBudget.limits.maxTokens = 1;
assert.match(validateCapabilityTask(modelBudget, root).errors.join("\n"), /zero token and cost/);

const arbitraryCommand = structuredClone(task);
arbitraryCommand.graders[0].command = ["sh", "-c", "true"];
assert.match(validateCapabilityTask(arbitraryCommand, root).errors.join("\n"), /must start with node/);

const fixtureDrift = structuredClone(task);
fixtureDrift.fixture.sha256 = `sha256:${"0".repeat(64)}`;
assert.match(validateCapabilityTask(fixtureDrift, root).errors.join("\n"), /does not match fixture/);

const failed = structuredClone(result);
failed.taskId = "CAPABILITY-HARNESS-FAIL";
failed.status = "FAIL";
const failedAggregate = aggregateCapabilityResults([result, failed]);
assert.equal(failedAggregate.status, "FAIL");
assert.equal(failedAggregate.hardGatePassed, false);

const paid = structuredClone(result);
paid.metrics.costUsd = 1;
assert.match(aggregateCapabilityResults([paid]).errors.join("\n"), /zero tokens and cost/);

const temporary = mkdtempSync(join(tmpdir(), "capability-cli-"));
try {
  const resultPath = join(temporary, "result.json");
  const runCli = spawnSync(
    process.execPath,
    [resolve("scripts/run-capability-task.mjs"), taskPath, "--expect-pass", `--output=${resultPath}`],
    { encoding: "utf8" },
  );
  assert.equal(runCli.status, 0, runCli.stderr);
  assert.equal(JSON.parse(readFileSync(resultPath, "utf8")).status, "PASS");

  const aggregatePath = join(temporary, "aggregate.json");
  const aggregateCli = spawnSync(
    process.execPath,
    [
      resolve("scripts/aggregate-capability-results.mjs"),
      resultPath,
      "--expect-pass",
      `--output=${aggregatePath}`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(aggregateCli.status, 0, aggregateCli.stderr);
  assert.equal(JSON.parse(readFileSync(aggregatePath, "utf8")).status, "PASS");

  const invalidPath = join(temporary, "invalid.json");
  writeFileSync(invalidPath, "{}\n");
  const invalidCli = spawnSync(
    process.execPath,
    [resolve("scripts/run-capability-task.mjs"), invalidPath],
    { encoding: "utf8" },
  );
  assert.equal(invalidCli.status, 1);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

process.stdout.write("REQ-025 deterministic capability task schema, runner and aggregation Eval: PASS\n");
