#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPortalCoordinator, PORTAL_PERMISSIONS } from "./github-app-portal.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_ROOT = resolve(ROOT, "web-portal");
const ASSETS = new Map([
  ["/", "index.html"],
  ["/app.js", "app.js"],
  ["/styles.css", "styles.css"],
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const REPOSITORY = Object.freeze({
  id: 101,
  accountId: 7,
  fullName: "fixture/example",
});
const PLAN_SHA256 = `sha256:${"a".repeat(64)}`;

function securityHeaders(contentType) {
  return {
    "cache-control": "no-store",
    "content-security-policy": "default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "content-type": contentType,
    "cross-origin-opener-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, securityHeaders(contentType));
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error("request body exceeds 16 KiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === `http://${request.headers.host}`;
}

function demoCoordinator() {
  const provider = {
    async installation() {
      return {
        id: 41,
        accountId: 7,
        status: "active",
        repositorySelection: "selected",
        repositoryIds: [REPOSITORY.id],
      };
    },
    async userAccess() {
      return {
        userId: 9,
        repositoryIds: [REPOSITORY.id],
        canPushRepositoryIds: [REPOSITORY.id],
      };
    },
    async withInstallationToken(_request, callback) {
      return callback("local-demo-installation-capability");
    },
    async withUserAccessToken(_request, callback) {
      return callback("local-demo-user-capability");
    },
    async createPullRequest(_input, token) {
      if (token !== "local-demo-user-capability") {
        throw new Error("demo capability was not confined to the operation");
      }
      return {
        number: 12,
        url: "https://github.com/fixture/example/pull/12",
      };
    },
  };
  const workspace = {
    async withEphemeralCheckout(_request, callback) {
      return callback("/tmp/local-demo-ephemeral-checkout");
    },
  };
  const core = {
    preview() {
      return {
        status: "PREVIEW",
        planSha256: PLAN_SHA256,
        counts: { create: 2, update: 1, preserve: 4, blocked: 0 },
        risk: "새 파일 2개와 관리 파일 1개를 바꿉니다. 기존 소유 파일 4개는 보존합니다.",
      };
    },
    apply({ expectedPlanSha256 }) {
      return {
        status: "PASS",
        planSha256: expectedPlanSha256,
        branch: "adoption/portal-reference",
        changedPaths: [
          ".ai/manifests/release-adoption.lock.json",
          "package.json",
        ],
      };
    },
  };
  return createPortalCoordinator({ provider, workspace, core });
}

export function createPortalDemoServer() {
  const coordinator = demoCoordinator();
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (request.method === "GET" && ASSETS.has(url.pathname)) {
        const relative = ASSETS.get(url.pathname);
        const body = readFileSync(resolve(ASSET_ROOT, relative));
        send(response, 200, body, CONTENT_TYPES[extname(relative)]);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/demo/status") {
        send(response, 200, JSON.stringify({
          mode: "LOCAL_REFERENCE",
          externalNetwork: "NOT_RUN",
          githubAppRegistration: "NOT_RUN",
          repository: REPOSITORY.fullName,
          permissions: PORTAL_PERMISSIONS,
        }));
        return;
      }
      if (
        request.method === "POST"
        && ["/api/demo/preview", "/api/demo/apply"].includes(url.pathname)
      ) {
        if (!sameOrigin(request)) {
          send(response, 403, JSON.stringify({ error: "cross-origin request blocked" }));
          return;
        }
        if (!request.headers["content-type"]?.startsWith("application/json")) {
          send(response, 415, JSON.stringify({ error: "application/json required" }));
          return;
        }
        const input = await readJson(request);
        const base = {
          requestId: input.requestId,
          userId: 9,
          repository: REPOSITORY,
        };
        const result = url.pathname.endsWith("/preview")
          ? await coordinator.preview({ ...base, release: "reference-v1" })
          : await coordinator.apply({
            ...base,
            approvedPlanSha256: input.approvedPlanSha256,
          });
        send(response, 200, JSON.stringify({ ...result, simulation: true }));
        return;
      }
      send(response, 404, JSON.stringify({ error: "not found" }));
    } catch (error) {
      send(response, 400, JSON.stringify({
        error: error instanceof Error ? error.message : "request failed",
      }));
    }
  });
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const host = "127.0.0.1";
  const port = Number.parseInt(process.env.PORTAL_DEMO_PORT ?? "4173", 10);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error("PORTAL_DEMO_PORT must be between 1024 and 65535");
  }
  createPortalDemoServer().listen(port, host, () => {
    process.stdout.write(
      `GitHub App Portal local reference: http://${host}:${port} (GitHub network NOT_RUN)\n`,
    );
  });
}
