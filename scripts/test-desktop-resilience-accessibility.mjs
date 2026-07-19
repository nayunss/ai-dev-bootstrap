#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { summarizeAdoptionResult } from "../desktop/ipc-contract.mjs";
import { DesktopAdoptionSession } from "../desktop/session.mjs";
import { runReleaseAdoption, sha256 } from "./release-adoption.mjs";

const sourceManifest = JSON.parse(readFileSync("evals/fixtures/release-adoption/v1.json", "utf8"));

function reviewedBundle() {
  const bundle = mkdtempSync(join(tmpdir(), "desktop-resilience-bundle-"));
  cpSync("evals/fixtures/release-adoption/v1.bundle.json", join(bundle, "archive.json"));
  cpSync("evals/fixtures/stack-profiles/react-vite.json", join(bundle, "stack-profile.json"));
  cpSync("evals/fixtures/skill-distribution/releases/v1", join(bundle, "skills"), { recursive: true });
  const manifest = structuredClone(sourceManifest);
  manifest.release.archivePath = "archive.json";
  manifest.release.archiveSha256 = sha256(readFileSync(join(bundle, "archive.json")));
  manifest.components.stackProfile.path = "stack-profile.json";
  manifest.components.skillDistribution.path = "skills/manifest.json";
  delete manifest.release.manifestSha256;
  manifest.release.manifestSha256 = sha256(JSON.stringify(manifest));
  const path = join(bundle, "release-manifest.json");
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return { bundle, path };
}

function worker(source) {
  const directory = mkdtempSync(join(tmpdir(), "desktop-test-worker-"));
  const path = join(directory, "worker.mjs");
  writeFileSync(path, source);
  return pathToFileURL(path);
}

const slowWorker = worker(`
  import { parentPort } from "node:worker_threads";
  setTimeout(() => parentPort.postMessage({ result: { status: "PREVIEW", planSha256: "sha256:${"1".repeat(64)}", entries: [] } }), 250);
`);
const duplicateTarget = mkdtempSync(join(tmpdir(), "desktop-duplicate-"));
const duplicateSession = new DesktopAdoptionSession({ workerUrl: slowWorker });
duplicateSession.selectProject(duplicateTarget);
duplicateSession.selectManifest(reviewedBundle().path);
const activeId = randomUUID();
const active = duplicateSession.run({ mode: "preview", operationId: activeId });
const duplicate = await duplicateSession.run({ mode: "preview", operationId: randomUUID() });
assert.equal(duplicate.status, "BLOCKED");
assert.match(duplicate.errors.join("\n"), /다른 작업이 진행 중/);
assert.equal((await duplicateSession.cancel(activeId)).accepted, true);
assert.equal((await active).status, "CANCELLED");
assert.equal(existsSync(join(duplicateTarget, "package.json")), false);

const crashWorker = worker("process.exit(12);");
const crashTarget = mkdtempSync(join(tmpdir(), "desktop-crash-"));
const crashSession = new DesktopAdoptionSession({ workerUrl: crashWorker });
crashSession.selectProject(crashTarget);
crashSession.selectManifest(reviewedBundle().path);
const crashed = await crashSession.run({ mode: "preview", operationId: randomUUID() });
assert.equal(crashed.status, "FAIL");
assert.match(crashed.errors.join("\n"), /예기치 않게 종료/);
assert.equal(existsSync(join(crashTarget, "package.json")), false);

const collisionTarget = mkdtempSync(join(tmpdir(), "desktop-collision-"));
writeFileSync(join(collisionTarget, "package.json"), "owner content\n");
const collisionSession = new DesktopAdoptionSession();
collisionSession.selectProject(collisionTarget);
collisionSession.selectManifest(reviewedBundle().path);
const collision = await collisionSession.run({ mode: "preview", operationId: randomUUID() });
assert.equal(collision.status, "BLOCKED");
assert.match(collision.errors.join("\n"), /기존 파일/);
assert.equal(readFileSync(join(collisionTarget, "package.json"), "utf8"), "owner content\n");

const tampered = reviewedBundle();
writeFileSync(join(tampered.bundle, "archive.json"), "tampered\n");
const tamperSession = new DesktopAdoptionSession();
tamperSession.selectProject(mkdtempSync(join(tmpdir(), "desktop-tamper-")));
assert.throws(() => tamperSession.selectManifest(tampered.path), /checksum drift/);

const driftTarget = mkdtempSync(join(tmpdir(), "desktop-drift-"));
const driftSession = new DesktopAdoptionSession();
driftSession.selectProject(driftTarget);
driftSession.selectManifest(reviewedBundle().path);
let result = await driftSession.run({ mode: "preview", operationId: randomUUID() });
result = await driftSession.run({ mode: "apply", operationId: randomUUID(), expectedPlanSha256: result.planSha256 });
assert.equal(result.status, "PASS");
writeFileSync(join(driftTarget, "package.json"), "owner drift\n");
result = await driftSession.run({ mode: "validate", operationId: randomUUID() });
assert.equal(result.status, "INVALID");
assert.match(result.errors.join("\n"), /적용 이후 파일이 변경/);
result = await driftSession.run({ mode: "rollback", operationId: randomUUID() });
assert.equal(result.status, "BLOCKED");
assert.equal(readFileSync(join(driftTarget, "package.json"), "utf8"), "owner drift\n");
assert.throws(() => new DesktopAdoptionSession().selectProject(driftTarget), /변경되었거나 손상/);
const retainedTarget = mkdtempSync(join(tmpdir(), "desktop-retained-selection-"));
const retainedSession = new DesktopAdoptionSession();
retainedSession.selectProject(retainedTarget);
assert.throws(() => retainedSession.selectProject(driftTarget), /변경되었거나 손상/);
retainedSession.selectManifest(reviewedBundle().path);
result = await retainedSession.run({ mode: "preview", operationId: randomUUID() });
result = await retainedSession.run({ mode: "apply", operationId: randomUUID(), expectedPlanSha256: result.planSha256 });
assert.equal(result.status, "PASS");
assert.equal(existsSync(join(retainedTarget, "package.json")), true);
assert.equal(readFileSync(join(driftTarget, "package.json"), "utf8"), "owner drift\n");

const partialTarget = mkdtempSync(join(tmpdir(), "desktop-partial-"));
let writes = 0;
const failingIo = {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync(path, bytes) {
    writes += 1;
    if (writes === 2) throw new Error("synthetic second write failure");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  },
};
result = summarizeAdoptionResult(runReleaseAdoption("apply", sourceManifest, process.cwd(), partialTarget, {
  surface: "gui",
  approved: true,
  io: failingIo,
}));
assert.equal(result.status, "FAIL");
assert.equal(existsSync(join(partialTarget, "package.json")), false);
assert.equal(existsSync(join(partialTarget, ".ai/manifests/release-adoption.lock.json")), false);

const html = readFileSync("desktop/renderer/index.html", "utf8");
const renderer = readFileSync("desktop/renderer/app.js", "utf8");
const css = readFileSync("desktop/renderer/styles.css", "utf8");
assert.match(html, /<html lang="ko">/);
assert.match(html, /role="alert"/);
assert.match(html, /role="status" aria-live="polite"/);
assert.match(html, /aria-busy="false"/);
assert.match(html, /id="error-summary"[^>]*tabindex="-1"/);
assert.match(html, /label for="approval"/);
assert.doesNotMatch(html, /tabindex="[1-9]/);
assert.doesNotMatch(html, /<(?:div|span)[^>]+onclick=/u);
assert.match(renderer, /errorSummary\.focus\(\)/);
assert.match(renderer, /byId\("retry"\)\.focus\(\)/);
assert.match(renderer, /byId\("result-title"\)\.focus\(\)/);
assert.match(css, /#result-title:focus-visible/);
assert.match(css, /\.error-summary:focus-visible/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /\.visually-hidden/);

process.stdout.write("REQ-047 desktop duplicate, crash, collision, tamper, keyboard, focus and screen-reader semantic fixture: PASS\n");
