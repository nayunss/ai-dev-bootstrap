import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, parse, resolve } from "node:path";

const MODES = new Set(["preview", "apply", "validate", "rollback"]);

export function validateSelectedRoot(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("프로젝트 폴더가 선택되지 않았습니다.");
  const root = resolve(value);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error("존재하는 프로젝트 폴더를 선택하세요.");
  const realRoot = realpathSync(root);
  if (realRoot === parse(realRoot).root || realRoot === realpathSync(homedir())) {
    throw new Error("시스템 전체 또는 홈 폴더는 프로젝트로 선택할 수 없습니다.");
  }
  if (basename(realRoot).startsWith(".env")) throw new Error(".env* 경로는 프로젝트 폴더로 선택할 수 없습니다.");
  return realRoot;
}

export function validateDesktopRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("요청 형식이 올바르지 않습니다.");
  const keys = Object.keys(value);
  if (keys.some((key) => !["mode", "expectedPlanSha256", "operationId"].includes(key))) throw new Error("알 수 없는 요청 항목이 있습니다.");
  if (!MODES.has(value.mode)) throw new Error("지원하지 않는 작업입니다.");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value.operationId ?? "")) {
    throw new Error("작업 식별자가 올바르지 않습니다.");
  }
  if (value.expectedPlanSha256 !== undefined && !/^sha256:[a-f0-9]{64}$/u.test(value.expectedPlanSha256)) {
    throw new Error("승인한 변경 계획의 식별자가 올바르지 않습니다.");
  }
  return { mode: value.mode, expectedPlanSha256: value.expectedPlanSha256, operationId: value.operationId };
}

export function cancelledAdoptionResult(mode) {
  return {
    status: "CANCELLED",
    errors: [],
    entries: [],
    cancelledMode: mode,
  };
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
    CANCELLED: "작업을 취소했습니다. 어떤 파일도 변경하지 않았습니다.",
  };
  const userError = (value) => {
    const error = String(value);
    if (/checksum drift|manifest checksum|archive checksum/u.test(error)) return "선택한 release의 무결성 검증에 실패했습니다. 다른 파일을 선택하거나 공식 bundle을 다시 확인하세요.";
    if (/target drift|target or rollback binding drift/u.test(error)) return "적용 이후 파일이 변경되어 자동 작업을 중단했습니다. 현재 파일을 보존했습니다.";
    if (/existing target differs|blocked-existing|already exists/u.test(error)) return "기존 파일 또는 적용 기록과 충돌해 작업하지 않았습니다.";
    if (/already installed/u.test(error)) return "선택한 release가 이미 적용되어 있습니다. 적용 상태 확인을 실행하세요.";
    if (/another operation|다른 작업/u.test(error)) return "다른 작업이 진행 중입니다. 완료 또는 취소 후 다시 시도하세요.";
    if (/worker|transaction completed/u.test(error)) return "작업 실행이 예기치 않게 종료되었습니다. 성공으로 처리하지 않았으며 적용 상태를 다시 확인하세요.";
    return "요청을 안전하게 완료하지 못했습니다. 입력과 현재 적용 상태를 확인하세요.";
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
    errors: Array.isArray(result?.errors) ? [...new Set(result.errors.map(userError))] : [],
    entries: entries.map(({ path, action, beforeSha256, afterSha256 }) => ({
      path,
      action,
      beforeSha256: beforeSha256 ?? null,
      afterSha256: afterSha256 ?? null,
    })),
  };
}
