#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeDevelopmentProfile, validateDevelopmentProfile } from "./development-profile.mjs";

const DESTINATION = "docs/development-environment.profile.yaml";
const QUESTIONS = [
  ["project", "Which application roots, languages, exact runtime/framework versions, manifests and lockfiles apply?"],
  ["project", "Which DB, migration, retention and restore evidence references apply to each application?"],
  ["project", "Which Git collaboration, CI, artifact and deployment providers/policies apply?"],
  ["personal", "Which project-local AI adapters are selected? Unselected adapters remain absent."],
  ["review", "Do plugin, MCP, executable skill, hook, telemetry or network tools require review?"],
];

function ensureTarget(targetRoot) {
  if (!existsSync(targetRoot)) throw new Error(`PROFILE_TARGET_MISSING: ${targetRoot}`);
  return realpathSync(targetRoot);
}

function destinationPath(targetRoot) {
  const path = resolve(targetRoot, DESTINATION);
  if (!path.startsWith(`${targetRoot}${sep}`)) throw new Error("PROFILE_TARGET_ESCAPE");
  return path;
}

export function planDevelopmentProfileMaterialization(target, profile) {
  const targetRoot = ensureTarget(resolve(target));
  const destination = destinationPath(targetRoot);
  const mode = readdirSync(targetRoot).length === 0 ? "initial" : "retrofit";
  const validation = validateDevelopmentProfile(profile, { mode: "semantic" });
  if (!validation.valid) {
    return {
      schemaVersion: 1,
      action: "blocked",
      destination: DESTINATION,
      mode,
      changes: [],
      questions: QUESTIONS.map(([category, question]) => ({ category, question })),
      blockers: validation.blockers,
      externalActions: validation.externalActions,
    };
  }
  const content = serializeDevelopmentProfile(profile);
  const exists = existsSync(destination);
  let action = "create";
  const blockers = [];
  if (exists) {
    if (readFileSync(destination, "utf8") === content) action = "preserve";
    else {
      action = "blocked";
      blockers.push({
        code: "PROFILE_EXISTING_CONFLICT",
        path: DESTINATION,
        message: "existing canonical profile differs; automatic merge and overwrite are forbidden",
      });
    }
  }
  return {
    schemaVersion: 1,
    action,
    destination: DESTINATION,
    mode,
    changes: action === "create" ? [{ operation: "create", path: DESTINATION }] : [],
    questions: QUESTIONS.map(([category, question]) => ({ category, question })),
    blockers,
    externalActions: validation.externalActions,
    content,
  };
}

export function applyDevelopmentProfileMaterialization(target, profile) {
  const targetRoot = ensureTarget(resolve(target));
  const plan = planDevelopmentProfileMaterialization(targetRoot, profile);
  if (plan.action === "blocked") return plan;
  if (plan.action === "create") {
    const destination = destinationPath(targetRoot);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, plan.content, { encoding: "utf8", flag: "wx" });
  }
  return plan;
}

function main() {
  const [target, inputPath, ...flags] = process.argv.slice(2);
  const unknown = flags.filter((flag) => !["--approve", "--json"].includes(flag));
  const approval = flags.includes("--approve");
  const json = flags.includes("--json");
  if (!target || !inputPath || unknown.length > 0 || new Set(flags).size !== flags.length) {
    process.stderr.write("Usage: materialize-development-profile.mjs TARGET PROFILE.json [--approve] [--json]\n");
    process.exit(2);
  }
  let profile;
  try {
    profile = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
    const plan = approval
      ? applyDevelopmentProfileMaterialization(target, profile)
      : planDevelopmentProfileMaterialization(target, profile);
    const visible = { ...plan };
    delete visible.content;
    if (json) process.stdout.write(`${JSON.stringify(visible, null, 2)}\n`);
    else {
      process.stdout.write(`Development profile ${plan.mode}: ${plan.action.toUpperCase()}; destination=${plan.destination}\n`);
      for (const question of plan.questions) process.stdout.write(`? [${question.category}] ${question.question}\n`);
      for (const blocker of plan.blockers) process.stdout.write(`BLOCKED ${blocker.code}: ${blocker.message}\n`);
      if (!approval && plan.action === "create") process.stdout.write("Preview only. Re-run with --approve to create the canonical profile.\n");
    }
    if (plan.action === "blocked") process.exit(1);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
