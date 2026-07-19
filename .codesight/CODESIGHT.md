# common-ai-development-harness — AI Context Map

> **Stack:** raw-http | none | unknown | javascript

> 1 routes (1 inferred) | 1 models | 0 components | 32 lib files | 13 env vars | 6 middleware
> **Token savings:** this file is ~3,300 tokens. Without it, AI exploration would cost ~21,600 tokens. **Saves ~18,300 tokens per conversation.**
> **Last scanned:** normalized — Git diff is the freshness authority

---

# Routes

- `GET` `/api/demo/status` [auth, cache, payment] `[inferred]`

---

# Schema

### synthetic_items
- id: integer (pk)

---

# Libraries

- `evals/fixtures/stack-quality/javascript/source.js` — function greet: (name) => void
- `evals/fixtures/stack-quality/python/app.py` — function greet: (name) -> str
- `scripts/adapter-parity.mjs` — function validateAdapterParity: (manifest, options) => void, function readParityManifest: (path) => void
- `scripts/application-inventory.mjs` — function discoverApplications: (root) => void, function readDeclaredInventory: (root) => void
- `scripts/capability-suite.mjs`
  - function hashFixture: (path) => void
  - function validateCapabilityTask: (task, root) => void
  - function runCapabilityTask: (task, root) => void
  - function aggregateCapabilityResults: (results) => void
  - function loadTask: (path) => void
- `scripts/development-profile.mjs`
  - function serializeDevelopmentProfile: (profile) => void
  - function parseDevelopmentProfileYaml: (source) => void
  - function safeProfilePath: (value) => void
  - function validateDevelopmentProfile: (profile, options) => void
  - function loadDevelopmentProfile: (path) => void
- `scripts/evaluate-skill-evolution.mjs` — function sha256: (value) => void, function evaluateSkillEvolution: (record, options) => void
- `scripts/fastapi-contract-adapter.mjs` — function evaluateFastApiContract: ({...}, current, routes, profile }) => void, function readJson: (path) => void
- `scripts/fullstack-materializer.mjs`
  - function sha256: (value) => void
  - function validateFullStackProfile: (profile, sourceValue, targetValue) => void
  - function applyFullStackTransaction: (operations, io, mkdirSync, readFileSync, unlinkSync, writeFileSync, }) => void
  - function runFullStackMaterializer: (mode, profile, sourceValue, targetValue, options) => void
  - function readProfile: (path) => void
- `scripts/github-actions-adoption.mjs` — function runGitHubActionsAdoption: ({...}, release, source, target, expectedPlanSha256, stage, }) => void
- `scripts/github-app-portal-demo.mjs` — function createPortalDemoServer: () => void
- `scripts/github-app-portal.mjs`
  - function validatePortalConfiguration: (config) => void
  - function authorizeRepository: ({...}, repository, userAccess }) => void
  - function verifyWebhookDelivery: ({...}, signature, deliveryId, event, secret, replayGuard, }) => void
  - function redactPortalValue: (value, key) => void
  - function createPortalCoordinator: ({...}, provider, workspace, core, sessionTtlMs, resultRetentionMs, maximumSessions, }) => void
  - class AuthStateStore
  - _...2 more_
- `scripts/materialize-development-profile.mjs` — function planDevelopmentProfileMaterialization: (target, profile) => void, function applyDevelopmentProfileMaterialization: (target, profile) => void
- `scripts/pilot-results.mjs`
  - function hashJson: (value) => void
  - function validatePilotCampaign: (campaign) => void
  - function validatePilotResult: (result, campaign) => void
  - function aggregatePilotResults: (campaign, results) => void
- `scripts/provider-profile-adapters.mjs` — function validateProviderProfile: (profile) => void
- `scripts/release-adoption-surfaces.mjs` — function runCliAdoption: (mode, manifest, source, target, options) => void, function runWebAdoption: (mode, manifest, source, target, options) => void
- `scripts/release-adoption.mjs`
  - function sha256: (value) => void
  - function validateReleaseAdoptionManifest: (manifest, sourceValue) => void
  - function inspectReleaseAdoption: (targetValue) => void
  - function runReleaseAdoption: (mode, manifest, sourceValue, targetValue, options) => void
- `scripts/skill-distribution.mjs`
  - function sha256: (value) => void
  - function validateSkillDistribution: (manifest, sourceValue) => void
  - function runSkillDistribution: (mode, manifest, sourceValue, targetValue, options) => void
- `scripts/stack-profile-fixtures.mjs` — function validateStackProfile: (profile) => void, function runStackProfileFixture: (mode, profile, targetValue, options) => void
- `scripts/stack-quality-adapters.mjs`
  - function validateQualityProfile: (profile, targetValue) => void
  - function runQualityProfile: (profile, targetValue, options) => void
  - function previewQualityProfile: (profile, targetValue) => void
  - function readQualityProfile: (path) => void
- `scripts/upgrade-core.mjs` — function applyFileTransaction: (operations, io, mkdirSync, readFileSync, unlinkSync, writeFileSync, }) => void
- `scripts/upstream-lock.mjs`
  - function sha256: (value) => void
  - function safeRelativePath: (path) => void
  - function targetPath: (root, path) => void
  - function canonicalContentHash: (files) => void
  - function validateUpstreamLock: (lock) => void
  - function serializeUpstreamLock: (lock) => void
  - _...2 more_
- `scripts/validate-delivery-evidence.mjs` — function validateDeliveryEvidence: (document) => void
- `scripts/validate-downstream-feedback-triage.mjs` — function feedbackTraceabilityProjection: (traceability) => void, function validateDownstreamFeedbackTriage: (document, {...}, }) => void
- `scripts/validate-fullstack-locale.mjs` — function validateFullstackLocale: (document) => void
- `scripts/validate-policy-evidence.mjs` — function validatePolicyEvidence: (profile) => void
- `scripts/validate-production-readiness.mjs` — function validateProductionReadiness: (profile) => void
- `scripts/validate-repository-state.mjs`
  - function validateRepositoryState: (profile, root) => void
  - function captureTrackedState: (root, paths) => void
  - function compareCheckOnlyState: (before, after) => void
- `scripts/validate-requirement-handoff-tasks.mjs` — function validateRequirementHandoffTasks: ({...}, triage, handoff }) => void
- `scripts/validate-requirement-traceability.mjs`
  - function validateTraceability: (manifest, {...}, read) => void
  - function requiresManifestChange: (files) => void
  - function handoffTraceabilityProjection: (source) => void
- `scripts/validate-skill-evolution-trial.mjs` — function validateTrialPlan: (plan, {...}) => void
- `scripts/validate-web-adoption-pr.mjs` — function validateWebAdoptionPullRequest: ({...}, baseRevision, expectedPlanSha256, }) => void

---

# Config

## Environment Variables

- `GITHUB_EVENT_PATH` **required** — scripts/validate-web-adoption-pr.mjs
- `GITHUB_OUTPUT` **required** — scripts/github-actions-adoption.mjs
- `GITHUB_STEP_SUMMARY` **required** — scripts/github-actions-adoption.mjs
- `GITHUB_WORKSPACE` **required** — scripts/github-actions-adoption.mjs
- `PATH` **required** — scripts/capability-suite.mjs
- `PORTAL_DEMO_PORT` **required** — scripts/github-app-portal-demo.mjs
- `QUALITY_NETWORK_ENFORCED` **required** — scripts/run-stack-quality.mjs
- `RUNNER_TEMP` **required** — scripts/github-actions-adoption.mjs
- `WEB_ADOPTION_BASE_REF` **required** — scripts/validate-web-adoption-pr.mjs
- `WEB_ADOPTION_EXPECTED_PLAN_SHA256` **required** — scripts/github-actions-adoption.mjs
- `WEB_ADOPTION_MODE` **required** — scripts/github-actions-adoption.mjs
- `WEB_ADOPTION_RELEASE` **required** — scripts/github-actions-adoption.mjs
- `WEB_ADOPTION_STAGE` **required** — scripts/github-actions-adoption.mjs

---

# Middleware

## custom
- ai-generated-code-license-provenance — `docs/ai-generated-code-license-provenance.md`
- ai-security-guardrails — `docs/ai-security-guardrails.md`
- branch-and-review-strategy — `docs/branch-and-review-strategy.md`
- evaluation-strategy — `docs/evaluation-strategy.md`
- generate-release-manifest — `scripts/generate-release-manifest.mjs`

## validation
- migrate-upstream-lock — `scripts/migrate-upstream-lock.mjs`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `scripts/fullstack-materializer.mjs` — imported by **4** files
- `scripts/release-adoption-surfaces.mjs` — imported by **3** files
- `scripts/release-adoption.mjs` — imported by **3** files
- `scripts/development-profile.mjs` — imported by **3** files
- `scripts/skill-distribution.mjs` — imported by **3** files
- `scripts/stack-profile-fixtures.mjs` — imported by **3** files
- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/capability-suite.mjs` — imported by **2** files
- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/fastapi-contract-adapter.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/adapter-parity.mjs` — imported by **2** files
- `scripts/provider-profile-adapters.mjs` — imported by **2** files
- `scripts/github-app-portal.mjs` — imported by **1** files
- `scripts/stack-quality-adapters.mjs` — imported by **1** files
- `scripts/upgrade-core.mjs` — imported by **1** files
- `scripts/validate-delivery-evidence.mjs` — imported by **1** files
- `scripts/validate-fullstack-locale.mjs` — imported by **1** files
- `scripts/github-actions-adoption.mjs` — imported by **1** files
- `scripts/validate-web-adoption-pr.mjs` — imported by **1** files

## Import Map (who imports what)

- `scripts/fullstack-materializer.mjs` ← `scripts/materialize-fullstack.mjs`, `scripts/release-adoption.mjs`, `scripts/skill-distribution.mjs`, `scripts/stack-profile-fixtures.mjs`
- `scripts/release-adoption-surfaces.mjs` ← `scripts/adopt-release.mjs`, `scripts/github-actions-adoption.mjs`, `scripts/test-release-adoption.mjs`
- `scripts/release-adoption.mjs` ← `scripts/github-actions-adoption.mjs`, `scripts/release-adoption-surfaces.mjs`, `scripts/test-release-adoption.mjs`
- `scripts/development-profile.mjs` ← `scripts/materialize-development-profile.mjs`, `scripts/test-development-profile-materializer.mjs`, `scripts/validate-development-environment-profile.mjs`
- `scripts/skill-distribution.mjs` ← `scripts/materialize-skill-distribution.mjs`, `scripts/release-adoption.mjs`, `scripts/test-skill-distribution.mjs`
- `scripts/stack-profile-fixtures.mjs` ← `scripts/materialize-stack-profile-fixture.mjs`, `scripts/release-adoption.mjs`, `scripts/test-stack-profile-fixtures.mjs`
- `scripts/upstream-lock.mjs` ← `scripts/test-downstream-validator.mjs`, `scripts/validate-core-upgrade-record.mjs`, `scripts/validate-upstream-lock.mjs`
- `scripts/capability-suite.mjs` ← `scripts/aggregate-capability-results.mjs`, `scripts/run-capability-task.mjs`
- `scripts/pilot-results.mjs` ← `scripts/aggregate-pilot-results.mjs`, `scripts/validate-pilot-result.mjs`
- `scripts/fastapi-contract-adapter.mjs` ← `scripts/evaluate-fastapi-contract.mjs`, `scripts/test-fastapi-contract-adapter.mjs`

---

# CI/CD Pipelines

## GitHub Actions (1 workflow)

| Workflow | Triggers | Jobs | Deploy | Environments |
|---|---|---|---|---|
| Security | pull_request, push | 2 | — | — |

### Security

> `.github/workflows/security.yml`

- **security** on `ubuntu-latest` — 13 steps
  - `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`
  - `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`
- **license-provenance** on `ubuntu-24.04` — 6 steps
  - `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`
  - `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`
  - `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`

---
_Source: .github/workflows/security.yml_
_Generated by codesight-cicd-plugin_

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_
