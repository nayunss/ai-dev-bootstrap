#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { discoverApplications, readDeclaredInventory } from "./application-inventory.mjs";

const root = resolve(process.argv[2] ?? ".");
const online = process.argv.includes("--online-audit");
const errors = [];
const notes = [];
const discoveredApplications = discoverApplications(root);
const declaredInventory = readDeclaredInventory(root);
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

function validateApplicationInventory() {
  if (discoveredApplications.length < 2) return;
  if (!declaredInventory) {
    errors.push("multiple application manifests detected; docs/development-environment.md requires a machine-readable JSON application inventory");
    return;
  }

  const declared = declaredInventory.applications;
  const seen = new Set();
  let hasFrontend = false;
  for (const application of declared) {
    const id = String(application?.id ?? "");
    const appRoot = String(application?.root ?? "");
    const manifest = String(application?.manifest ?? "");
    if (!id || !appRoot || !manifest || !application?.type) {
      errors.push("each application inventory entry requires id, root, type, and manifest");
      continue;
    }
    if (application.type === "frontend") hasFrontend = true;
    if (seen.has(manifest)) errors.push(`duplicate application manifest in inventory: ${manifest}`);
    seen.add(manifest);
    const discovered = discoveredApplications.find((candidate) => candidate.manifest === manifest);
    if (!discovered) errors.push(`declared application manifest does not exist or is outside discovery: ${manifest}`);
    else if (discovered.root !== appRoot) errors.push(`application root mismatch for ${manifest}: expected ${discovered.root}, received ${appRoot}`);

    if (!Array.isArray(application.quality) || application.quality.length === 0) {
      errors.push(`application ${id} requires at least one quality command in inventory`);
    }
    for (const field of ["ci", "deploy"]) {
      const evidence = application[field];
      if (typeof evidence !== "string" || !evidence || !existsSync(join(root, evidence))) {
        errors.push(`application ${id} requires existing ${field} evidence path`);
      }
    }
    const hook = application.hook;
    if (!new Set(["required", "not-approved", "not-applicable"]).has(hook)) {
      errors.push(`application ${id} hook must be required, not-approved, or not-applicable`);
    }
    if (hook === "required") {
      const hookPath = appRoot === "." ? ".husky/pre-commit" : join(appRoot, ".husky/pre-commit");
      if (!existsSync(join(root, hookPath))) errors.push(`application ${id} requires hook evidence: ${hookPath}`);
      if (manifest.endsWith("package.json") && existsSync(join(root, manifest))) {
        const pkg = JSON.parse(readFileSync(join(root, manifest), "utf8"));
        const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const dependency of ["husky", "lint-staged"]) {
          if (!exactVersion(dependencies[dependency])) {
            errors.push(`application ${id} required hook profile must pin exact ${dependency}`);
          }
        }
      }
    }
  }

  for (const application of discoveredApplications) {
    if (!seen.has(application.manifest)) errors.push(`discovered manifest is missing from application inventory: ${application.manifest}`);
  }

  if (declaredInventory.shared?.codeSight !== "required") {
    errors.push("multi-application inventory must declare shared.codeSight as required");
  }
  requireFile(".codesight/wiki/index.md");
  if (hasFrontend && existsSync(join(root, ".editorconfig"))) {
    const editorConfig = read(".editorconfig");
    const frontendProfile = /^\[\*\.\{[^\]]*(?:js|jsx|ts|tsx|css|scss)[^\]]*\}\]/m;
    if (!frontendProfile.test(editorConfig)) {
      errors.push("multi-application frontend requires an explicit JavaScript/TypeScript/CSS EditorConfig profile");
    }
  }
}

function validatePnpmBuildPolicy(appRoot = ".") {
  const relative = appRoot === "." ? "pnpm-workspace.yaml" : join(appRoot, "pnpm-workspace.yaml");
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

function validateNodeApplication(manifest, appRoot) {
  const pkg = JSON.parse(readFileSync(join(root, manifest), "utf8"));
  const label = appRoot === "." ? "root" : appRoot;
  const manager = String(pkg.packageManager ?? "");
  const managerMatch = manager.match(/^(npm|pnpm|yarn)@(\d+\.\d+\.\d+)$/);
  if (!managerMatch) errors.push(`${label} packageManager must pin an exact npm, pnpm, or yarn version`);
  const managerName = managerMatch?.[1];
  const managerMajor = Number(managerMatch?.[2].split(".")[0]);
  const lockfiles = { npm: "package-lock.json", pnpm: "pnpm-lock.yaml", yarn: "yarn.lock" };
  const lockfile = managerName ? join(appRoot, lockfiles[managerName]) : null;
  if (lockfile && !existsSync(join(root, lockfile))) errors.push(`${label} missing ${lockfiles[managerName]} for ${managerName}`);
  for (const [name, version] of Object.entries(pkg.engines ?? {})) {
    if (!exactVersion(version)) errors.push(`${label} engines.${name} must be an exact version, received '${version}'`);
  }
  if (managerName === "pnpm" && managerMajor >= 11 && pkg.pnpm?.overrides) {
    errors.push(`${label} pnpm 11+ overrides must be declared in pnpm-workspace.yaml, not package.json#pnpm.overrides`);
  }
  const workspace = join(appRoot, "pnpm-workspace.yaml");
  if (managerName === "pnpm" && managerMajor >= 11 && !existsSync(join(root, workspace))) {
    notes.push(`${label} pnpm 11 project has no pnpm-workspace.yaml; create it when overrides or workspace policy is needed`);
  }
  if (managerName === "pnpm" && managerMajor >= 11) validatePnpmBuildPolicy(appRoot);
  const allDependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(allDependencies)) {
    if (!exactVersion(version)) errors.push(`${label} ${name} must use an exact version, received '${version}'`);
  }
  if (allDependencies.next) {
    const candidates = [manifest, join(appRoot, "scripts/run-next.mjs"), ".github/workflows/security.yml", ".github/workflows/ci.yml"];
    const telemetryEvidence = candidates
      .filter((file) => existsSync(join(root, file)))
      .some((file) => read(file).includes("NEXT_TELEMETRY_DISABLED"));
    if (!telemetryEvidence) errors.push(`${label} Next.js requires project-controlled NEXT_TELEMETRY_DISABLED=1 evidence`);
  }
  if (allDependencies["@playwright/test"]) {
    notes.push(`${label} Playwright browser binaries require a separate preview and Human-in-the-loop approval; validate never downloads them`);
  }
}

requireFile("HANDOFF.md");
requireFile(".editorconfig");
for (const file of requiredSecurity) requireFile(file);
validateApplicationInventory();

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

for (const application of discoveredApplications) {
  if (application.manifest === "package.json" || !application.manifest.endsWith("package.json")) continue;
  validateNodeApplication(application.manifest, application.root);
}

if (existsSync(join(root, "scripts/validate-handoff.mjs"))) {
  const handoff = spawnSync(process.execPath, ["scripts/validate-handoff.mjs", "full"], { cwd: root, encoding: "utf8" });
  if (handoff.status !== 0) errors.push(handoff.stderr.trim() || "HANDOFF validation failed");
}
if (existsSync(join(root, "scripts/validate-mcp-manifest.mjs"))) {
  const mcp = spawnSync(process.execPath, ["scripts/validate-mcp-manifest.mjs"], { cwd: root, encoding: "utf8" });
  if (mcp.status !== 0) errors.push(mcp.stderr.trim() || "MCP manifest validation failed");
}
if (existsSync(join(root, "docs/production-readiness.json"))) {
  if (!existsSync(join(root, "scripts/validate-production-readiness.mjs"))) {
    errors.push("production readiness profile requires scripts/validate-production-readiness.mjs");
  } else {
    const readiness = spawnSync(
      process.execPath,
      ["scripts/validate-production-readiness.mjs", "docs/production-readiness.json", "--check-consistency"],
      { cwd: root, encoding: "utf8" },
    );
    if (readiness.status !== 0) errors.push(readiness.stderr.trim() || "Production readiness validation failed");
    else if (readiness.stdout.includes("BLOCKED")) notes.push("Production remains blocked until readiness evidence passes --expect-ready");
  }
}
if (existsSync(join(root, ".ai/manifests/adapters.lock.json"))) {
  if (!existsSync(join(root, "scripts/manage-adapters.mjs"))) {
    errors.push("adapter lock requires scripts/manage-adapters.mjs");
  } else {
    const adapters = spawnSync(process.execPath, ["scripts/manage-adapters.mjs", "validate", root], {
      cwd: root,
      encoding: "utf8",
    });
    if (adapters.status !== 0) errors.push(adapters.stderr.trim() || "adapter hash validation failed");
  }
}
if (existsSync(join(root, ".ai/manifests/upstream.lock.yaml"))) {
  if (!existsSync(join(root, "scripts/validate-upstream-lock.mjs"))) {
    errors.push("upstream lock requires scripts/validate-upstream-lock.mjs");
  } else {
    const upstream = spawnSync(
      process.execPath,
      ["scripts/validate-upstream-lock.mjs", ".ai/manifests/upstream.lock.yaml", root],
      { cwd: root, encoding: "utf8" },
    );
    if (upstream.status !== 0) errors.push(upstream.stderr.trim() || "upstream lock validation failed");
  }
}
if (existsSync(join(root, ".ai/manifests/upstream-upgrade.rollback.json"))) {
  if (!existsSync(join(root, "scripts/validate-core-upgrade-record.mjs"))) {
    errors.push("core upgrade rollback record requires scripts/validate-core-upgrade-record.mjs");
  } else {
    const upgrade = spawnSync(process.execPath, ["scripts/validate-core-upgrade-record.mjs", root], {
      cwd: root,
      encoding: "utf8",
    });
    if (upgrade.status !== 0) errors.push(upgrade.stderr.trim() || "core upgrade rollback record validation failed");
    else notes.push("core upgrade rollback remains available until explicitly finalized");
  }
}
if (existsSync(join(root, ".ai/manifests/security-tools.lock.json"))) {
  if (!existsSync(join(root, "scripts/manage-security-tools.mjs"))) {
    errors.push("security tool lock requires scripts/manage-security-tools.mjs");
  } else {
    const securityTools = spawnSync(process.execPath, ["scripts/manage-security-tools.mjs", "validate", root], {
      cwd: root,
      encoding: "utf8",
    });
    if (securityTools.status !== 0) errors.push(securityTools.stderr.trim() || "security tool hash validation failed");
  }
}
if (existsSync(join(root, ".ai/manifests/dependency-bootstrap.lock.json"))) {
  if (!existsSync(join(root, "scripts/manage-dependencies.mjs"))) {
    errors.push("dependency bootstrap lock requires scripts/manage-dependencies.mjs");
  } else {
    const dependencies = spawnSync(process.execPath, ["scripts/manage-dependencies.mjs", "validate", root], {
      cwd: root,
      encoding: "utf8",
    });
    if (dependencies.status !== 0) errors.push(dependencies.stderr.trim() || "dependency bootstrap validation failed");
  }
}

for (const note of notes) process.stdout.write(`NOTE: ${note}\n`);
if (errors.length) {
  for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
  process.exit(1);
}
process.stdout.write(`Downstream validation (${basename(root)}): PASS\n`);
