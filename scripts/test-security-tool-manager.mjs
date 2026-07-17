#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const manager = resolve("scripts/manage-security-tools.mjs");
const reviewedManifest = readFileSync(".ai/manifests/security-tools.yaml", "utf8");
const runtimeCatalog = JSON.parse(readFileSync(".ai/manifests/security-tool-assets.json", "utf8"));
assert.match(reviewedManifest, /runtimeAssetCatalog: security-tool-assets\.json/);
for (const tool of runtimeCatalog.tools) {
  assert.match(reviewedManifest, new RegExp(`id: ${tool.id}`));
  assert.match(reviewedManifest, new RegExp(`version: ${tool.version.replaceAll(".", "\\.")}`));
  for (const asset of Object.values(tool.assets)) assert.ok(reviewedManifest.includes(asset.sha256));
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const artifacts = mkdtempSync(join(tmpdir(), "security-tool-artifacts-"));
writeFileSync(join(artifacts, "secret-scan"), "#!/bin/sh\necho fixture-secret-scan\n");
writeFileSync(join(artifacts, "sast"), "#!/bin/sh\necho fixture-sast\n");
const catalog = {
  schemaVersion: 1,
  networkDefault: "deny",
  installRoot: ".tools/security",
  lockPath: ".ai/manifests/security-tools.lock.json",
  tools: [
    {
      id: "secret-scan",
      version: "1.2.3",
      installType: "binary",
      runtimeNetwork: "deny",
      telemetry: "none",
      assets: {
        fixture: {
          file: "secret-scan",
          url: "https://example.invalid/secret-scan/1.2.3",
          sha256: sha256(readFileSync(join(artifacts, "secret-scan"))),
        },
      },
    },
    {
      id: "sast",
      version: "4.5.6",
      installType: "binary",
      runtimeNetwork: "deny",
      telemetry: "forced-off",
      assets: {
        fixture: {
          file: "sast",
          url: "https://example.invalid/sast/4.5.6",
          sha256: sha256(readFileSync(join(artifacts, "sast"))),
        },
      },
    },
  ],
};
const catalogPath = join(artifacts, "catalog.json");
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
const run = (target, ...args) => spawnSync(process.execPath, [
  manager,
  ...args,
  `--catalog=${catalogPath}`,
  "--platform=fixture",
], { cwd: root, encoding: "utf8" });

const target = mkdtempSync(join(tmpdir(), "security-tool-target-"));
const bootstrapPreview = spawnSync(resolve("scripts/bootstrap"), ["security-tools", "preview", target], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(bootstrapPreview.status, 0);
assert.match(bootstrapPreview.stdout, /network: deny/);
let result = run(target, "preview", target);
assert.equal(result.status, 0);
assert.match(result.stdout, /network: deny/);
assert.equal(existsSync(join(target, ".tools/security/bin/secret-scan")), false);
result = run(target, "apply", target, artifacts);
assert.equal(result.status, 2);
assert.equal(existsSync(join(target, ".tools/security/bin/secret-scan")), false);
result = run(target, "apply", target, artifacts, "--approve");
assert.equal(result.status, 0, result.stderr);
assert.equal(existsSync(join(target, ".tools/security/bin/secret-scan")), true);
assert.equal(existsSync(join(target, ".ai/manifests/security-tools.lock.json")), true);
assert.equal(run(target, "validate", target).status, 0);
const lock = JSON.parse(readFileSync(join(target, ".ai/manifests/security-tools.lock.json"), "utf8"));
assert.equal(lock.networkDuringInstall, "deny");
assert.deepEqual(lock.tools.map((tool) => `${tool.id}@${tool.version}`), ["secret-scan@1.2.3", "sast@4.5.6"]);

writeFileSync(join(target, ".tools/security/bin/secret-scan"), "# owner changed\n");
result = run(target, "validate", target);
assert.equal(result.status, 1);
assert.match(result.stderr, /security tool drift: secret-scan/);
result = run(target, "uninstall", target, "--approve");
assert.equal(result.status, 0);
assert.equal(readFileSync(join(target, ".tools/security/bin/secret-scan"), "utf8"), "# owner changed\n");
assert.equal(existsSync(join(target, ".tools/security/bin/sast")), false);
assert.equal(existsSync(join(target, ".ai/manifests/security-tools.lock.json")), false);

const mismatchTarget = mkdtempSync(join(tmpdir(), "security-tool-mismatch-"));
const badArtifacts = mkdtempSync(join(tmpdir(), "security-tool-bad-artifacts-"));
writeFileSync(join(badArtifacts, "secret-scan"), "tampered\n");
writeFileSync(join(badArtifacts, "sast"), readFileSync(join(artifacts, "sast")));
result = run(mismatchTarget, "apply", mismatchTarget, badArtifacts, "--approve");
assert.equal(result.status, 1);
assert.match(result.stderr, /Artifact checksum mismatch/);
assert.equal(existsSync(join(mismatchTarget, ".tools/security/bin/sast")), false);

const collisionTarget = mkdtempSync(join(tmpdir(), "security-tool-collision-"));
writeFileSync(join(collisionTarget, "owner.txt"), "preserved\n");
result = run(collisionTarget, "apply", collisionTarget, artifacts, "--approve");
assert.equal(result.status, 0);
const secondTarget = mkdtempSync(join(tmpdir(), "security-tool-existing-"));
writeFileSync(join(secondTarget, "placeholder"), "owner\n");
result = run(secondTarget, "apply", secondTarget, artifacts, "--approve");
assert.equal(result.status, 0);
writeFileSync(join(secondTarget, ".tools/security/bin/secret-scan"), "different\n");
result = run(secondTarget, "apply", secondTarget, artifacts, "--approve");
assert.equal(result.status, 1);
assert.match(result.stderr, /existing binaries differ/);
assert.equal(readFileSync(join(secondTarget, ".tools/security/bin/sast"), "utf8"), readFileSync(join(artifacts, "sast"), "utf8"));

process.stdout.write("Downstream project-local security tool preview/apply/validate/uninstall Eval: PASS\n");
