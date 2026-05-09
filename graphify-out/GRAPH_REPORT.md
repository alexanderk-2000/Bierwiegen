# Graph Report - .  (2026-05-09)

## Corpus Check
- Corpus is ~28,281 words - fits in a single context window. You may not need a graph.

## Summary
- 309 nodes · 449 edges · 19 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Game Routing|Auth & Game Routing]]
- [[_COMMUNITY_Local Game Engine|Local Game Engine]]
- [[_COMMUNITY_Social & Profile|Social & Profile]]
- [[_COMMUNITY_Game Logic & Data Layer|Game Logic & Data Layer]]
- [[_COMMUNITY_Online Game Session|Online Game Session]]
- [[_COMMUNITY_Auth UI & Settings|Auth UI & Settings]]
- [[_COMMUNITY_UI Components & FX|UI Components & FX]]
- [[_COMMUNITY_App Icon & Branding|App Icon & Branding]]
- [[_COMMUNITY_Supabase Auth Middleware|Supabase Auth Middleware]]
- [[_COMMUNITY_Core Game Types|Core Game Types]]
- [[_COMMUNITY_Design Tokens|Design Tokens]]
- [[_COMMUNITY_Burst Particle Palettes|Burst Particle Palettes]]
- [[_COMMUNITY_Next Config Export|Next Config Export]]
- [[_COMMUNITY_ESLint Export|ESLint Export]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_Bottle Size Enum|Bottle Size Enum]]
- [[_COMMUNITY_Round Type Enum|Round Type Enum]]
- [[_COMMUNITY_Haptics Toggle|Haptics Toggle]]
- [[_COMMUNITY_Middleware UpdateSession|Middleware UpdateSession]]

## God Nodes (most connected - your core abstractions)
1. `getSupabaseBrowserClient()` - 43 edges
2. `getSupabaseBrowserClient` - 32 edges
3. `GamePage` - 30 edges
4. `play()` - 25 edges
5. `AccountHeader` - 11 edges
6. `vibrate()` - 9 edges
7. `ProfilePage` - 9 edges
8. `NewGamePage` - 9 edges
9. `GamesPage()` - 8 edges
10. `Database` - 8 edges

## Surprising Connections (you probably didn't know these)
- `inviteByEmail()` --calls--> `now()`  [INFERRED]
  lib/db/invitations.ts → app/page.tsx
- `createInviteLink()` --calls--> `now()`  [INFERRED]
  lib/db/invitations.ts → app/page.tsx
- `GET()` --calls--> `getSupabaseServerClient()`  [INFERRED]
  app/auth/callback/route.ts → lib/supabase/server.ts
- `saveName()` --calls--> `play()`  [INFERRED]
  app/profile/page.tsx → lib/fx/sound.ts
- `submit()` --calls--> `getSupabaseBrowserClient()`  [INFERRED]
  app/(auth)/signup/page.tsx → lib/supabase/client.ts

## Communities

### Community 0 - "Auth & Game Routing"
Cohesion: 0.05
Nodes (51): GET (auth callback), AuthLayout(), useUser(), AccountHeader, BeerMug, Burst, GamePage, GamesPage() (+43 more)

### Community 1 - "Local Game Engine"
Cohesion: 0.06
Nodes (30): addPlayer(), awardWinners(), beerAnalytics(), bottleSizeLabel(), closeNumpad(), createEmptyFinishRound(), createRound(), editPlayerBeer() (+22 more)

### Community 2 - "Social & Profile"
Cohesion: 0.08
Nodes (28): archiveGame(), createOnlineGame(), deleteGame(), getGame(), listMyGames(), createInviteLink(), generateToken(), inviteByEmail() (+20 more)

### Community 3 - "Game Logic & Data Layer"
Cohesion: 0.07
Nodes (38): getSupabaseBrowserClient, DEFAULT_PENALTY_CONFIG, EvalMeasurement, EvalResult, evaluateRound, exactHitTokensForCaller, RoundPenaltyConfig, archiveGame (+30 more)

### Community 4 - "Online Game Session"
Cohesion: 0.08
Nodes (22): GET(), addGuestPlayer(), removePlayer(), searchProfiles(), updatePlayer(), applyExactHitDistribution(), completeRound(), endGame() (+14 more)

### Community 5 - "Auth UI & Settings"
Cohesion: 0.11
Nodes (22): toggle(), applyThemeClass(), logout(), toggleSound(), toggleTheme(), getHapticsEnabled(), isEnabled(), vibrate() (+14 more)

### Community 6 - "UI Components & FX"
Cohesion: 0.14
Nodes (18): AccountHeader, applyThemeClass, NavLink, readTheme, BeerMug, getHapticsEnabled, isEnabled (haptics), vibrate (+10 more)

### Community 7 - "App Icon & Branding"
Cohesion: 0.22
Nodes (10): Amber/Golden Circle Background, Beer Mug / Stein Visual Element, Bierwiegen App, Beer Mug App Icon (SVG), White Mug Body, White/Cream Mug Handle, Golden Yellow Mug Interior (Beer), Dark Brown Mug Rim/Top (+2 more)

### Community 8 - "Supabase Auth Middleware"
Cohesion: 0.4
Nodes (3): middleware(), middleware, updateSession()

### Community 9 - "Core Game Types"
Cohesion: 0.5
Nodes (4): BeerInfo, Measurement, Penalty, Player

### Community 12 - "Design Tokens"
Cohesion: 1.0
Nodes (2): BeerBarTheme (Tailwind tokens), TailwindConfig

### Community 13 - "Burst Particle Palettes"
Cohesion: 1.0
Nodes (2): Burst, PALETTES

### Community 22 - "Next Config Export"
Cohesion: 1.0
Nodes (1): nextConfig

### Community 23 - "ESLint Export"
Cohesion: 1.0
Nodes (1): eslintConfig

### Community 24 - "Home Page"
Cohesion: 1.0
Nodes (1): HomePage

### Community 25 - "Bottle Size Enum"
Cohesion: 1.0
Nodes (1): BottleSize

### Community 26 - "Round Type Enum"
Cohesion: 1.0
Nodes (1): RoundType

### Community 27 - "Haptics Toggle"
Cohesion: 1.0
Nodes (1): setHapticsEnabled

### Community 28 - "Middleware UpdateSession"
Cohesion: 1.0
Nodes (1): updateSession

## Knowledge Gaps
- **82 isolated node(s):** `middleware`, `nextConfig`, `TailwindConfig`, `eslintConfig`, `HomePage` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Design Tokens`** (2 nodes): `BeerBarTheme (Tailwind tokens)`, `TailwindConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Burst Particle Palettes`** (2 nodes): `Burst`, `PALETTES`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next Config Export`** (1 nodes): `nextConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Export`** (1 nodes): `eslintConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Page`** (1 nodes): `HomePage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bottle Size Enum`** (1 nodes): `BottleSize`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Round Type Enum`** (1 nodes): `RoundType`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Haptics Toggle`** (1 nodes): `setHapticsEnabled`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Middleware UpdateSession`** (1 nodes): `updateSession`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSupabaseBrowserClient()` connect `Social & Profile` to `Auth & Game Routing`, `Online Game Session`, `Auth UI & Settings`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **Why does `now()` connect `Local Game Engine` to `Social & Profile`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `GamePage` connect `Auth & Game Routing` to `Social & Profile`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `getSupabaseBrowserClient()` (e.g. with `accept()` and `submit()`) actually correct?**
  _`getSupabaseBrowserClient()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GamePage` (e.g. with `GamesPage()` and `NewGamePage`) actually correct?**
  _`GamePage` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `play()` (e.g. with `saveName()` and `submit()`) actually correct?**
  _`play()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `AccountHeader` (e.g. with `BeerMug` and `ServiceWorker`) actually correct?**
  _`AccountHeader` has 2 INFERRED edges - model-reasoned connections that need verification._