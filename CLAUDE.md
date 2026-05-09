# Bierwiegen 2 — CLAUDE.md

## Architecture: Two Parallel Game Engines

This app has two distinct game systems:
- **Local game** (`app/page.tsx`) — runs entirely in localStorage, no auth required
- **Online game** (`app/games/[id]/page.tsx`) — persisted in Supabase DB, multiplayer

Pure game logic lives in `lib/game-logic.ts` (no side effects).
DB operations are in `lib/db/` — `rounds.ts`, `games.ts`, `players.ts`, `invitations.ts`, `profile.ts`.

## God Nodes (touch these carefully — most dependents)

- `lib/supabase/client.ts` → `getSupabaseBrowserClient()` — 43 callers across the app
- `app/games/[id]/page.tsx` → `GamePage` — orchestrates the entire online session (30 edges)
- `lib/fx/sound.ts` → `play()` — called from data ops (profile save), not just UI
- `lib/fx/haptics.ts` → `vibrate()` — co-fires with `play()` in most user actions

## Auth Flow

`middleware.ts` → `lib/supabase/middleware.ts:updateSession` — runs on every request.
Auth pages under `app/(auth)/` share `app/(auth)/layout.tsx`.
Server-side Supabase client: `lib/supabase/server.ts:getSupabaseServerClient` (only used in `app/auth/callback/route.ts`).
Browser-side: `lib/supabase/client.ts:getSupabaseBrowserClient` (everywhere else).

## Round Lifecycle (Online)

`startRound` → `upsertMeasurement` → `evaluateAndCommitRound` → `applyExactHitDistribution` → `completeRound` → `endGame`
All in `lib/db/rounds.ts`. `evaluateAndCommitRound` calls `evaluateRound` from `lib/game-logic.ts`.

## Key Patterns

- Supabase types are in `lib/supabase/types.ts` (`Database`) — always import from here
- Design tokens (colors, spacing) defined in `tailwind.config.ts` as `BeerBarTheme`
- `AccountHeader` renders in every authenticated page; wraps auth, theme, sound toggles
- FX components in `components/fx/` (`BeerMug`, `Burst`) — visual-only, no data

## Knowledge Graph

A navigable knowledge graph of this codebase lives in `graphify-out/`.
- `graphify-out/graph.html` — interactive, open in browser
- `graphify-out/GRAPH_REPORT.md` — community map + god nodes
- Query: `/graphify query "<question>"` — traces relationships through the graph
- Update after changes: `/graphify . --update`

## Dev Commands

```bash
npm run dev      # start dev server
npx tsc --noEmit # type-check without building
```
