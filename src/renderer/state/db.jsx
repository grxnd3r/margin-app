import React, { createContext, useContext, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { nanoid } from "nanoid";

const DbContext = createContext(null);

const LS_KEY = "mm.db.v1";

function nowIso() {
  return new Date().toISOString();
}

function readLocalState() {
  try {
    const raw = window.localStorage?.getItem(LS_KEY);
    if (!raw) return { meta: { version: 1 }, clients: [], projects: [] };
    const data = JSON.parse(raw);
    return {
      meta: data?.meta || { version: 1 },
      clients: Array.isArray(data?.clients) ? data.clients : [],
      projects: Array.isArray(data?.projects) ? data.projects : [],
    };
  } catch {
    return { meta: { version: 1 }, clients: [], projects: [] };
  }
}

function writeLocalState(next) {
  try {
    window.localStorage?.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / disabled storage
  }
}

function normalizeImport(payload) {
  const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : { version: 1 };
  const clients = Array.isArray(payload?.clients) ? payload.clients : [];
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];

  const cleanClients = clients
    .filter((c) => c && typeof c === "object")
    .map((c) => ({
      id: typeof c.id === "string" && c.id ? c.id : nanoid(),
      name: String(c.name || "").trim() || "Unnamed Client",
      image: typeof c.image === "string" ? c.image : null,
      createdAt: typeof c.createdAt === "string" ? c.createdAt : nowIso(),
      updatedAt: nowIso(),
    }));

  const cleanProjects = projects
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: typeof p.id === "string" && p.id ? p.id : nanoid(),
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

function api() {
  if (window.mm) return window.mm;
  // Dev fallback (browser preview): in Electron, preload injects window.mm
  return {
    getState: async () => readLocalState(),
    replaceState: async (next) => {
      const clean = normalizeImport(next);
      writeLocalState(clean);
      return { ok: true };
    },
    upsertClient: async (payload) => {
      const data = readLocalState();
      const name = String(payload?.name || "").trim();
      if (!name) throw new Error("Client name is required.");
      const existing =
        payload?.id ? (data.clients || []).find((c) => c && c.id === payload.id) || null : null;
      const client = {
        id: payload?.id || nanoid(),
        name,
        image:
          typeof payload?.image === "string"
            ? payload.image
            : typeof existing?.image === "string"
            ? existing.image
            : null,
        createdAt: payload?.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      const clients = [...(data.clients || [])];
      const idx = clients.findIndex((c) => c.id === client.id);
      if (idx === -1) clients.unshift(client);
      else clients[idx] = client;
      const next = { ...data, clients };
      writeLocalState(next);
      return client;
    },
    upsertProject: async (payload) => {
      const data = readLocalState();
      const existing =
        payload?.id ? (data.projects || []).find((p) => p && p.id === payload.id) || null : null;
      const project = {
        id: payload?.id || nanoid(),
        title: String(payload?.title || "").trim() || "Untitled Project",
        clientId: payload?.clientId || null,
        status: payload?.status || "Draft",
        date: payload?.date || nowIso(),
        createdAt: payload?.createdAt || nowIso(),
        updatedAt: nowIso(),
        products: Array.isArray(payload?.products) ? payload.products : [],
        image:
          typeof payload?.image === "string"
            ? payload.image
            : typeof existing?.image === "string"
            ? existing.image
            : null,
      };
      const projects = [...(data.projects || [])];
      const idx = projects.findIndex((p) => p.id === project.id);
      if (idx === -1) projects.unshift(project);
      else projects[idx] = project;
      const next = { ...data, projects };
      writeLocalState(next);
      return project;
    },
    deleteProject: async (id) => {
      const data = readLocalState();
      const next = { ...data, projects: (data.projects || []).filter((p) => p.id !== id) };
      writeLocalState(next);
      return { ok: true };
    },
  };
}

export function DbProvider({ children }) {
  const [state, setState] = useState({
    meta: { version: 1 },
    clients: [],
    projects: [],
  });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api().getState();
      const base = data || { meta: { version: 1 }, clients: [], projects: [] };

      const repairedClients = [];
      const clients = (Array.isArray(base.clients) ? base.clients : []).map((c) => {
        if (!c || typeof c !== "object") return null;
        if (typeof c.id === "string" && c.id) return c;
        const next = { ...c, id: nanoid(), createdAt: c.createdAt || nowIso(), updatedAt: nowIso() };
        repairedClients.push(next);
        return next;
      }).filter(Boolean);

      const repairedProjects = [];
      const projects = (Array.isArray(base.projects) ? base.projects : []).map((p) => {
        if (!p || typeof p !== "object") return null;
        if (typeof p.id === "string" && p.id) return p;
        const next = {
          ...p,
          id: nanoid(),
          createdAt: p.createdAt || nowIso(),
          updatedAt: nowIso(),
          products: Array.isArray(p.products) ? p.products : [],
        };
        repairedProjects.push(next);
        return next;
      }).filter(Boolean);

      const nextState = {
        meta: base.meta || { version: 1 },
        clients,
        projects,
      };

      setState(nextState);

      // Best-effort: persist repairs so they survive future refreshes.
      if (repairedClients.length || repairedProjects.length) {
        const a = api();
        await Promise.allSettled([
          ...repairedClients.map((c) => a.upsertClient(c)),
          ...repairedProjects.map((p) => a.upsertProject(p)),
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function upsertProject(project) {
    const base = project || {};
    const toSave = {
      ...base,
      id: base.id || nanoid(),
      createdAt: base.createdAt || nowIso(),
      updatedAt: nowIso(),
      products: Array.isArray(base.products) ? base.products : [],
    };
    // Optimistic update for snappy autosave.
    setState((prev) => {
      const projects = Array.isArray(prev.projects) ? [...prev.projects] : [];
      const idx = projects.findIndex((p) => p.id === toSave.id);
      if (idx === -1) projects.unshift(toSave);
      else projects[idx] = { ...projects[idx], ...toSave };
      return { ...prev, projects };
    });

    try {
      const saved = await api().upsertProject(toSave);
      setState((prev) => {
        const projects = [...prev.projects];
        const idx = projects.findIndex((p) => p.id === saved.id);
        if (idx === -1) projects.unshift(saved);
        else projects[idx] = saved;
        return { ...prev, projects };
      });
      return saved;
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Autosave failed",
        message: e?.message || "Could not save project.",
      });
      throw e;
    }
  }

  async function deleteProject(id) {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
    return await api().deleteProject(id);
  }

  async function upsertClient(client) {
    const base = client || {};
    const toSave = {
      ...base,
      id: base.id || nanoid(),
      createdAt: base.createdAt || nowIso(),
      updatedAt: nowIso(),
      name: String(base.name || "").trim(),
      image: typeof base.image === "string" ? base.image : null,
    };
    const saved = await api().upsertClient(toSave);
    setState((prev) => {
      const clients = [...prev.clients];
      const idx = clients.findIndex((c) => c.id === saved.id);
      if (idx === -1) clients.unshift(saved);
      else clients[idx] = saved;
      return { ...prev, clients };
    });
    return saved;
  }

  async function replaceState(next) {
    const clean = normalizeImport(next);
    try {
      await api().replaceState(clean);
      await refresh();
      notifications.show({
        color: "teal",
        title: "Import réussi",
        message: `${clean.clients.length} clients · ${clean.projects.length} projets`,
      });
      return { ok: true };
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Import échoué",
        message: e?.message || "Impossible d'importer le fichier.",
      });
      throw e;
    }
  }

  async function mergeState(next) {
    const clean = normalizeImport(next);
    const a = api();
    try {
      await Promise.allSettled([
        ...(clean.clients || []).map((c) => a.upsertClient(c)),
        ...(clean.projects || []).map((p) => a.upsertProject(p)),
      ]);
      await refresh();
      notifications.show({
        color: "teal",
        title: "Import (fusion) réussi",
        message: `${clean.clients.length} clients · ${clean.projects.length} projets`,
      });
      return { ok: true };
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Import échoué",
        message: e?.message || "Impossible d'importer le fichier.",
      });
      throw e;
    }
  }

  function exportState() {
    const clean = normalizeImport(state);
    return {
      ...clean,
      meta: {
        ...(clean.meta || { version: 1 }),
        exportedAt: nowIso(),
      },
    };
  }

  const value = useMemo(
    () => ({
      state,
      loading,
      refresh,
      upsertProject,
      deleteProject,
      upsertClient,
      replaceState,
      mergeState,
      exportState,
    }),
    [state, loading]
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used inside DbProvider");
  return ctx;
}


