import { readFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, protocol } from "electron";
import { runReleaseAdoption, validateReleaseAdoptionManifest } from "../scripts/release-adoption.mjs";
import { summarizeAdoptionResult, validateDesktopRequest, validateSelectedRoot } from "./ipc-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rendererRoot = resolve(here, "renderer");
const state = { target: null, manifest: null, source: null, previewPlanSha256: null };

protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

function rendererResource(urlValue) {
  const url = new URL(urlValue);
  if (url.host !== "renderer") throw new Error("허용되지 않은 화면 요청입니다.");
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/u, "");
  const resource = resolve(rendererRoot, relative || "index.html");
  if (resource !== rendererRoot && !resource.startsWith(`${rendererRoot}/`)) throw new Error("화면 경로가 범위를 벗어났습니다.");
  return resource;
}

function mime(path) {
  return new Map([
    [".html", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
  ]).get(extname(path)) ?? "application/octet-stream";
}

function validSender(event) {
  const value = event.senderFrame?.url ?? "";
  if (!value.startsWith("app://renderer/")) throw new Error("허용되지 않은 화면에서 보낸 요청입니다.");
}

function requireSelection() {
  if (!state.target) throw new Error("먼저 프로젝트 폴더를 선택하세요.");
  if (!state.manifest || !state.source) throw new Error("먼저 검토된 release manifest를 선택하세요.");
}

function registerIpc() {
  ipcMain.handle("desktop:select-project", async (event) => {
    validSender(event);
    const selected = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "적용할 프로젝트 폴더 선택" });
    if (selected.canceled) return { canceled: true };
    state.target = validateSelectedRoot(selected.filePaths[0]);
    state.previewPlanSha256 = null;
    return { canceled: false, name: basename(state.target), path: state.target };
  });

  ipcMain.handle("desktop:select-manifest", async (event) => {
    validSender(event);
    const selected = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Release manifest", extensions: ["json"] }],
      title: "검토된 release manifest 선택",
    });
    if (selected.canceled) return { canceled: true };
    const manifestPath = resolve(selected.filePaths[0]);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const source = dirname(manifestPath);
    const validation = validateReleaseAdoptionManifest(manifest, source);
    if (!validation.valid) throw new Error(`Release manifest를 사용할 수 없습니다: ${validation.errors.join(", ")}`);
    state.manifest = manifest;
    state.source = source;
    state.previewPlanSha256 = null;
    return { canceled: false, release: manifest.release.version, file: basename(manifestPath) };
  });

  ipcMain.handle("desktop:run", (event, rawRequest) => {
    validSender(event);
    requireSelection();
    const request = validateDesktopRequest(rawRequest);
    if (request.mode === "apply" && request.expectedPlanSha256 !== state.previewPlanSha256) {
      return summarizeAdoptionResult({ status: "BLOCKED", errors: ["화면에서 확인한 변경 계획과 승인 요청이 일치하지 않습니다."] });
    }
    const result = runReleaseAdoption(request.mode, state.manifest, state.source, state.target, {
      surface: "gui",
      approved: request.mode === "apply" || request.mode === "rollback",
      expectedPlanSha256: request.expectedPlanSha256,
    });
    if (request.mode === "preview" && result.status === "PREVIEW") state.previewPlanSha256 = result.planSha256;
    if (request.mode !== "preview") state.previewPlanSha256 = null;
    return summarizeAdoptionResult(result);
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 820,
    minHeight: 640,
    backgroundColor: "#f4f4f0",
    title: "AI Dev Bootstrap",
    webPreferences: {
      preload: join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://renderer/")) event.preventDefault();
  });
  window.loadURL("app://renderer/index.html");
}

app.whenReady().then(() => {
  protocol.handle("app", async (request) => {
    try {
      const resource = rendererResource(request.url);
      return new Response(readFileSync(resource), { headers: { "content-type": mime(resource) } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => app.quit());
