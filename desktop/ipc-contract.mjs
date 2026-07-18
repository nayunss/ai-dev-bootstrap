import { basename, resolve } from "node:path";

const MODES = new Set(["preview", "apply", "validate", "rollback"]);

export function validateSelectedRoot(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("프로젝트 폴더가 선택되지 않았습니다.");
  const root = resolve(value);
  if (basename(root).startsWith(".env")) throw new Error(".env* 경로는 프로젝트 폴더로 선택할 수 없습니다.");
  return root;
}

export function validateDesktopRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("요청 형식이 올바르지 않습니다.");
  const keys = Object.keys(value);
  if (keys.some((key) => !["mode", "expectedPlanSha256"].includes(key))) throw new Error("알 수 없는 요청 항목이 있습니다.");
  if (!MODES.has(value.mode)) throw new Error("지원하지 않는 작업입니다.");
  if (value.expectedPlanSha256 !== undefined && !/^sha256:[a-f0-9]{64}$/u.test(value.expectedPlanSha256)) {
    throw new Error("승인한 변경 계획의 식별자가 올바르지 않습니다.");
  }
  return { mode: value.mode, expectedPlanSha256: value.expectedPlanSha256 };
}

export function summarizeAdoptionResult(result) {
  const entries = Array.isArray(result?.entries) ? result.entries : [];
  const count = (action) => entries.filter((entry) => entry.action === action).length;
  const messages = {
    PREVIEW: "아직 파일을 변경하지 않았습니다. 아래 계획을 확인하세요.",
    PASS: "요청한 작업과 검증을 완료했습니다.",
    BLOCKED: "안전을 위해 작업을 중단했습니다. 어떤 파일도 변경하지 않았습니다.",
    APPROVAL_REQUIRED: "변경 계획을 확인하고 명시적으로 승인해야 합니다.",
    INVALID: "입력 또는 현재 상태를 확인할 수 없어 작업하지 않았습니다.",
    FAIL: "작업 중 오류가 발생했습니다. 복구 결과를 확인하세요.",
  };
  return {
    status: result?.status ?? "INVALID",
    message: messages[result?.status] ?? messages.INVALID,
    planSha256: result?.planSha256 ?? null,
    counts: {
      create: count("create"),
      update: count("update-managed"),
      preserve: count("preserve-identical") + count("preserve-removed-drifted"),
      remove: count("remove-managed"),
      blocked: count("blocked-existing-different"),
    },
    errors: Array.isArray(result?.errors) ? result.errors.map(String) : [],
    entries: entries.map(({ path, action }) => ({ path, action })),
  };
}
