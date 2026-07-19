#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildDesktopDevelopmentPackage,
  validateDesktopDevelopmentPackage,
} from "./desktop-package-provenance.mjs";

const output = mkdtempSync(join(tmpdir(), "desktop-package-eval-"));
const result = await buildDesktopDevelopmentPackage(output);
assert.match(result.assetSha256, /^sha256:[a-f0-9]{64}$/u);
assert.equal(result.appFiles > 0, true);
assert.equal(validateDesktopDevelopmentPackage(output).status, "PASS");

const sbomPath = join(output, "desktop-development.sbom.cdx.json");
const original = readFileSync(sbomPath);
writeFileSync(sbomPath, "tampered\n");
const tampered = validateDesktopDevelopmentPackage(output);
assert.equal(tampered.status, "INVALID");
assert.match(tampered.errors.join("\n"), /checksum drift|Unexpected token/u);
writeFileSync(sbomPath, original);
assert.equal(validateDesktopDevelopmentPackage(output).status, "PASS");

const manifestPath = join(output, "desktop-development-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.supported = true;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const manifestSha = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
const sumsPath = join(output, "SHA256SUMS");
const sums = readFileSync(sumsPath, "utf8").replace(
  /^[a-f0-9]{64}  desktop-development-manifest\.json$/mu,
  `${manifestSha}  desktop-development-manifest.json`,
);
writeFileSync(sumsPath, sums);
const boundaryTamper = validateDesktopDevelopmentPackage(output);
assert.equal(boundaryTamper.status, "INVALID");
assert.match(boundaryTamper.errors.join("\n"), /support boundary/u);

process.stdout.write("GUI-04 reproducible package, fuse, checksum, SBOM, provenance and metadata drift fixture: PASS\n");
