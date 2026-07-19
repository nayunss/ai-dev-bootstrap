# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**30 library files** across 3 modules

## Scripts (26 files)

- `scripts/upstream-lock.mjs` — sha256, safeRelativePath, targetPath, canonicalContentHash, validateUpstreamLock, serializeUpstreamLock, …
- `scripts/capability-suite.mjs` — hashFixture, validateCapabilityTask, runCapabilityTask, aggregateCapabilityResults, loadTask
- `scripts/development-profile.mjs` — serializeDevelopmentProfile, parseDevelopmentProfileYaml, safeProfilePath, validateDevelopmentProfile, loadDevelopmentProfile
- `scripts/fullstack-materializer.mjs` — sha256, validateFullStackProfile, applyFullStackTransaction, runFullStackMaterializer, readProfile
- `scripts/pilot-results.mjs` — hashJson, validatePilotCampaign, validatePilotResult, aggregatePilotResults
- `scripts/stack-quality-adapters.mjs` — validateQualityProfile, runQualityProfile, previewQualityProfile, readQualityProfile
- `scripts/release-adoption.mjs` — sha256, validateReleaseAdoptionManifest, runReleaseAdoption
- `scripts/skill-distribution.mjs` — sha256, validateSkillDistribution, runSkillDistribution
- `scripts/validate-repository-state.mjs` — validateRepositoryState, captureTrackedState, compareCheckOnlyState
- `scripts/adapter-parity.mjs` — validateAdapterParity, readParityManifest
- `scripts/application-inventory.mjs` — discoverApplications, readDeclaredInventory
- `scripts/evaluate-skill-evolution.mjs` — sha256, evaluateSkillEvolution
- `scripts/fastapi-contract-adapter.mjs` — evaluateFastApiContract, readJson
- `scripts/materialize-development-profile.mjs` — planDevelopmentProfileMaterialization, applyDevelopmentProfileMaterialization
- `scripts/release-adoption-surfaces.mjs` — runCliAdoption, runGuiAdoption
- `scripts/stack-profile-fixtures.mjs` — validateStackProfile, runStackProfileFixture
- `scripts/validate-requirement-traceability.mjs` — validateTraceability, requiresManifestChange
- `scripts/provider-profile-adapters.mjs` — validateProviderProfile
- `scripts/upgrade-core.mjs` — applyFileTransaction
- `scripts/validate-delivery-evidence.mjs` — validateDeliveryEvidence
- `scripts/validate-downstream-feedback-triage.mjs` — validateDownstreamFeedbackTriage
- `scripts/validate-fullstack-locale.mjs` — validateFullstackLocale
- `scripts/validate-policy-evidence.mjs` — validatePolicyEvidence
- `scripts/validate-production-readiness.mjs` — validateProductionReadiness
- `scripts/validate-requirement-handoff-tasks.mjs` — validateRequirementHandoffTasks
- _…and 1 more files_

## Desktop (2 files)

- `desktop/ipc-contract.mjs` — validateSelectedRoot, validateDesktopRequest, cancelledAdoptionResult, summarizeAdoptionResult
- `desktop/session.mjs` — DesktopAdoptionSession

## Evals (2 files)

- `evals/fixtures/stack-quality/javascript/source.js` — greet
- `evals/fixtures/stack-quality/python/app.py` — greet

---
_Back to [overview.md](./overview.md)_