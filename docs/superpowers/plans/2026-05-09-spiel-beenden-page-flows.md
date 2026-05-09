# Spiel beenden & Page Flows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a styled "Spiel beenden" option to both game engines, replace all native `confirm()` dialogs with a shared `ConfirmModal`, and add a prominent Endstand-Banner to the online game.

**Architecture:** One new shared component (`ConfirmModal`) handles all confirmation dialogs. The local game (`app/page.tsx`) gets two new modal states and a new TopBar button. The online game (`app/games/[id]/page.tsx`) gets a single `modalConfig` discriminated union that drives one `ConfirmModal` instance covering four actions, plus a new Endstand-Banner rendered in the lobby tab.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Lucide React icons. Type-check with `npx tsc --noEmit`.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `components/ConfirmModal.tsx` | **Create** | Shared modal component |
| `app/page.tsx` | **Modify** | Add `Flag` import, two modal states, `endGame` handler, TopBar prop, two `ConfirmModal` mounts |
| `app/games/[id]/page.tsx` | **Modify** | Add `modalConfig` state, replace four `confirm()` calls, add Endstand-Banner, auto-tab effect |

---

## Task 1: Create `components/ConfirmModal.tsx`

**Files:**
- Create: `components/ConfirmModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="coaster relative z-10 w-full max-w-sm px-6 py-5">
        <h2 className="text-lg font-semibold text-malt dark:text-nightText">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-malt/65 dark:text-nightMuted">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-malt/20 px-4 py-2 text-sm font-medium text-malt/75 transition hover:-translate-y-0.5 active:scale-95 dark:border-nightBorder dark:text-nightMuted"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? "rounded-full border border-wine/40 bg-dangerSoft px-4 py-2 text-sm font-medium text-wine transition active:scale-95"
                : "rounded-full bg-orange px-4 py-2 text-sm font-medium text-white shadow transition active:scale-95"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/alexanderkoppetsch/Desktop/Apps/BW 2" && npx tsc --noEmit
```

Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add components/ConfirmModal.tsx
git commit -m "feat: add ConfirmModal component"
```

---

## Task 2: Local game — add `Flag` import + two modal states

**Files:**
- Modify: `app/page.tsx` lines 5–36 (lucide imports), ~794 (state declarations), ~1375 (resetGame)

- [ ] **Step 1: Add `Flag` to the lucide-react import block**

In [app/page.tsx](app/page.tsx#L5-L36), add `Flag` to the existing import list (alphabetical):

```tsx
import {
  ArrowRight,
  BarChart3,
  Beer,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Delete,
  Flag,           // ← add this
  Globe2,
  History,
  Home,
  Medal,
  Moon,
  PartyPopper,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  X,
  Zap
} from "lucide-react";
```

- [ ] **Step 2: Add `ConfirmModal` import at the top of the file** (after the existing component imports, around line 40)

```tsx
import ConfirmModal from "@/components/ConfirmModal";
```

- [ ] **Step 3: Add the two modal states** near the existing `useState` declarations (around line 80–85, after the `[inviteLink, setInviteLink]` state):

```tsx
const [showEndGameModal, setShowEndGameModal] = useState(false);
const [showResetModal, setShowResetModal] = useState(false);
```

- [ ] **Step 4: Type-check**

```bash
cd "/Users/alexanderkoppetsch/Desktop/Apps/BW 2" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(local): add modal states and Flag import for end-game flow"
```

---

## Task 3: Local game — "Spiel beenden" handler + TopBar button + modal mounts

**Files:**
- Modify: `app/page.tsx` lines ~1375 (resetGame), ~1685 (TopBar), ~1428 (TopBar call), ~1670 (JSX bottom section)

- [ ] **Step 1: Add `endLocalGame` handler** directly after `resetGame` (~line 1381):

```tsx
const endLocalGame = () => {
  updateGame("Spiel beendet", (g) => ({
    ...g,
    status: "ended",
    activeRoundId: undefined,
  }));
  setScreen("final");
  sound("win");
  buzz([100, 50, 100, 50, 200]);
  setConfettiKey((k) => k + 1);
  setShowEndGameModal(false);
};
```

- [ ] **Step 2: Replace `window.confirm()` in `resetGame`** (lines 1375–1381).

Replace:
```tsx
const resetGame = () => {
  if (!window.confirm("Spiel wirklich zurücksetzen?")) return;
  setUndoStack([]);
  localStorage.removeItem(STORAGE_KEY);
  setGame(emptyGame());
  setScreen("home");
};
```

With:
```tsx
const resetGame = () => {
  setShowResetModal(true);
};

const doReset = () => {
  setUndoStack([]);
  localStorage.removeItem(STORAGE_KEY);
  setGame(emptyGame());
  setScreen("home");
  setShowResetModal(false);
};
```

- [ ] **Step 3: Add `onEndGame` prop to TopBar component** (lines 1685–1707).

Update the props destructuring and type:
```tsx
function TopBar({
  game,
  activeRound,
  pendingCallerId,
  progress,
  onUndo,
  undoLabel,
  onReset,
  onEndGame,        // ← add
  onGoHome,
  onOpenSettings,
  theme
}: {
  game: Game;
  activeRound?: Round;
  pendingCallerId?: string;
  progress: string;
  onUndo: () => void;
  undoLabel?: string;
  onReset: () => void;
  onEndGame: () => void;   // ← add
  onGoHome: () => void;
  onOpenSettings: () => void;
  theme: "light" | "dark";
}) {
```

- [ ] **Step 4: Add the "Beenden" `IconButton` inside TopBar** (lines 1740–1745).

Replace the button row:
```tsx
<div className="flex justify-end gap-1.5">
  <IconButton label="Startseite" onClick={onGoHome} icon={<Home />} theme={theme} />
  <IconButton label="Einstellungen" onClick={onOpenSettings} icon={<Settings />} theme={theme} />
  <IconButton label={undoLabel ? `Undo: ${undoLabel}` : "Undo"} onClick={onUndo} disabled={!undoLabel} icon={<Undo2 />} theme={theme} />
  {game.status === "playing" && (
    <IconButton label="Spiel beenden" onClick={onEndGame} icon={<Flag />} theme={theme} />
  )}
  <IconButton label="Reset" onClick={onReset} icon={<RotateCcw />} danger theme={theme} />
</div>
```

- [ ] **Step 5: Pass `onEndGame` at the TopBar call site** (lines 1428–1439).

```tsx
<TopBar
  game={game}
  activeRound={activeRound}
  pendingCallerId={screen === "roundSetup" ? roundCaller : undefined}
  progress={progress}
  onUndo={undo}
  undoLabel={undoStack.at(-1)?.label}
  onReset={resetGame}
  onEndGame={() => setShowEndGameModal(true)}
  onGoHome={() => setScreen("home")}
  onOpenSettings={() => setShowSettings(true)}
  theme={settings.theme}
/>
```

- [ ] **Step 6: Mount both `ConfirmModal` instances** in the JSX — add directly above the closing `</main>` tag (around line 1681):

```tsx
<ConfirmModal
  open={showEndGameModal}
  title="Spiel beenden?"
  description="Der aktuelle Punktestand wird als Ergebnis gewertet."
  confirmLabel="Beenden"
  onConfirm={endLocalGame}
  onCancel={() => setShowEndGameModal(false)}
/>
<ConfirmModal
  open={showResetModal}
  title="Spiel zurücksetzen?"
  description="Alle Daten werden gelöscht. Das kann nicht rückgängig gemacht werden."
  confirmLabel="Zurücksetzen"
  onConfirm={doReset}
  onCancel={() => setShowResetModal(false)}
  danger
/>
```

- [ ] **Step 7: Type-check**

```bash
cd "/Users/alexanderkoppetsch/Desktop/Apps/BW 2" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Manual smoke test**

```
npm run dev
```

1. Starte ein lokales Spiel mit 2 Spielern
2. In der TopBar erscheint ein Flag-Icon-Button (nur wenn `game.status === "playing"`)
3. Klick auf Flag → ConfirmModal öffnet sich mit "Spiel beenden?"
4. "Beenden" → FinalScreen erscheint mit aktuellem Punktestand, Konfetti
5. "Weiter spielen" → Modal schließt, Spiel läuft weiter
6. Klick auf Reset → ConfirmModal mit rotem "Zurücksetzen"-Button

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx
git commit -m "feat(local): add Spiel-beenden to TopBar, replace window.confirm with ConfirmModal"
```

---

## Task 4: Online game — add `modalConfig` state + replace all `confirm()` calls

**Files:**
- Modify: `app/games/[id]/page.tsx`

- [ ] **Step 1: Add `ConfirmModal` import** at the top of the file (after existing component imports, ~line 18):

```tsx
import ConfirmModal from "@/components/ConfirmModal";
```

- [ ] **Step 2: Add `ModalConfig` type and state** directly after the existing type declarations (after line 45, before the `grams` helper):

```tsx
type ModalConfig =
  | { type: "endGame" }
  | { type: "archive" }
  | { type: "removePlayer"; playerId: string }
  | { type: "startEmpty" };
```

And in the component body, add the state near the other `useState` calls (~line 73):

```tsx
const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
```

- [ ] **Step 3: Replace `doStartEmpty`** (lines 210–220). Remove the `confirm()`:

```tsx
const doStartEmpty = async () => {
  setBusy(true);
  play("coin");
  try {
    await startEmptyFinishRound({ gameId: game.id, roundNumber: rounds.length + 1, penaltyConfig: cfg });
    setTab("play");
  } finally {
    setBusy(false);
  }
};
```

- [ ] **Step 4: Replace `doEndGame`** (lines 274–278). Remove the `confirm()`:

```tsx
const doEndGame = async () => {
  play("warn");
  await endGame(game.id);
};
```

- [ ] **Step 5: Replace `doArchive`** (lines 280–284). Remove the `confirm()`:

```tsx
const doArchive = async () => {
  await archiveGame(game.id);
  router.push("/games");
};
```

- [ ] **Step 6: Replace `doRemovePlayer`** (lines 331–334). Remove the `confirm()`:

```tsx
const doRemovePlayer = async (playerId: string) => {
  await removePlayer(playerId);
};
```

- [ ] **Step 7: Update all call sites** to open modal instead of calling handlers directly:

In the header "Beenden" button (line 367):
```tsx
onClick={() => setModalConfig({ type: "endGame" })}
```

In the "Archivieren" button (line 374):
```tsx
onClick={() => setModalConfig({ type: "archive" })}
```

In the "Leer trinken (Finale)" button in `LobbyView`, it already calls `onStartEmpty` — so update `onStartEmpty` passed from `GamePage`:
In the `LobbyView` call at line ~414:
```tsx
onStartEmpty={() => setModalConfig({ type: "startEmpty" })}
```
And update `LobbyView`'s `onStartEmpty` type and internal "Leer trinken" button handler — it already just calls `onStartEmpty()`, so this is already fine.

In the `doRemovePlayer` call inside `LobbyView`, it already calls `onRemovePlayer(player.id)` — update the passed handler in `GamePage` (line ~412):
```tsx
onRemovePlayer={(id) => setModalConfig({ type: "removePlayer", playerId: id })}
```

- [ ] **Step 8: Mount a single `ConfirmModal`** at the bottom of the `GamePage` JSX, just before the closing `</div>` (after the `</main>`, around line 445):

```tsx
<ConfirmModal
  open={modalConfig !== null}
  title={
    modalConfig?.type === "endGame" ? "Spiel beenden?" :
    modalConfig?.type === "archive" ? "Spiel archivieren?" :
    modalConfig?.type === "removePlayer" ? "Spieler entfernen?" :
    "Finale Runde starten?"
  }
  description={
    modalConfig?.type === "endGame" ? "Alle Spieler sehen danach den Endstand." :
    modalConfig?.type === "archive" ? "Das Spiel wird ins Archiv verschoben." :
    modalConfig?.type === "startEmpty" ? "Danach trinken alle leer und das Spiel endet." :
    undefined
  }
  confirmLabel={
    modalConfig?.type === "endGame" ? "Beenden" :
    modalConfig?.type === "archive" ? "Archivieren" :
    modalConfig?.type === "removePlayer" ? "Entfernen" :
    "Starten"
  }
  danger={modalConfig?.type === "endGame" || modalConfig?.type === "removePlayer"}
  onConfirm={async () => {
    if (modalConfig?.type === "endGame") await doEndGame();
    else if (modalConfig?.type === "archive") await doArchive();
    else if (modalConfig?.type === "removePlayer") await doRemovePlayer(modalConfig.playerId);
    else if (modalConfig?.type === "startEmpty") await doStartEmpty();
    setModalConfig(null);
  }}
  onCancel={() => setModalConfig(null)}
/>
```

- [ ] **Step 9: Type-check**

```bash
cd "/Users/alexanderkoppetsch/Desktop/Apps/BW 2" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add app/games/[id]/page.tsx
git commit -m "feat(online): replace all confirm() with ConfirmModal via modalConfig state"
```

---

## Task 5: Online game — Endstand-Banner + auto-tab on game end

**Files:**
- Modify: `app/games/[id]/page.tsx`

- [ ] **Step 1: Add auto-tab effect** — when `game.status` changes to `"ended"`, switch to lobby tab. Add this `useEffect` after the existing `useEffect` that sets tab on `activeRound` change (~line 142):

```tsx
useEffect(() => {
  if (game?.status === "ended") setTab("lobby");
}, [game?.status]);
```

- [ ] **Step 2: Add the Endstand-Banner** inside `LobbyView`. The banner renders when `game.status === "ended"`. Add it as the first element inside the outer `<div className="grid flex-1 gap-2 overflow-hidden phase-enter lg:grid-cols-[1fr_320px]">` (before the players `<section>`).

In the `LobbyView` component, add `onArchive` and `isEnded` props:

Update `LobbyView` function signature to include:
```tsx
isEnded: boolean;
onArchive: () => void;
```

And update the type:
```tsx
isEnded: boolean;
onArchive: () => void;
```

Pass them from `GamePage`'s `LobbyView` call:
```tsx
isEnded={game.status === "ended"}
onArchive={() => setModalConfig({ type: "archive" })}
```

- [ ] **Step 3: Add the Endstand-Banner JSX** inside `LobbyView`, at the top of the returned JSX (before the players section), wrapped in `{isEnded && (...)}`:

```tsx
{isEnded && (
  <section className="coaster col-span-full p-4 phase-enter">
    <div className="mb-3 flex items-center gap-2">
      <Crown className="size-5 text-orange" />
      <h2 className="text-lg font-semibold text-malt dark:text-nightText">Spielende</h2>
    </div>
    <div className="mb-4 grid gap-1.5">
      {[...players]
        .sort((a, b) => a.penalty_points - b.penalty_points)
        .map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
              index === 0
                ? "border border-orange/40 bg-orange/10"
                : "bg-cream/80 dark:bg-nightSurface2/80"
            }`}
          >
            <div className="flex items-center gap-2">
              {index === 0 && <Crown className="size-4 text-orange" />}
              <span className="text-sm font-semibold text-malt dark:text-nightText">
                {index + 1}. {player.display_name}
              </span>
            </div>
            <span className="text-sm font-bold text-wine">{player.penalty_points} Pkt.</span>
          </div>
        ))}
    </div>
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onArchive}
        className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium active:scale-95"
      >
        Archivieren
      </button>
      <Link
        href="/games"
        onClick={() => play("tap")}
        className="inline-flex items-center gap-2 rounded-full border border-malt/20 px-4 py-2.5 text-sm font-medium text-malt/75 transition hover:-translate-y-0.5 active:scale-95 dark:border-nightBorder dark:text-nightMuted"
      >
        ← Zur Spielliste
      </Link>
    </div>
  </section>
)}
```

Note: `Crown` needs to be imported in the online game. Add it to the lucide-react import — it's already there (`Crown` was imported on line 10).

- [ ] **Step 4: Type-check**

```bash
cd "/Users/alexanderkoppetsch/Desktop/Apps/BW 2" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test**

```
npm run dev
```

1. Erstelle ein Online-Spiel (oder nutze ein bestehendes)
2. Klick auf "Beenden" im Header → ConfirmModal öffnet sich (danger=true, roter Button)
3. Bestätigen → `game.status` wechselt zu "ended", Tab wechselt automatisch zu "Lobby"
4. Endstand-Banner erscheint ganz oben in der Lobby mit sortierten Spielern, Gewinner hervorgehoben
5. "Archivieren" → ConfirmModal, dann Weiterleitung zu /games
6. "← Zur Spielliste" → direkt zu /games
7. "Spieler entfernen" → ConfirmModal (danger=true)
8. "Leer trinken (Finale)" → ConfirmModal (danger=false)

- [ ] **Step 6: Commit**

```bash
git add app/games/[id]/page.tsx
git commit -m "feat(online): add Endstand-Banner and auto-tab switch on game end"
```
