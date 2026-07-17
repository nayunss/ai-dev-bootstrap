#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const generatorVersion = "1.0.0";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRootArgument = process.argv.find((argument) => argument.startsWith("--source-root="));
const sourceRoot = resolve(sourceRootArgument?.slice("--source-root=".length) || join(root, "adapters"));
const lockPath = ".ai/manifests/adapters.lock.json";
const definitions = {
  codex: ["AGENTS.md", ".codex/hooks.json"],
  "claude-code": ["CLAUDE.md", ".claude/settings.json"],
};

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function hash(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function safeRelative(path) {
  return path && !path.startsWith("/") && !path.split(/[\\/]/).includes("..") && !path.split(/[\\/]/).some((part) => part.startsWith(".env"));
}

function targetPath(target, path) {
  if (!safeRelative(path)) fail(`Unsafe adapter path: ${path}`);
  const destination = resolve(target, path);
  if (destination !== target && !destination.startsWith(`${target}${sep}`)) fail(`Adapter path escapes target: ${path}`);
  return destination;
}

function content(path) {
  return readFileSync(path);
}

function selected(value) {
  const names = [...new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean))].sort();
  if (names.length === 0) fail("At least one adapter is required: codex,claude-code", 2);
  for (const name of names) if (!definitions[name]) fail(`Unsupported adapter: ${name}`, 2);
  return names;
}

function source(name) {
  const files = definitions[name].map((path) => {
    const sourcePath = join(sourceRoot, name, "files", path);
    if (!existsSync(sourcePath)) fail(`Missing adapter source: ${relative(root, sourcePath)}`);
    const bytes = content(sourcePath);
    return { path, sourcePath, sourceSha256: hash(bytes), targetSha256: hash(bytes), bytes };
  });
  const sourceHash = hash(files.map((file) => `${file.path}\0${file.sourceSha256}\n`).join(""));
  return { name, sourceHash, files };
}

function readLock(target, required = false) {
  const path = targetPath(target, lockPath);
  if (!existsSync(path)) {
    if (required) fail(`Missing adapter lock: ${lockPath}`);
    return { schemaVersion: 1, generatorVersion, adapters: [] };
  }
  const lock = JSON.parse(readFileSync(path, "utf8"));
  if (lock.schemaVersion !== 1 || !Array.isArray(lock.adapters)) fail("Invalid adapter lock schema.");
  return lock;
}

function writeLock(target, lock) {
  const path = targetPath(target, lockPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`);
}

function planApply(target, names) {
  return names.map((name) => {
    const adapter = source(name);
    return {
      ...adapter,
      files: adapter.files.map((file) => {
        const destination = targetPath(target, file.path);
        if (!existsSync(destination)) return { ...file, action: "create", managed: true };
        const currentSha256 = hash(content(destination));
        if (currentSha256 === file.targetSha256) return { ...file, action: "preserve-identical", managed: false };
        return { ...file, action: "blocked-existing-different", managed: false, currentSha256 };
      }),
    };
  });
}

function printPlan(label, plans) {
  console.log(`${label} preview`);
  for (const adapter of plans) {
    console.log(`- adapter: ${adapter.name}`);
    if (adapter.sourceHash) console.log(`  source: ${adapter.sourceHash}`);
    for (const file of adapter.files) console.log(`  ${file.action}: ${file.path}`);
  }
}

function apply(target, names, approved) {
  const plans = planApply(target, names);
  printPlan("Adapter apply", plans);
  if (plans.some((adapter) => adapter.files.some((file) => file.action === "blocked-existing-different"))) {
    fail("Adapter apply blocked: existing files differ; no files were changed.");
  }
  if (!approved) return;

  const lock = readLock(target);
  const byName = new Map(lock.adapters.map((adapter) => [adapter.name, adapter]));
  for (const adapter of plans) {
    for (const file of adapter.files) {
      if (file.action !== "create") continue;
      const destination = targetPath(target, file.path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, file.bytes);
    }
    byName.set(adapter.name, {
      name: adapter.name,
      sourceHash: adapter.sourceHash,
      files: adapter.files.map(({ path, sourceSha256, targetSha256, managed }) => ({
        path, sourceSha256, targetSha256, managed,
      })),
    });
  }
  writeLock(target, {
    schemaVersion: 1,
    generatorVersion,
    adapters: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
  });
  console.log("Adapter apply: PASS");
}

function validate(target) {
  const lock = readLock(target, true);
  const errors = [];
  if (lock.generatorVersion !== generatorVersion) errors.push(`generator version drift: ${lock.generatorVersion} != ${generatorVersion}`);
  for (const adapter of lock.adapters) {
    if (!definitions[adapter.name]) {
      errors.push(`unsupported locked adapter: ${adapter.name}`);
      continue;
    }
    const currentSource = source(adapter.name);
    if (adapter.sourceHash !== currentSource.sourceHash) errors.push(`source drift: ${adapter.name}`);
    for (const file of adapter.files ?? []) {
      const destination = targetPath(target, file.path);
      if (!existsSync(destination)) errors.push(`missing adapter file: ${file.path}`);
      else if (hash(content(destination)) !== file.targetSha256) errors.push(`target drift: ${file.path}`);
    }
  }
  if (errors.length) fail(`Adapter validation: FAIL\n${errors.map((error) => `- ${error}`).join("\n")}`);
  console.log(`Adapter validation: PASS (${lock.adapters.map((adapter) => adapter.name).join(",") || "none"})`);
}

function uninstall(target, names, approved) {
  const lock = readLock(target, true);
  const selectedEntries = lock.adapters.filter((adapter) => names.includes(adapter.name));
  const plans = selectedEntries.map((adapter) => ({
    name: adapter.name,
    files: (adapter.files ?? []).map((file) => {
      const destination = targetPath(target, file.path);
      if (!existsSync(destination)) return { ...file, action: "already-missing" };
      const currentSha256 = hash(content(destination));
      if (!file.managed) return { ...file, action: "preserve-preexisting" };
      if (currentSha256 !== file.targetSha256) return { ...file, action: "preserve-drifted" };
      return { ...file, action: "remove-generated" };
    }),
  }));
  printPlan("Adapter uninstall", plans);
  if (!approved) return;

  for (const adapter of plans) {
    for (const file of adapter.files) {
      if (file.action === "remove-generated") unlinkSync(targetPath(target, file.path));
    }
  }
  writeLock(target, {
    ...lock,
    generatorVersion,
    adapters: lock.adapters.filter((adapter) => !names.includes(adapter.name)),
  });
  console.log("Adapter uninstall: PASS; preexisting and drifted files were preserved.");
}

const [mode = "preview", targetValue, selectionValue, approval] = process.argv.slice(2);
if (!targetValue) fail("Usage: manage-adapters.mjs <preview|apply|validate|uninstall> TARGET [codex,claude-code] [--approve]", 2);
const target = resolve(targetValue);
if (!existsSync(target)) fail(`Target does not exist: ${target}`);

switch (mode) {
  case "preview":
    apply(target, selected(selectionValue), false);
    break;
  case "apply":
    apply(target, selected(selectionValue), approval === "--approve");
    if (approval !== "--approve") fail("Apply requires explicit --approve after preview.", 2);
    break;
  case "validate":
    validate(target);
    break;
  case "uninstall":
    uninstall(target, selected(selectionValue), approval === "--approve");
    if (approval !== "--approve") fail("Uninstall requires explicit --approve after preview.", 2);
    break;
  default:
    fail(`Unsupported adapter mode: ${mode}`, 2);
}
