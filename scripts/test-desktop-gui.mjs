#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { summarizeAdoptionResult, validateDesktopRequest, validateSelectedRoot } from "../desktop/ipc-contract.mjs";
import { DesktopAdoptionSession } from "../desktop/session.mjs";
import { runReleaseAdoption, sha256 } from "./release-adoption.mjs";

const root = process.cwd();
const manifest = JSON.parse(readFileSync("evals/fixtures/release-adoption/v1.json", "utf8"));

const selectedRoot = mkdtempSync(join(tmpdir(), "desktop-selected-root-"));
assert.equal(validateSelectedRoot(selectedRoot), realpathSync(selectedRoot));
assert.throws(() => validateSelectedRoot(homedir()), /홈 폴더/);
const envRoot = join(tmpdir(), `.env-private-${Date.now()}`);
mkdirSync(envRoot);
assert.throws(() => validateSelectedRoot(envRoot), /\.env/);
const requestId = randomUUID();
assert.deepEqual(
  validateDesktopRequest({ mode: "preview", operationId: requestId }),
  { mode: "preview", expectedPlanSha256: undefined, operationId: requestId },
);
assert.throws(() => validateDesktopRequest({ mode: "shell", command: "rm" }), /알 수 없는|지원하지/);
assert.throws(() => validateDesktopRequest({ mode: "apply", operationId: requestId, expectedPlanSha256: "wrong" }), /식별자/);

function reviewedBundle() {
  const bundle = mkdtempSync(join(tmpdir(), "desktop-reviewed-bundle-"));
  cpSync("evals/fixtures/release-adoption/v1.bundle.json", join(bundle, "archive.json"));
  cpSync("evals/fixtures/stack-profiles/react-vite.json", join(bundle, "stack-profile.json"));
  cpSync("evals/fixtures/skill-distribution/releases/v1", join(bundle, "skills"), { recursive: true });
  const reviewed = structuredClone(manifest);
  reviewed.release.archivePath = "archive.json";
  reviewed.release.archiveSha256 = sha256(readFileSync(join(bundle, "archive.json")));
  reviewed.components.stackProfile.path = "stack-profile.json";
  reviewed.components.skillDistribution.path = "skills/manifest.json";
  delete reviewed.release.manifestSha256;
  reviewed.release.manifestSha256 = sha256(JSON.stringify(reviewed));
  const path = join(bundle, "release-manifest.json");
  writeFileSync(path, `${JSON.stringify(reviewed, null, 2)}\n`);
  return path;
}

const target = mkdtempSync(join(tmpdir(), "desktop-gui-"));
const preview = runReleaseAdoption("preview", manifest, root, target, { surface: "gui" });
assert.equal(preview.status, "PREVIEW");
const summary = summarizeAdoptionResult(preview);
assert.equal(summary.message, "아직 파일을 변경하지 않았습니다. 아래 계획을 확인하세요.");
assert.equal(summary.counts.create > 0, true);
assert.equal(summary.entries.every((entry) => entry.afterSha256?.startsWith("sha256:")), true);

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

const session = new DesktopAdoptionSession();
const sessionTarget = mkdtempSync(join(tmpdir(), "desktop-session-target-"));
session.selectProject(sessionTarget);
const evidence = session.selectManifest(reviewedBundle());
assert.equal(evidence.release, "1.0.0");
assert.equal(evidence.artifactStatus, "UNSIGNED_DEVELOPMENT_ONLY");
assert.equal(evidence.signing, "NOT_RUN");

const cancelledId = randomUUID();
const pendingPreview = session.run({ mode: "preview", operationId: cancelledId });
assert.throws(() => session.selectProject(mkdtempSync(join(tmpdir(), "desktop-other-target-"))), /진행 중인 작업/);
assert.deepEqual(await session.cancel(cancelledId), {
  accepted: true,
  message: "작업을 취소했습니다. 파일은 변경하지 않았습니다.",
});
result = await pendingPreview;
assert.equal(result.status, "CANCELLED");
assert.equal(existsSync(join(sessionTarget, "package.json")), false);

result = await session.run({ mode: "preview", operationId: randomUUID() });
assert.equal(result.status, "PREVIEW");
const invalidatedPlan = result.planSha256;
const secondCancelledId = randomUUID();
const secondPendingPreview = session.run({ mode: "preview", operationId: secondCancelledId });
assert.equal((await session.cancel(secondCancelledId)).accepted, true);
assert.equal((await secondPendingPreview).status, "CANCELLED");
result = await session.run({ mode: "apply", operationId: randomUUID(), expectedPlanSha256: invalidatedPlan });
assert.equal(result.status, "BLOCKED");
assert.equal(existsSync(join(sessionTarget, "package.json")), false);

result = await session.run({ mode: "preview", operationId: randomUUID() });
assert.equal(result.status, "PREVIEW");
const approvedPlan = result.planSha256;
result = await session.run({ mode: "apply", operationId: randomUUID(), expectedPlanSha256: approvedPlan });
assert.equal(result.status, "PASS");
assert.equal(existsSync(join(sessionTarget, "package.json")), true);
result = await session.run({ mode: "validate", operationId: randomUUID() });
assert.equal(result.status, "PASS");
result = await session.run({ mode: "rollback", operationId: randomUUID() });
assert.equal(result.status, "PASS");
assert.equal(existsSync(join(sessionTarget, "package.json")), false);

const html = readFileSync("desktop/renderer/index.html", "utf8");
assert.match(html, /connect-src 'none'/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /id="cancel"/);
assert.match(html, /id="retry"/);
assert.match(html, /id="release-evidence"/);
assert.doesNotMatch(html, /[—–]/u);
const preload = readFileSync("desktop/preload.cjs", "utf8");
assert.doesNotMatch(preload, /ipcRenderer:\s*ipcRenderer|send:\s*ipcRenderer/u);

process.stdout.write("REQ-047 reviewed bundle desktop flow, cancellation, rerun, IPC and renderer security fixture: PASS\n");
