import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { applyFullStackTransaction } from "./fullstack-materializer.mjs";

const LOCK = ".ai/manifests/skills.lock.json";
const ROLLBACK = ".ai/manifests/skills.rollback.json";
const ADAPTERS = new Set(["codex", "claude-code", "github-copilot"]);

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeRelative(value, label) {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\0")) {
    throw new Error(`${label} must be a safe relative path`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized === "." || normalized.split("/").some((part) => !part || part === ".." || part.startsWith(".env"))) {
    throw new Error(`${label} must not escape or reference .env*`);
  }
  return normalized;
}

function confined(root, relativePath, label) {
  const path = resolve(root, safeRelative(relativePath, label));
  const rel = relative(root, path);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes root`);
  return path;
}

function packageHash(files) {
  return sha256(files.map((file) => `${file.path}\0${file.sha256}\n`).join(""));
}

function adapterHash(adapter) {
  return sha256(`${adapter.id}|${adapter.version}|${adapter.canonicalRoot}|${adapter.targetRoot}`);
}

function validateSkillShape(skill, type, ids, errors) {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(skill?.id ?? "") || ids.has(skill.id)) errors.push(`invalid or duplicate skill id: ${skill?.id ?? "unknown"}`);
  ids.add(skill?.id);
  if (!/^\d+\.\d+\.\d+$/u.test(skill?.version ?? "")) errors.push(`invalid skill version: ${skill?.id ?? "unknown"}`);
  if (!["markdown-only", "project-script"].includes(skill?.risk)) errors.push(`invalid skill risk: ${skill?.id ?? "unknown"}`);
  if (!Array.isArray(skill?.files) || !skill.files.some((file) => file.path === "SKILL.md")) errors.push(`${skill?.id ?? "unknown"} must contain SKILL.md`);
  if (type === "core" && (skill?.dependencies ?? []).length > 0) errors.push(`core skill dependencies must remain empty: ${skill.id}`);
  if (skill?.source?.includes("private") || skill?.source?.includes("organization")) errors.push(`public bundle contains private source: ${skill.id}`);
}

export function validateSkillDistribution(manifest, sourceValue) {
  const sourceRoot = resolve(sourceValue);
  const errors = [];
  if (manifest?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^\d+\.\d+\.\d+$/u.test(manifest?.release?.version ?? "")) errors.push("release.version must be exact semver");
  if (manifest?.release?.requiredCoreVersion !== manifest?.release?.version) errors.push("requiredCoreVersion must match release version");
  const core = Array.isArray(manifest?.core) ? manifest.core : [];
  const optional = Array.isArray(manifest?.optional) ? manifest.optional : [];
  if (core.length === 0) errors.push("at least one core skill is required");
  const ids = new Set();
  for (const skill of core) validateSkillShape(skill, "core", ids, errors);
  for (const skill of optional) validateSkillShape(skill, "optional", ids, errors);
  const skills = [...core, ...optional];
  const byId = new Map(skills.map((skill) => [skill.id, skill]));

  for (const skill of skills) {
    const verifiedFiles = [];
    for (const file of skill.files ?? []) {
      try {
        const sourcePath = confined(sourceRoot, `${safeRelative(skill.source, "skill.source")}/${safeRelative(file.path, "skill file")}`, "skill source");
        if (!existsSync(sourcePath)) {
          errors.push(`missing skill source: ${skill.id}/${file.path}`);
          continue;
        }
        const bytes = readFileSync(sourcePath);
        if (sha256(bytes) !== file.sha256) errors.push(`skill file hash drift: ${skill.id}/${file.path}`);
        if (file.path === "SKILL.md") {
          const skillDocument = bytes.toString("utf8");
          const frontmatter = skillDocument.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? "";
          const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
          const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim();
          if (name !== skill.id || !description) errors.push(`invalid SKILL.md frontmatter: ${skill.id}`);
        }
        if (bytes.includes(Buffer.from("internal.example")) || bytes.includes(Buffer.from("PRIVATE ORGANIZATION"))) {
          errors.push(`public bundle leaks private reference: ${skill.id}/${file.path}`);
        }
        verifiedFiles.push(file);
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (verifiedFiles.length === (skill.files ?? []).length && packageHash(verifiedFiles) !== skill.packageSha256) {
      errors.push(`skill package hash drift: ${skill.id}`);
    }
    for (const dependency of skill.dependencies ?? []) {
      const target = byId.get(dependency.id);
      if (!target || target.version !== dependency.version) errors.push(`incompatible dependency: ${skill.id} -> ${dependency.id}@${dependency.version}`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(`skill dependency cycle: ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency.id);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);

  const adapters = Array.isArray(manifest?.toolAdapters) ? manifest.toolAdapters : [];
  if (adapters.length !== 3 || new Set(adapters.map((adapter) => adapter.id)).size !== 3) errors.push("exactly three unique tool adapters are required");
  for (const adapter of adapters) {
    if (!ADAPTERS.has(adapter?.id)) errors.push(`unsupported tool adapter: ${adapter?.id ?? "unknown"}`);
    if (adapter?.canonicalRoot !== ".ai/skills") errors.push(`invalid canonical skill root: ${adapter?.id ?? "unknown"}`);
    try {
      safeRelative(adapter?.targetRoot, "adapter.targetRoot");
    } catch (error) {
      errors.push(error.message);
    }
    if (adapterHash(adapter) !== adapter?.sha256) errors.push(`tool adapter hash drift: ${adapter?.id ?? "unknown"}`);
  }
  for (const plugin of manifest?.reviewedPlugins ?? []) {
    if (plugin?.catalogState !== "reviewed-catalog-only" || plugin?.installApproved !== false) {
      errors.push(`plugin catalog must remain non-executable: ${plugin?.id ?? "unknown"}`);
    }
  }
  return { valid: errors.length === 0, errors, skills, byId };
}

function resolveSelection(manifest, validation, options, errors) {
  const selected = new Set(manifest.core.map((skill) => skill.id));
  for (const id of options.optional ?? []) {
    if (!manifest.optional.some((skill) => skill.id === id)) errors.push(`unknown optional skill: ${id}`);
    else selected.add(id);
  }
  const queue = [...selected];
  while (queue.length > 0) {
    const skill = validation.byId.get(queue.pop());
    for (const dependency of skill?.dependencies ?? []) {
      if (!selected.has(dependency.id)) {
        selected.add(dependency.id);
        queue.push(dependency.id);
      }
    }
  }
  const adapters = [...new Set(options.adapters ?? [])].sort();
  for (const id of adapters) if (!ADAPTERS.has(id)) errors.push(`unknown selected adapter: ${id}`);
  return { skillIds: [...selected].sort(), adapterIds: adapters };
}

function desiredFiles(manifest, validation, sourceRoot, selection) {
  const roots = [".ai/skills", ...manifest.toolAdapters.filter((adapter) => selection.adapterIds.includes(adapter.id)).map((adapter) => adapter.targetRoot)];
  const files = [];
  for (const id of selection.skillIds) {
    const skill = validation.byId.get(id);
    for (const file of skill.files) {
      const bytes = readFileSync(confined(sourceRoot, `${skill.source}/${file.path}`, "skill source"));
      for (const root of roots) files.push({
        path: `${root}/${skill.id}/${file.path}`,
        sha256: file.sha256,
        bytes,
        skillId: id,
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function readRecord(path, kind) {
  if (!existsSync(path)) throw new Error(`missing ${kind}`);
  const record = JSON.parse(readFileSync(path, "utf8"));
  const { recordSha256, ...payload } = record;
  if (record?.kind !== kind || recordSha256 !== sha256(JSON.stringify(payload))) throw new Error(`${kind} integrity drift`);
  return record;
}

function seal(payload) {
  return { ...payload, recordSha256: sha256(JSON.stringify(payload)) };
}

function filePlan(files, target, currentLock) {
  const owned = new Map((currentLock?.files ?? []).map((file) => [file.path, file]));
  return files.map((file) => {
    const targetPath = confined(target, file.path, "skill target");
    if (!existsSync(targetPath)) return { ...file, targetPath, action: "create", managed: true };
    const current = sha256(readFileSync(targetPath));
    if (current === file.sha256) return { ...file, targetPath, action: "preserve-identical", managed: owned.get(file.path)?.managed ?? false };
    if (owned.get(file.path)?.managed && current === owned.get(file.path).sha256) return { ...file, targetPath, action: "update-managed", managed: true };
    return { ...file, targetPath, action: "blocked-existing-different", managed: false };
  });
}

export function runSkillDistribution(mode, manifest, sourceValue, targetValue, options = {}) {
  const sourceRoot = resolve(sourceValue);
  const target = resolve(targetValue);
  const validation = validateSkillDistribution(manifest, sourceRoot);
  if (!validation.valid) return { status: "INVALID", errors: validation.errors, pluginExecution: "NOT_RUN" };
  const selectionErrors = [];
  const selection = resolveSelection(manifest, validation, options, selectionErrors);
  if (selectionErrors.length) return { status: "INVALID", errors: selectionErrors, pluginExecution: "NOT_RUN" };
  const lockPath = confined(target, LOCK, "skill lock");
  const rollbackPath = confined(target, ROLLBACK, "skill rollback");
  let currentLock = null;
  if (existsSync(lockPath)) {
    try {
      currentLock = readRecord(lockPath, "skill-distribution-lock");
    } catch (error) {
      return { status: "INVALID", errors: [error.message], pluginExecution: "NOT_RUN" };
    }
  }

  if (mode === "preview" || mode === "apply" || mode === "upgrade") {
    if (mode !== "upgrade" && currentLock) return { status: "BLOCKED", errors: ["skill lock already exists"], pluginExecution: "NOT_RUN" };
    if (mode === "upgrade" && !currentLock) return { status: "BLOCKED", errors: ["upgrade requires an installed skill lock"], pluginExecution: "NOT_RUN" };
    const files = desiredFiles(manifest, validation, sourceRoot, selection);
    const plan = filePlan(files, target, currentLock);
    const desiredPaths = new Set(files.map((file) => file.path));
    const removals = (currentLock?.files ?? []).filter((file) => !desiredPaths.has(file.path)).map((file) => {
      const targetPath = confined(target, file.path, "removed skill target");
      const current = existsSync(targetPath) ? sha256(readFileSync(targetPath)) : null;
      return { ...file, targetPath, action: file.managed && current === file.sha256 ? "remove-managed" : "preserve-removed-drifted" };
    });
    const summary = [...plan, ...removals].map(({ path, action, skillId }) => ({ path, action, skillId }));
    if (plan.some((file) => file.action === "blocked-existing-different")) {
      return { status: "BLOCKED", plan: summary, errors: ["existing skill target differs"], pluginExecution: "NOT_RUN" };
    }
    if (mode === "preview") return { status: "PREVIEW", plan: summary, selection, pluginExecution: "NOT_RUN" };
    if (options.approved !== true) return { status: "APPROVAL_REQUIRED", plan: summary, selection, pluginExecution: "NOT_RUN" };

    const lock = seal({
      schemaVersion: 1,
      kind: "skill-distribution-lock",
      releaseVersion: manifest.release.version,
      manifestSha256: sha256(canonical(manifest)),
      skillIds: selection.skillIds,
      adapterIds: selection.adapterIds,
      files: plan.map((file) => ({ path: file.path, sha256: file.sha256, managed: file.managed, skillId: file.skillId })),
      reviewedPluginIds: manifest.reviewedPlugins.map((plugin) => plugin.id).sort(),
      pluginExecution: "NOT_RUN",
    });
    const operations = [
      ...plan.filter((file) => ["create", "update-managed"].includes(file.action)).map((file) => ({ kind: "write", path: file.targetPath, bytes: file.bytes })),
      ...removals.filter((file) => file.action === "remove-managed").map((file) => ({ kind: "remove", path: file.targetPath })),
      { kind: "write", path: lockPath, bytes: Buffer.from(canonical(lock)) },
    ];
    if (mode === "upgrade") {
      const rollback = seal({
        schemaVersion: 1,
        kind: "skill-distribution-rollback",
        fromLock: currentLock,
        previousFiles: currentLock.files.filter((file) => file.managed && existsSync(confined(target, file.path, "previous skill target")))
          .map((file) => ({ path: file.path, bytesBase64: readFileSync(confined(target, file.path, "previous skill target")).toString("base64") })),
        toLockSha256: lock.recordSha256,
      });
      operations.push({ kind: "write", path: rollbackPath, bytes: Buffer.from(canonical(rollback)) });
    }
    try {
      applyFullStackTransaction(operations, options.io);
    } catch (error) {
      return { status: "FAIL", errors: [error.message], pluginExecution: "NOT_RUN" };
    }
    return { status: "PASS", plan: summary, selection, pluginExecution: "NOT_RUN" };
  }

  if (!currentLock) return { status: "INVALID", errors: ["installed skill lock is required"], pluginExecution: "NOT_RUN" };
  const drift = currentLock.files.filter((file) => {
    const path = confined(target, file.path, "locked skill target");
    return !existsSync(path) || sha256(readFileSync(path)) !== file.sha256;
  });
  if (mode === "validate") {
    if (currentLock.manifestSha256 !== sha256(canonical(manifest))) return { status: "INVALID", errors: ["manifest drift"], pluginExecution: "NOT_RUN" };
    return drift.length ? { status: "INVALID", errors: drift.map((file) => `target drift: ${file.path}`), pluginExecution: "NOT_RUN" } : { status: "PASS", pluginExecution: "NOT_RUN" };
  }
  if (mode === "rollback") {
    if (!existsSync(rollbackPath)) return { status: "INVALID", errors: ["missing skill-distribution-rollback"], pluginExecution: "NOT_RUN" };
    if (options.approved !== true) return { status: "APPROVAL_REQUIRED", pluginExecution: "NOT_RUN" };
    let rollback;
    try {
      rollback = readRecord(rollbackPath, "skill-distribution-rollback");
    } catch (error) {
      return { status: "INVALID", errors: [error.message], pluginExecution: "NOT_RUN" };
    }
    if (rollback.toLockSha256 !== currentLock.recordSha256 || drift.length) return { status: "BLOCKED", errors: ["upgrade target or rollback binding drift"], pluginExecution: "NOT_RUN" };
    const previous = new Map(rollback.previousFiles.map((file) => [file.path, Buffer.from(file.bytesBase64, "base64")]));
    const previousPaths = new Set(rollback.fromLock.files.map((file) => file.path));
    const operations = currentLock.files.filter((file) => file.managed && !previousPaths.has(file.path))
      .map((file) => ({ kind: "remove", path: confined(target, file.path, "rollback remove") }));
    for (const [path, bytes] of previous) operations.push({ kind: "write", path: confined(target, path, "rollback restore"), bytes });
    operations.push({ kind: "write", path: lockPath, bytes: Buffer.from(canonical(rollback.fromLock)) });
    operations.push({ kind: "remove", path: rollbackPath });
    try {
      applyFullStackTransaction(operations, options.io);
    } catch (error) {
      return { status: "FAIL", errors: [error.message], pluginExecution: "NOT_RUN" };
    }
    return { status: "PASS", pluginExecution: "NOT_RUN" };
  }
  if (mode !== "uninstall") return { status: "INVALID", errors: [`unsupported mode: ${mode}`], pluginExecution: "NOT_RUN" };
  if (options.approved !== true) return { status: "APPROVAL_REQUIRED", pluginExecution: "NOT_RUN" };
  const operations = currentLock.files.filter((file) => {
    const path = confined(target, file.path, "uninstall skill target");
    return file.managed && existsSync(path) && sha256(readFileSync(path)) === file.sha256;
  }).map((file) => ({ kind: "remove", path: confined(target, file.path, "uninstall skill target") }));
  operations.push({ kind: "remove", path: lockPath });
  if (existsSync(rollbackPath)) operations.push({ kind: "remove", path: rollbackPath });
  try {
    applyFullStackTransaction(operations, options.io);
  } catch (error) {
    return { status: "FAIL", errors: [error.message], pluginExecution: "NOT_RUN" };
  }
  return { status: "PASS", preservedDrifted: drift.map((file) => file.path), pluginExecution: "NOT_RUN" };
}
