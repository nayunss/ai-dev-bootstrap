#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetArgument = process.argv[2];
if (!targetArgument) {
  process.stderr.write("Usage: materialize-project-onboarding.mjs TARGET\n");
  process.exit(2);
}
const targetRoot = resolve(targetArgument);
if (!existsSync(targetRoot)) {
  process.stderr.write(`Target does not exist: ${targetRoot}\n`);
  process.exit(1);
}

const profiles = [
  {
    template: "production-readiness.json",
    destination: "docs/production-readiness.json",
    questions: [
      "REQ-040 legal/privacy owner, reviewer, due date and evidence reference?",
      "REQ-040 data category retention, disposal, legal hold, owner and review evidence?",
      "REQ-040 multi-instance topology, shared enforcement layer, instance count and bypass-test evidence?",
      "REQ-040 provider backup/restore boundary, RPO/RTO, integrity result and reviewer evidence?",
    ],
  },
  {
    template: "skill-evolution-trial.json",
    destination: "docs/skill-evolution-trial.json",
    questions: [
      "REQ-041 exact model, harness and adapter version for this project?",
      "REQ-041 trial count, token/cost/timeout limits, network mode and allowed hosts?",
      "REQ-041 held-out test owner, independent reviewer, release criteria and approval evidence?",
    ],
  },
  {
    template: "upstream-adoption.json",
    destination: "docs/upstream-adoption.json",
    questions: [
      "REQ-042 upstream release/tag, commit, archive checksum and manifest reference?",
      "REQ-042 target repository/profile and canonical lock migration versions?",
      "REQ-042 compatibility preview, rollback validation and human approval evidence?",
    ],
  },
];

process.stdout.write("Project onboarding/retrofit questions\n");
for (const profile of profiles) {
  const destination = join(targetRoot, profile.destination);
  if (existsSync(destination)) {
    process.stdout.write(`- preserve existing: ${profile.destination}\n`);
  } else {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(harnessRoot, "docs/templates", profile.template), destination);
    process.stdout.write(`- created blocked template: ${profile.destination}\n`);
  }
  for (const question of profile.questions) process.stdout.write(`  ? ${question}\n`);
}
process.stdout.write("Unanswered values remain TBD/pending and do not authorize Production, model calls or release adoption.\n");
