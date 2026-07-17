#!/usr/bin/env node
import { resolve } from "node:path";
import { readParityManifest, validateAdapterParity } from "./adapter-parity.mjs";

const target = process.argv.find((argument) => argument.startsWith("--materialized-root="));
try {
  const result = validateAdapterParity(
    readParityManifest(resolve(".ai/manifests/adapter-parity.json")),
    {
      sourceRoot: resolve("adapters"),
      ...(target ? { materializedRoot: resolve(target.slice("--materialized-root=".length)) } : {}),
    },
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "PASS") process.exit(1);
} catch (error) {
  process.stderr.write(`Adapter parity validation failed: ${error.message}\n`);
  process.exit(1);
}
