#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const online = process.argv.includes("--online-audit");
const errors = [];
const notes = [];
const requiredSecurity = [
  ".ai/standards/engineering.md",
  ".ai/standards/security.md",
  ".ai/manifests/approved-mcp.json",
  ".claude/settings.json",
  ".codex/hooks.json",
  ".gitleaks.toml",
  "scripts/ai-security-hook.mjs",
  "scripts/security-check",
  "scripts/security-check.mjs",
  "scripts/validate-handoff.mjs",
  "scripts/validate-mcp-manifest.mjs",
  "security/sast-rules.yml",
  "AGENTS.md",
  "CLAUDE.md",
];

function read(relative) {
  return readFileSync(join(root, relative), "utf8");
}

function requireFile(relative) {
  if (!existsSync(join(root, relative))) errors.push(`missing required file: ${relative}`);
}

function exactVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

function exactBuildMatcher(value) {
  return /^(?:@[^/]+\/[^@]+|[^@]+)@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

function validatePnpmBuildPolicy() {
  const relative = "pnpm-workspace.yaml";
  if (!existsSync(join(root, relative))) return;
  const workspace = read(relative);
  if (/^\s*dangerouslyAllowAllBuilds\s*:\s*true\s*(?:#.*)?$/m.test(workspace)) {
    errors.push("pnpm dangerouslyAllowAllBuilds must not be enabled");
  }
  if (/^\s*strictDepBuilds\s*:\s*false\s*(?:#.*)?$/m.test(workspace)) {
    errors.push("pnpm strictDepBuilds must not be disabled");
  }
  const block = workspace.match(/^allowBuilds\s*:\s*(?:#.*)?\n((?:[ \t]+.*(?:\n|$))*)/m)?.[1];
  if (!block) return;
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const entry = trimmed.match(/^(['"]?)(.+?)\1\s*:\s*(true|false)?\s*(?:#.*)?$/);
    if (!entry) {
      errors.push(`invalid pnpm allowBuilds entry: ${trimmed}`);
      continue;
    }
    const [, , matcher, decision] = entry;
    if (!exactBuildMatcher(matcher)) {
      errors.push(`pnpm allowBuilds matcher must pin an exact package version: ${matcher}`);
    }
    if (!decision) errors.push(`pnpm allowBuilds decision must be true or false: ${matcher}`);
  }
}

requireFile("HANDOFF.md");
requireFile(".editorconfig");
for (const file of requiredSecurity) requireFile(file);

for (const adapter of ["AGENTS.md", "CLAUDE.md"]) {
  if (!existsSync(join(root, adapter))) continue;
  const content = read(adapter);
  for (const reference of [".ai/standards/engineering.md", ".ai/standards/security.md", "HANDOFF.md"]) {
    if (!content.includes(reference)) errors.push(`${adapter} must reference ${reference}`);
  }
  if (existsSync(join(root, ".codesight/wiki/index.md")) && !content.includes(".codesight/wiki/index.md")) {
    errors.push(`${adapter} must reference .codesight/wiki/index.md when CodeSight context is present`);
  }
}

if (existsSync(join(root, ".editorconfig"))) {
  const editorConfig = read(".editorconfig");
  for (const setting of ["root = true", "charset = utf-8", "end_of_line = lf", "insert_final_newline = true", "trim_trailing_whitespace = true"]) {
    if (!editorConfig.includes(setting)) errors.push(`.editorconfig missing: ${setting}`);
  }
}

const packageFile = join(root, "package.json");
if (existsSync(packageFile)) {
  const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
  const manager = String(pkg.packageManager ?? "");
  const managerMatch = manager.match(/^(npm|pnpm|yarn)@(\d+\.\d+\.\d+)$/);
  if (!managerMatch) errors.push("packageManager must pin an exact npm, pnpm, or yarn version");
  const managerName = managerMatch?.[1];
  const managerMajor = Number(managerMatch?.[2].split(".")[0]);
  const lockfiles = { npm: "package-lock.json", pnpm: "pnpm-lock.yaml", yarn: "yarn.lock" };
  if (managerName && !existsSync(join(root, lockfiles[managerName]))) errors.push(`missing ${lockfiles[managerName]} for ${managerName}`);
  for (const [name, version] of Object.entries(pkg.engines ?? {})) {
    if (!exactVersion(version)) errors.push(`engines.${name} must be an exact version, received '${version}'`);
  }
  if (managerName === "pnpm" && managerMajor >= 11 && pkg.pnpm?.overrides) {
    errors.push("pnpm 11+ overrides must be declared in pnpm-workspace.yaml, not package.json#pnpm.overrides");
  }
  if (managerName === "pnpm" && managerMajor >= 11 && !existsSync(join(root, "pnpm-workspace.yaml"))) {
    notes.push("pnpm 11 project has no pnpm-workspace.yaml; create it when overrides or workspace policy is needed");
  }
  if (managerName === "pnpm" && managerMajor >= 11) validatePnpmBuildPolicy();
  const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(allDependencies)) {
    if (!exactVersion(version)) errors.push(`${name} must use an exact version, received '${version}'`);
  }
  if (allDependencies.next) {
    const telemetryEvidence = ["package.json", "scripts/run-next.mjs", ".github/workflows/security.yml"]
      .filter((file) => existsSync(join(root, file)))
      .some((file) => read(file).includes("NEXT_TELEMETRY_DISABLED"));
    if (!telemetryEvidence) errors.push("Next.js requires project-controlled NEXT_TELEMETRY_DISABLED=1 evidence");
  }
  if (allDependencies["@playwright/test"]) {
    notes.push("Playwright browser binaries require a separate preview and Human-in-the-loop approval; validate never downloads them");
  }

  if (online && managerName) {
    let command;
    let args;
    if (managerName === "pnpm") {
      const pnpm = join(root, ".tools/pnpm/package/bin/pnpm.cjs");
      const node = join(root, ".tools/node/bin/node");
      if (!existsSync(pnpm) || !existsSync(node)) {
        errors.push("online pnpm audit requires reviewed project-local Node and pnpm; Corepack fallback is forbidden");
      } else {
        command = node;
        args = [pnpm, "audit", "--audit-level", "moderate", "--store-dir", join(root, ".tools/pnpm-store")];
      }
    } else if (managerName === "npm") {
      command = "npm";
      args = ["audit", "--audit-level=moderate"];
    } else {
      errors.push("online audit is not implemented for this package manager");
    }
    if (command) {
      const audit = spawnSync(command, args, { cwd: root, stdio: "inherit" });
      if (audit.status !== 0) errors.push(`${managerName} vulnerability audit failed`);
    }
  }
}

if (existsSync(join(root, "scripts/validate-handoff.mjs"))) {
  const handoff = spawnSync(process.execPath, ["scripts/validate-handoff.mjs", "full"], { cwd: root, encoding: "utf8" });
  if (handoff.status !== 0) errors.push(handoff.stderr.trim() || "HANDOFF validation failed");
}
if (existsSync(join(root, "scripts/validate-mcp-manifest.mjs"))) {
  const mcp = spawnSync(process.execPath, ["scripts/validate-mcp-manifest.mjs"], { cwd: root, encoding: "utf8" });
  if (mcp.status !== 0) errors.push(mcp.stderr.trim() || "MCP manifest validation failed");
}

for (const note of notes) process.stdout.write(`NOTE: ${note}\n`);
if (errors.length) {
  for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
  process.exit(1);
}
process.stdout.write(`Downstream validation (${basename(root)}): PASS\n`);
