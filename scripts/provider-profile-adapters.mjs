const SAFE_REF = /^[A-Za-z0-9.][A-Za-z0-9._/-]*$/u;
const HIGH_RISK_ROLES = {
  dependency: "supply-chain",
  security: "security",
  release: "release",
  production: "production",
  database: "database",
  destructive: "independent-reviewer",
};
const REQUIRED_CI_OUTCOMES = ["immutable-checkout", "quality", "test", "security", "provenance", "artifact-integrity", "fail-closed"];
const PROVIDER_MAP = {
  github: new Set(["github", "github-enterprise"]),
  gitlab: new Set(["gitlab", "gitlab-self-managed"]),
  generic: new Set(["generic-git"]),
  none: new Set(["none"]),
};

function add(blockers, code, path, message) {
  blockers.push({ code, path, message });
}

function safeRef(value) {
  return typeof value === "string"
    && SAFE_REF.test(value)
    && !value.split(/[\\/]/u).includes("..")
    && !value.split(/[\\/]/u).some((part) => part.startsWith(".env"));
}

function checkReference(blockers, value, path, nullable = false) {
  if (nullable && value === null) return;
  if (!safeRef(value)) add(blockers, "PROVIDER_UNSAFE_REFERENCE", path, "reference must be relative, non-secret and must not use .env*");
}

function inspectSecrets(value, path, blockers) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const current = path ? `${path}.${key}` : key;
    if (/(token|password|secret|privatekey|credentialvalue)/iu.test(key)) {
      add(blockers, "PROVIDER_SECRET_FIELD", current, "credential values are forbidden");
    }
    inspectSecrets(child, current, blockers);
  }
}

export function validateProviderProfile(profile) {
  const blockers = [];
  if (profile?.schemaVersion !== 1) add(blockers, "PROVIDER_SCHEMA_VERSION", "schemaVersion", "schemaVersion must be 1");
  const adapter = profile?.adapter;
  const hosting = profile?.hosting;
  if (!PROVIDER_MAP[adapter?.id]?.has(hosting?.provider)) {
    add(blockers, "PROVIDER_ADAPTER_MISMATCH", "adapter.id", "adapter does not match hosting provider");
  }
  if (adapter?.id === "none") {
    if (adapter.mode !== "none" || adapter.capabilities?.length !== 0) add(blockers, "PROVIDER_NONE_CAPABILITY", "adapter", "none adapter must have no capabilities");
    for (const field of ["host", "namespace", "repository", "canonicalRemote", "fetchUrl", "pushUrl", "defaultBranch", "credentialRef"]) {
      if (hosting?.[field] !== null) add(blockers, "PROVIDER_NONE_INTEGRATION", `hosting.${field}`, "none hosting must not configure integration fields");
    }
    if (hosting?.changeRequestMode !== "none" || hosting?.visibility !== "not-applicable") {
      add(blockers, "PROVIDER_NONE_INTEGRATION", "hosting", "none hosting must use not-applicable/none");
    }
  } else {
    if (adapter?.mode !== "synthetic-read-only" || !adapter?.capabilities?.includes("git-read")) {
      add(blockers, "PROVIDER_READ_ONLY_CAPABILITY", "adapter", "provider adapter must expose read-only synthetic capabilities");
    }
    for (const field of ["host", "namespace", "repository", "canonicalRemote", "defaultBranch"]) {
      if (typeof hosting?.[field] !== "string" || hosting[field].length === 0) add(blockers, "PROVIDER_HOSTING_FIELD", `hosting.${field}`, "hosting field is required");
    }
    if (hosting?.credentialRef !== null) checkReference(blockers, hosting.credentialRef, "hosting.credentialRef");
    for (const field of ["fetchUrl", "pushUrl"]) {
      const url = hosting?.[field];
      if (typeof url !== "string" || /^https?:\/\/[^/]*@/u.test(url)) add(blockers, "PROVIDER_URL_CREDENTIAL", `hosting.${field}`, "Git URL is missing or contains embedded credentials");
    }
  }
  if (adapter?.id === "generic" && adapter.capabilities?.some((capability) => capability !== "git-read")) {
    add(blockers, "PROVIDER_GENERIC_UNSUPPORTED", "adapter.capabilities", "generic adapter supports local Git read only");
  }

  const review = profile?.branchReview;
  if (review?.forcePush !== false) add(blockers, "PROVIDER_FORCE_PUSH", "branchReview.forcePush", "force push must be disabled");
  const risks = new Map();
  for (const [index, policy] of (review?.riskPolicies ?? []).entries()) {
    if (risks.has(policy?.risk)) add(blockers, "PROVIDER_RISK_DUPLICATE", `branchReview.riskPolicies[${index}]`, "risk policy is duplicated");
    risks.set(policy?.risk, policy);
    const role = HIGH_RISK_ROLES[policy?.risk];
    if (role && (!policy.requiredRoles?.includes(role) || policy.minimumApprovals < 1 || policy.selfReview !== false)) {
      add(blockers, "PROVIDER_HIGH_RISK_REVIEW", `branchReview.riskPolicies[${index}]`, `${policy.risk} requires ${role}, independent review and at least one approval`);
    }
  }
  for (const risk of ["normal", ...Object.keys(HIGH_RISK_ROLES)]) {
    if (!risks.has(risk)) add(blockers, "PROVIDER_RISK_MISSING", "branchReview.riskPolicies", `${risk} policy is required`);
  }
  if (review?.emergency?.enabled) {
    const emergency = review.emergency;
    if (!emergency.approverRole || !emergency.expiresAt || emergency.postReviewRequired !== true || !emergency.rollbackRef) {
      add(blockers, "PROVIDER_EMERGENCY_INCOMPLETE", "branchReview.emergency", "enabled emergency path requires approver, expiry, post-review and rollback");
    }
  }

  const ci = profile?.ci;
  if (ci?.provider === "none") {
    if (ci.configPath !== null || ci.credentialRef !== null || ci.permissions?.length !== 0 || ci.network !== "not-applicable") {
      add(blockers, "PROVIDER_CI_NONE_INTEGRATION", "ci", "CI none must not configure integration or credentials");
    }
  } else {
    checkReference(blockers, ci?.configPath, "ci.configPath");
    checkReference(blockers, ci?.ownerRef, "ci.ownerRef");
    if (ci?.credentialRef !== null) checkReference(blockers, ci.credentialRef, "ci.credentialRef");
    for (const outcome of REQUIRED_CI_OUTCOMES) {
      if (!ci?.requiredOutcomes?.includes(outcome)) add(blockers, "PROVIDER_CI_OUTCOME_MISSING", "ci.requiredOutcomes", `${outcome} is required`);
    }
    if (ci?.permissions?.includes("admin") || ci?.permissions?.includes("write-all")) {
      add(blockers, "PROVIDER_CI_PERMISSION", "ci.permissions", "broad CI permissions are forbidden");
    }
  }

  const artifacts = profile?.artifacts;
  if (artifacts?.provider === "none") {
    if (artifacts.integrity !== "not-applicable" || artifacts.retentionDays !== 0 || artifacts.configPath !== null || artifacts.credentialRef !== null) {
      add(blockers, "PROVIDER_ARTIFACT_NONE_INTEGRATION", "artifacts", "artifact none must not configure storage");
    }
  } else {
    if (!["sha256", "digest-signature"].includes(artifacts?.integrity) || artifacts?.retentionDays < 1) {
      add(blockers, "PROVIDER_ARTIFACT_EVIDENCE", "artifacts", "artifact integrity and positive retention are required");
    }
    checkReference(blockers, artifacts?.ownerRef, "artifacts.ownerRef");
    if (artifacts?.configPath !== null) checkReference(blockers, artifacts.configPath, "artifacts.configPath");
  }

  for (const [index, deployment] of (profile?.deployments ?? []).entries()) {
    const base = `deployments[${index}]`;
    if (deployment?.environment === "none") {
      if (
        deployment.provider !== "none"
        || deployment.applicationRoot !== null
        || deployment.configPath !== null
        || deployment.promotion !== "none"
        || deployment.rollbackRef !== null
        || deployment.credentialRef !== null
      ) add(blockers, "PROVIDER_DEPLOYMENT_NONE_INTEGRATION", base, "deployment none must not configure provider integration");
    } else {
      checkReference(blockers, deployment?.applicationRoot, `${base}.applicationRoot`);
      checkReference(blockers, deployment?.configPath, `${base}.configPath`);
      checkReference(blockers, deployment?.rollbackRef, `${base}.rollbackRef`);
      if (deployment?.credentialRef !== null) checkReference(blockers, deployment.credentialRef, `${base}.credentialRef`);
      if (deployment.environment === "production" && deployment.promotion !== "human-approved") {
        add(blockers, "PROVIDER_PRODUCTION_PROMOTION", `${base}.promotion`, "Production promotion requires human approval");
      }
    }
  }
  inspectSecrets(profile, "", blockers);
  return {
    schemaVersion: 1,
    valid: blockers.length === 0,
    supportLevel: blockers.length === 0 ? "SYNTHETIC_CONTRACT_ONLY" : "BLOCKED",
    externalActions: {
      providerWrite: "NOT_RUN",
      credentialUse: "NOT_RUN",
      push: "NOT_RUN",
      policyChange: "NOT_RUN",
      deployment: "NOT_RUN",
    },
    blockers: blockers.sort((left, right) => `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`)),
  };
}
