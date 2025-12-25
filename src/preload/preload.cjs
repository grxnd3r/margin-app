const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mm", {
  getState: () => ipcRenderer.invoke("db:get"),
  upsertClient: (client) => ipcRenderer.invoke("db:upsertClient", client),
  upsertProject: (project) => ipcRenderer.invoke("db:upsertProject", project),
  deleteProject: (id) => ipcRenderer.invoke("db:deleteProject", id),
});


