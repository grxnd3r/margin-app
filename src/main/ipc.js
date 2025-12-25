import { ipcMain } from "electron";
import { nanoid } from "nanoid";

function nowIso() {
  return new Date().toISOString();
}

function upsertById(list, entity) {
  const idx = list.findIndex((x) => x.id === entity.id);
  if (idx === -1) list.push(entity);
  else list[idx] = entity;
}

export function registerIpc(db) {
  ipcMain.handle("app:info", async () => {
    return { ok: true };
  });

  ipcMain.handle("db:get", async () => {
    await db.read();
    return db.data;
  });

  ipcMain.handle("db:upsertClient", async (_evt, payload) => {
    await db.read();
    const name = String(payload?.name || "").trim();
    if (!name) throw new Error("Client name is required.");

    db.data.clients ||= [];
    const existing =
      payload?.id ? db.data.clients.find((c) => c && c.id === payload.id) || null : null;

    const client = {
      id: payload?.id || nanoid(),
      name,
      image:
        typeof payload?.image === "string"
          ? payload.image
          : typeof existing?.image === "string"
          ? existing.image
          : null,
      updatedAt: nowIso(),
      createdAt: payload?.id ? payload?.createdAt || nowIso() : nowIso(),
    };

    upsertById(db.data.clients, client);
    await db.write();
    return client;
  });

  ipcMain.handle("db:upsertProject", async (_evt, payload) => {
    await db.read();

    const id = payload?.id || nanoid();
    const createdAt = payload?.createdAt || nowIso();
    db.data.projects ||= [];
    const existing = db.data.projects.find((p) => p && p.id === id) || null;
    const project = {
      id,
      title: String(payload?.title || "").trim() || "Untitled Project",
      clientId: payload?.clientId || null,
      status: payload?.status || "Draft",
      date: payload?.date || nowIso(),
      createdAt,
      updatedAt: nowIso(),
      products: Array.isArray(payload?.products) ? payload.products : [],
      image:
        typeof payload?.image === "string"
          ? payload.image
          : typeof existing?.image === "string"
          ? existing.image
          : null,
    };

    upsertById(db.data.projects, project);
    await db.write();
    return project;
  });

  ipcMain.handle("db:deleteProject", async (_evt, id) => {
    await db.read();
    db.data.projects ||= [];
    const before = db.data.projects.length;
    db.data.projects = db.data.projects.filter((p) => p.id !== id);
    await db.write();
    return { ok: true, removed: before - db.data.projects.length };
  });
}


