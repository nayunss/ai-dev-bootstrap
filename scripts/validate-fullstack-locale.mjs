#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAYERS = ["frontend", "bff", "backend"];
const LOCALE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/u;
const CODE = /^[A-Z][A-Z0-9_]+$/u;

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && !new Set(["TBD", "pending", "unknown"]).has(value);
}

function sameSet(left, right) {
  return [...new Set(left)].sort().join(",") === [...new Set(right)].sort().join(",");
}

export function validateFullstackLocale(document) {
  const errors = [];
  if (document?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  const profile = document?.profile;
  if (!LOCALE.test(profile?.defaultLocale ?? "")) errors.push("profile.defaultLocale is invalid");
  if (
    !Array.isArray(profile?.supportedLocales)
    || profile.supportedLocales.length === 0
    || new Set(profile.supportedLocales).size !== profile.supportedLocales.length
    || profile.supportedLocales.some((locale) => !LOCALE.test(locale))
  ) errors.push("profile.supportedLocales must contain unique valid locales");
  if (!profile?.supportedLocales?.includes(profile?.defaultLocale)) errors.push("defaultLocale must be supported");
  if (!text(profile?.timezone)) errors.push("profile.timezone is required");
  if (!/^[A-Z]{3}$/u.test(profile?.currency ?? "")) errors.push("profile.currency must be ISO 4217");
  if (!Array.isArray(document?.adapters) || document.adapters.length !== LAYERS.length) {
    return { errors: [...errors, "adapters must contain frontend, bff and backend"], valid: false, humanLocaleReviewRequired: true };
  }
  const adapterLayers = document.adapters.map((adapter) => adapter?.layer);
  if (!sameSet(adapterLayers, LAYERS) || adapterLayers.length !== new Set(adapterLayers).size) {
    errors.push("adapters must contain each required layer exactly once");
  }
  let canonicalCodes = null;
  for (const adapter of document.adapters) {
    const layer = adapter?.layer ?? "unknown";
    if (!text(adapter?.adapterId) || !text(adapter?.sourceReference)) errors.push(`${layer} adapter metadata is required`);
    if (!Array.isArray(adapter?.outputs)) {
      errors.push(`${layer}.outputs must be an array`);
      continue;
    }
    const outputLocales = adapter.outputs.map((output) => output?.locale);
    if (!sameSet(outputLocales, profile?.supportedLocales ?? []) || outputLocales.length !== new Set(outputLocales).size) {
      errors.push(`${layer} outputs must cover every supported locale exactly once`);
    }
    for (const output of adapter.outputs) {
      const locale = output?.locale ?? "unknown";
      const prefix = `${layer}.${locale}`;
      if (output?.documentLanguage !== locale) errors.push(`${prefix}.documentLanguage must match locale`);
      if (layer === "frontend" && output?.htmlLang !== locale) errors.push(`${prefix}.htmlLang must match locale`);
      if (layer !== "frontend" && output?.htmlLang !== null) errors.push(`${prefix}.htmlLang must be null outside frontend`);
      if (output?.rawBackendMessageExposed !== false) errors.push(`${prefix} must not expose raw backend messages`);
      const formatting = output?.formatting;
      if (formatting?.dateLocale !== locale || formatting?.numberLocale !== locale) {
        errors.push(`${prefix} date and number locale must match`);
      }
      if (formatting?.currency !== profile?.currency) errors.push(`${prefix} currency differs from profile`);
      if (formatting?.timezone !== profile?.timezone) errors.push(`${prefix} timezone differs from profile`);
      if (
        !Array.isArray(output?.accessibilityLabels)
        || output.accessibilityLabels.length === 0
        || output.accessibilityLabels.some((label) => !text(label))
      ) errors.push(`${prefix}.accessibilityLabels is required`);
      if (!Array.isArray(output?.messages) || output.messages.length === 0) {
        errors.push(`${prefix}.messages is required`);
        continue;
      }
      const codes = output.messages.map((message) => message?.code);
      if (new Set(codes).size !== codes.length || codes.some((code) => !CODE.test(code ?? ""))) {
        errors.push(`${prefix} message codes must be unique and stable`);
      }
      if (canonicalCodes === null) canonicalCodes = codes;
      else if (!sameSet(codes, canonicalCodes)) errors.push(`${prefix} message code set differs across stack`);
      for (const message of output.messages) {
        if (!text(message?.userMessage)) errors.push(`${prefix}.${message?.code}.userMessage is required`);
        if (message?.internalDiagnostic !== null && !text(message.internalDiagnostic)) {
          errors.push(`${prefix}.${message?.code}.internalDiagnostic is invalid`);
        }
        if (message?.internalDiagnostic !== null && message?.userMessage === message.internalDiagnostic) {
          errors.push(`${prefix}.${message.code} exposes internal diagnostic as user message`);
        }
      }
    }
  }
  return { errors, valid: errors.length === 0, humanLocaleReviewRequired: true };
}

function main() {
  const path = process.argv[2];
  const expectation = process.argv[3];
  if (!path || !new Set(["--expect-valid", "--expect-invalid"]).has(expectation)) {
    process.stderr.write("Usage: validate-fullstack-locale.mjs PROFILE (--expect-valid|--expect-invalid)\n");
    process.exit(2);
  }
  const result = validateFullstackLocale(JSON.parse(readFileSync(resolve(path), "utf8")));
  const matched = expectation === "--expect-valid" ? result.valid : !result.valid;
  if (!matched) {
    result.errors.forEach((error) => process.stderr.write(`FAIL: ${error}\n`));
    process.exit(1);
  }
  process.stdout.write(`Full-stack locale: ${result.valid ? "VALID" : "INVALID"}; human-review=REQUIRED\n`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
