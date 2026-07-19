#!/usr/bin/env node
import {
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual,
} from "node:crypto";

export const PORTAL_PERMISSIONS = Object.freeze({
  metadata: "read",
  contents: "write",
  pull_requests: "write",
});

const HASH = /^sha256:[a-f0-9]{64}$/u;
const SAFE_RETURN_PATH = /^\/[A-Za-z0-9/_?=&.-]*$/u;
const SAFE_DELIVERY_ID = /^[A-Za-z0-9-]{1,128}$/u;
const ALLOWED_WEBHOOK_EVENTS = new Set([
  "github_app_authorization",
  "installation",
  "installation_repositories",
]);
const SENSITIVE_KEY = /authorization|code|private.?key|secret|token/iu;
const TOKEN_IN_TEXT = /\b(?:gh[opsu]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/gu;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function samePermissions(actual) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  const expectedEntries = Object.entries(PORTAL_PERMISSIONS);
  const actualEntries = Object.entries(actual);
  return actualEntries.length === expectedEntries.length
    && expectedEntries.every(([key, value]) => actual[key] === value);
}

export function validatePortalConfiguration(config) {
  invariant(config?.repositorySelection === "selected", "Portal must use selected repositories only");
  invariant(samePermissions(config.permissions), "Portal permission set exceeds or misses the reviewed minimum");
  invariant(config.tokenPersistence === false, "Portal must not persist GitHub tokens");
  invariant(config.telemetry === false, "Portal telemetry must remain disabled");
  invariant(config.checkout === "ephemeral", "Portal checkout must be ephemeral");
  invariant(
    Array.isArray(config.egressAllowlist)
      && config.egressAllowlist.length === 2
      && config.egressAllowlist.includes("api.github.com")
      && config.egressAllowlist.includes("github.com"),
    "Portal egress allowlist must contain only reviewed GitHub endpoints",
  );
  invariant(
    Number.isInteger(config.evidenceRetentionDays)
      && config.evidenceRetentionDays >= 1
      && config.evidenceRetentionDays <= 7,
    "Portal evidence retention must be between 1 and 7 days",
  );
  invariant(
    typeof config.operator === "string" && config.operator.trim().length > 0,
    "Portal requires an accountable operator",
  );
  return { status: "PASS" };
}

export function authorizeRepository({ installation, repository, userAccess }) {
  invariant(installation?.status === "active", "GitHub App installation must be active");
  invariant(
    installation.repositorySelection === "selected",
    "GitHub App installation must be limited to selected repositories",
  );
  invariant(
    Number.isInteger(repository?.id) && repository.accountId === installation.accountId,
    "repository does not belong to the installation account",
  );
  invariant(
    installation.repositoryIds?.includes(repository.id),
    "repository is outside the GitHub App installation",
  );
  invariant(
    Number.isInteger(userAccess?.userId) && userAccess.repositoryIds?.includes(repository.id),
    "user is not authorized for the selected repository",
  );
  invariant(
    userAccess.canPushRepositoryIds?.includes(repository.id),
    "user does not have current push permission for the selected repository",
  );
  return {
    installationId: installation.id,
    repositoryId: repository.id,
    userId: userAccess.userId,
  };
}

export class AuthStateStore {
  #clock;
  #randomBytes;
  #ttlMs;
  #maximumEntries;
  #states = new Map();

  constructor({
    clock = Date.now,
    randomBytes = nodeRandomBytes,
    ttlMs = 10 * 60 * 1000,
    maximumEntries = 10_000,
  } = {}) {
    invariant(Number.isInteger(ttlMs) && ttlMs > 0 && ttlMs <= 15 * 60 * 1000, "auth state TTL is invalid");
    invariant(Number.isInteger(maximumEntries) && maximumEntries > 0, "auth state capacity is invalid");
    this.#clock = clock;
    this.#randomBytes = randomBytes;
    this.#ttlMs = ttlMs;
    this.#maximumEntries = maximumEntries;
  }

  begin({ expectedAccountId, returnTo }) {
    invariant(Number.isInteger(expectedAccountId), "expected account ID is required");
    invariant(
      typeof returnTo === "string"
        && SAFE_RETURN_PATH.test(returnTo)
        && !returnTo.startsWith("//"),
      "auth return path must be a local Portal path",
    );
    const now = this.#clock();
    for (const [key, record] of this.#states) {
      if (record.expiresAt < now) this.#states.delete(key);
    }
    invariant(this.#states.size < this.#maximumEntries, "auth state store capacity reached");
    const state = this.#randomBytes(32).toString("base64url");
    invariant(!this.#states.has(state), "auth state collision");
    this.#states.set(state, {
      expectedAccountId,
      returnTo,
      expiresAt: now + this.#ttlMs,
    });
    return state;
  }

  consume(state) {
    const record = this.#states.get(state);
    this.#states.delete(state);
    invariant(record && record.expiresAt >= this.#clock(), "auth state is invalid or expired");
    return {
      expectedAccountId: record.expectedAccountId,
      returnTo: record.returnTo,
    };
  }
}

export class DeliveryReplayGuard {
  #clock;
  #ttlMs;
  #maximumEntries;
  #deliveries = new Map();

  constructor({
    clock = Date.now,
    ttlMs = 24 * 60 * 60 * 1000,
    maximumEntries = 10_000,
  } = {}) {
    invariant(Number.isInteger(ttlMs) && ttlMs > 0, "delivery replay TTL is invalid");
    invariant(Number.isInteger(maximumEntries) && maximumEntries > 0, "delivery replay capacity is invalid");
    this.#clock = clock;
    this.#ttlMs = ttlMs;
    this.#maximumEntries = maximumEntries;
  }

  consume(deliveryId) {
    invariant(SAFE_DELIVERY_ID.test(deliveryId ?? ""), "webhook delivery ID is invalid");
    const now = this.#clock();
    for (const [id, expiresAt] of this.#deliveries) {
      if (expiresAt < now) this.#deliveries.delete(id);
    }
    invariant(!this.#deliveries.has(deliveryId), "duplicate webhook delivery");
    invariant(this.#deliveries.size < this.#maximumEntries, "webhook replay store capacity reached");
    this.#deliveries.set(deliveryId, now + this.#ttlMs);
  }
}

function validSignature({ body, signature, secret }) {
  if (
    !Buffer.isBuffer(body)
    || body.length === 0
    || body.length > 1024 * 1024
    || typeof secret !== "string"
    || secret.length < 8
    || !/^sha256=[a-f0-9]{64}$/u.test(signature ?? "")
  ) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyWebhookDelivery({
  body,
  signature,
  deliveryId,
  event,
  secret,
  replayGuard,
}) {
  invariant(ALLOWED_WEBHOOK_EVENTS.has(event), "webhook event is not allowed");
  invariant(validSignature({ body, signature, secret }), "webhook signature is invalid");
  invariant(replayGuard instanceof DeliveryReplayGuard, "webhook replay guard is required");
  replayGuard.consume(deliveryId);
  return { event, deliveryId };
}

export function redactPortalValue(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return value.replace(TOKEN_IN_TEXT, "[REDACTED_GITHUB_TOKEN]");
  if (Array.isArray(value)) return value.map((item) => redactPortalValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactPortalValue(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

function validateRepository(repository) {
  invariant(
    Number.isInteger(repository?.id)
      && Number.isInteger(repository.accountId)
      && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository.fullName ?? ""),
    "repository selection is invalid",
  );
}

function validateRequest({ requestId, userId, repository }) {
  invariant(/^[A-Za-z0-9-]{1,80}$/u.test(requestId ?? ""), "Portal request ID is invalid");
  invariant(Number.isInteger(userId), "Portal user ID is invalid");
  validateRepository(repository);
}

export function createPortalCoordinator({
  clock = Date.now,
  provider,
  workspace,
  core,
  sessionTtlMs = 10 * 60 * 1000,
  resultRetentionMs = 24 * 60 * 60 * 1000,
  maximumSessions = 10_000,
}) {
  invariant(provider && workspace && core, "Portal adapters are required");
  invariant(
    Number.isInteger(sessionTtlMs) && sessionTtlMs > 0 && sessionTtlMs <= 15 * 60 * 1000,
    "Portal preview session TTL is invalid",
  );
  invariant(
    Number.isInteger(resultRetentionMs)
      && resultRetentionMs > 0
      && resultRetentionMs <= 7 * 24 * 60 * 60 * 1000,
    "Portal result retention is invalid",
  );
  invariant(Number.isInteger(maximumSessions) && maximumSessions > 0, "Portal session capacity is invalid");
  const previews = new Map();
  const completed = new Map();

  function prune() {
    const now = clock();
    for (const [id, record] of previews) {
      if (record.expiresAt < now) previews.delete(id);
    }
    for (const [id, record] of completed) {
      if (record.expiresAt < now) completed.delete(id);
    }
  }

  async function authorizedContext(input) {
    const currentInstallation = await provider.installation(input.repository);
    const currentUserAccess = await provider.userAccess({
      userId: input.userId,
      repository: input.repository,
    });
    return authorizeRepository({
      installation: currentInstallation,
      repository: input.repository,
      userAccess: currentUserAccess,
    });
  }

  async function inEphemeralCheckout(context, repository, operation) {
    return provider.withInstallationToken({
      installationId: context.installationId,
      repositoryId: context.repositoryId,
      permissions: PORTAL_PERMISSIONS,
    }, async (token) => {
      invariant(typeof token === "string" && token.length > 0, "installation token was not issued");
      const result = await workspace.withEphemeralCheckout(
        { repository, token },
        (target) => operation(target, token),
      );
      invariant(
        !JSON.stringify(result).includes(token),
        "installation token escaped the ephemeral operation",
      );
      return result;
    });
  }

  return Object.freeze({
    async preview(input) {
      validateRequest(input);
      prune();
      invariant(
        previews.size + completed.size < maximumSessions,
        "Portal session capacity reached",
      );
      invariant(
        !previews.has(input.requestId) && !completed.has(input.requestId),
        "Portal request ID was already used",
      );
      invariant(typeof input.release === "string" && input.release.length > 0, "reviewed release is required");
      const context = await authorizedContext(input);
      const result = await inEphemeralCheckout(
        context,
        input.repository,
        (target) => core.preview({ target, release: input.release }),
      );
      invariant(result?.status === "PREVIEW" && HASH.test(result.planSha256 ?? ""), "core preview failed");
      const record = {
        requestId: input.requestId,
        userId: input.userId,
        repository: input.repository,
        release: input.release,
        planSha256: result.planSha256,
        expiresAt: clock() + sessionTtlMs,
      };
      previews.set(input.requestId, record);
      return redactPortalValue({
        status: result.status,
        requestId: input.requestId,
        repository: input.repository.fullName,
        planSha256: result.planSha256,
        counts: result.counts,
        risk: result.risk,
        expiresAt: new Date(record.expiresAt).toISOString(),
        delivery: {
          branch: "NOT_RUN",
          pullRequest: "NOT_RUN",
          merge: "NOT_RUN",
        },
      });
    },

    async apply(input) {
      validateRequest(input);
      prune();
      if (completed.has(input.requestId)) {
        const record = completed.get(input.requestId);
        invariant(
          record.userId === input.userId
            && record.repositoryId === input.repository.id
            && record.accountId === input.repository.accountId
            && record.planSha256 === input.approvedPlanSha256,
          "completed request cannot be replayed by a different approval context",
        );
        return record.result;
      }
      const preview = previews.get(input.requestId);
      invariant(preview && preview.expiresAt >= clock(), "preview session is missing or expired");
      invariant(
        preview.userId === input.userId
          && preview.repository.id === input.repository.id
          && preview.repository.accountId === input.repository.accountId,
        "approval actor or repository changed after preview",
      );
      invariant(
        HASH.test(input.approvedPlanSha256 ?? "")
          && input.approvedPlanSha256 === preview.planSha256,
        "apply requires the exact preview plan SHA-256",
      );
      const context = await authorizedContext(input);
      const coreResult = await inEphemeralCheckout(
        context,
        input.repository,
        async (target) => {
          const coreResult = await core.apply({
            target,
            release: preview.release,
            expectedPlanSha256: input.approvedPlanSha256,
          });
          invariant(
            coreResult?.status === "PASS"
              && coreResult.planSha256 === preview.planSha256
              && typeof coreResult.branch === "string"
              && Array.isArray(coreResult.changedPaths),
            "core apply did not preserve the approved plan boundary",
          );
          return coreResult;
        },
      );
      invariant(
        typeof provider.withUserAccessToken === "function",
        "provider must scope Pull Request delivery to a user access token",
      );
      const pullRequest = await provider.withUserAccessToken({
        installationId: context.installationId,
        repositoryId: context.repositoryId,
        userId: context.userId,
      }, async (token) => {
        invariant(typeof token === "string" && token.length > 0, "user access token was not issued");
        const result = await provider.createPullRequest({
            installationId: context.installationId,
            repositoryId: context.repositoryId,
            userId: context.userId,
            branch: coreResult.branch,
            planSha256: coreResult.planSha256,
            changedPaths: coreResult.changedPaths,
          }, token);
        invariant(!JSON.stringify(result).includes(token), "user access token escaped PR delivery");
        return result;
      });
      invariant(
        Number.isInteger(pullRequest?.number)
          && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[0-9]+$/u.test(
            pullRequest.url ?? "",
          ),
        "provider did not return a valid GitHub pull request",
      );
      const result = redactPortalValue({
        status: "PR_CREATED",
        requestId: input.requestId,
        repository: input.repository.fullName,
        planSha256: preview.planSha256,
        changedPaths: coreResult.changedPaths,
        pullRequest,
        delivery: {
          branch: coreResult.branch,
          pullRequest: "CREATED",
          merge: "NOT_RUN",
        },
      });
      completed.set(input.requestId, {
        userId: input.userId,
        repositoryId: input.repository.id,
        accountId: input.repository.accountId,
        planSha256: preview.planSha256,
        expiresAt: clock() + resultRetentionMs,
        result,
      });
      previews.delete(input.requestId);
      return result;
    },
  });
}
