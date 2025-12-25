# MarginMaster

Modern desktop app to manage client projects and track margins — built with **Electron + React + Vite**, powered by **Bun**, with **Mantine v7** UI.

## Dev

```bash
bun install
bun run dev
```

## Data persistence

- Data is stored in Electron `userData` as `db.json`.
- On app launch, `db.json` is copied to `userData/backups/` with a timestamp for simple backups.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
