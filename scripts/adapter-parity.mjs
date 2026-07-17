import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";

const REQUIRED_ADAPTERS = ["claude-code", "codex", "github-copilot"];
const REQUIRED_CONTRACTS = {
  engineering: ".ai/standards/engineering.md",
  security: ".ai/standards/security.md",
  roles: "docs/agents.md",
  persona: "docs/persona-and-role-guidelines.md",
  handoff: "HANDOFF.md",
  context: ".codesight/wiki/index.md",
  changeMode: ".ai/workflows/change-mode.md",
};
const SOURCE_FILES = {
  "claude-code": { entrypoint: "CLAUDE.md", hook: ".claude/settings.json" },
  codex: { entrypoint: "AGENTS.md", hook: ".codex/hooks.json" },
  "github-copilot": { entrypoint: ".github/copilot-instructions.md", hook: null },
};
const PERSONA_PATTERNS = [
  /20년\s*경력/u,
  /천재\s*(?:개발자|엔지니어)/u,
  /always\s+act\s+as/iu,
];

function safePath(root, value, label) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.split(/[\\/]/u).includes("..")) {
    throw new Error(`${label} must be a safe relative path`);
  }
  if (value.split(/[\\/]/u).some((part) => part.startsWith(".env"))) throw new Error(`${label} must not reference .env*`);
  const path = resolve(root, value);
  if (path !== root && !path.startsWith(`${root}${sep}`)) throw new Error(`${label} escapes root`);
  return path;
}

function read(path, label, errors) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    errors.push(`${label} is missing`);
    return "";
  }
}

function validateHook(content, adapter, errors) {
  let hooks;
  try {
    hooks = JSON.parse(content)?.hooks;
  } catch {
    errors.push(`${adapter} hook must be valid JSON`);
    return;
  }
  const session = hooks?.SessionStart?.[0]?.hooks?.[0];
  const pre = hooks?.PreToolUse?.[0]?.hooks?.[0];
  const post = hooks?.PostToolUse?.[0]?.hooks?.[0];
  if (session?.command !== "scripts/codesight-context" || JSON.stringify(session?.args) !== '["session"]') {
    errors.push(`${adapter} SessionStart outcome drift`);
  }
  if (pre?.command !== "node" || JSON.stringify(pre?.args) !== '["scripts/ai-security-hook.mjs","pre"]') {
    errors.push(`${adapter} PreToolUse permission outcome drift`);
  }
  if (post?.command !== "node" || JSON.stringify(post?.args) !== '["scripts/ai-security-hook.mjs","post"]') {
    errors.push(`${adapter} PostToolUse verification outcome drift`);
  }
}

function location(root, adapter, path, materialized) {
  return materialized ? safePath(root, path, `${adapter} target`) : safePath(root, join(adapter, "files", path), `${adapter} source`);
}

export function validateAdapterParity(manifest, options = {}) {
  const sourceRoot = resolve(options.sourceRoot ?? "adapters");
  const materializedRoot = options.materializedRoot ? resolve(options.materializedRoot) : null;
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (JSON.stringify(manifest?.requiredAdapters) !== JSON.stringify(REQUIRED_ADAPTERS)) {
    errors.push("requiredAdapters must contain the sorted supported adapter set");
  }
  if (JSON.stringify(manifest?.commonContracts) !== JSON.stringify(REQUIRED_CONTRACTS)) {
    errors.push("commonContracts drift");
  }
  const adapters = Array.isArray(manifest?.adapters) ? manifest.adapters : [];
  if (
    adapters.length !== REQUIRED_ADAPTERS.length
    || JSON.stringify(adapters.map((adapter) => adapter?.id).sort()) !== JSON.stringify(REQUIRED_ADAPTERS)
  ) errors.push("adapter entries must be complete and unique");

  for (const adapterId of REQUIRED_ADAPTERS) {
    const adapter = adapters.find((candidate) => candidate.id === adapterId);
    const definition = SOURCE_FILES[adapterId];
    if (!adapter) continue;
    if (adapter.entrypoint !== definition.entrypoint) errors.push(`${adapterId} entrypoint drift`);
    if (adapter.roleExecution !== "sequential-baseline") errors.push(`${adapterId} role execution must preserve sequential baseline`);
    if (adapter.permissionExpansion !== "forbidden") errors.push(`${adapterId} permission expansion must be forbidden`);
    const sourceEntry = read(location(sourceRoot, adapterId, definition.entrypoint, false), `${adapterId} source entrypoint`, errors);
    const entries = [{ label: `${adapterId} source`, content: sourceEntry }];
    if (materializedRoot) {
      entries.push({
        label: `${adapterId} materialized`,
        content: read(location(materializedRoot, adapterId, definition.entrypoint, true), `${adapterId} materialized entrypoint`, errors),
      });
    }
    for (const entry of entries) {
      const normalized = entry.content.replace(/\s+/gu, " ");
      for (const contract of Object.values(REQUIRED_CONTRACTS)) {
        if (!entry.content.includes(contract)) errors.push(`${entry.label} must reference ${contract}`);
      }
      if (!normalized.includes("확대하지 않는다")) errors.push(`${entry.label} must deny native permission expansion`);
      if (PERSONA_PATTERNS.some((pattern) => pattern.test(entry.content))) {
        errors.push(`${entry.label} contains a prohibited global persona`);
      }
    }

    if (definition.hook) {
      if (adapter.hookCoverage !== "session-pre-post" || adapter.fallbackCommands?.length !== 0) {
        errors.push(`${adapterId} hook coverage contract drift`);
      }
      validateHook(
        read(location(sourceRoot, adapterId, definition.hook, false), `${adapterId} source hook`, errors),
        `${adapterId} source`,
        errors,
      );
      if (materializedRoot) {
        validateHook(
          read(location(materializedRoot, adapterId, definition.hook, true), `${adapterId} materialized hook`, errors),
          `${adapterId} materialized`,
          errors,
        );
      }
    } else {
      const fallback = ["scripts/validate .", "scripts/security-check changed"];
      if (adapter.hookCoverage !== "none-use-common-fallback" || JSON.stringify(adapter.fallbackCommands) !== JSON.stringify(fallback)) {
        errors.push(`${adapterId} fallback contract drift`);
      }
      for (const command of fallback) {
        if (!sourceEntry.includes(command)) errors.push(`${adapterId} source must declare fallback ${command}`);
      }
    }
  }
  return {
    schemaVersion: 1,
    status: errors.length === 0 ? "PASS" : "FAIL",
    parityEligible: errors.length === 0,
    adapters: REQUIRED_ADAPTERS.map((id) => ({
      id,
      policy: errors.some((error) => error.startsWith(`${id} `) && error.includes("reference")) ? "FAIL" : "PASS",
      role: errors.some((error) => error.startsWith(`${id} `) && error.includes("role")) ? "FAIL" : "PASS",
      permission: errors.some((error) => error.startsWith(`${id} `) && (error.includes("permission") || error.includes("PreToolUse"))) ? "FAIL" : "PASS",
      enforcement: errors.some((error) => error.startsWith(`${id} `) && (error.includes("hook") || error.includes("fallback") || error.includes("outcome"))) ? "FAIL" : "PASS",
    })),
    errors,
  };
}

export function readParityManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
