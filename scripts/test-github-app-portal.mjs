#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  AuthStateStore,
  DeliveryReplayGuard,
  PORTAL_PERMISSIONS,
  authorizeRepository,
  createPortalCoordinator,
  redactPortalValue,
  validatePortalConfiguration,
  verifyWebhookDelivery,
} from "./github-app-portal.mjs";
import { createPortalDemoServer } from "./github-app-portal-demo.mjs";

let now = Date.parse("2026-07-19T00:00:00Z");
const clock = () => now;

const config = {
  repositorySelection: "selected",
  permissions: PORTAL_PERMISSIONS,
  tokenPersistence: false,
  telemetry: false,
  checkout: "ephemeral",
  egressAllowlist: ["api.github.com", "github.com"],
  evidenceRetentionDays: 7,
  operator: "security-owner",
};
assert.deepEqual(validatePortalConfiguration(config), { status: "PASS" });
assert.throws(
  () => validatePortalConfiguration({
    ...config,
    repositorySelection: "all",
  }),
  /selected repositories/u,
);
assert.throws(
  () => validatePortalConfiguration({
    ...config,
    permissions: { ...PORTAL_PERMISSIONS, administration: "write" },
  }),
  /permission/u,
);
assert.throws(
  () => validatePortalConfiguration({ ...config, tokenPersistence: true }),
  /persist/u,
);

const installation = {
  id: 41,
  accountId: 7,
  status: "active",
  repositorySelection: "selected",
  repositoryIds: [101],
};
const repository = { id: 101, accountId: 7, fullName: "fixture/example" };
const userAccess = { userId: 9, repositoryIds: [101], canPushRepositoryIds: [101] };
assert.deepEqual(authorizeRepository({ installation, repository, userAccess }), {
  installationId: 41,
  repositoryId: 101,
  userId: 9,
});
assert.throws(
  () => authorizeRepository({
    installation: { ...installation, repositoryIds: [999] },
    repository,
    userAccess,
  }),
  /installation/u,
);
assert.throws(
  () => authorizeRepository({
    installation: { ...installation, status: "suspended" },
    repository,
    userAccess,
  }),
  /active/u,
);
assert.throws(
  () => authorizeRepository({
    installation,
    repository,
    userAccess: { ...userAccess, canPushRepositoryIds: [] },
  }),
  /push/u,
);

const stateStore = new AuthStateStore({
  clock,
  randomBytes: () => Buffer.alloc(32, 7),
});
const state = stateStore.begin({
  expectedAccountId: 7,
  returnTo: "/portal/repositories",
});
assert.equal(state.length >= 43, true);
assert.deepEqual(stateStore.consume(state), {
  expectedAccountId: 7,
  returnTo: "/portal/repositories",
});
assert.throws(() => stateStore.consume(state), /invalid or expired/u);
assert.throws(
  () => stateStore.begin({ expectedAccountId: 7, returnTo: "https://evil.invalid/" }),
  /return path/u,
);
const boundedStateStore = new AuthStateStore({
  clock,
  randomBytes: (size) => Buffer.alloc(size, 8),
  maximumEntries: 1,
});
boundedStateStore.begin({ expectedAccountId: 7, returnTo: "/portal" });
assert.throws(
  () => boundedStateStore.begin({ expectedAccountId: 7, returnTo: "/portal" }),
  /capacity/u,
);

const webhookSecret = "fixture-secret";
const body = Buffer.from(JSON.stringify({ action: "suspended", installation: { id: 41 } }));
const signature = `sha256=${createHmac("sha256", webhookSecret).update(body).digest("hex")}`;
const replayGuard = new DeliveryReplayGuard({ clock });
assert.deepEqual(
  verifyWebhookDelivery({
    body,
    signature,
    deliveryId: "delivery-1",
    event: "installation",
    secret: webhookSecret,
    replayGuard,
  }),
  { event: "installation", deliveryId: "delivery-1" },
);
assert.throws(
  () => verifyWebhookDelivery({
    body,
    signature,
    deliveryId: "delivery-1",
    event: "installation",
    secret: webhookSecret,
    replayGuard,
  }),
  /duplicate/u,
);
assert.throws(
  () => verifyWebhookDelivery({
    body,
    signature: `sha256=${"0".repeat(64)}`,
    deliveryId: "delivery-2",
    event: "installation",
    secret: webhookSecret,
    replayGuard,
  }),
  /signature/u,
);
assert.throws(
  () => verifyWebhookDelivery({
    body,
    signature,
    deliveryId: "delivery-3",
    event: "push",
    secret: webhookSecret,
    replayGuard,
  }),
  /event/u,
);

const sensitive = {
  token: "ghs_new_format_not_fixed_length",
  nested: {
    authorization: "Bearer secret",
    safe: "keep",
    message: "failed with ghs_abcdefghijklmnopqrstuvwxyz0123456789",
  },
};
assert.deepEqual(redactPortalValue(sensitive), {
  token: "[REDACTED]",
  nested: {
    authorization: "[REDACTED]",
    safe: "keep",
    message: "failed with [REDACTED_GITHUB_TOKEN]",
  },
});

const calls = [];
const provider = {
  async installation() {
    return installation;
  },
  async userAccess() {
    return userAccess;
  },
  async withInstallationToken({ permissions }, callback) {
    assert.deepEqual(permissions, PORTAL_PERMISSIONS);
    const token = "ghs_runtime_only_variable_length_token";
    const result = await callback(token);
    assert.equal(JSON.stringify(result).includes(token), false);
    return result;
  },
  async withUserAccessToken(_request, callback) {
    const token = "ghu_runtime_only_variable_length_token";
    const result = await callback(token);
    assert.equal(JSON.stringify(result).includes(token), false);
    return result;
  },
  async createPullRequest(input, token) {
    assert.equal(token, "ghu_runtime_only_variable_length_token");
    calls.push(["createPullRequest", input]);
    return { number: 12, url: "https://github.com/fixture/example/pull/12" };
  },
};
const workspace = {
  async withEphemeralCheckout({ token }, callback) {
    calls.push(["checkout", token.startsWith("ghs_")]);
    return callback("/tmp/ephemeral-checkout");
  },
};
const core = {
  preview({ target }) {
    assert.equal(target, "/tmp/ephemeral-checkout");
    return {
      status: "PREVIEW",
      planSha256: `sha256:${"a".repeat(64)}`,
      counts: { create: 2, update: 1, preserve: 4, blocked: 0 },
      risk: "3개 파일을 변경하며 삭제·배포·자동 병합은 하지 않습니다.",
    };
  },
  apply({ target, expectedPlanSha256 }) {
    assert.equal(target, "/tmp/ephemeral-checkout");
    assert.equal(expectedPlanSha256, `sha256:${"a".repeat(64)}`);
    return {
      status: "PASS",
      planSha256: expectedPlanSha256,
      branch: "adoption/portal-request-1",
      changedPaths: ["package.json", ".ai/manifests/release-adoption.lock.json"],
    };
  },
};
const coordinator = createPortalCoordinator({
  clock,
  provider,
  workspace,
  core,
  sessionTtlMs: 10 * 60 * 1000,
});
const preview = await coordinator.preview({
  requestId: "request-1",
  userId: 9,
  repository,
  release: "reference-v1",
});
assert.equal(preview.status, "PREVIEW");
assert.equal(preview.planSha256, `sha256:${"a".repeat(64)}`);
assert.equal("token" in preview, false);
await assert.rejects(
  coordinator.apply({
    requestId: "request-1",
    userId: 9,
    repository,
    approvedPlanSha256: `sha256:${"0".repeat(64)}`,
  }),
  /exact preview plan/u,
);
const applied = await coordinator.apply({
  requestId: "request-1",
  userId: 9,
  repository,
  approvedPlanSha256: preview.planSha256,
});
assert.equal(applied.status, "PR_CREATED");
assert.equal(applied.pullRequest.number, 12);
assert.equal(applied.delivery.merge, "NOT_RUN");
const repeated = await coordinator.apply({
  requestId: "request-1",
  userId: 9,
  repository,
  approvedPlanSha256: preview.planSha256,
});
assert.deepEqual(repeated, applied);
assert.equal(calls.filter(([name]) => name === "createPullRequest").length, 1);
await assert.rejects(
  coordinator.apply({
    requestId: "request-1",
    userId: 10,
    repository,
    approvedPlanSha256: preview.planSha256,
  }),
  /different approval context/u,
);
await assert.rejects(
  coordinator.preview({
    requestId: "request-1",
    userId: 9,
    repository,
    release: "reference-v1",
  }),
  /already used/u,
);

now += 11 * 60 * 1000;
await assert.rejects(
  coordinator.apply({
    requestId: "request-expired",
    userId: 9,
    repository,
    approvedPlanSha256: preview.planSha256,
  }),
  /preview session/u,
);

const demoServer = createPortalDemoServer();
await new Promise((resolve, reject) => {
  demoServer.once("error", reject);
  demoServer.listen(0, "127.0.0.1", resolve);
});
try {
  const address = demoServer.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pageResponse = await fetch(baseUrl);
  const page = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.headers.get("content-security-policy"), /default-src 'self'/u);
  assert.match(page, /<main id="main">/u);
  assert.match(page, /<h1 id="page-title">/u);
  assert.match(page, /<fieldset>/u);
  assert.match(page, /aria-live="polite"/u);
  assert.doesNotMatch(page, /onclick=|tabindex="[1-9]/u);

  const statusResponse = await fetch(`${baseUrl}/api/demo/status`);
  const status = await statusResponse.json();
  assert.equal(status.externalNetwork, "NOT_RUN");
  assert.equal(status.githubAppRegistration, "NOT_RUN");
  assert.deepEqual(status.permissions, PORTAL_PERMISSIONS);

  const demoRequestId = "browser-fixture";
  const previewResponse = await fetch(`${baseUrl}/api/demo/preview`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({ requestId: demoRequestId }),
  });
  const demoPreview = await previewResponse.json();
  assert.equal(demoPreview.status, "PREVIEW");
  assert.equal(demoPreview.simulation, true);
  const applyResponse = await fetch(`${baseUrl}/api/demo/apply`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify({
      requestId: demoRequestId,
      approvedPlanSha256: demoPreview.planSha256,
    }),
  });
  const demoApply = await applyResponse.json();
  assert.equal(demoApply.status, "PR_CREATED");
  assert.equal(demoApply.delivery.merge, "NOT_RUN");

  const crossOrigin = await fetch(`${baseUrl}/api/demo/preview`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://evil.invalid",
    },
    body: JSON.stringify({ requestId: "blocked-origin" }),
  });
  assert.equal(crossOrigin.status, 403);
} finally {
  await new Promise((resolve, reject) => demoServer.close((error) => (
    error ? reject(error) : resolve()
  )));
}

process.stdout.write(
  "REQ-047 GitHub App Portal authorization, token, webhook, approval, PR boundary and browser reference fixture: PASS\n",
);
