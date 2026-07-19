import { readFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, protocol } from "electron";
import { DesktopAdoptionSession } from "./session.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const rendererRoot = resolve(here, "renderer");
const session = new DesktopAdoptionSession();

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

function registerIpc() {
  ipcMain.handle("desktop:select-project", async (event) => {
    validSender(event);
    const selected = await dialog.showOpenDialog({ properties: ["openDirectory"], title: "적용할 프로젝트 폴더 선택" });
    if (selected.canceled) return { canceled: true };
    return { canceled: false, ...session.selectProject(selected.filePaths[0]) };
  });

  ipcMain.handle("desktop:select-manifest", async (event) => {
    validSender(event);
    const selected = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Reviewed release manifest", extensions: ["json"] }],
      title: "검토된 release manifest 선택",
    });
    if (selected.canceled) return { canceled: true };
    return { canceled: false, ...session.selectManifest(selected.filePaths[0]) };
  });

  ipcMain.handle("desktop:run", async (event, rawRequest) => {
    validSender(event);
    return session.run(rawRequest);
  });

  ipcMain.handle("desktop:cancel", async (event, operationId) => {
    validSender(event);
    return session.cancel(operationId);
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
