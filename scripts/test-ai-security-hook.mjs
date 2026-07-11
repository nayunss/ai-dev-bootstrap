#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(toolName, toolInput) {
  return spawnSync(process.execPath, ["scripts/ai-security-hook.mjs", "pre"], {
    cwd: root,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
  });
}

function expectDenied(toolName, toolInput) {
  const result = run(toolName, toolInput);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"permissionDecision":"deny"/);
  assert.match(result.stdout, /files whose names start with \.env are always blocked/);
}

for (const file of [".env", ".env.local", ".env.example", ".environment", "config/.env.production"]) {
  expectDenied("Read", { file_path: file });
}
expectDenied("Grep", { pattern: "TOKEN", path: ".env.development" });
expectDenied("Glob", { pattern: "**/.env*" });
expectDenied("Bash", { command: "sed -n '1,20p' .env.local" });

const unapprovedMcp = run("mcp__filesystem__read_file", { path: "src/app.ts" });
assert.equal(unapprovedMcp.status, 0);
assert.match(unapprovedMcp.stdout, /"permissionDecision":"deny"/);
assert.match(unapprovedMcp.stdout, /is not enabled in the reviewed project manifest/);

const mcpMutation = run("Bash", { command: "claude mcp add filesystem -- npx server" });
assert.equal(mcpMutation.status, 0);
assert.match(mcpMutation.stdout, /"permissionDecision":"deny"/);
assert.match(mcpMutation.stdout, /MCP configuration changes require supply-chain review/);

const safe = run("Read", { file_path: "src/app.ts" });
assert.equal(safe.status, 0);
assert.equal(safe.stdout, "");

process.stdout.write("AI sensitive-file hook tests: PASS\n");
