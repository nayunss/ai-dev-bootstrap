const form = document.querySelector("#adoption-form");
const previewButton = document.querySelector("#preview-button");
const previewPanel = document.querySelector("#preview-panel");
const donePanel = document.querySelector("#done-panel");
const approval = document.querySelector("#approval");
const applyButton = document.querySelector("#apply-button");
const errorPanel = document.querySelector("#error");
const liveStatus = document.querySelector("#live-status");
let requestId = "";
let approvedPlanSha256 = "";

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "요청을 완료하지 못했습니다.");
  return result;
}

function showError(error) {
  errorPanel.textContent = error instanceof Error ? error.message : "요청을 완료하지 못했습니다.";
  errorPanel.hidden = false;
  liveStatus.textContent = errorPanel.textContent;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorPanel.hidden = true;
  previewButton.disabled = true;
  previewButton.textContent = "안전하게 확인하는 중…";
  try {
    requestId = `portal-${crypto.randomUUID()}`;
    const result = await api("/api/demo/preview", { requestId });
    approvedPlanSha256 = result.planSha256;
    document.querySelector("#create-count").textContent = result.counts.create;
    document.querySelector("#update-count").textContent = result.counts.update;
    document.querySelector("#preserve-count").textContent = result.counts.preserve;
    document.querySelector("#blocked-count").textContent = result.counts.blocked;
    document.querySelector("#risk-summary").textContent = result.risk;
    document.querySelector("#plan-hash").textContent = result.planSha256;
    previewPanel.hidden = false;
    previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    approval.focus();
    liveStatus.textContent = "변경 내용 미리보기가 준비되었습니다.";
  } catch (error) {
    showError(error);
  } finally {
    previewButton.disabled = false;
    previewButton.textContent = "변경 내용 다시 확인 →";
  }
});

approval.addEventListener("change", () => {
  applyButton.disabled = !approval.checked;
});

applyButton.addEventListener("click", async () => {
  errorPanel.hidden = true;
  applyButton.disabled = true;
  applyButton.textContent = "승인 계획을 재검증하는 중…";
  try {
    const result = await api("/api/demo/apply", {
      requestId,
      approvedPlanSha256,
    });
    previewPanel.hidden = true;
    donePanel.hidden = false;
    document.querySelector("#pr-link").textContent = new URL(result.pullRequest.url).pathname.slice(1);
    donePanel.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("#done-title").focus();
    liveStatus.textContent = "로컬 Pull Request 생성 경계 검증을 완료했습니다.";
  } catch (error) {
    showError(error);
    applyButton.disabled = false;
  } finally {
    applyButton.textContent = "승인하고 Pull Request 준비";
  }
});
