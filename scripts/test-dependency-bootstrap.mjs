#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const manager = new URL("./manage-dependencies.mjs", import.meta.url).pathname;
const fixture = mkdtempSync(join(tmpdir(), "dependency-bootstrap-"));
mkdirSync(join(fixture, ".ai/manifests"), { recursive: true });
mkdirSync(join(fixture, ".tools/node/bin"), { recursive: true });
mkdirSync(join(fixture, ".tools/pnpm/package/bin"), { recursive: true });
mkdirSync(join(fixture, ".tools/yarn"), { recursive: true });
mkdirSync(join(fixture, ".tools/maven/bin"), { recursive: true });
mkdirSync(join(fixture, ".tools/gradle/bin"), { recursive: true });
mkdirSync(join(fixture, ".tools/python/bin"), { recursive: true });
mkdirSync(join(fixture, "frontend"), { recursive: true });
mkdirSync(join(fixture, "service"), { recursive: true });
for (const root of ["web", "java", "jvm", "worker"]) mkdirSync(join(fixture, root), { recursive: true });
writeFileSync(join(fixture, "frontend/package.json"), JSON.stringify({ packageManager: "pnpm@11.11.0" }));
writeFileSync(join(fixture, "frontend/pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
writeFileSync(join(fixture, "service/package.json"), JSON.stringify({ packageManager: "npm@10.9.8" }));
writeFileSync(join(fixture, "service/package-lock.json"), JSON.stringify({ lockfileVersion: 3 }));
writeFileSync(join(fixture, "web/package.json"), JSON.stringify({ packageManager: "yarn@4.9.2" }));
writeFileSync(join(fixture, "web/yarn.lock"), "__metadata:\n  version: 8\n");
writeFileSync(join(fixture, "java/pom.xml"), "<project />\n");
writeFileSync(join(fixture, "java/dependencies.lock"), "{}\n");
writeFileSync(join(fixture, "jvm/build.gradle"), "plugins {}\n");
writeFileSync(join(fixture, "jvm/gradle.lockfile"), "# lock\n");
writeFileSync(join(fixture, "worker/pyproject.toml"), "[project]\nname='worker'\n");
writeFileSync(join(fixture, "worker/requirements.lock"), "\n");
writeFileSync(join(fixture, ".ai/manifests/dependency-bootstrap.json"), JSON.stringify({
  schemaVersion: 1,
  applications: [
    { id: "frontend", root: "frontend", adapter: "pnpm", version: "11.11.0", manifest: "package.json", lockfile: "pnpm-lock.yaml" },
    { id: "service", root: "service", adapter: "npm", version: "10.9.8", manifest: "package.json", lockfile: "package-lock.json" },
    { id: "web", root: "web", adapter: "yarn", version: "4.9.2", manifest: "package.json", lockfile: "yarn.lock" },
    { id: "java", root: "java", adapter: "maven", version: "3.9.11", manifest: "pom.xml", lockfile: "dependencies.lock" },
    { id: "jvm", root: "jvm", adapter: "gradle", version: "8.14.3", manifest: "build.gradle", lockfile: "gradle.lockfile" },
    { id: "worker", root: "worker", adapter: "python", version: "3.13.5", manifest: "pyproject.toml", lockfile: "requirements.lock" }
  ]
}, null, 2));
const fakeNode = join(fixture, ".tools/node/bin/node");
writeFileSync(fakeNode, "#!/bin/sh\ncase \"$1\" in *pnpm*) version=11.11.0;; *yarn*) version=4.9.2;; esac\nif [ \"$2\" = \"--version\" ]; then echo \"$version\"; else mkdir -p node_modules; fi\n");
chmodSync(fakeNode, 0o755);
writeFileSync(join(fixture, ".tools/pnpm/package/bin/pnpm.cjs"), "// fixture\n");
writeFileSync(join(fixture, ".tools/yarn/yarn.cjs"), "// fixture\n");
mkdirSync(join(fixture, "bin"), { recursive: true });
const fakeNpm = join(fixture, "bin/npm");
writeFileSync(fakeNpm, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 10.9.7; else mkdir -p node_modules; fi\n");
chmodSync(fakeNpm, 0o755);
const fakeTools = [
  [join(fixture, ".tools/maven/bin/mvn"), "if [ \"$1\" = \"--version\" ]; then echo 'Apache Maven 3.9.11'; else mkdir -p .dependency-cache; fi"],
  [join(fixture, ".tools/gradle/bin/gradle"), "if [ \"$1\" = \"--version\" ]; then echo 'Gradle 8.14.3'; else mkdir -p .dependency-cache; fi"],
  [join(fixture, ".tools/python/bin/python"), "if [ \"$1\" = \"--version\" ]; then echo 'Python 3.13.5'; else mkdir -p .venv; fi"]
];
for (const [path, body] of fakeTools) {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

function run(...args) {
  return spawnSync(process.execPath, [manager, ...args], { encoding: "utf8", env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` } });
}
let result = run("preview", fixture);
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /cwd=frontend/);
assert.match(result.stdout, /cwd=service/);
assert.equal(existsSync(join(fixture, ".ai/manifests/dependency-bootstrap.lock.json")), false);
result = run("apply", fixture, "--offline");
assert.equal(result.status, 2);
assert.match(result.stderr, /requires --approve/);
result = run("apply", fixture, "--offline", "--approve");
assert.notEqual(result.status, 0);
assert.match(result.stderr, /adapter version mismatch/);
assert.equal(existsSync(join(fixture, "frontend/node_modules")), false);
writeFileSync(fakeNpm, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 10.9.8; else mkdir -p node_modules; fi\n");
chmodSync(fakeNpm, 0o755);
result = run("apply", fixture, "--offline", "--approve");
assert.equal(result.status, 0, result.stderr);
assert.equal(existsSync(join(fixture, "frontend/node_modules/.dependency-bootstrap-owner.json")), true);
assert.equal(existsSync(join(fixture, "service/node_modules/.dependency-bootstrap-owner.json")), true);
assert.equal(existsSync(join(fixture, "web/node_modules/.dependency-bootstrap-owner.json")), true);
assert.equal(existsSync(join(fixture, "java/.dependency-cache/.dependency-bootstrap-owner.json")), true);
assert.equal(existsSync(join(fixture, "jvm/.dependency-cache/.dependency-bootstrap-owner.json")), true);
assert.equal(existsSync(join(fixture, "worker/.venv/.dependency-bootstrap-owner.json")), true);
result = run("validate", fixture);
assert.equal(result.status, 0, result.stderr);
writeFileSync(join(fixture, "frontend/node_modules/.dependency-bootstrap-owner.json"), "drift\n");
result = run("validate", fixture);
assert.notEqual(result.status, 0);
assert.match(result.stderr, /ownership drift/);
result = run("uninstall", fixture, "--approve");
assert.equal(result.status, 0, result.stderr);
assert.equal(existsSync(join(fixture, "frontend/node_modules")), true);
assert.equal(existsSync(join(fixture, "service/node_modules")), false);
assert.equal(existsSync(join(fixture, ".ai/manifests/dependency-bootstrap.lock.json")), false);
process.stdout.write("Stack dependency bootstrap clean install/uninstall Eval: PASS\n");
