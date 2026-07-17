import { createHash } from "node:crypto";

const RESULT_STATUSES = new Set(["PASS", "FAIL", "BLOCKED", "NOT-RUN"]);
const PILOT_TYPES = new Set(["frontend", "backend", "full-stack"]);
const PARTICIPANT_ROLES = new Set(["tester", "maintainer", "coordinator", "reviewer"]);
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const REQUIREMENT = /^REQ-\d{3}$/u;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

export function hashJson(value) {
  return `sha256:${createHash("sha256").update(`${JSON.stringify(value, null, 2)}\n`).digest("hex")}`;
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "TBD";
}

function unique(values) {
  return new Set(values).size === values.length;
}

function validateEvidenceReference(evidence, prefix, errors) {
  if (!text(evidence?.reference)) errors.push(`${prefix}.reference is required`);
  if (!SHA256.test(evidence?.sha256 ?? "")) errors.push(`${prefix}.sha256 must be SHA-256`);
}

function validateUpstream(upstream, prefix, errors) {
  for (const field of ["repository", "ref"]) {
    if (!text(upstream?.[field])) errors.push(`${prefix}.${field} is required`);
  }
  if (!SHA1.test(upstream?.commitSha ?? "")) errors.push(`${prefix}.commitSha must be a 40-character Git SHA`);
  if (upstream?.releaseChecksum !== "not-published" && !SHA256.test(upstream?.releaseChecksum ?? "")) {
    errors.push(`${prefix}.releaseChecksum must be not-published or SHA-256`);
  }
}

export function validatePilotCampaign(campaign) {
  const errors = [];
  if (campaign?.schemaVersion !== 1) errors.push("campaign schemaVersion must be 1");
  if (!text(campaign?.campaignId)) errors.push("campaignId is required");
  if (typeof campaign?.synthetic !== "boolean") errors.push("synthetic must be boolean");
  validateUpstream(campaign?.upstream, "upstream", errors);
  if (!Number.isInteger(campaign?.minimumIndependentTesters) || campaign.minimumIndependentTesters < 2) {
    errors.push("minimumIndependentTesters must be an integer of at least 2");
  }
  if (!text(campaign?.coordinatorId)) errors.push("coordinatorId is required");

  const participants = Array.isArray(campaign?.participants) ? campaign.participants : [];
  const participantIds = participants.map((participant) => participant?.testerId);
  if (participants.length < 2) errors.push("campaign requires multiple registered participants");
  if (!unique(participantIds)) errors.push("participant testerId values must be unique");
  for (const participant of participants) {
    if (!text(participant?.testerId)) errors.push("participant testerId is required");
    if (
      !Array.isArray(participant?.roles)
      || participant.roles.length === 0
      || !unique(participant.roles)
      || participant.roles.some((role) => !PARTICIPANT_ROLES.has(role))
    ) {
      errors.push(`participant ${participant?.testerId ?? "unknown"} roles are invalid`);
    }
    if (!new Set(["registered", "withdrawn"]).has(participant?.status)) {
      errors.push(`participant ${participant?.testerId ?? "unknown"} status must be registered or withdrawn`);
    }
    if (participant?.status === "withdrawn" && !text(participant?.withdrawalReason)) {
      errors.push(`withdrawn participant ${participant.testerId} requires withdrawalReason`);
    }
  }
  const registeredTesters = participants.filter(
    (participant) => participant.status === "registered" && participant.roles?.includes("tester"),
  );
  if (registeredTesters.length < (campaign?.minimumIndependentTesters ?? Infinity)) {
    errors.push("registered tester count is below minimumIndependentTesters");
  }
  const coordinator = participants.find((participant) => participant.testerId === campaign?.coordinatorId);
  if (!coordinator?.roles?.includes("coordinator") || coordinator.status !== "registered") {
    errors.push("coordinatorId must reference a registered coordinator participant");
  }

  const assignments = Array.isArray(campaign?.assignments) ? campaign.assignments : [];
  const pilotIds = assignments.map((assignment) => assignment?.pilotId);
  if (assignments.length === 0) errors.push("campaign requires assignments");
  if (!unique(pilotIds)) errors.push("assignment pilotId values must be unique");
  for (const assignment of assignments) {
    if (!text(assignment?.pilotId)) errors.push("assignment pilotId is required");
    const assignedTester = participants.find((participant) => participant.testerId === assignment?.testerId);
    if (assignedTester?.status !== "registered" || !assignedTester.roles?.includes("tester")) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} references an unregistered tester`);
    }
    if (!PILOT_TYPES.has(assignment?.type)) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} type must be frontend, backend, or full-stack`);
    }
    if (!Array.isArray(assignment?.requiredRequirementIds) || assignment.requiredRequirementIds.length === 0) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} requires requirement IDs`);
    } else if (
      !unique(assignment.requiredRequirementIds)
      || assignment.requiredRequirementIds.some((id) => !REQUIREMENT.test(id))
    ) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} requirement IDs are invalid or duplicated`);
    }
    if (
      !Array.isArray(assignment?.requiredGates)
      || assignment.requiredGates.length === 0
      || !unique(assignment.requiredGates)
      || assignment.requiredGates.some((gate) => !text(gate))
    ) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} required gates are invalid or duplicated`);
    }
    if (assignment?.requiresCleanReproduction !== true) {
      errors.push(`assignment ${assignment?.pilotId ?? "unknown"} must require clean reproduction`);
    }
  }
  for (const participant of registeredTesters) {
    if (!assignments.some((assignment) => assignment.testerId === participant.testerId)) {
      errors.push(`registered tester ${participant.testerId} has no assignment`);
    }
  }
  if (!Number.isInteger(campaign?.matrixRevision) || campaign.matrixRevision < 1) {
    errors.push("matrixRevision must be a positive integer");
  }
  const history = Array.isArray(campaign?.matrixHistory) ? campaign.matrixHistory : [];
  if (!history.some((entry) => entry?.revision === campaign?.matrixRevision)) {
    errors.push("matrixHistory must include the current matrixRevision");
  }
  return { errors, valid: errors.length === 0 };
}

function sensitiveContentErrors(result) {
  const serialized = JSON.stringify(result);
  const errors = [];
  for (const pattern of [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{12,}/iu,
  ]) {
    if (pattern.test(serialized)) errors.push("result contains secret-like content; submit only sanitized references");
  }
  return errors;
}

function validateAiProvenance(provenance, errors) {
  for (const field of [
    "provider",
    "toolSurface",
    "toolVersion",
    "modelDisplayName",
    "modelId",
    "modeProfile",
  ]) {
    if (!text(provenance?.[field])) errors.push(`aiProvenance.${field} is required`);
  }
  validateEvidenceReference(provenance?.verificationReference, "aiProvenance.verificationReference", errors);
  if (!new Set(["verified", "tester-declared", "undisclosed"]).has(provenance?.evidenceLevel)) {
    errors.push("aiProvenance.evidenceLevel must be verified, tester-declared, or undisclosed");
  }
  if (!Array.isArray(provenance?.adapters) || !unique(provenance.adapters) || provenance.adapters.some((item) => !text(item))) {
    errors.push("aiProvenance.adapters must be a unique string array");
  }
  for (const field of ["filesystem", "network", "approval"]) {
    if (!text(provenance?.permissions?.[field])) errors.push(`aiProvenance.permissions.${field} is required`);
  }
}

function deriveStatus(result, assignment) {
  const outcomes = Array.isArray(result?.outcomes) ? result.outcomes : [];
  const required = assignment?.requiredGates ?? [];
  const requiredOutcomes = required.map((gate) => outcomes.find((outcome) => outcome.gate === gate));
  const fixtureStatuses = (result?.negativeRollbackFixtures ?? []).flatMap((fixture) => [
    fixture.status,
    fixture.cleanupStatus,
  ]);
  const statuses = [
    ...requiredOutcomes.map((outcome) => outcome?.status ?? "NOT-RUN"),
    ...fixtureStatuses,
  ];
  if (statuses.includes("FAIL") || result?.review?.status === "rejected") return "FAIL";
  if (statuses.includes("BLOCKED") || result?.review?.status === "pending") return "BLOCKED";
  if (
    statuses.includes("NOT-RUN")
    || (result?.unverified?.length ?? 0) > 0
    || result?.downstream?.cleanStart !== true
    || result?.downstream?.independentGitRepository !== true
  ) {
    return "NOT-RUN";
  }
  return "PASS";
}

export function validatePilotResult(result, campaign) {
  const errors = [...sensitiveContentErrors(result)];
  const campaignValidation = validatePilotCampaign(campaign);
  if (!campaignValidation.valid) errors.push(...campaignValidation.errors.map((error) => `campaign: ${error}`));
  if (result?.schemaVersion !== 1) errors.push("result schemaVersion must be 1");
  for (const field of ["campaignId", "pilotId", "trialId", "executedAt"]) {
    if (!text(result?.[field])) errors.push(`${field} is required`);
  }
  if (result?.campaignId !== campaign?.campaignId) errors.push("result campaignId does not match campaign");
  if (!ISO_TIME.test(result?.executedAt ?? "")) errors.push("executedAt must be a UTC timestamp");
  const assignment = campaign?.assignments?.find((entry) => entry.pilotId === result?.pilotId);
  if (!assignment) errors.push("pilotId is not assigned in campaign");
  if (result?.tester?.id !== assignment?.testerId) errors.push("result tester does not match assignment");
  if (!Array.isArray(result?.tester?.roles) || !result.tester.roles.includes("tester")) {
    errors.push("tester.roles must include tester");
  }
  validateUpstream(result?.upstream, "result.upstream", errors);
  if (JSON.stringify(result?.upstream) !== JSON.stringify(campaign?.upstream)) {
    errors.push("result upstream pin does not exactly match campaign");
  }

  if (!SHA1.test(result?.downstream?.commitSha ?? "")) errors.push("downstream.commitSha must be a Git SHA");
  if (!SHA256.test(result?.downstream?.repositoryFingerprint ?? "")) {
    errors.push("downstream.repositoryFingerprint must be SHA-256");
  }
  for (const field of ["workspaceId", "resourceIsolationId"]) {
    if (!text(result?.downstream?.[field])) errors.push(`downstream.${field} is required`);
  }
  if (result?.downstream?.cleanStart !== true) errors.push("downstream.cleanStart must be true");
  if (result?.downstream?.independentGitRepository !== true) {
    errors.push("downstream.independentGitRepository must be true");
  }

  for (const field of ["os", "architecture", "ciProvider", "deployProvider"]) {
    if (!text(result?.environment?.[field])) errors.push(`environment.${field} is required`);
  }
  if (
    !Array.isArray(result?.environment?.stack)
    || result.environment.stack.length === 0
    || result.environment.stack.some((entry) => !text(entry?.name) || !text(entry?.version))
  ) {
    errors.push("environment.stack requires exact name and version entries");
  }
  validateAiProvenance(result?.aiProvenance, errors);

  if (
    !Array.isArray(result?.requirementIds)
    || !unique(result.requirementIds)
    || result.requirementIds.some((id) => !REQUIREMENT.test(id))
  ) {
    errors.push("requirementIds must be unique REQ identifiers");
  }
  for (const requiredId of assignment?.requiredRequirementIds ?? []) {
    if (!result?.requirementIds?.includes(requiredId)) errors.push(`missing assigned requirement: ${requiredId}`);
  }

  const outcomes = Array.isArray(result?.outcomes) ? result.outcomes : [];
  if (outcomes.length === 0 || !unique(outcomes.map((outcome) => outcome?.gate))) {
    errors.push("outcomes require unique gate entries");
  }
  for (const outcome of outcomes) {
    if (!text(outcome?.gate) || !RESULT_STATUSES.has(outcome?.status)) errors.push("outcome gate or status is invalid");
    if (!text(outcome?.command)) errors.push(`outcome ${outcome?.gate ?? "unknown"} command is required`);
    if (!Number.isInteger(outcome?.exitStatus) && outcome?.exitStatus !== null) {
      errors.push(`outcome ${outcome?.gate ?? "unknown"} exitStatus must be integer or null`);
    }
    if (!Array.isArray(outcome?.evidenceReferences) || outcome.evidenceReferences.length === 0) {
      errors.push(`outcome ${outcome?.gate ?? "unknown"} requires evidence`);
    } else {
      outcome.evidenceReferences.forEach((evidence, index) => {
        validateEvidenceReference(evidence, `outcome ${outcome.gate}.evidenceReferences[${index}]`, errors);
      });
    }
  }

  const fixtures = Array.isArray(result?.negativeRollbackFixtures) ? result.negativeRollbackFixtures : [];
  if (fixtures.length === 0) errors.push("negativeRollbackFixtures requires at least one entry");
  for (const fixture of fixtures) {
    if (!text(fixture?.fixture) || !RESULT_STATUSES.has(fixture?.status)) errors.push("fixture name or status is invalid");
    if (!RESULT_STATUSES.has(fixture?.cleanupStatus)) errors.push(`fixture ${fixture?.fixture ?? "unknown"} cleanup status is invalid`);
    for (const field of ["expected", "observed"]) {
      if (!text(fixture?.[field])) errors.push(`fixture ${fixture?.fixture ?? "unknown"} ${field} is required`);
    }
    if (!Array.isArray(fixture?.evidenceReferences) || fixture.evidenceReferences.length === 0) {
      errors.push(`fixture ${fixture?.fixture ?? "unknown"} requires evidence`);
    } else {
      fixture.evidenceReferences.forEach((evidence, index) => {
        validateEvidenceReference(evidence, `fixture ${fixture.fixture}.evidenceReferences[${index}]`, errors);
      });
    }
  }

  if (!Number.isInteger(result?.findings?.count) || result.findings.count < 0) errors.push("findings.count is invalid");
  validateEvidenceReference(result?.findings?.feedbackReference, "findings.feedbackReference", errors);
  if (!Array.isArray(result?.unverified) || result.unverified.some((item) => !text(item))) {
    errors.push("unverified must be a string array");
  }
  if (!Number.isFinite(result?.cost?.durationMinutes) || result.cost.durationMinutes < 0) {
    errors.push("cost.durationMinutes must be non-negative");
  }
  if (result?.cost?.tokenUsage !== null && (!Number.isInteger(result?.cost?.tokenUsage) || result.cost.tokenUsage < 0)) {
    errors.push("cost.tokenUsage must be a non-negative integer or null");
  }
  if (!text(result?.cost?.measurementNotes)) errors.push("cost.measurementNotes is required");
  if (result?.cost?.externalCost !== null) {
    if (!Number.isFinite(result?.cost?.externalCost?.amount) || result.cost.externalCost.amount < 0) {
      errors.push("cost.externalCost.amount must be non-negative");
    }
    if (!/^[A-Z]{3}$/u.test(result?.cost?.externalCost?.currency ?? "")) {
      errors.push("cost.externalCost.currency must be ISO-style uppercase code");
    }
  }

  for (const field of ["graderAssetsModified", "previousTesterResultsAccessed", "productionDataUsed", "secretsIncluded"]) {
    if (result?.attestation?.[field] !== false) errors.push(`attestation.${field} must be false`);
  }
  if (result?.attestation?.submittedBy !== result?.tester?.id) errors.push("attestation.submittedBy must match tester");
  if (!ISO_TIME.test(result?.attestation?.submittedAt ?? "")) errors.push("attestation.submittedAt must be UTC timestamp");
  if (!new Set(["approved", "pending", "rejected"]).has(result?.review?.status)) errors.push("review.status is invalid");
  if (!text(result?.review?.reviewerId) || result?.review?.reviewerId === result?.tester?.id) {
    errors.push("reviewerId must identify a reviewer other than the tester");
  }
  const reviewer = campaign?.participants?.find((participant) => participant.testerId === result?.review?.reviewerId);
  if (reviewer?.status !== "registered" || !reviewer.roles?.includes("reviewer")) {
    errors.push("reviewerId must reference a registered reviewer participant");
  }
  if (!text(result?.review?.reviewedAt)) errors.push("review.reviewedAt is required");
  validateEvidenceReference(result?.review?.evidenceReference, "review.evidenceReference", errors);

  const computedStatus = deriveStatus(result, assignment);
  if (!RESULT_STATUSES.has(result?.reportedStatus)) errors.push("reportedStatus is invalid");
  else if (result.reportedStatus !== computedStatus) {
    errors.push(`reportedStatus ${result.reportedStatus} does not match computed ${computedStatus}`);
  }
  return {
    errors,
    valid: errors.length === 0,
    computedStatus,
    compatibilityEligible: result?.aiProvenance?.evidenceLevel !== "undisclosed",
  };
}

export function aggregatePilotResults(campaign, results) {
  const campaignValidation = validatePilotCampaign(campaign);
  const errors = [...campaignValidation.errors];
  const validations = results.map((result) => ({
    result,
    validation: validatePilotResult(result, campaign),
  }));
  for (const { result, validation } of validations) {
    for (const error of validation.errors) errors.push(`${result?.pilotId ?? "unknown"}: ${error}`);
  }
  const resultPilotIds = results.map((result) => result?.pilotId);
  if (!unique(resultPilotIds)) errors.push("multiple results were submitted for the same pilotId");

  for (const field of ["repositoryFingerprint", "workspaceId", "resourceIsolationId"]) {
    const values = results.map((result) => result?.downstream?.[field]).filter(Boolean);
    if (!unique(values)) errors.push(`independence violation: downstream.${field} is reused`);
  }
  const assignments = campaign?.assignments ?? [];
  const matrix = assignments.map((assignment) => {
    const entry = validations.find(({ result }) => result.pilotId === assignment.pilotId);
    return {
      pilotId: assignment.pilotId,
      testerId: assignment.testerId,
      type: assignment.type,
      status: entry?.validation?.valid ? entry.validation.computedStatus : entry ? "INVALID" : "MISSING",
      compatibilityEligible: entry?.validation?.compatibilityEligible ?? false,
    };
  });
  const independentTesters = new Set(
    matrix.filter((entry) => entry.status === "PASS").map((entry) => entry.testerId),
  ).size;
  const completeMatrix = matrix.length > 0 && matrix.every((entry) => entry.status === "PASS");
  const enoughTesters = independentTesters >= (campaign?.minimumIndependentTesters ?? Infinity);
  let status = "INCOMPLETE";
  if (errors.length > 0) status = "INVALID";
  else if (completeMatrix && enoughTesters) status = campaign.synthetic ? "SYNTHETIC_COMPLETE" : "COMPLETE";
  const compatibilityEligible = matrix.every((entry) => entry.compatibilityEligible);
  return {
    schemaVersion: 1,
    campaignId: campaign?.campaignId ?? "unknown",
    campaignHash: hashJson(campaign),
    synthetic: campaign?.synthetic ?? true,
    status,
    supportDecisionEligible: status === "COMPLETE" && compatibilityEligible,
    compatibilityEligible,
    minimumIndependentTesters: campaign?.minimumIndependentTesters ?? null,
    independentPassingTesters: independentTesters,
    counts: {
      assignments: matrix.length,
      submitted: results.length,
      pass: matrix.filter((entry) => entry.status === "PASS").length,
      incomplete: matrix.filter((entry) => new Set(["FAIL", "BLOCKED", "NOT-RUN", "MISSING"]).has(entry.status)).length,
      invalid: matrix.filter((entry) => entry.status === "INVALID").length,
    },
    matrix,
    errors,
  };
}
