#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "pre";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mcpManifest = JSON.parse(readFileSync(resolve(root, ".ai", "manifests", "approved-mcp.json"), "utf8"));
let input = {};
try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}

function deny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason,
  }}));
  process.exit(0);
}
function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => strings(item, out));
  return out;
}

function mcpServerName(tool) {
  const match = tool.match(/^mcp__([a-z0-9-]+)__(.+)$/i);
  return match ? { server: match[1], tool: match[2] } : null;
}

function approvedMcpServers() {
  return new Map(
    (mcpManifest.servers ?? [])
      .filter(
        (server) =>
          server.approved === true &&
          server.enabled === true &&
          server.reviewExpiresAt >= new Date().toISOString().slice(0, 10),
      )
      .map((server) => [server.name, new Set(server.allowedTools)]),
  );
}

if (mode === "pre") {
  const tool = String(input.tool_name ?? "");
  const text = strings(input.tool_input ?? {}).join("\n");
  const destructive = [
    /(^|[;&|`$()\s])rm\s+(-[^\n]*[rf][^\n]*\s+|--recursive\b|--force\b)/i,
    /\bgit\s+(?:reset\s+--hard|clean\s+-[^\n]*[fdx]|push\s+[^\n]*--force)\b/i,
    /\b(?:DROP|TRUNCATE)\s+(?:DATABASE|SCHEMA|TABLE)\b/i,
    /\b(?:terraform\s+destroy|kubectl\s+delete|helm\s+uninstall)\b/i,
  ];
  const sensitive = /(?:^|[/\\\s"'=])(?:\.env[^/\\\s"']*|credentials?(?:\.|$)|secrets?\.(?:ya?ml|json)|\.ssh[/\\]|\.aws[/\\])/i;
  const protectedPath = /(^|[/\\])(?:\.ai[/\\](?:standards|workflows|manifests)|\.github[/\\]workflows|\.claude[/\\]settings|\.codex[/\\]hooks|\.husky|(?:\.vscode|\.cursor)[/\\]mcp\.json|\.mcp\.json)(?:[/\\]|$)/i;
  const mcpCall = mcpServerName(tool);
  const approvedMcp = approvedMcpServers();
  const mcpMutation = /\b(?:claude|codex)\s+mcp\s+(?:add|remove|reset|enable|disable)\b|(?:^|[/\\])(?:\.mcp\.json|mcp\.json)\b/i;
  if (destructive.some((pattern) => pattern.test(text))) deny("Destructive action blocked; exact human approval and rollback evidence are required.");
  if (tool === "Bash" && mcpMutation.test(text)) deny("MCP configuration changes require supply-chain review, manifest approval, and separate human activation.");
  if (mcpCall && !approvedMcp.has(mcpCall.server)) deny(`MCP server '${mcpCall.server}' is not enabled in the reviewed project manifest.`);
  if (mcpCall && !approvedMcp.get(mcpCall.server)?.has(mcpCall.tool)) deny(`MCP tool '${mcpCall.server}/${mcpCall.tool}' is outside the reviewed allowlist.`);
  if (/^(?:Bash|Read|Glob|Grep|mcp__.*)$/i.test(tool) && sensitive.test(text)) deny("Sensitive files must not be read by AI; files whose names start with .env are always blocked.");
  if (/^(?:Write|Edit|MultiEdit|NotebookEdit)$/i.test(tool) && sensitive.test(text)) deny("Sensitive credential path modification is blocked.");
  if (/^(?:Write|Edit|MultiEdit|NotebookEdit)$/i.test(tool) && protectedPath.test(text)) deny("Protected security configuration requires separate review.");
  process.exit(0);
}
if (mode === "post") {
  if (!/^(?:Write|Edit|MultiEdit|NotebookEdit)$/i.test(String(input.tool_name ?? ""))) process.exit(0);
  const result = spawnSync(resolve(root, "scripts", "security-check"), ["changed"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "Post-edit security check failed.\n");
    process.exit(2);
  }
  process.exit(0);
}
process.exit(2);
