# common-ai-development-harness — AI Context Map

> **Stack:** raw-http | none | unknown | javascript

> 0 routes | 1 models | 0 components | 15 lib files | 2 env vars | 6 middleware
> **Token savings:** this file is ~1,900 tokens. Without it, AI exploration would cost ~13,800 tokens. **Saves ~12,000 tokens per conversation.**
> **Last scanned:** normalized — Git diff is the freshness authority

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
- `scripts/evaluate-skill-evolution.mjs` — function sha256: (value) => void, function evaluateSkillEvolution: (record, options) => void
- `scripts/fastapi-contract-adapter.mjs` — function evaluateFastApiContract: ({...}, current, routes, profile }) => void, function readJson: (path) => void
- `scripts/fullstack-materializer.mjs`
  - function sha256: (value) => void
  - function validateFullStackProfile: (profile, sourceValue, targetValue) => void
  - function applyFullStackTransaction: (operations, io, mkdirSync, readFileSync, unlinkSync, writeFileSync, }) => void
  - function runFullStackMaterializer: (mode, profile, sourceValue, targetValue, options) => void
  - function readProfile: (path) => void
- `scripts/pilot-results.mjs`
  - function hashJson: (value) => void
  - function validatePilotCampaign: (campaign) => void
  - function validatePilotResult: (result, campaign) => void
  - function aggregatePilotResults: (campaign, results) => void
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
- `scripts/validate-production-readiness.mjs` — function validateProductionReadiness: (profile) => void
- `scripts/validate-requirement-traceability.mjs` — function validateTraceability: (manifest, {...}, read) => void, function requiresManifestChange: (files) => void
- `scripts/validate-skill-evolution-trial.mjs` — function validateTrialPlan: (plan, {...}) => void

---

# Config

## Environment Variables

- `PATH` **required** — scripts/capability-suite.mjs
- `QUALITY_NETWORK_ENFORCED` **required** — scripts/run-stack-quality.mjs

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

---

# CI/CD Pipelines

## GitHub Actions (1 workflow)

| Workflow | Triggers | Jobs | Deploy | Environments |
|---|---|---|---|---|
| Security | pull_request, push | 2 | — | — |

### Security

> `.github/workflows/security.yml`

- **security** on `ubuntu-latest` — 11 steps
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
