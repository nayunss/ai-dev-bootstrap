#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
assert.equal(readFileSync(join(root, "scripts/validate-downstream.mjs"), "utf8").includes(".env.example"), false);
const fixture = mkdtempSync(join(tmpdir(), "downstream-validator-"));
mkdirSync(join(fixture, "docs"), { recursive: true });
for (const path of [
  ".ai",
  ".claude",
  ".codex",
  "security",
  "scripts",
  ".editorconfig",
  ".gitleaks.toml",
  "AGENTS.md",
  "CLAUDE.md",
  "HANDOFF.md",
]) {
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

mkdirSync(join(fixture, "frontend"), { recursive: true });
writeFileSync(join(fixture, "frontend/package.json"), `${JSON.stringify({
  name: "frontend",
  private: true,
  packageManager: "pnpm@11.11.0",
  engines: { node: "24.17.0", pnpm: "11.11.0" },
  devDependencies: { husky: "9.1.7", "lint-staged": "16.2.7" },
}, null, 2)}\n`);
writeFileSync(join(fixture, "frontend/pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
const missingInventory = validate();
assert.notEqual(missingInventory.status, 0);
assert.match(missingInventory.stderr, /machine-readable JSON application inventory/);
const preview = spawnSync(process.execPath, [join(root, "scripts/preview-applications.mjs"), fixture], { encoding: "utf8" });
assert.equal(preview.status, 0);
assert.match(preview.stdout, /frontend\/package\.json .*undeclared/);
assert.match(preview.stdout, /multi-application repository requires/);

mkdirSync(join(fixture, ".github/workflows"), { recursive: true });
mkdirSync(join(fixture, ".codesight/wiki"), { recursive: true });
mkdirSync(join(fixture, "frontend/.husky"), { recursive: true });
writeFileSync(join(fixture, ".github/workflows/ci.yml"), "name: fixture\n");
writeFileSync(join(fixture, ".codesight/wiki/index.md"), "# fixture\n");
writeFileSync(join(fixture, "railway.json"), "{}\n");
writeFileSync(join(fixture, "frontend/railway.json"), "{}\n");
writeFileSync(join(fixture, "frontend/.husky/pre-commit"), "exit 0\n");
writeFileSync(join(fixture, ".editorconfig"), `${readFileSync(join(fixture, ".editorconfig"), "utf8")}
[*.{js,jsx,ts,tsx,css,scss}]
indent_style = space
indent_size = 2
`);
writeFileSync(join(fixture, "docs/development-environment.md"), `# Development environment

\`\`\`json
{
  "applications": [
    {
      "id": "root",
      "root": ".",
      "type": "frontend",
      "manifest": "package.json",
      "quality": ["verify"],
      "ci": ".github/workflows/ci.yml",
      "deploy": "railway.json",
      "hook": "not-applicable"
    },
    {
      "id": "frontend",
      "root": "frontend",
      "type": "frontend",
      "manifest": "frontend/package.json",
      "quality": ["verify"],
      "ci": ".github/workflows/ci.yml",
      "deploy": "frontend/railway.json",
      "hook": "required"
    }
  ],
  "shared": { "codeSight": "required" }
}
\`\`\`
`);
assert.equal(validate().status, 0);

const nestedFloating = JSON.parse(readFileSync(join(fixture, "frontend/package.json"), "utf8"));
nestedFloating.devDependencies.husky = "^9.1.7";
writeFileSync(join(fixture, "frontend/package.json"), `${JSON.stringify(nestedFloating, null, 2)}\n`);
const rejectedNestedDependency = validate();
assert.notEqual(rejectedNestedDependency.status, 0);
assert.match(rejectedNestedDependency.stderr, /frontend husky must use an exact version/);
writeFileSync(join(fixture, "frontend/package.json"), `${JSON.stringify({
  ...nestedFloating,
  devDependencies: { husky: "9.1.7", "lint-staged": "16.2.7" },
}, null, 2)}\n`);

const validAgents = readFileSync(join(fixture, "AGENTS.md"), "utf8");
writeFileSync(join(fixture, "AGENTS.md"), "# incomplete adapter\n");
const invalidAdapter = validate();
assert.notEqual(invalidAdapter.status, 0);
assert.match(invalidAdapter.stderr, /AGENTS\.md must reference \.ai\/standards\/engineering\.md/);
writeFileSync(join(fixture, "AGENTS.md"), validAgents);

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
