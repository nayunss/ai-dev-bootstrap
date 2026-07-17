# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**15 library files** across 2 modules

## Scripts (13 files)

- `scripts/upstream-lock.mjs` — sha256, safeRelativePath, targetPath, canonicalContentHash, validateUpstreamLock, serializeUpstreamLock, …
- `scripts/capability-suite.mjs` — hashFixture, validateCapabilityTask, runCapabilityTask, aggregateCapabilityResults, loadTask
- `scripts/fullstack-materializer.mjs` — sha256, validateFullStackProfile, applyFullStackTransaction, runFullStackMaterializer, readProfile
- `scripts/pilot-results.mjs` — hashJson, validatePilotCampaign, validatePilotResult, aggregatePilotResults
- `scripts/stack-quality-adapters.mjs` — validateQualityProfile, runQualityProfile, previewQualityProfile, readQualityProfile
- `scripts/adapter-parity.mjs` — validateAdapterParity, readParityManifest
- `scripts/application-inventory.mjs` — discoverApplications, readDeclaredInventory
- `scripts/evaluate-skill-evolution.mjs` — sha256, evaluateSkillEvolution
- `scripts/fastapi-contract-adapter.mjs` — evaluateFastApiContract, readJson
- `scripts/validate-requirement-traceability.mjs` — validateTraceability, requiresManifestChange
- `scripts/upgrade-core.mjs` — applyFileTransaction
- `scripts/validate-production-readiness.mjs` — validateProductionReadiness
- `scripts/validate-skill-evolution-trial.mjs` — validateTrialPlan

## Evals (2 files)

- `evals/fixtures/stack-quality/javascript/source.js` — greet
- `evals/fixtures/stack-quality/python/app.py` — greet

---
_Back to [overview.md](./overview.md)_