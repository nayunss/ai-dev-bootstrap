# Dependency Graph

## Most Imported Files (change these carefully)

- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/upgrade-core.mjs` — imported by **1** files
- `scripts/validate-production-readiness.mjs` — imported by **1** files
- `scripts/validate-skill-evolution-trial.mjs` — imported by **1** files
- `scripts/evaluate-skill-evolution.mjs` — imported by **1** files

## Import Map (who imports what)

- `scripts/upstream-lock.mjs` ← `scripts/test-downstream-validator.mjs`, `scripts/validate-core-upgrade-record.mjs`, `scripts/validate-upstream-lock.mjs`
- `scripts/pilot-results.mjs` ← `scripts/aggregate-pilot-results.mjs`, `scripts/validate-pilot-result.mjs`
- `scripts/application-inventory.mjs` ← `scripts/preview-applications.mjs`, `scripts/validate-downstream.mjs`
- `scripts/upgrade-core.mjs` ← `scripts/test-core-upgrade.mjs`
- `scripts/validate-production-readiness.mjs` ← `scripts/test-production-readiness.mjs`
- `scripts/validate-skill-evolution-trial.mjs` ← `scripts/test-skill-evolution-trial.mjs`
- `scripts/evaluate-skill-evolution.mjs` ← `scripts/test-skill-evolution.mjs`
