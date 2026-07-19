const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bootstrapDesktop", Object.freeze({
  selectProject: () => ipcRenderer.invoke("desktop:select-project"),
  selectManifest: () => ipcRenderer.invoke("desktop:select-manifest"),
  run: (request) => ipcRenderer.invoke("desktop:run", request),
  cancel: (operationId) => ipcRenderer.invoke("desktop:cancel", operationId),
}));
