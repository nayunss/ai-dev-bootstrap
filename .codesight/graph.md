# Dependency Graph

## Most Imported Files (change these carefully)

- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/capability-suite.mjs` — imported by **2** files
- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/fastapi-contract-adapter.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/adapter-parity.mjs` — imported by **2** files
- `scripts/fullstack-materializer.mjs` — imported by **1** files
- `scripts/stack-quality-adapters.mjs` — imported by **1** files
- `scripts/upgrade-core.mjs` — imported by **1** files
- `scripts/validate-production-readiness.mjs` — imported by **1** files
- `scripts/validate-requirement-traceability.mjs` — imported by **1** files
- `scripts/validate-skill-evolution-trial.mjs` — imported by **1** files
- `scripts/evaluate-skill-evolution.mjs` — imported by **1** files

## Import Map (who imports what)

- `scripts/upstream-lock.mjs` ← `scripts/test-downstream-validator.mjs`, `scripts/validate-core-upgrade-record.mjs`, `scripts/validate-upstream-lock.mjs`
- `scripts/capability-suite.mjs` ← `scripts/aggregate-capability-results.mjs`, `scripts/run-capability-task.mjs`
- `scripts/pilot-results.mjs` ← `scripts/aggregate-pilot-results.mjs`, `scripts/validate-pilot-result.mjs`
- `scripts/fastapi-contract-adapter.mjs` ← `scripts/evaluate-fastapi-contract.mjs`, `scripts/test-fastapi-contract-adapter.mjs`
- `scripts/application-inventory.mjs` ← `scripts/preview-applications.mjs`, `scripts/validate-downstream.mjs`
- `scripts/adapter-parity.mjs` ← `scripts/test-adapter-parity.mjs`, `scripts/validate-adapter-parity.mjs`
- `scripts/fullstack-materializer.mjs` ← `scripts/materialize-fullstack.mjs`
- `scripts/stack-quality-adapters.mjs` ← `scripts/run-stack-quality.mjs`
- `scripts/upgrade-core.mjs` ← `scripts/test-core-upgrade.mjs`
- `scripts/validate-production-readiness.mjs` ← `scripts/test-production-readiness.mjs`
