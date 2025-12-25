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

function normalizeIncomingDb(payload) {
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : { version: 1 };
  const clients = Array.isArray(payload?.clients) ? payload.clients : [];
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];

  const cleanClients = clients
    .filter((c) => c && typeof c === "object")
    .map((c) => ({
      id: typeof c.id === "string" ? c.id : nanoid(),
      name: String(c.name || "").trim() || "Unnamed Client",
      image: typeof c.image === "string" ? c.image : null,
      createdAt: typeof c.createdAt === "string" ? c.createdAt : nowIso(),
      updatedAt: nowIso(),
    }));

  const cleanProjects = projects
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: typeof p.id === "string" ? p.id : nanoid(),
      title: String(p.title || "").trim() || "Untitled Project",
      clientId: p.clientId || null,
      status: p.status || "Draft",
      date: typeof p.date === "string" ? p.date : nowIso(),
      createdAt: typeof p.createdAt === "string" ? p.createdAt : nowIso(),
      updatedAt: nowIso(),
      products: Array.isArray(p.products) ? p.products : [],
      image: typeof p.image === "string" ? p.image : null,
    }));

  return { meta: { ...meta, version: 1 }, clients: cleanClients, projects: cleanProjects };
}

export function registerIpc(db) {
  ipcMain.handle("app:info", async () => {
    return { ok: true };
  });

  ipcMain.handle("db:get", async () => {
    await db.read();
    return db.data;
  });

  ipcMain.handle("db:replace", async (_evt, payload) => {
    await db.read();
    const next = normalizeIncomingDb(payload);
    db.data = next;
    await db.write();
    return { ok: true };
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


