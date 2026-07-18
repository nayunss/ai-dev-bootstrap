const api = window.bootstrapDesktop;
const state = { project: false, manifest: false, planSha256: null, busy: false };
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
}

function render(result) {
  state.planSha256 = result.status === "PREVIEW" ? result.planSha256 : null;
  byId("approval").checked = false;
  byId("result").dataset.status = result.status.toLowerCase();
  byId("result-title").textContent = {
    PREVIEW: "변경 계획을 확인하세요",
    PASS: "작업을 완료했습니다",
    BLOCKED: "안전을 위해 중단했습니다",
    APPROVAL_REQUIRED: "승인이 필요합니다",
    INVALID: "현재 상태를 확인할 수 없습니다",
    FAIL: "작업을 완료하지 못했습니다",
  }[result.status] ?? "결과를 확인하세요";
  byId("result-message").textContent = result.message;
  for (const key of ["create", "update", "preserve", "blocked"]) byId(`count-${key}`).textContent = String(result.counts[key] ?? 0);
  const list = byId("details-list");
  list.replaceChildren();
  for (const entry of result.entries) {
    const item = document.createElement("li");
    item.textContent = `${actionNames[entry.action] ?? entry.action}: ${entry.path}`;
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
  updateControls();
}

async function run(operation) {
  state.busy = true;
  updateControls();
  try {
    const result = operation === "apply" ? await api.apply(state.planSha256) : await api[operation]();
    render(result);
  } catch (error) {
    render({ status: "INVALID", message: "요청을 처리하지 않았습니다.", counts: {}, entries: [], errors: [error.message] });
  } finally {
    state.busy = false;
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
    }
  } catch (error) {
    render({ status: "INVALID", message: "Release를 선택하지 못했습니다.", counts: {}, entries: [], errors: [error.message] });
  }
  updateControls();
});

byId("approval").addEventListener("change", updateControls);
byId("preview").addEventListener("click", () => run("preview"));
byId("apply").addEventListener("click", () => run("apply"));
byId("validate").addEventListener("click", () => run("validate"));
byId("rollback").addEventListener("click", () => run("rollback"));
updateControls();
