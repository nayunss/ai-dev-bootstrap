#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  lutimesSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";
import {
  flipFuses,
  FuseState,
  FuseV1Options,
  FuseVersion,
  getCurrentFuseWire,
} from "@electron/fuses";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const APP_NAME = "AI Dev Bootstrap";
const PLATFORM = "darwin";
const ARCH = "arm64";
const STATUS = "UNSIGNED_DEVELOPMENT_ONLY";
const SOURCE_DATE = new Date("2026-01-01T00:00:00.000Z");
const SOURCE_PATHS = [
  "desktop",
  "scripts/fullstack-materializer.mjs",
  "scripts/release-adoption.mjs",
  "scripts/skill-distribution.mjs",
  "scripts/stack-profile-fixtures.mjs",
];
const OUTPUT_FILES = {
  asset: `ai-dev-bootstrap-${PACKAGE.version}-macos-arm64-unsigned-development.zip`,
  sbom: "desktop-development.sbom.cdx.json",
  provenance: "desktop-development.provenance.json",
  manifest: "desktop-development-manifest.json",
  checksums: "SHA256SUMS",
};

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function walk(root) {
  const found = [];
  function visit(path) {
    const stat = lstatSync(path);
    const name = relative(root, path).replaceAll("\\", "/");
    if (name) found.push({ name, path, stat });
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort()) visit(join(path, entry));
    }
  }
  visit(root);
  return found;
}

function inventory(root) {
  return walk(root).filter(({ stat }) => !stat.isDirectory()).map(({ name, path, stat }) => ({
    path: name,
    type: stat.isSymbolicLink() ? "symlink" : "file",
    mode: stat.mode & 0o777,
    sha256: sha256(stat.isSymbolicLink() ? Buffer.from(readlinkSync(path)) : readFileSync(path)),
  }));
}

function normalizeMetadata(root) {
  for (const { path, stat } of walk(root).reverse()) {
    if (stat.isSymbolicLink()) lutimesSync(path, SOURCE_DATE, SOURCE_DATE);
    else utimesSync(path, SOURCE_DATE, SOURCE_DATE);
  }
  utimesSync(root, SOURCE_DATE, SOURCE_DATE);
}

function deterministicZip(appPath, archivePath) {
  normalizeMetadata(appPath);
  const parent = dirname(appPath);
  const app = basename(appPath);
  const entries = [app, ...walk(appPath).map(({ name, stat }) => `${app}/${name}${stat.isDirectory() ? "/" : ""}`)];
  const zipped = spawnSync("zip", ["-X", "-q", "-y", archivePath, "-@"], {
    cwd: parent,
    encoding: "utf8",
    input: `${entries.join("\n")}\n`,
  });
  if (zipped.status !== 0) throw new Error(`deterministic zip failed: ${zipped.stderr.trim()}`);
}

function stageSource(root) {
  const stage = mkdtempSync(join(tmpdir(), "desktop-package-source-"));
  for (const source of SOURCE_PATHS) cpSync(join(root, source), join(stage, source), { recursive: true });
  writeFileSync(join(stage, "package.json"), canonical({
    name: "ai-dev-bootstrap-desktop",
    productName: APP_NAME,
    version: PACKAGE.version,
    private: true,
    type: "module",
    main: "desktop/main.mjs",
  }));
  return stage;
}

const fuseConfig = {
  version: FuseVersion.V1,
  resetAdHocDarwinSignature: true,
  strictlyRequireAllFuses: true,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true,
  [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  [FuseV1Options.WasmTrapHandlers]: true,
};

async function verifyFuses(appPath) {
  const current = await getCurrentFuseWire(appPath);
  for (const [key, expected] of Object.entries(fuseConfig)) {
    if (!/^\d+$/u.test(key)) continue;
    const state = expected ? FuseState.ENABLE : FuseState.DISABLE;
    if (current[key] !== state) throw new Error(`fuse verification failed: ${FuseV1Options[key]}`);
  }
}

async function packageOnce(root, archivePath) {
  const source = stageSource(root);
  const output = mkdtempSync(join(tmpdir(), "desktop-package-output-"));
  try {
    const [directory] = await packager({
      dir: source,
      name: APP_NAME,
      appBundleId: "dev.aidevbootstrap.desktop",
      appVersion: PACKAGE.version,
      buildVersion: PACKAGE.version,
      platform: PLATFORM,
      arch: ARCH,
      electronVersion: PACKAGE.devDependencies.electron,
      asar: true,
      prune: true,
      junk: true,
      overwrite: true,
      out: output,
    });
    const appPath = join(directory, `${APP_NAME}.app`);
    await flipFuses(appPath, fuseConfig);
    await verifyFuses(appPath);
    const appInventory = inventory(appPath);
    deterministicZip(appPath, archivePath);
    return { appInventory, appInventorySha256: sha256(JSON.stringify(appInventory)) };
  } finally {
    rmSync(source, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
}

function sourceInventory(root) {
  return SOURCE_PATHS.flatMap((source) => {
    const path = join(root, source);
    if (!lstatSync(path).isDirectory()) return [{ path: source, sha256: sha256(readFileSync(path)) }];
    return inventory(path).filter((entry) => entry.type === "file").map((entry) => ({
      path: `${source}/${entry.path}`,
      sha256: entry.sha256,
    }));
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function sbom() {
  const uuid = createHash("sha256").update(`ai-dev-bootstrap:${PACKAGE.version}`).digest("hex")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/u, "$1-$2-$3-$4-$5");
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${uuid}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: "ai-dev-bootstrap-desktop",
        version: PACKAGE.version,
      },
    },
    components: [{
      type: "framework",
      name: "electron",
      version: PACKAGE.devDependencies.electron,
      purl: `pkg:npm/electron@${PACKAGE.devDependencies.electron}`,
      licenses: [{ license: { id: "MIT" } }],
      scope: "required",
    }],
  };
}

function gitValue(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function validateDesktopDevelopmentPackage(outputValue) {
  const output = resolve(outputValue);
  const errors = [];
  try {
    const manifest = JSON.parse(readFileSync(join(output, OUTPUT_FILES.manifest), "utf8"));
    const sums = readFileSync(join(output, OUTPUT_FILES.checksums), "utf8").trim().split("\n");
    const expectedNames = new Set(Object.values(OUTPUT_FILES).filter((name) => name !== OUTPUT_FILES.checksums));
    const seen = new Set();
    for (const line of sums) {
      const match = line.match(/^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/u);
      if (!match || !expectedNames.has(match[2]) || seen.has(match[2])) {
        errors.push("SHA256SUMS entry is invalid");
        continue;
      }
      seen.add(match[2]);
      const path = join(output, match[2]);
      if (!existsSync(path) || sha256(readFileSync(path)) !== `sha256:${match[1]}`) errors.push(`checksum drift: ${match[2]}`);
    }
    for (const name of expectedNames) if (!seen.has(name)) errors.push(`missing checksum: ${name}`);
    if (
      manifest.schemaVersion !== 1
      || manifest.artifactStatus !== STATUS
      || manifest.supported !== false
      || manifest.platform !== PLATFORM
      || manifest.arch !== ARCH
      || manifest.signing !== "NOT_RUN"
      || manifest.notarization !== "NOT_RUN"
    ) errors.push("development manifest support boundary is invalid");
    for (const key of ["asset", "sbom", "provenance"]) {
      const name = OUTPUT_FILES[key];
      if (manifest.files?.[key]?.path !== name || manifest.files[key].sha256 !== sha256(readFileSync(join(output, name)))) {
        errors.push(`manifest metadata drift: ${key}`);
      }
    }
    const provenance = JSON.parse(readFileSync(join(output, OUTPUT_FILES.provenance), "utf8"));
    const provenanceSourceSha256 = sha256(JSON.stringify(provenance.sourceFiles));
    if (
      provenance.artifactStatus !== STATUS
      || provenance.network !== "ELECTRON_RUNTIME_CACHE_OR_APPROVED_DOWNLOAD"
      || provenance.signing !== "NOT_RUN"
      || provenance.notarization !== "NOT_RUN"
      || provenance.sourceSha256 !== provenanceSourceSha256
      || manifest.coreSha256 !== provenanceSourceSha256
    ) errors.push("provenance boundary is invalid");
    const packageSbom = JSON.parse(readFileSync(join(output, OUTPUT_FILES.sbom), "utf8"));
    if (packageSbom.bomFormat !== "CycloneDX" || packageSbom.specVersion !== "1.6") errors.push("SBOM contract is invalid");
  } catch (error) {
    errors.push(error.message);
  }
  return { status: errors.length ? "INVALID" : "PASS", errors };
}

export async function buildDesktopDevelopmentPackage(outputValue) {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    throw new Error("GUI-04 development package requires a macOS arm64 clean runner");
  }
  const output = resolve(outputValue);
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const first = join(output, `${OUTPUT_FILES.asset}.first`);
  const second = join(output, `${OUTPUT_FILES.asset}.second`);
  const firstBuild = await packageOnce(ROOT, first);
  const secondBuild = await packageOnce(ROOT, second);
  const firstSha = sha256(readFileSync(first));
  const secondSha = sha256(readFileSync(second));
  if (firstSha !== secondSha || firstBuild.appInventorySha256 !== secondBuild.appInventorySha256) {
    throw new Error("development package reproducibility drift");
  }
  renameSync(first, join(output, OUTPUT_FILES.asset));
  rmSync(second, { force: true });
  const sourceFiles = sourceInventory(ROOT);
  writeFileSync(join(output, OUTPUT_FILES.sbom), canonical(sbom()));
  const provenance = {
    schemaVersion: 1,
    kind: "desktop-development-provenance",
    artifactStatus: STATUS,
    repository: "https://github.com/nayunss/ai-dev-bootstrap",
    sourceCommit: gitValue(["rev-parse", "HEAD"]),
    sourceFiles,
    sourceSha256: sha256(JSON.stringify(sourceFiles)),
    builder: {
      node: process.version,
      electron: PACKAGE.devDependencies.electron,
      packager: PACKAGE.devDependencies["@electron/packager"],
      fuses: PACKAGE.devDependencies["@electron/fuses"],
      platform: PLATFORM,
      arch: ARCH,
    },
    build: {
      asar: true,
      reproducibilityRuns: 2,
      appInventorySha256: firstBuild.appInventorySha256,
      appFiles: firstBuild.appInventory.length,
      fuses: {
        runAsNode: false,
        nodeOptions: false,
        nodeCliInspect: false,
        embeddedAsarIntegrity: true,
        onlyLoadAppFromAsar: true,
      },
    },
    network: "ELECTRON_RUNTIME_CACHE_OR_APPROVED_DOWNLOAD",
    signing: "NOT_RUN",
    notarization: "NOT_RUN",
    usabilityEval: "NOT_RUN",
    publication: "NOT_RUN",
  };
  writeFileSync(join(output, OUTPUT_FILES.provenance), canonical(provenance));
  const files = {};
  for (const key of ["asset", "sbom", "provenance"]) {
    const path = join(output, OUTPUT_FILES[key]);
    files[key] = { path: OUTPUT_FILES[key], sha256: sha256(readFileSync(path)) };
  }
  const manifest = {
    schemaVersion: 1,
    kind: "desktop-development-package-manifest",
    version: PACKAGE.version,
    artifactStatus: STATUS,
    supported: false,
    platform: PLATFORM,
    arch: ARCH,
    minimumOsCandidate: "macOS 13",
    signing: "NOT_RUN",
    notarization: "NOT_RUN",
    coreSha256: provenance.sourceSha256,
    files,
  };
  writeFileSync(join(output, OUTPUT_FILES.manifest), canonical(manifest));
  files.manifest = {
    path: OUTPUT_FILES.manifest,
    sha256: sha256(readFileSync(join(output, OUTPUT_FILES.manifest))),
  };
  const sums = ["asset", "sbom", "provenance", "manifest"]
    .map((key) => `${files[key].sha256.slice("sha256:".length)}  ${files[key].path}`)
    .join("\n");
  writeFileSync(join(output, OUTPUT_FILES.checksums), `${sums}\n`);
  chmodSync(join(output, OUTPUT_FILES.checksums), 0o644);
  const validation = validateDesktopDevelopmentPackage(output);
  if (validation.status !== "PASS") throw new Error(validation.errors.join("; "));
  return { output, assetSha256: firstSha, appFiles: firstBuild.appInventory.length };
}

async function main() {
  const mode = process.argv[2] ?? "build";
  const output = resolve(process.argv[3] ?? join(ROOT, "dist", "desktop-development"));
  if (mode === "build") {
    const result = await buildDesktopDevelopmentPackage(output);
    process.stdout.write(`GUI-04 unsigned macOS arm64 development package: PASS (${result.assetSha256}, ${result.appFiles} files)\n`);
    return;
  }
  if (mode === "validate") {
    const result = validateDesktopDevelopmentPackage(output);
    if (result.status !== "PASS") throw new Error(result.errors.join("; "));
    process.stdout.write("GUI-04 desktop package checksum, SBOM and provenance validation: PASS\n");
    return;
  }
  throw new Error("Usage: desktop-package-provenance.mjs <build|validate> [OUTPUT]");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) await main();
