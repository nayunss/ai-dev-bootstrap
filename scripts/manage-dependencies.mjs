#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const [mode, targetValue, ...flags] = process.argv.slice(2);
const approval = flags.includes("--approve");
const network = flags.includes("--allow-network");
const offline = flags.includes("--offline");
const profileRelative = ".ai/manifests/dependency-bootstrap.json";
const lockRelative = ".ai/manifests/dependency-bootstrap.lock.json";
const markerName = ".dependency-bootstrap-owner.json";

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function safeRelative(value, label, allowDot = false) {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\0")) fail(`${label} must be a safe relative path`);
  const normalized = value.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if ((!allowDot && normalized === ".") || segments.some((part) => part === ".." || part === "")) fail(`${label} must not escape the project`);
  if (segments.some((part) => part.startsWith(".env"))) fail(`${label} must not reference .env*`);
  return normalized;
}
function confined(root, value, label) {
  const path = resolve(root, value);
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`${label} escapes target`);
  return path;
}
function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(`${label} must be valid JSON: ${path}`);
  }
}
function findExecutable(name) {
  for (const directory of (process.env.PATH || "").split(":")) {
    const candidate = join(directory, name);
    if (directory && existsSync(candidate)) return candidate;
  }
  fail(`Required executable is unavailable: ${name}`);
}

if (!new Set(["preview", "apply", "validate", "uninstall"]).has(mode) || !targetValue) {
  fail("Usage: manage-dependencies.mjs <preview|apply|validate|uninstall> TARGET [--offline|--allow-network] [--approve]", 2);
}
if (network && offline) fail("Choose exactly one of --offline or --allow-network", 2);
const target = realpathSync(resolve(targetValue));
const profilePath = join(target, profileRelative);
const lockPath = join(target, lockRelative);
if (!existsSync(profilePath)) fail(`Missing dependency bootstrap profile: ${profileRelative}`);
const profileBytes = readFileSync(profilePath);
const profile = readJson(profilePath, "dependency bootstrap profile");
if (profile.schemaVersion !== 1 || !Array.isArray(profile.applications) || profile.applications.length === 0) {
  fail("Dependency bootstrap profile must use schemaVersion 1 with non-empty applications");
}

const ids = new Set();
const adapters = new Set(["npm", "pnpm", "yarn", "maven", "gradle", "python"]);
const plans = profile.applications.map((app) => {
  if (!app || typeof app !== "object" || Array.isArray(app)) fail("Each application must be an object");
  if (Object.keys(app).sort().join(",") !== ["adapter", "id", "lockfile", "manifest", "root", "version"].sort().join(",")) {
    fail("Application fields must be exactly id, root, adapter, version, manifest, lockfile");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(app.id) || ids.has(app.id)) fail(`Invalid or duplicate application id: ${app.id}`);
  ids.add(app.id);
  if (!adapters.has(app.adapter)) fail(`Unsupported dependency adapter: ${app.adapter}`);
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(app.version)) fail(`${app.id} must pin an exact adapter version`);
  const rootRelative = safeRelative(app.root, `${app.id}.root`, true);
  const appRoot = confined(target, rootRelative, `${app.id}.root`);
  if (!existsSync(appRoot) || !lstatSync(appRoot).isDirectory()) fail(`Application root is not a directory: ${app.root}`);
  const manifestRelative = safeRelative(app.manifest, `${app.id}.manifest`);
  const lockfileRelative = safeRelative(app.lockfile, `${app.id}.lockfile`);
  const manifest = confined(appRoot, manifestRelative, `${app.id}.manifest`);
  const lockfile = confined(appRoot, lockfileRelative, `${app.id}.lockfile`);
  if (!existsSync(manifest)) fail(`Missing manifest for ${app.id}: ${app.manifest}`);
  if (!existsSync(lockfile)) fail(`Missing lockfile for ${app.id}: ${app.lockfile}`);

  let command;
  let args;
  let versionArgs;
  let output;
  if (app.adapter === "npm") {
    const pkg = readJson(manifest, `${app.id} package.json`);
    if (pkg.packageManager !== `npm@${app.version}`) fail(`${app.id} npm version must match packageManager`);
    command = findExecutable("npm");
    versionArgs = ["--version"];
    args = ["ci", "--ignore-scripts", "--strict-peer-deps"];
    if (offline) args.push("--offline");
    output = "node_modules";
  } else if (app.adapter === "pnpm" || app.adapter === "yarn") {
    const pkg = readJson(manifest, `${app.id} package.json`);
    if (pkg.packageManager !== `${app.adapter}@${app.version}`) fail(`${app.id} ${app.adapter} version must match packageManager`);
    const node = join(target, ".tools/node/bin/node");
    const cli = app.adapter === "pnpm" ? join(target, ".tools/pnpm/package/bin/pnpm.cjs") : join(target, ".tools/yarn/yarn.cjs");
    if (!existsSync(node) || !existsSync(cli)) fail(`${app.id} requires reviewed project-local Node and ${app.adapter}`);
    command = node;
    versionArgs = [cli, "--version"];
    args = app.adapter === "pnpm"
      ? [cli, "install", "--ignore-scripts", "--strict-peer-dependencies", "--store-dir", join(target, ".tools/pnpm-store")]
      : [cli, "install", "--immutable", "--mode=skip-build"];
    if (offline) args.push(app.adapter === "pnpm" ? "--offline" : "--immutable-cache");
    output = "node_modules";
  } else if (app.adapter === "maven") {
    command = join(target, ".tools/maven/bin/mvn");
    if (!existsSync(command)) fail(`${app.id} requires reviewed project-local Maven`);
    versionArgs = ["--version"];
    args = ["--batch-mode", "--no-transfer-progress", `-Dmaven.repo.local=${join(appRoot, ".dependency-cache/maven")}`];
    if (offline) args.push("--offline");
    args.push("dependency:go-offline");
    output = ".dependency-cache";
  } else if (app.adapter === "gradle") {
    command = join(target, ".tools/gradle/bin/gradle");
    if (!existsSync(command)) fail(`${app.id} requires reviewed project-local Gradle`);
    versionArgs = ["--version"];
    args = ["--no-daemon", "--gradle-user-home", join(appRoot, ".dependency-cache/gradle")];
    if (offline) args.push("--offline");
    args.push("dependencies");
    output = ".dependency-cache";
  } else {
    command = join(target, ".tools/python/bin/python");
    if (!existsSync(command)) fail(`${app.id} requires reviewed project-local Python`);
    versionArgs = ["--version"];
    args = ["-m", "pip", "install", "--require-hashes", "--no-deps", "--only-binary=:all:", "--target", ".venv", "-r", lockfileRelative];
    if (offline) args.push("--no-index");
    output = ".venv";
  }
  return { ...app, appRoot, command, versionArgs, args, output, outputPath: join(appRoot, output) };
});

function printPlan(title) {
  process.stdout.write(`${title}\nNetwork: ${network ? "explicitly-allowed" : offline ? "denied-offline" : "not-selected"}\n`);
  for (const plan of plans) {
    process.stdout.write(`- ${plan.id} [${plan.adapter}] cwd=${relative(target, plan.appRoot) || "."} output=${join(plan.root, plan.output)}\n`);
    process.stdout.write(`  argv=${JSON.stringify([plan.command, ...plan.args])}\n`);
  }
}
function validateVersions() {
  for (const plan of plans) {
    const result = spawnSync(plan.command, plan.versionArgs, {
      cwd: plan.appRoot,
      encoding: "utf8",
      env: { PATH: `${dirname(plan.command)}:/usr/bin:/bin` }
    });
    const text = `${result.stdout || ""}\n${result.stderr || ""}`;
    const detected = plan.adapter === "maven"
      ? text.match(/Apache Maven ([^\s]+)/)?.[1]
      : plan.adapter === "gradle"
        ? text.match(/Gradle ([^\s]+)/)?.[1]
        : plan.adapter === "python"
          ? text.match(/Python ([^\s]+)/)?.[1]
          : text.trim();
    if (result.status !== 0 || detected !== plan.version) fail(`${plan.id} adapter version mismatch: expected ${plan.version}, found ${detected || "unavailable"}`);
  }
}
if (mode === "preview") {
  printPlan("Dependency bootstrap preview");
  process.exit(0);
}
if (mode === "validate") {
  if (!existsSync(lockPath)) fail(`Missing dependency bootstrap lock: ${lockRelative}`);
  const lock = readJson(lockPath, "dependency bootstrap lock");
  if (lock.schemaVersion !== 1 || lock.profileSha256 !== sha256(profileBytes)) fail("Dependency bootstrap profile drift detected");
  validateVersions();
  if (!Array.isArray(lock.applications) || lock.applications.length !== plans.length) fail("Dependency bootstrap lock application drift detected");
  for (const plan of plans) {
    const record = lock.applications.find((item) => item.id === plan.id);
    const marker = join(plan.outputPath, markerName);
    if (!record || record.adapter !== plan.adapter || record.root !== plan.root || record.output !== plan.output) fail(`Dependency bootstrap lock drift detected: ${plan.id}`);
    if (!record.created || !existsSync(marker) || readFileSync(marker, "utf8") !== `${record.markerSha256}\n`) fail(`Dependency bootstrap output ownership drift detected: ${plan.id}`);
  }
  process.stdout.write("Dependency bootstrap validation: PASS\n");
  process.exit(0);
}
if (mode === "uninstall") {
  if (!existsSync(lockPath)) fail(`Missing dependency bootstrap lock: ${lockRelative}`);
  const lock = readJson(lockPath, "dependency bootstrap lock");
  if (lock.schemaVersion !== 1 || lock.profileSha256 !== sha256(profileBytes)) fail("Dependency bootstrap profile drift detected");
  printPlan("Dependency bootstrap uninstall preview");
  if (!approval) fail("Dependency bootstrap uninstall requires --approve", 2);
  for (const plan of plans) {
    const record = lock.applications?.find((item) => item.id === plan.id);
    const marker = join(plan.outputPath, markerName);
    if (record?.created && existsSync(marker) && readFileSync(marker, "utf8") === `${record.markerSha256}\n`) rmSync(plan.outputPath, { recursive: true });
    else process.stdout.write(`Preserved unowned or drifted output: ${plan.id}\n`);
  }
  rmSync(lockPath);
  process.stdout.write("Dependency bootstrap uninstall: PASS\n");
  process.exit(0);
}

printPlan("Dependency bootstrap apply preview");
if (!approval) fail("Dependency bootstrap apply requires --approve", 2);
if (!network && !offline) fail("Dependency bootstrap apply requires --offline or --allow-network", 2);
if (existsSync(lockPath)) fail("Dependency bootstrap lock already exists; validate or uninstall first");
for (const plan of plans) if (existsSync(plan.outputPath)) fail(`Refusing to replace existing output: ${join(plan.root, plan.output)}`);
validateVersions();
const records = [];
for (const plan of plans) {
  const result = spawnSync(plan.command, plan.args, {
    cwd: plan.appRoot,
    encoding: "utf8",
    env: {
      PATH: `${dirname(plan.command)}:/usr/bin:/bin`,
      HOME: join(target, ".tools/dependency-home"),
      npm_config_cache: join(target, ".tools/npm-cache"),
      PIP_DISABLE_PIP_VERSION_CHECK: "1",
      PIP_NO_INPUT: "1",
      ...(offline ? { npm_config_offline: "true", YARN_ENABLE_NETWORK: "0" } : {})
    }
  });
  if (result.status !== 0) {
    for (const candidate of plans) if (existsSync(candidate.outputPath)) rmSync(candidate.outputPath, { recursive: true });
    fail(`${plan.id} dependency install failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  if (!existsSync(plan.outputPath)) mkdirSync(plan.outputPath, { recursive: true });
  const markerSha256 = sha256(`${plan.id}\n${sha256(profileBytes)}\n`);
  writeFileSync(join(plan.outputPath, markerName), `${markerSha256}\n`, { flag: "wx" });
  records.push({ id: plan.id, root: plan.root, adapter: plan.adapter, output: plan.output, created: true, markerSha256 });
}
mkdirSync(dirname(lockPath), { recursive: true });
writeFileSync(lockPath, `${JSON.stringify({
  schemaVersion: 1,
  profileSha256: sha256(profileBytes),
  network: network ? "explicitly-allowed" : "denied-offline",
  applications: records
}, null, 2)}\n`, { flag: "wx" });
process.stdout.write("Dependency bootstrap apply: PASS\n");
