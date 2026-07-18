import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const ROOT_KEYS = new Set([
  "schemaVersion", "profileId", "status", "reviewedAt", "ownerRef", "repository", "applications",
  "settings", "collaboration", "ci", "artifacts", "deployments", "security", "decisions", "extensions",
]);
const STAGES = ["local", "ci", "production"];

function scalar(value) {
  return JSON.stringify(value);
}

function emit(value, indent, lines) {
  for (const key of Object.keys(value)) {
    const item = value[key];
    if (item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length > 0) {
      lines.push(`${" ".repeat(indent)}${key}:`);
      emit(item, indent + 2, lines);
    } else {
      lines.push(`${" ".repeat(indent)}${key}: ${scalar(item)}`);
    }
  }
}

export function serializeDevelopmentProfile(profile) {
  const lines = [];
  emit(profile, 0, lines);
  return `${lines.join("\n")}\n`;
}

export function parseDevelopmentProfileYaml(source) {
  if (source.includes("\t") || source.includes("\r")) throw new Error("PROFILE_YAML_FORMAT: tabs and CR are forbidden");
  const root = {};
  const stack = [{ indent: -2, value: root }];
  for (const [index, line] of source.split("\n").entries()) {
    if (line === "" && index === source.split("\n").length - 1) continue;
    const match = /^( *)([A-Za-z][A-Za-z0-9.-]*):(?: (.+))?$/u.exec(line);
    if (!match || match[1].length % 2) throw new Error(`PROFILE_YAML_FORMAT: invalid line ${index + 1}`);
    const indent = match[1].length;
    while (stack.at(-1).indent >= indent) stack.pop();
    if (stack.at(-1).indent !== indent - 2) throw new Error(`PROFILE_YAML_FORMAT: invalid indentation at line ${index + 1}`);
    const parent = stack.at(-1).value;
    const key = match[2];
    if (Object.hasOwn(parent, key)) throw new Error(`PROFILE_YAML_DUPLICATE_KEY: ${key}`);
    if (match[3] === undefined) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      try {
        parent[key] = JSON.parse(match[3]);
      } catch {
        throw new Error(`PROFILE_YAML_SCALAR: line ${index + 1} must use a JSON scalar or collection`);
      }
    }
  }
  const canonical = serializeDevelopmentProfile(root);
  if (canonical !== source) {
    const offset = [...canonical].findIndex((character, index) => character !== source[index]);
    throw new Error(`PROFILE_YAML_NON_CANONICAL: byte ${offset}`);
  }
  return root;
}

export function safeProfilePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.split(/[\\/]/u).includes("..")
    && !value.split(/[\\/]/u).some((part) => part.startsWith(".env"));
}

function add(blockers, code, path, message) {
  blockers.push({ code, path, message });
}

function checkPath(blockers, value, path) {
  if (!safeProfilePath(value)) add(blockers, "PROFILE_UNSAFE_PATH", path, "path must be repository-relative and must not reference .env*");
}

function inspectSecrets(value, path, blockers) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (/(secret|token|password|connectionstring|credentialvalue)/iu.test(key)) {
      add(blockers, "PROFILE_SECRET_FIELD", childPath, "secret values are forbidden; use a reference ID");
    }
    inspectSecrets(child, childPath, blockers);
  }
}

function requiredStructure(profile, blockers) {
  for (const key of ROOT_KEYS) if (!Object.hasOwn(profile, key)) add(blockers, "PROFILE_REQUIRED_FIELD", key, "required field is missing");
  for (const key of Object.keys(profile)) if (!ROOT_KEYS.has(key)) add(blockers, "PROFILE_UNKNOWN_FIELD", key, "unknown root field");
  if (profile.schemaVersion !== 1) add(blockers, "PROFILE_SCHEMA_VERSION", "schemaVersion", "only schemaVersion 1 is supported");
  if (!["draft", "blocked", "approved", "superseded"].includes(profile.status)) add(blockers, "PROFILE_STATUS", "status", "invalid profile status");
  if (!Array.isArray(profile.applications) || profile.applications.length === 0) add(blockers, "PROFILE_APPLICATION_REQUIRED", "applications", "at least one application is required");
  if (!Array.isArray(profile.decisions)) add(blockers, "PROFILE_DECISIONS_TYPE", "decisions", "decisions must be an array");
  const settings = profile.settings;
  for (const category of ["teamRequired", "projectRequired", "personalChoice", "reviewRequired", "prohibited"]) {
    if (!Array.isArray(settings?.[category])) add(blockers, "PROFILE_SETTINGS_CATEGORY", `settings.${category}`, "settings category must be an array");
  }
  if (!profile.extensions || Array.isArray(profile.extensions) || typeof profile.extensions !== "object") {
    add(blockers, "PROFILE_EXTENSIONS_TYPE", "extensions", "extensions must be an object");
  } else {
    for (const key of Object.keys(profile.extensions)) {
      if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/u.test(key)) add(blockers, "PROFILE_EXTENSION_NAMESPACE", `extensions.${key}`, "extension key must be namespaced");
    }
  }
}

function semantic(profile, blockers, now) {
  const ids = new Set();
  const roots = new Set();
  const files = new Set();
  const settingOwners = new Map();
  for (const category of ["teamRequired", "projectRequired", "personalChoice", "reviewRequired", "prohibited"]) {
    const values = profile.settings?.[category] ?? [];
    if (new Set(values).size !== values.length) add(blockers, "PROFILE_SETTING_DUPLICATE", `settings.${category}`, "setting references must be unique");
    for (const value of values) {
      if (typeof value !== "string" || value.length === 0) {
        add(blockers, "PROFILE_SETTING_REFERENCE", `settings.${category}`, "setting reference must be non-empty");
      } else if (settingOwners.has(value)) {
        add(blockers, "PROFILE_SETTING_BOUNDARY_CONFLICT", `settings.${category}`, `${value} is also classified as ${settingOwners.get(value)}`);
      } else {
        settingOwners.set(value, category);
      }
    }
  }
  for (const required of ["policy/engineering", "policy/security", "gate/test", "gate/security"]) {
    if (!profile.settings?.teamRequired?.includes(required)) add(blockers, "PROFILE_TEAM_BASELINE_MISSING", "settings.teamRequired", `${required} is mandatory`);
  }
  for (const prohibited of ["global/git-write", "global/ai-config-write", "security/gate-disable", "unreviewed/network-install"]) {
    if (!profile.settings?.prohibited?.includes(prohibited)) add(blockers, "PROFILE_PROHIBITION_MISSING", "settings.prohibited", `${prohibited} is mandatory`);
  }
  for (const [index, application] of (profile.applications ?? []).entries()) {
    const base = `applications[${index}]`;
    if (!application?.id || ids.has(application.id)) add(blockers, "PROFILE_APPLICATION_ID", `${base}.id`, "application ID is missing or duplicated");
    ids.add(application?.id);
    for (const field of ["root", "manifest", "lockfile"]) {
      checkPath(blockers, application?.[field], `${base}.${field}`);
      if (field !== "root" && files.has(application?.[field])) add(blockers, "PROFILE_FILE_DUPLICATE", `${base}.${field}`, "manifest or lockfile is duplicated");
      if (field !== "root") files.add(application?.[field]);
    }
    if (roots.has(application?.root)) add(blockers, "PROFILE_APPLICATION_ROOT_DUPLICATE", `${base}.root`, "application root is duplicated");
    roots.add(application?.root);
    for (const tool of ["runtime", "framework"]) {
      const version = application?.[tool]?.version;
      if (typeof version !== "string" || !/^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][A-Za-z0-9.-]+)?$/u.test(version)) {
        add(blockers, "PROFILE_VERSION_NOT_EXACT", `${base}.${tool}.version`, "runtime and framework versions must be exact");
      }
    }
    for (const [name, command] of Object.entries(application?.commands ?? {})) {
      const commandPath = `${base}.commands.${name}`;
      checkPath(blockers, command?.cwd, `${commandPath}.cwd`);
      if (typeof command?.executable !== "string" || !/^[A-Za-z0-9._+-]+$/u.test(command.executable)) {
        add(blockers, "PROFILE_COMMAND_EXECUTABLE", `${commandPath}.executable`, "shell strings and paths are forbidden");
      }
      if (!Array.isArray(command?.argv) || command.argv.some((arg) => typeof arg !== "string")) add(blockers, "PROFILE_COMMAND_ARGV", `${commandPath}.argv`, "argv must be a string array");
      for (const [artifactIndex, artifact] of (command?.expectedArtifacts ?? []).entries()) checkPath(blockers, artifact, `${commandPath}.expectedArtifacts[${artifactIndex}]`);
    }
  }
  for (const [index, deployment] of (profile.deployments ?? []).entries()) {
    if (deployment.configPath !== null) checkPath(blockers, deployment.configPath, `deployments[${index}].configPath`);
    if (deployment.rollbackEvidenceRef !== null) checkPath(blockers, deployment.rollbackEvidenceRef, `deployments[${index}].rollbackEvidenceRef`);
  }
  for (const [index, decision] of (profile.decisions ?? []).entries()) {
    const base = `decisions[${index}]`;
    if (!STAGES.includes(decision?.stage)) add(blockers, "PROFILE_DECISION_STAGE", `${base}.stage`, "invalid readiness stage");
    if (decision?.evidenceRef !== null) checkPath(blockers, decision.evidenceRef, `${base}.evidenceRef`);
    if (decision?.status === "approved") {
      if (!decision.ownerRef || !decision.evidenceRef || !decision.reviewedAt) add(blockers, "PROFILE_FALSE_APPROVAL", base, "approved decision requires owner, evidence and review date");
      if (decision.expiresAt && Date.parse(decision.expiresAt) <= now.getTime()) add(blockers, "PROFILE_APPROVAL_EXPIRED", base, "approval has expired");
    }
  }
  if (profile.status === "superseded") add(blockers, "PROFILE_SUPERSEDED", "status", "superseded profile cannot authorize new work");
  inspectSecrets(profile, "", blockers);
}

function repository(profile, repositoryRoot, blockers) {
  const canonicalRoot = realpathSync(repositoryRoot);
  for (const [index, application] of (profile.applications ?? []).entries()) {
    for (const field of ["root", "manifest", "lockfile"]) {
      const value = application?.[field];
      if (!safeProfilePath(value)) continue;
      const target = resolve(repositoryRoot, value);
      if (!existsSync(target)) {
        add(blockers, "PROFILE_REPOSITORY_MISSING", `applications[${index}].${field}`, `${value} is missing`);
        continue;
      }
      const real = realpathSync(target);
      if (real !== canonicalRoot && !real.startsWith(`${canonicalRoot}${sep}`)) {
        add(blockers, "PROFILE_REPOSITORY_ESCAPE", `applications[${index}].${field}`, `${value} resolves outside repository`);
      }
      if (field === "root" && !lstatSync(target).isDirectory()) add(blockers, "PROFILE_ROOT_TYPE", `applications[${index}].root`, "application root must be a directory");
      if (field !== "root" && !lstatSync(target).isFile()) add(blockers, "PROFILE_FILE_TYPE", `applications[${index}].${field}`, "manifest and lockfile must be files");
    }
  }
}

export function validateDevelopmentProfile(profile, options = {}) {
  const mode = options.mode ?? "semantic";
  const blockers = [];
  requiredStructure(profile, blockers);
  if (mode !== "schema") semantic(profile, blockers, options.now ?? new Date());
  if (mode === "repository" || mode === "readiness") {
    if (!options.repositoryRoot) add(blockers, "PROFILE_REPOSITORY_REQUIRED", "repositoryRoot", "repository root is required");
    else repository(profile, resolve(options.repositoryRoot), blockers);
  }
  if (mode === "readiness") {
    const stage = options.stage;
    if (!STAGES.includes(stage)) add(blockers, "PROFILE_READINESS_STAGE", "stage", "stage must be local, ci or production");
    const required = (profile.decisions ?? []).filter((decision) => STAGES.indexOf(decision.stage) <= STAGES.indexOf(stage));
    for (const decision of required) {
      if (!["approved", "not-applicable"].includes(decision.status)) add(blockers, "PROFILE_READINESS_BLOCKED", `decisions.${decision.id}`, decision.blocker || "decision is unresolved");
    }
    if (profile.status !== "approved") add(blockers, "PROFILE_READINESS_STATUS", "status", "profile must be approved");
    if (stage === "production") add(blockers, "PROFILE_PRODUCTION_SEPARATE_GATE", "production", "profile validation never grants Production approval");
  }
  return {
    schemaVersion: 1,
    mode,
    stage: options.stage ?? null,
    valid: blockers.length === 0,
    ready: mode === "readiness" ? blockers.length === 0 : null,
    readOnly: true,
    externalActions: {
      providerWrite: "NOT_RUN",
      dependencyInstall: "NOT_RUN",
      databaseMigration: "NOT_RUN",
      productionDeploy: "NOT_RUN"
    },
    blockers: blockers.sort((a, b) => `${a.code}:${a.path}`.localeCompare(`${b.code}:${b.path}`)),
  };
}

export function loadDevelopmentProfile(path) {
  return parseDevelopmentProfileYaml(readFileSync(path, "utf8"));
}
