#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
assert.equal(readFileSync(join(root, "scripts/validate-downstream.mjs"), "utf8").includes(".env.example"), false);
const fixture = mkdtempSync(join(tmpdir(), "downstream-validator-"));
for (const path of [".ai", ".claude", ".codex", "security", "scripts", ".editorconfig", ".gitleaks.toml", "HANDOFF.md"]) {
  cpSync(join(root, path), join(fixture, path), { recursive: true });
}

const validPackage = {
  name: "fixture",
  private: true,
  packageManager: "pnpm@11.11.0",
  engines: { node: "24.17.0", pnpm: "11.11.0" },
  dependencies: { next: "16.2.10" },
  scripts: { dev: "NEXT_TELEMETRY_DISABLED=1 next dev" },
};
writeFileSync(join(fixture, "package.json"), `${JSON.stringify(validPackage, null, 2)}\n`);
writeFileSync(join(fixture, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
const validWorkspace = `packages:
  - .

allowBuilds:
  sharp@0.34.5: true
  '@parcel/watcher@2.5.6': false
`;
writeFileSync(join(fixture, "pnpm-workspace.yaml"), validWorkspace);

function validate() {
  return spawnSync(process.execPath, [join(root, "scripts/validate-downstream.mjs"), fixture], {
    encoding: "utf8",
  });
}

assert.equal(validate().status, 0);
const incompatible = JSON.parse(readFileSync(join(fixture, "package.json"), "utf8"));
incompatible.devDependencies = { eslint: "^10.0.0" };
incompatible.pnpm = { overrides: { postcss: "8.5.10" } };
writeFileSync(join(fixture, "package.json"), `${JSON.stringify(incompatible, null, 2)}\n`);
const rejected = validate();
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /must use an exact version/);
assert.match(rejected.stderr, /pnpm 11\+ overrides/);

writeFileSync(join(fixture, "package.json"), `${JSON.stringify(validPackage, null, 2)}\n`);
writeFileSync(
  join(fixture, "pnpm-workspace.yaml"),
  `${validWorkspace}\ndangerouslyAllowAllBuilds: true\nstrictDepBuilds: false\n`,
);
const unsafeGlobalBuilds = validate();
assert.notEqual(unsafeGlobalBuilds.status, 0);
assert.match(unsafeGlobalBuilds.stderr, /dangerouslyAllowAllBuilds/);
assert.match(unsafeGlobalBuilds.stderr, /strictDepBuilds/);

writeFileSync(
  join(fixture, "pnpm-workspace.yaml"),
  `packages:
  - .
allowBuilds:
  sharp: true
  'unrs-resolver@1.12.2':
`,
);
const unpinnedBuilds = validate();
assert.notEqual(unpinnedBuilds.status, 0);
assert.match(unpinnedBuilds.stderr, /must pin an exact package version/);
assert.match(unpinnedBuilds.stderr, /decision must be true or false/);

process.stdout.write("Downstream validator regression tests: PASS\n");
