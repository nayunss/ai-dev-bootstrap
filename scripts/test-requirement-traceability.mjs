#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requiresManifestChange, validateTraceability } from "./validate-requirement-traceability.mjs";

const manifest = JSON.parse(readFileSync(".ai/manifests/requirement-traceability.json", "utf8"));
assert.deepEqual(validateTraceability(manifest), []);

const missing = structuredClone(manifest);
missing.requirements.pop();
assert.match(validateTraceability(missing).join("\n"), /missing requirement id: REQ-024/);

const duplicate = structuredClone(manifest);
duplicate.requirements[1].id = "REQ-019";
assert.match(validateTraceability(duplicate).join("\n"), /duplicate requirement id/);

const unsafe = structuredClone(manifest);
unsafe.requirements[0].implementationSources[0] = ".env.example";
assert.match(validateTraceability(unsafe).join("\n"), /unsafe implementationSources path/);

const missingEvidence = structuredClone(manifest);
missingEvidence.requirements[0].verificationSources[0] = "scripts/not-present.mjs";
assert.match(validateTraceability(missingEvidence).join("\n"), /missing verificationSources path/);

const tokenDrift = structuredClone(manifest);
delete tokenDrift.requirements[0].tokenProfileImpact.rationale;
assert.match(validateTraceability(tokenDrift).join("\n"), /tokenProfileImpact mode and rationale/);

assert.equal(requiresManifestChange(["docs/requirements.md"]), true);
assert.equal(requiresManifestChange(["HANDOFF.md"]), false);
process.stdout.write("REQ-019~024 requirement traceability manifest and validator Eval: PASS\n");
