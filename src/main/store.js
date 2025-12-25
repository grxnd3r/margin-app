import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";

function nowIso() {
  return new Date().toISOString();
}

function safeFilenameTimestamp(d = new Date()) {
  // 2025-12-25T19:05:33.123Z -> 20251225-190533
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function defaultData() {
  const c1 = { id: nanoid(), name: "Nordic Café" };
  const c2 = { id: nanoid(), name: "BluePeak Studio" };

  const p1 = {
    id: nanoid(),
    title: "Holiday Product Shoot",
    clientId: c2.id,
    status: "Active",
    date: new Date().toISOString(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    products: [
      {
        id: nanoid(),
        title: "Lighting Rental",
        costPrice: 120,
        sellingPrice: 220,
        date: new Date().toISOString(),
      },
      {
        id: nanoid(),
        title: "Editing",
        costPrice: 80,
        sellingPrice: 160,
        date: new Date().toISOString(),
      },
    ],
  };

  return {
    meta: { version: 1 },
    clients: [c1, c2],
    projects: [p1],
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function initDbAndBackup() {
  const userDataDir = app.getPath("userData");
  const dbDir = path.join(userDataDir, "data");
  const backupsDir = path.join(userDataDir, "backups");
  const dbFile = path.join(dbDir, "db.json");

  await ensureDir(dbDir);
  await ensureDir(backupsDir);

  // Simple backup-on-launch mechanism: copy db.json to backups/ if it exists.
  if (await fileExists(dbFile)) {
    const stamp = safeFilenameTimestamp();
    const backupFile = path.join(backupsDir, `db-${stamp}.json`);
    await fs.copyFile(dbFile, backupFile);
  }

  const adapter = new JSONFile(dbFile);
  const db = new Low(adapter, defaultData());
  await db.read();
  db.data ||= defaultData();
  await db.write();

  return db;
}


