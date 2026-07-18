# Dependency Graph

## Most Imported Files (change these carefully)

- `scripts/fullstack-materializer.mjs` — imported by **4** files
- `scripts/development-profile.mjs` — imported by **3** files
- `scripts/skill-distribution.mjs` — imported by **3** files
- `scripts/stack-profile-fixtures.mjs` — imported by **3** files
- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/release-adoption-surfaces.mjs` — imported by **2** files
- `scripts/capability-suite.mjs` — imported by **2** files
- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/fastapi-contract-adapter.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/release-adoption.mjs` — imported by **2** files
- `scripts/adapter-parity.mjs` — imported by **2** files
- `scripts/provider-profile-adapters.mjs` — imported by **2** files
- `scripts/stack-quality-adapters.mjs` — imported by **1** files
- `scripts/upgrade-core.mjs` — imported by **1** files
- `scripts/validate-delivery-evidence.mjs` — imported by **1** files
- `scripts/validate-downstream-feedback-triage.mjs` — imported by **1** files
- `scripts/validate-fullstack-locale.mjs` — imported by **1** files
- `scripts/validate-policy-evidence.mjs` — imported by **1** files
- `scripts/validate-production-readiness.mjs` — imported by **1** files

## Import Map (who imports what)

- `scripts/fullstack-materializer.mjs` ← `scripts/materialize-fullstack.mjs`, `scripts/release-adoption.mjs`, `scripts/skill-distribution.mjs`, `scripts/stack-profile-fixtures.mjs`
- `scripts/development-profile.mjs` ← `scripts/materialize-development-profile.mjs`, `scripts/test-development-profile-materializer.mjs`, `scripts/validate-development-environment-profile.mjs`
- `scripts/skill-distribution.mjs` ← `scripts/materialize-skill-distribution.mjs`, `scripts/release-adoption.mjs`, `scripts/test-skill-distribution.mjs`
- `scripts/stack-profile-fixtures.mjs` ← `scripts/materialize-stack-profile-fixture.mjs`, `scripts/release-adoption.mjs`, `scripts/test-stack-profile-fixtures.mjs`
- `scripts/upstream-lock.mjs` ← `scripts/test-downstream-validator.mjs`, `scripts/validate-core-upgrade-record.mjs`, `scripts/validate-upstream-lock.mjs`
- `scripts/release-adoption-surfaces.mjs` ← `scripts/adopt-release.mjs`, `scripts/test-release-adoption.mjs`
- `scripts/capability-suite.mjs` ← `scripts/aggregate-capability-results.mjs`, `scripts/run-capability-task.mjs`
- `scripts/pilot-results.mjs` ← `scripts/aggregate-pilot-results.mjs`, `scripts/validate-pilot-result.mjs`
- `scripts/fastapi-contract-adapter.mjs` ← `scripts/evaluate-fastapi-contract.mjs`, `scripts/test-fastapi-contract-adapter.mjs`
- `scripts/application-inventory.mjs` ← `scripts/preview-applications.mjs`, `scripts/validate-downstream.mjs`
