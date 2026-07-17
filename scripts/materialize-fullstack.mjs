#!/usr/bin/env node
import { resolve } from "node:path";
import { readProfile, runFullStackMaterializer } from "./fullstack-materializer.mjs";

const [mode, targetValue, profileValue, sourceValue, approval] = process.argv.slice(2);
if (!new Set(["preview", "apply", "validate", "rollback"]).has(mode) || !targetValue || !profileValue || !sourceValue) {
  process.stderr.write("Usage: materialize-fullstack.mjs <preview|apply|validate|rollback> TARGET PROFILE SOURCE [--approve]\n");
  process.exit(2);
}
try {
  const result = runFullStackMaterializer(
    mode,
    readProfile(resolve(profileValue)),
    resolve(sourceValue),
    resolve(targetValue),
    { approved: approval === "--approve" },
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "APPROVAL_REQUIRED") process.exit(2);
  if (!new Set(["PASS", "PREVIEW"]).has(result.status)) process.exit(1);
} catch (error) {
  process.stderr.write(`Full-stack materialization failed: ${error.message}\n`);
  process.exit(1);
}
