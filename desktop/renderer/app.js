const api = window.bootstrapDesktop;
const state = {
  project: false,
  manifest: false,
  planSha256: null,
  busy: false,
  operationId: null,
  activeOperation: null,
  lastSafeOperation: null,
};
const byId = (id) => document.getElementById(id);
const actionNames = {
  create: "새로 만들기",
  "update-managed": "업데이트",
  "preserve-identical": "그대로 유지",
  "preserve-removed-drifted": "사용자 파일 보존",
  "remove-managed": "제거",
  "blocked-existing-different": "충돌로 차단",
};

function updateControls() {
  const ready = state.project && state.manifest && !state.busy;
  byId("preview").disabled = !ready;
  byId("approval").disabled = !state.planSha256 || state.busy;
  byId("apply").disabled = !state.planSha256 || !byId("approval").checked || state.busy;
  byId("validate").disabled = !ready;
  byId("rollback").disabled = !ready;
  byId("select-project").disabled = state.busy;
  byId("select-manifest").disabled = state.busy;
  byId("cancel").hidden = !state.busy;
  byId("cancel").disabled = !["preview", "validate"].includes(state.activeOperation);
}

function shortHash(value) {
  return value ? `${value.slice(0, 15)}…${value.slice(-8)}` : "없음";
}

function render(result, operation = null) {
  state.planSha256 = result.status === "PREVIEW" ? result.planSha256 : null;
  state.lastSafeOperation = result.status === "CANCELLED" && ["preview", "validate"].includes(operation) ? operation : null;
  byId("approval").checked = false;
  byId("result").dataset.status = result.status.toLowerCase();
  byId("result-title").textContent = {
    PREVIEW: "변경 계획을 확인하세요",
    PASS: "작업을 완료했습니다",
    BLOCKED: "안전을 위해 중단했습니다",
    APPROVAL_REQUIRED: "승인이 필요합니다",
    INVALID: "현재 상태를 확인할 수 없습니다",
    FAIL: "작업을 완료하지 못했습니다",
    CANCELLED: "작업을 취소했습니다",
  }[result.status] ?? "결과를 확인하세요";
  byId("result-message").textContent = result.message;
  for (const key of ["create", "update", "preserve", "blocked"]) byId(`count-${key}`).textContent = String(result.counts[key] ?? 0);
  const list = byId("details-list");
  list.replaceChildren();
  for (const entry of result.entries) {
    const item = document.createElement("li");
    const title = document.createElement("span");
    title.textContent = `${actionNames[entry.action] ?? entry.action}: ${entry.path}`;
    const hashes = document.createElement("code");
    hashes.textContent = `현재 ${shortHash(entry.beforeSha256)} → 적용 ${shortHash(entry.afterSha256)}`;
    item.append(title, hashes);
    list.append(item);
  }
  for (const error of result.errors) {
    const item = document.createElement("li");
    item.className = "error";
    item.textContent = error;
    list.append(item);
  }
  if (!result.entries.length && !result.errors.length) {
    const item = document.createElement("li");
    item.textContent = "표시할 상세 항목이 없습니다.";
    list.append(item);
  }
  byId("retry").hidden = state.lastSafeOperation === null;
  updateControls();
}

async function run(operation) {
  state.busy = true;
  state.operationId = crypto.randomUUID();
  state.activeOperation = operation;
  if (["preview", "validate"].includes(operation)) state.lastSafeOperation = operation;
  byId("retry").hidden = true;
  byId("result-title").textContent = operation === "preview" ? "변경 계획을 확인하고 있습니다" : "요청을 처리하고 있습니다";
  byId("result-message").textContent = ["preview", "validate"].includes(operation)
    ? "이 작업은 파일을 변경하지 않으며 취소할 수 있습니다."
    : "안전한 transaction이 끝날 때까지 창을 닫지 마세요.";
  updateControls();
  try {
    const result = await api.run({
      mode: operation,
      operationId: state.operationId,
      expectedPlanSha256: operation === "apply" ? state.planSha256 : undefined,
    });
    render(result, operation);
  } catch (error) {
    render({ status: "INVALID", message: "요청을 처리하지 않았습니다.", counts: {}, entries: [], errors: [error.message] }, operation);
  } finally {
    state.busy = false;
    state.operationId = null;
    state.activeOperation = null;
    updateControls();
  }
}

byId("select-project").addEventListener("click", async () => {
  try {
    const result = await api.selectProject();
    if (!result.canceled) {
      state.project = true;
      state.planSha256 = null;
      byId("project-value").textContent = `${result.name}\n${result.path}`;
    }
  } catch (error) {
    render({ status: "INVALID", message: "프로젝트 폴더를 선택하지 못했습니다.", counts: {}, entries: [], errors: [error.message] });
  }
  updateControls();
});

byId("select-manifest").addEventListener("click", async () => {
  try {
    const result = await api.selectManifest();
    if (!result.canceled) {
      state.manifest = true;
      state.planSha256 = null;
      byId("manifest-value").textContent = `${result.release}\n${result.file}`;
      byId("release-commit").textContent = result.commit;
      byId("release-manifest-sha").textContent = result.manifestSha256;
      byId("release-support-status").textContent =
        `${result.artifactStatus} · signing ${result.signing} · notarization ${result.notarization}`;
      byId("release-evidence").hidden = false;
    }
  } catch (error) {
    render({ status: "INVALID", message: "Release를 선택하지 못했습니다.", counts: {}, entries: [], errors: [error.message] });
  }
  updateControls();
});

byId("approval").addEventListener("change", updateControls);
byId("preview").addEventListener("click", () => run("preview"));
byId("retry").addEventListener("click", () => {
  if (state.lastSafeOperation) run(state.lastSafeOperation);
});
byId("cancel").addEventListener("click", async () => {
  if (!state.operationId) return;
  byId("cancel").disabled = true;
  const result = await api.cancel(state.operationId);
  if (!result.accepted) {
    byId("result-message").textContent = result.message;
    updateControls();
  }
});
byId("apply").addEventListener("click", () => run("apply"));
byId("validate").addEventListener("click", () => run("validate"));
byId("rollback").addEventListener("click", () => run("rollback"));
updateControls();
