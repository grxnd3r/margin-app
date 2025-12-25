import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initDbAndBackup } from "./store.js";
import { registerIpc } from "./ipc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isDev() {
  return !app.isPackaged;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0B1220",
    show: false,
    title: "MarginMaster",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/preload.cjs"),
    },
  });

  win.once("ready-to-show", () => win.show());

  if (isDev()) {
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(app.getAppPath(), "dist/renderer/index.html"));
  }

  return win;
}

app.whenReady().then(async () => {
  const db = await initDbAndBackup();
  registerIpc(db);
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


