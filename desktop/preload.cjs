const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bootstrapDesktop", Object.freeze({
  selectProject: () => ipcRenderer.invoke("desktop:select-project"),
  selectManifest: () => ipcRenderer.invoke("desktop:select-manifest"),
  preview: () => ipcRenderer.invoke("desktop:run", { mode: "preview" }),
  apply: (expectedPlanSha256) => ipcRenderer.invoke("desktop:run", { mode: "apply", expectedPlanSha256 }),
  validate: () => ipcRenderer.invoke("desktop:run", { mode: "validate" }),
  rollback: () => ipcRenderer.invoke("desktop:run", { mode: "rollback" }),
}));
