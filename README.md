# Assembly Time Tracker

A marketplace app for the [Assembly](https://www.assembly.com) platform that
lets internal users (staff) log time against the clients in their workspace.

Built on the Assembly marketplace app template:

- **Next.js 15** App Router + TypeScript 5 + Tailwind 4
- **`@assembly-js/node-sdk`** — server-side API access via `getAssembly()`
- **`@assembly-js/app-bridge`** — parent-window postMessage bridge via `lib/bridge.ts`
- **assembly-ui shadcn registry** at `https://cdn.assembly.com/r/` — themed components

## Features

- Pick any client in your workspace and log hours/minutes of work against them
- See your own recent entries
- Per-client totals in the sidebar
- Delete entries you created

## Storage (demo scaffold)

Entries are stored in an **in-memory Map** keyed by `workspaceId`
(`lib/store.ts`). This is fine for a demo / preview deployment — each warm
Vercel instance keeps its entries until it cycles — but data does not persist
across cold starts or multiple instances.

For production, replace the Map in `lib/store.ts` with a durable backend:

- **Vercel KV** (Redis) — drop-in, small additions in `listEntries` / `createEntry` / `deleteEntry`
- **Postgres** (e.g. Neon, Supabase, RDS) — if you want reporting queries
- **Assembly Notes API** — if you want entries to live alongside the workspace

The public interface of `lib/store.ts` is intentionally small so the swap is a
localized change; no route handler or page component needs to move.

## Local dev

```bash
yarn install
yarn dev        # http://localhost:3000
```

Create `.env.local`:

```
ASSEMBLY_API_KEY=your_assembly_api_key_here
COPILOT_ENV=staging
```

Without `ASSEMBLY_API_KEY` the app shows the "Open this app from inside your
Assembly workspace to sign in" fallback — that is expected when no token is
present.

## File map

```
app/
├── layout.tsx                    ← root; renders <Bridge />
├── page.tsx                      ← time tracker main view (server component)
├── _components/
│   ├── log-time-form.tsx         ← create-entry form (client)
│   └── delete-entry-button.tsx   ← per-row delete (client)
└── api/
    ├── _assembly/server.ts       ← getAssembly() — only place assemblyApi() is called
    └── entries/
        ├── route.ts              ← GET list + POST create
        └── [id]/route.ts         ← DELETE
lib/
├── bridge.ts                     ← 'use client' — AssemblyBridge wrapper (do not split)
├── store.ts                      ← in-memory time entry store (swap for a DB)
├── types.ts                      ← shared types
├── format.ts                     ← duration / date formatters
└── utils.ts                      ← cn()
middleware.ts                     ← iframe CSP [DO NOT REMOVE]
components/ui/                    ← assembly-ui components
```

## Deploy

Pushing the repo to GitHub and connecting Vercel deploys automatically. Set
`ASSEMBLY_API_KEY` (and optionally `COPILOT_ENV=staging`) as environment
variables in the Vercel project.
