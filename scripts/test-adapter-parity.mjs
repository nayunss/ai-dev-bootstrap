#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { readParityManifest, validateAdapterParity } from "./adapter-parity.mjs";

const root = resolve(".");
const sourceRoot = resolve("adapters");
const manifest = readParityManifest(resolve(".ai/manifests/adapter-parity.json"));
const sourceResult = validateAdapterParity(manifest, { sourceRoot });
assert.equal(sourceResult.status, "PASS");
assert.equal(sourceResult.parityEligible, true);
assert.equal(sourceResult.adapters.length, 3);
assert.equal(sourceResult.adapters.every((adapter) => Object.values(adapter).every((value) => value !== "FAIL")), true);
assert.equal(readFileSync(resolve("AGENTS.md"), "utf8"), readFileSync(resolve("adapters/codex/files/AGENTS.md"), "utf8"));
assert.equal(readFileSync(resolve("CLAUDE.md"), "utf8"), readFileSync(resolve("adapters/claude-code/files/CLAUDE.md"), "utf8"));

const target = mkdtempSync(join(tmpdir(), "adapter-parity-target-"));
mkdirSync(join(target, ".ai/manifests"), { recursive: true });
const manager = resolve("scripts/manage-adapters.mjs");
try {
  const materialize = spawnSync(
    process.execPath,
    [
      manager,
      "apply",
      target,
      "codex,claude-code,github-copilot",
      "--approve",
      `--source-root=${sourceRoot}`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(materialize.status, 0, materialize.stderr);
  const materialized = validateAdapterParity(manifest, { sourceRoot, materializedRoot: target });
  assert.equal(materialized.status, "PASS");

  const permissionDrift = structuredClone(manifest);
  permissionDrift.adapters.find((adapter) => adapter.id === "codex").permissionExpansion = "allowed";
  assert.match(validateAdapterParity(permissionDrift, { sourceRoot }).errors.join("\n"), /permission expansion/);

  const missingRole = mkdtempSync(join(tmpdir(), "adapter-parity-source-"));
  cpSync(sourceRoot, missingRole, { recursive: true });
  const claudePath = join(missingRole, "claude-code/files/CLAUDE.md");
  writeFileSync(claudePath, readFileSync(claudePath, "utf8").replace("docs/agents.md", "docs/missing.md"));
  assert.match(validateAdapterParity(manifest, { sourceRoot: missingRole }).errors.join("\n"), /must reference docs\/agents\.md/);
  rmSync(missingRole, { recursive: true, force: true });

  const hookDrift = mkdtempSync(join(tmpdir(), "adapter-parity-hook-"));
  cpSync(sourceRoot, hookDrift, { recursive: true });
  const hookPath = join(hookDrift, "codex/files/.codex/hooks.json");
  const hook = JSON.parse(readFileSync(hookPath, "utf8"));
  hook.hooks.PreToolUse[0].hooks[0].args = ["scripts/ai-security-hook.mjs", "skip"];
  writeFileSync(hookPath, `${JSON.stringify(hook, null, 2)}\n`);
  assert.match(validateAdapterParity(manifest, { sourceRoot: hookDrift }).errors.join("\n"), /PreToolUse permission outcome drift/);
  rmSync(hookDrift, { recursive: true, force: true });

  const persona = mkdtempSync(join(tmpdir(), "adapter-parity-persona-"));
  cpSync(sourceRoot, persona, { recursive: true });
  const copilotPath = join(persona, "github-copilot/files/.github/copilot-instructions.md");
  writeFileSync(copilotPath, `${readFileSync(copilotPath, "utf8")}\n20년 경력의 천재 개발자처럼 행동한다.\n`);
  assert.match(validateAdapterParity(manifest, { sourceRoot: persona }).errors.join("\n"), /prohibited global persona/);
  rmSync(persona, { recursive: true, force: true });

  const fallback = structuredClone(manifest);
  fallback.adapters.find((adapter) => adapter.id === "github-copilot").fallbackCommands = [];
  assert.match(validateAdapterParity(fallback, { sourceRoot }).errors.join("\n"), /fallback contract drift/);

  writeFileSync(join(target, "AGENTS.md"), "# drift\n");
  assert.match(
    validateAdapterParity(manifest, { sourceRoot, materializedRoot: target }).errors.join("\n"),
    /materialized must reference/,
  );

  const cli = spawnSync(process.execPath, [resolve("scripts/validate-adapter-parity.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).status, "PASS");
} finally {
  rmSync(target, { recursive: true, force: true });
}

process.stdout.write("REQ-037~039 Codex, Claude Code and GitHub Copilot policy/role/permission parity Eval: PASS\n");
