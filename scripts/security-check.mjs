#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expected = { gitleaks: "8.30.1", opengrep: "1.22.0" };
const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const mode = process.argv[2] ?? "full";
if (!new Set(["changed", "staged", "full", "verify-tools"]).has(mode)) process.exit(2);

function pathFor(name) {
  const local = join(root, ".tools", "bin", name);
  return existsSync(local) ? local : name;
}
function run(command, args, capture = false, input) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", input,
    env: {
      ...process.env,
      HOME: join(root, ".tools", "runtime-home"),
      XDG_CACHE_HOME: join(root, ".tools", "runtime-cache"),
      OPENGREP_ENABLE_VERSION_CHECK: "0",
      SEMGREP_SEND_METRICS: "off",
      SEMGREP_APP_TOKEN: "",
    },
    stdio: input === undefined ? (capture ? "pipe" : "inherit") : ["pipe", "inherit", "inherit"],
  });
  if (result.error?.code === "ENOENT") {
    console.error(`Missing security tool: ${command}. Run scripts/bootstrap-security-tools.`);
    process.exit(127);
  }
  return result;
}
function verify(name, args) {
  const command = pathFor(name);
  const result = run(command, args, true);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0 || !output.includes(expected[name])) {
    console.error(`${name} version mismatch; expected ${expected[name]}.`);
    process.exit(1);
  }
  return command;
}
function git(args) {
  const result = run("git", args, true);
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}
function hasHead() {
  return run("git", ["rev-parse", "--verify", "HEAD"], true).status === 0;
}
function files() {
  if (mode === "changed" && !hasHead()) return ["."];
  const args = mode === "staged"
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD"];
  return git(args).split("\0").filter(Boolean).filter((file) => existsSync(join(root, file)));
}

const mcpManifest = run(process.execPath, ["scripts/validate-mcp-manifest.mjs"], true);
if (mcpManifest.status !== 0) {
  process.stderr.write(mcpManifest.stderr || mcpManifest.stdout || "MCP approval manifest validation failed.\n");
  process.exit(1);
}

const gitleaks = verify("gitleaks", ["version"]);
const opengrep = verify("opengrep", ["--version"]);
if (mode === "verify-tools") {
  console.log("Security tool versions: PASS");
  process.exit(0);
}

let secret;
if (mode === "full" || (mode === "changed" && !hasHead())) {
  secret = run(gitleaks, ["dir", ".", "--config", ".gitleaks.toml", "--redact=100", "--no-banner"]);
} else {
  const diffArgs = mode === "staged"
    ? ["diff", "--cached", "--binary", "--no-ext-diff"]
    : ["diff", "--binary", "--no-ext-diff", "HEAD"];
  secret = run(gitleaks, ["stdin", "--config", ".gitleaks.toml", "--redact=100", "--no-banner"], false, git(diffArgs));
}

const targets = mode === "full" ? ["."] : files();
const sast = targets.length === 0 ? { status: 0 } : run(opengrep, [
  "scan", "--config", "security/sast-rules.yml", "--disable-version-check", "--error", "--force-exclude",
  "--exclude", ".tools", "--exclude", "node_modules", "--exclude", ".security-reports", ...targets,
]);

if (secret.status !== 0 || sast.status !== 0) {
  console.error("Security check: FAIL");
  process.exit(1);
}
console.log("Security check: PASS");
