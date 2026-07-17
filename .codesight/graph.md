# Dependency Graph

## Most Imported Files (change these carefully)

- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/upstream-lock.mjs` — imported by **2** files
- `scripts/validate-production-readiness.mjs` — imported by **1** files
- `scripts/validate-skill-evolution-trial.mjs` — imported by **1** files
- `scripts/evaluate-skill-evolution.mjs` — imported by **1** files

## Import Map (who imports what)

- `scripts/pilot-results.mjs` ← `scripts/aggregate-pilot-results.mjs`, `scripts/validate-pilot-result.mjs`
- `scripts/application-inventory.mjs` ← `scripts/preview-applications.mjs`, `scripts/validate-downstream.mjs`
- `scripts/upstream-lock.mjs` ← `scripts/test-downstream-validator.mjs`, `scripts/validate-upstream-lock.mjs`
- `scripts/validate-production-readiness.mjs` ← `scripts/test-production-readiness.mjs`
- `scripts/validate-skill-evolution-trial.mjs` ← `scripts/test-skill-evolution-trial.mjs`
- `scripts/evaluate-skill-evolution.mjs` ← `scripts/test-skill-evolution.mjs`
