# Libraries

- `scripts/application-inventory.mjs` — function discoverApplications: (root) => void, function readDeclaredInventory: (root) => void
- `scripts/evaluate-skill-evolution.mjs` — function sha256: (value) => void, function evaluateSkillEvolution: (record, options) => void
- `scripts/pilot-results.mjs`
  - function hashJson: (value) => void
  - function validatePilotCampaign: (campaign) => void
  - function validatePilotResult: (result, campaign) => void
  - function aggregatePilotResults: (campaign, results) => void
- `scripts/upstream-lock.mjs`
  - function sha256: (value) => void
  - function safeRelativePath: (path) => void
  - function targetPath: (root, path) => void
  - function canonicalContentHash: (files) => void
  - function validateUpstreamLock: (lock) => void
  - function serializeUpstreamLock: (lock) => void
  - _...2 more_
- `scripts/validate-production-readiness.mjs` — function validateProductionReadiness: (profile) => void
- `scripts/validate-skill-evolution-trial.mjs` — function validateTrialPlan: (plan, {...}) => void
