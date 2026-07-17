#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultCatalog = join(root, ".ai/manifests/security-tool-assets.json");
const catalogArgument = process.argv.find((argument) => argument.startsWith("--catalog="));
const platformArgument = process.argv.find((argument) => argument.startsWith("--platform="));
const catalogPath = resolve(catalogArgument?.slice("--catalog=".length) || defaultCatalog);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safePath(base, relative) {
  if (
    typeof relative !== "string"
    || !relative
    || relative.startsWith("/")
    || relative.split(/[\\/]/u).includes("..")
    || relative.split(/[\\/]/u).some((part) => part.startsWith(".env"))
  ) fail(`Unsafe security tool path: ${relative}`);
  const path = resolve(base, relative);
  if (path !== base && !path.startsWith(`${base}${sep}`)) fail(`Security tool path escapes target: ${relative}`);
  return path;
}

function currentPlatform() {
  if (platformArgument) return platformArgument.slice("--platform=".length);
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-arm64";
  if (process.platform === "linux" && process.arch === "x64") return "linux-x64";
  fail(`Unsupported security tool platform: ${process.platform}-${process.arch}`);
}

function readCatalog() {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  if (
    catalog?.schemaVersion !== 1
    || catalog.networkDefault !== "deny"
    || !Array.isArray(catalog.tools)
    || catalog.tools.length === 0
  ) fail("Invalid security tool asset catalog");
  if (catalog.tools.some((tool) => !tool.id || !/^\d+\.\d+\.\d+$/u.test(tool.version ?? ""))) {
    fail("Security tool catalog requires id and exact version");
  }
  return catalog;
}

function readLock(target, relative, required = false) {
  const path = safePath(target, relative);
  if (!existsSync(path)) {
    if (required) fail(`Missing security tool lock: ${relative}`);
    return null;
  }
  const lock = JSON.parse(readFileSync(path, "utf8"));
  if (lock?.schemaVersion !== 1 || !Array.isArray(lock.tools)) fail("Invalid security tool lock");
  return lock;
}

function artifactBytes(tool, artifact) {
  const bytes = readFileSync(artifact);
  if (tool.installType === "binary") return bytes;
  if (tool.installType !== "tar-gzip-member" || !tool.archiveMember) fail(`Unsupported install type: ${tool.id}`);
  const result = spawnSync("tar", ["-xOzf", artifact, tool.archiveMember], {
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) fail(`Failed to extract approved archive member for ${tool.id}`);
  return result.stdout;
}

function plans(target, artifactRoot, catalog, platform) {
  return catalog.tools.map((tool) => {
    const asset = tool.assets?.[platform];
    if (!asset || !/^[a-f0-9]{64}$/u.test(asset.sha256 ?? "")) fail(`Missing approved asset: ${tool.id}/${platform}`);
    const destinationRelative = `${catalog.installRoot}/bin/${tool.id}`;
    const destination = safePath(target, destinationRelative);
    const artifact = artifactRoot ? safePath(artifactRoot, asset.file) : null;
    let action = existsSync(destination) ? "blocked-existing" : "create";
    let installedBytes = null;
    if (artifactRoot) {
      if (!existsSync(artifact)) fail(`Missing approved artifact: ${asset.file}`);
      if (sha256(readFileSync(artifact)) !== asset.sha256) fail(`Artifact checksum mismatch: ${tool.id}`);
      installedBytes = artifactBytes(tool, artifact);
      if (existsSync(destination) && sha256(readFileSync(destination)) === sha256(installedBytes)) {
        action = "preserve-identical";
      }
    }
    return { tool, asset, artifact, destination, destinationRelative, installedBytes, action };
  });
}

function printPlan(label, plan, platform) {
  process.stdout.write(`${label} (${platform}, network: deny)\n`);
  for (const item of plan) {
    process.stdout.write(`- ${item.tool.id}@${item.tool.version}: ${item.action} ${item.destinationRelative}\n`);
    process.stdout.write(`  artifact: ${item.asset.file}\n`);
    process.stdout.write(`  source: ${item.asset.url}\n`);
    process.stdout.write(`  sha256: ${item.asset.sha256}\n`);
  }
}

const [mode, targetValue, artifactValue, approval] = process.argv.slice(2);
if (!new Set(["preview", "apply", "validate", "uninstall"]).has(mode) || !targetValue) {
  fail("Usage: manage-security-tools.mjs <preview|apply|validate|uninstall> TARGET [ARTIFACT_DIR] [--approve] [--platform=...]", 2);
}
const target = resolve(targetValue);
if (!existsSync(target)) fail(`Target does not exist: ${target}`);
const catalog = readCatalog();
const platform = currentPlatform();
const lockRelative = catalog.lockPath;

if (mode === "preview") {
  printPlan("Security tool install preview", plans(target, null, catalog, platform), platform);
  process.exit(0);
}

if (mode === "apply") {
  if (!artifactValue || artifactValue === "--approve") fail("Apply requires an offline artifact directory", 2);
  const plan = plans(target, resolve(artifactValue), catalog, platform);
  printPlan("Security tool install preview", plan, platform);
  if (plan.some((item) => item.action === "blocked-existing")) {
    fail("Security tool apply blocked: existing binaries differ; no files were changed");
  }
  if (approval !== "--approve") fail("Security tool apply requires explicit --approve after preview", 2);
  for (const item of plan) {
    if (item.action !== "create") continue;
    mkdirSync(dirname(item.destination), { recursive: true });
    writeFileSync(item.destination, item.installedBytes, { flag: "wx" });
    chmodSync(item.destination, 0o755);
  }
  const lock = {
    schemaVersion: 1,
    catalogSha256: `sha256:${sha256(readFileSync(catalogPath))}`,
    platform,
    networkDuringInstall: "deny",
    tools: plan.map((item) => ({
      id: item.tool.id,
      version: item.tool.version,
      sourceUrl: item.asset.url,
      artifactSha256: `sha256:${item.asset.sha256}`,
      installedPath: item.destinationRelative,
      installedSha256: `sha256:${sha256(item.installedBytes)}`,
      managed: item.action === "create",
      runtimeNetwork: item.tool.runtimeNetwork,
      telemetry: item.tool.telemetry,
    })),
  };
  const lockPath = safePath(target, lockRelative);
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  mkdirSync(safePath(target, `${catalog.installRoot}/runtime-home`), { recursive: true });
  mkdirSync(safePath(target, `${catalog.installRoot}/runtime-cache`), { recursive: true });
  process.stdout.write("Security tool apply: PASS\n");
  process.exit(0);
}

const lock = readLock(target, lockRelative, true);
if (mode === "validate") {
  const errors = [];
  if (lock.catalogSha256 !== `sha256:${sha256(readFileSync(catalogPath))}`) errors.push("security tool catalog drift");
  if (lock.platform !== platform) errors.push("security tool platform drift");
  if (lock.networkDuringInstall !== "deny") errors.push("security tool install network must be deny");
  if (lock.tools.length !== catalog.tools.length) errors.push("security tool lock population drift");
  for (const tool of lock.tools) {
    const approved = catalog.tools.find((candidate) => candidate.id === tool.id);
    const asset = approved?.assets?.[platform];
    if (
      !approved
      || tool.version !== approved.version
      || tool.sourceUrl !== asset?.url
      || tool.artifactSha256 !== `sha256:${asset?.sha256}`
      || tool.runtimeNetwork !== approved.runtimeNetwork
      || tool.telemetry !== approved.telemetry
    ) errors.push(`security tool approval drift: ${tool.id}`);
    const path = safePath(target, tool.installedPath);
    if (!existsSync(path)) errors.push(`missing security tool: ${tool.id}`);
    else if (`sha256:${sha256(readFileSync(path))}` !== tool.installedSha256) errors.push(`security tool drift: ${tool.id}`);
  }
  if (errors.length) fail(`Security tool validation: FAIL\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.stdout.write(`Security tool validation: PASS (${lock.tools.map((tool) => `${tool.id}@${tool.version}`).join(", ")})\n`);
  process.exit(0);
}

const uninstallPlan = lock.tools.map((tool) => {
  const path = safePath(target, tool.installedPath);
  if (!existsSync(path)) return { ...tool, path, action: "already-missing" };
  if (!tool.managed) return { ...tool, path, action: "preserve-preexisting" };
  if (`sha256:${sha256(readFileSync(path))}` !== tool.installedSha256) {
    return { ...tool, path, action: "preserve-drifted" };
  }
  return { ...tool, path, action: "remove-generated" };
});
process.stdout.write("Security tool uninstall preview\n");
for (const tool of uninstallPlan) process.stdout.write(`- ${tool.id}: ${tool.action} ${tool.installedPath}\n`);
if (artifactValue !== "--approve") fail("Security tool uninstall requires explicit --approve after preview", 2);
for (const tool of uninstallPlan) if (tool.action === "remove-generated") unlinkSync(tool.path);
unlinkSync(safePath(target, lockRelative));
process.stdout.write("Security tool uninstall: PASS; preexisting and drifted binaries were preserved\n");
