import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const REQUIREMENT = /^REQ-\d{3}$/u;
const TASK_ID = /^[A-Z][A-Z0-9-]{2,63}$/u;
const GRADER_ID = /^[a-z][a-z0-9-]{1,63}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const STOP_CONDITIONS = new Set(["grader-failure", "timeout", "limit-exceeded", "fixture-drift"]);
const ALLOWED_TOOLS = new Set(["read", "test"]);

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function safeRepositoryPath(root, candidate, prefix) {
  if (!text(candidate) || isAbsolute(candidate) || candidate.split(/[\\/]/u).includes("..")) {
    throw new Error(`${prefix} must be a safe repository-relative path`);
  }
  if (basename(candidate).startsWith(".env")) throw new Error(`${prefix} must not reference .env*`);
  const absolute = resolve(root, candidate);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
    throw new Error(`${prefix} escapes repository root`);
  }
  return absolute;
}

function fileInventory(root) {
  const entries = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("fixture symlinks are not allowed");
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) {
        const content = readFileSync(absolute);
        entries.push({
          path: relative(root, absolute).split(sep).join("/"),
          bytes: content.length,
          sha256: createHash("sha256").update(content).digest("hex"),
        });
      }
    }
  }
  walk(root);
  return entries;
}

export function hashFixture(path) {
  const inventory = fileInventory(path);
  return `sha256:${createHash("sha256").update(`${JSON.stringify(inventory)}\n`).digest("hex")}`;
}

function fixtureDiff(before, after) {
  const previous = new Map(before.map((entry) => [entry.path, entry]));
  const current = new Map(after.map((entry) => [entry.path, entry]));
  const paths = [...new Set([...previous.keys(), ...current.keys()])].sort();
  const changedFiles = paths.filter((path) => previous.get(path)?.sha256 !== current.get(path)?.sha256);
  const diffBytes = changedFiles.reduce(
    (total, path) => total + (previous.get(path)?.bytes ?? 0) + (current.get(path)?.bytes ?? 0),
    0,
  );
  return { changedFiles, diffBytes };
}

export function validateCapabilityTask(task, root = process.cwd()) {
  const errors = [];
  if (task?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!TASK_ID.test(task?.id ?? "")) errors.push("id is invalid");
  if (!new Set(["capability", "regression"]).has(task?.kind)) errors.push("kind is invalid");
  if (
    !Array.isArray(task?.requirementIds)
    || task.requirementIds.length === 0
    || !unique(task.requirementIds)
    || task.requirementIds.some((id) => !REQUIREMENT.test(id))
  ) errors.push("requirementIds must be unique REQ identifiers");
  for (const field of ["purpose", "input"]) if (!text(task?.[field])) errors.push(`${field} is required`);

  let fixturePath;
  try {
    fixturePath = safeRepositoryPath(root, task?.fixture?.path, "fixture.path");
    if (!task.fixture.path.startsWith("evals/fixtures/")) errors.push("fixture.path must be under evals/fixtures");
    if (!statSync(fixturePath).isDirectory()) errors.push("fixture.path must be a directory");
  } catch (error) {
    errors.push(error.message);
  }
  if (!SHA256.test(task?.fixture?.sha256 ?? "")) errors.push("fixture.sha256 must be SHA-256");
  else if (fixturePath) {
    try {
      if (hashFixture(fixturePath) !== task.fixture.sha256) errors.push("fixture.sha256 does not match fixture");
    } catch (error) {
      errors.push(`fixture inventory failed: ${error.message}`);
    }
  }

  const tools = task?.permissions?.allowedTools;
  if (!Array.isArray(tools) || tools.length === 0 || !unique(tools) || tools.some((tool) => !ALLOWED_TOOLS.has(tool))) {
    errors.push("permissions.allowedTools must contain unique read/test values");
  }
  if (task?.permissions?.network !== "deny") errors.push("permissions.network must be deny");
  if (task?.permissions?.filesystem !== "isolated-fixture") {
    errors.push("permissions.filesystem must be isolated-fixture");
  }
  if (task?.expectedOutcome?.allGradersPass !== true) errors.push("expectedOutcome.allGradersPass must be true");
  if (typeof task?.expectedOutcome?.fixtureUnchanged !== "boolean") {
    errors.push("expectedOutcome.fixtureUnchanged must be boolean");
  }

  const graders = Array.isArray(task?.graders) ? task.graders : [];
  if (graders.length === 0 || !unique(graders.map((grader) => grader?.id))) errors.push("graders require unique entries");
  for (const grader of graders) {
    if (!GRADER_ID.test(grader?.id ?? "")) errors.push("grader id is invalid");
    if (!Array.isArray(grader?.command) || grader.command.length < 2 || grader.command[0] !== "node") {
      errors.push(`grader ${grader?.id ?? "unknown"} command must start with node`);
      continue;
    }
    try {
      const script = safeRepositoryPath(root, grader.command[1], `grader ${grader.id} script`);
      if (!grader.command[1].startsWith("evals/graders/") || !grader.command[1].endsWith(".mjs")) {
        errors.push(`grader ${grader.id} script must be an evals/graders .mjs file`);
      } else if (!statSync(script).isFile()) errors.push(`grader ${grader.id} script must exist`);
    } catch (error) {
      errors.push(error.message);
    }
    if (grader.command.slice(2).some((argument) => !text(argument) || (argument.includes("{") && argument !== "{fixture}"))) {
      errors.push(`grader ${grader.id} contains an invalid argument`);
    }
    if (!Number.isInteger(grader?.expectedExitStatus) || grader.expectedExitStatus < 0 || grader.expectedExitStatus > 255) {
      errors.push(`grader ${grader.id} expectedExitStatus is invalid`);
    }
    if (!Number.isInteger(grader?.timeoutMs) || grader.timeoutMs < 1 || grader.timeoutMs > 60000) {
      errors.push(`grader ${grader.id} timeoutMs is invalid`);
    }
  }

  if (!Number.isInteger(task?.trials) || task.trials < 1 || task.trials > 20) errors.push("trials is invalid");
  const limits = task?.limits ?? {};
  for (const field of ["maxDurationMs", "maxToolCalls"]) {
    if (!Number.isInteger(limits[field]) || limits[field] < 1) errors.push(`limits.${field} is invalid`);
  }
  if (!Number.isInteger(limits.maxDiffBytes) || limits.maxDiffBytes < 0) errors.push("limits.maxDiffBytes is invalid");
  if (limits.maxTokens !== 0 || limits.maxCostUsd !== 0) {
    errors.push("deterministic suite requires zero token and cost limits");
  }
  const stops = task?.stopConditions;
  if (!Array.isArray(stops) || stops.length === 0 || !unique(stops) || stops.some((item) => !STOP_CONDITIONS.has(item))) {
    errors.push("stopConditions are invalid");
  }
  return { errors, valid: errors.length === 0 };
}

function runTrial(task, root, trialIndex) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "capability-suite-"));
  const fixturePath = join(temporaryRoot, "fixture");
  cpSync(resolve(root, task.fixture.path), fixturePath, { recursive: true, errorOnExist: true });
  const before = fileInventory(fixturePath);
  const started = process.hrtime.bigint();
  const graderResults = [];
  let stopReason = null;
  try {
    for (const grader of task.graders) {
      const script = resolve(root, grader.command[1]);
      const args = [script, ...grader.command.slice(2).map((item) => item === "{fixture}" ? fixturePath : item)];
      const result = spawnSync(process.execPath, args, {
        cwd: fixturePath,
        encoding: "utf8",
        timeout: grader.timeoutMs,
        env: {
          PATH: process.env.PATH,
          HOME: temporaryRoot,
          TMPDIR: temporaryRoot,
          CAPABILITY_NETWORK: "deny",
        },
      });
      const timedOut = result.error?.code === "ETIMEDOUT";
      const status = timedOut ? null : result.status;
      graderResults.push({
        id: grader.id,
        status: timedOut ? "TIMEOUT" : status === grader.expectedExitStatus ? "PASS" : "FAIL",
        exitStatus: status,
        stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
        stderrBytes: Buffer.byteLength(result.stderr ?? ""),
      });
      if (timedOut || status !== grader.expectedExitStatus) {
        stopReason = timedOut ? "timeout" : "grader-failure";
        break;
      }
    }
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const diff = fixtureDiff(before, fileInventory(fixturePath));
    if (!stopReason && task.expectedOutcome.fixtureUnchanged && diff.changedFiles.length > 0) stopReason = "fixture-drift";
    if (
      !stopReason
      && (durationMs > task.limits.maxDurationMs
        || graderResults.length > task.limits.maxToolCalls
        || diff.diffBytes > task.limits.maxDiffBytes)
    ) stopReason = "limit-exceeded";
    return {
      trial: trialIndex,
      status: stopReason ? "FAIL" : "PASS",
      stopReason,
      metrics: {
        durationMs: Number(durationMs.toFixed(3)),
        toolCalls: graderResults.length,
        diffBytes: diff.diffBytes,
        changedFiles: diff.changedFiles.length,
        tokens: 0,
        costUsd: 0,
      },
      graders: graderResults,
    };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function runCapabilityTask(task, root = process.cwd()) {
  const validation = validateCapabilityTask(task, root);
  if (!validation.valid) return { schemaVersion: 1, taskId: task?.id ?? null, status: "INVALID", errors: validation.errors };
  const trials = [];
  for (let index = 1; index <= task.trials; index += 1) {
    const trial = runTrial(task, root, index);
    trials.push(trial);
    if (trial.status !== "PASS") break;
  }
  const totals = trials.reduce(
    (metrics, trial) => ({
      durationMs: Number((metrics.durationMs + trial.metrics.durationMs).toFixed(3)),
      toolCalls: metrics.toolCalls + trial.metrics.toolCalls,
      diffBytes: metrics.diffBytes + trial.metrics.diffBytes,
      tokens: 0,
      costUsd: 0,
    }),
    { durationMs: 0, toolCalls: 0, diffBytes: 0, tokens: 0, costUsd: 0 },
  );
  return {
    schemaVersion: 1,
    taskId: task.id,
    kind: task.kind,
    requirementIds: task.requirementIds,
    deterministic: true,
    fixtureSha256: task.fixture.sha256,
    status: trials.length === task.trials && trials.every((trial) => trial.status === "PASS") ? "PASS" : "FAIL",
    metrics: totals,
    trials,
    modelTrial: {
      executed: false,
      tokens: 0,
      costUsd: 0,
      reason: "deterministic suite only; live model trials require a separate approved plan",
    },
  };
}

export function aggregateCapabilityResults(results) {
  const errors = [];
  if (!Array.isArray(results) || results.length === 0) errors.push("at least one result is required");
  const ids = (results ?? []).map((result) => result?.taskId);
  if (!unique(ids)) errors.push("taskId values must be unique");
  for (const result of results ?? []) {
    if (!TASK_ID.test(result?.taskId ?? "")) errors.push("result taskId is invalid");
    if (!new Set(["PASS", "FAIL"]).has(result?.status)) errors.push(`result ${result?.taskId ?? "unknown"} status is invalid`);
    if (result?.deterministic !== true || result?.modelTrial?.executed !== false) {
      errors.push(`result ${result?.taskId ?? "unknown"} is not a deterministic offline result`);
    }
    for (const field of ["durationMs", "toolCalls", "diffBytes", "tokens", "costUsd"]) {
      if (typeof result?.metrics?.[field] !== "number" || result.metrics[field] < 0) {
        errors.push(`result ${result?.taskId ?? "unknown"} metric ${field} is invalid`);
      }
    }
    if (result?.metrics?.tokens !== 0 || result?.metrics?.costUsd !== 0) {
      errors.push(`result ${result?.taskId ?? "unknown"} must have zero tokens and cost`);
    }
  }
  if (errors.length > 0) return { schemaVersion: 1, status: "INVALID", errors };
  const durations = results.map((result) => result.metrics.durationMs).sort((a, b) => a - b);
  const total = (field) => results.reduce((sum, result) => sum + result.metrics[field], 0);
  return {
    schemaVersion: 1,
    status: results.every((result) => result.status === "PASS") ? "PASS" : "FAIL",
    hardGatePassed: results.every((result) => result.status === "PASS"),
    counts: {
      tasks: results.length,
      pass: results.filter((result) => result.status === "PASS").length,
      fail: results.filter((result) => result.status === "FAIL").length,
    },
    metrics: {
      totalDurationMs: Number(total("durationMs").toFixed(3)),
      averageDurationMs: Number((total("durationMs") / results.length).toFixed(3)),
      p95DurationMs: durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)],
      totalToolCalls: total("toolCalls"),
      totalDiffBytes: total("diffBytes"),
      totalTokens: total("tokens"),
      totalCostUsd: total("costUsd"),
    },
    tasks: results.map((result) => ({
      taskId: result.taskId,
      kind: result.kind,
      status: result.status,
      metrics: result.metrics,
    })),
  };
}

export function loadTask(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
