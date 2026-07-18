#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { summarizeAdoptionResult, validateDesktopRequest, validateSelectedRoot } from "../desktop/ipc-contract.mjs";
import { runReleaseAdoption } from "./release-adoption.mjs";

const root = process.cwd();
const manifest = JSON.parse(readFileSync("evals/fixtures/release-adoption/v1.json", "utf8"));

assert.equal(validateSelectedRoot("/tmp/project"), "/tmp/project");
assert.throws(() => validateSelectedRoot("/tmp/.env-private"), /\.env/);
assert.deepEqual(validateDesktopRequest({ mode: "preview" }), { mode: "preview", expectedPlanSha256: undefined });
assert.throws(() => validateDesktopRequest({ mode: "shell", command: "rm" }), /알 수 없는|지원하지/);
assert.throws(() => validateDesktopRequest({ mode: "apply", expectedPlanSha256: "wrong" }), /식별자/);

const target = mkdtempSync(join(tmpdir(), "desktop-gui-"));
const preview = runReleaseAdoption("preview", manifest, root, target, { surface: "gui" });
assert.equal(preview.status, "PREVIEW");
const summary = summarizeAdoptionResult(preview);
assert.equal(summary.message, "아직 파일을 변경하지 않았습니다. 아래 계획을 확인하세요.");
assert.equal(summary.counts.create > 0, true);

const stalePlan = `sha256:${"0".repeat(64)}`;
let result = runReleaseAdoption("apply", manifest, root, target, {
  surface: "gui",
  approved: true,
  expectedPlanSha256: stalePlan,
});
assert.equal(result.status, "BLOCKED");
assert.match(result.errors.join("\n"), /approved plan differs/);
assert.equal(existsSync(join(target, "package.json")), false);

result = runReleaseAdoption("apply", manifest, root, target, {
  surface: "gui",
  approved: true,
  expectedPlanSha256: preview.planSha256,
});
assert.equal(result.status, "PASS");
writeFileSync(join(target, "package.json"), "owner drift\n");
result = summarizeAdoptionResult(runReleaseAdoption("rollback", manifest, root, target, { approved: true }));
assert.equal(result.status, "BLOCKED");
assert.match(result.errors.join("\n"), /target or rollback binding drift/);

const html = readFileSync("desktop/renderer/index.html", "utf8");
assert.match(html, /connect-src 'none'/);
assert.match(html, /aria-live="polite"/);
assert.doesNotMatch(html, /[—–]/u);
const preload = readFileSync("desktop/preload.cjs", "utf8");
assert.doesNotMatch(preload, /ipcRenderer:\s*ipcRenderer|send:\s*ipcRenderer/u);

process.stdout.write("REQ-047 desktop IPC, approval binding, safe copy and renderer security fixture: PASS\n");
