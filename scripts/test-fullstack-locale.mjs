#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateFullstackLocale } from "./validate-fullstack-locale.mjs";

const valid = JSON.parse(readFileSync("evals/fixtures/fullstack-locale/valid.json", "utf8"));
const evaluate = (document) => validateFullstackLocale(document);
assert.deepEqual(evaluate(valid), { errors: [], valid: true, humanLocaleReviewRequired: true });

const frontendOnly = structuredClone(valid);
frontendOnly.adapters = frontendOnly.adapters.filter((adapter) => adapter.layer === "frontend");
assert.match(evaluate(frontendOnly).errors.join("\n"), /adapters must contain frontend, bff and backend/);

const missingBffLocale = structuredClone(valid);
missingBffLocale.adapters[1].outputs.pop();
assert.match(evaluate(missingBffLocale).errors.join("\n"), /bff outputs must cover every supported locale/);

const backendRawMessage = structuredClone(valid);
backendRawMessage.adapters[2].outputs[0].rawBackendMessageExposed = true;
assert.match(evaluate(backendRawMessage).errors.join("\n"), /must not expose raw backend messages/);

const unstableCode = structuredClone(valid);
unstableCode.adapters[2].outputs[0].messages[0].code = "BACKEND_ACCOUNT_MISSING";
assert.match(evaluate(unstableCode).errors.join("\n"), /message code set differs across stack/);

const rawDiagnostic = structuredClone(valid);
rawDiagnostic.adapters[2].outputs[0].messages[0].userMessage =
  rawDiagnostic.adapters[2].outputs[0].messages[0].internalDiagnostic;
assert.match(evaluate(rawDiagnostic).errors.join("\n"), /exposes internal diagnostic as user message/);

const htmlLanguageDrift = structuredClone(valid);
htmlLanguageDrift.adapters[0].outputs[0].htmlLang = "en-US";
assert.match(evaluate(htmlLanguageDrift).errors.join("\n"), /htmlLang must match locale/);

const formattingDrift = structuredClone(valid);
formattingDrift.adapters[1].outputs[0].formatting.timezone = "UTC";
assert.match(evaluate(formattingDrift).errors.join("\n"), /timezone differs from profile/);

const missingAccessibility = structuredClone(valid);
missingAccessibility.adapters[0].outputs[0].accessibilityLabels = [];
assert.match(evaluate(missingAccessibility).errors.join("\n"), /accessibilityLabels is required/);

process.stdout.write("REQ-052 frontend, BFF and backend locale contract Eval: PASS\n");
