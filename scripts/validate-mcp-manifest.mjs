#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".ai/manifests/approved-mcp.json", "utf8"));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.defaultPolicy, "deny");
assert.ok(Array.isArray(manifest.servers));

const required = [
  "name",
  "version",
  "source",
  "integrity",
  "reviewedAt",
  "reviewExpiresAt",
  "approvedBy",
  "allowedTools",
  "allowedHosts",
  "filesystemRead",
  "filesystemWrite",
  "credentialScopes",
  "telemetry",
  "approved",
  "enabled",
];

const names = new Set();
for (const server of manifest.servers) {
  for (const field of required) assert.ok(Object.hasOwn(server, field), `${server.name ?? "MCP"}: missing ${field}`);
  assert.match(server.name, /^[a-z0-9-]+$/);
  assert.ok(!names.has(server.name), `duplicate MCP server: ${server.name}`);
  names.add(server.name);
  assert.notEqual(server.version, "latest");
  assert.match(server.integrity, /^sha256:[a-f0-9]{64}$/);
  assert.match(server.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(server.reviewExpiresAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(server.reviewExpiresAt >= new Date().toISOString().slice(0, 10));
  assert.equal(server.telemetry, "disabled");
  assert.ok(Array.isArray(server.allowedTools) && server.allowedTools.length > 0);
  assert.ok(Array.isArray(server.allowedHosts));
  assert.ok(Array.isArray(server.filesystemRead));
  assert.ok(Array.isArray(server.filesystemWrite));
  assert.ok(Array.isArray(server.credentialScopes));
  assert.equal(server.filesystemRead.some((path) => path.includes(".env")), false);
  assert.equal(server.filesystemWrite.some((path) => path.includes(".env")), false);
  if (server.enabled) assert.equal(server.approved, true);
}

process.stdout.write("MCP approval manifest: PASS\n");
