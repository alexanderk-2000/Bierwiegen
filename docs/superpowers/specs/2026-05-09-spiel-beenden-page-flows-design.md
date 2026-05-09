# Bierwiegen 2 — Spiel beenden & Page Flows

**Datum:** 2026-05-09  
**Status:** Approved

---

## Ziel

1. "Spiel beenden" im lokalen Spiel einbauen (bisher fehlend)
2. "Spiel beenden" im Online-Spiel verbessern (bisher: nativer Browser-`confirm()`)
3. Alle `confirm()`-Aufrufe durch ein styled `ConfirmModal` ersetzen
4. Online-Spiel: prominente Endstand-Ansicht wenn `game.status === "ended"`

---

## 1. Neue Komponente: `components/ConfirmModal.tsx`

**Props:**
```ts
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}
```

**Erscheinungsbild:**
- Zentriertes Modal mit `fixed inset-0` Backdrop (blur + dark overlay)
- Dialog-Box im `.coaster`-Stil (`rounded-2xl`, `border`, `shadow`)
- Title: `font-semibold`, Description: `text-sm text-muted`
- Confirm-Button: Orange (`bg-orange text-white`) wenn `danger=false`, Rot/`bg-dangerSoft text-wine border-wine/40` wenn `danger=true`
- Cancel-Button: sekundär (ghost-style)
- Backdrop-Klick schließt modal (ruft `onCancel`)

**Kein interner State** — die aufrufende Seite hält `open` und Handler.

---

## 2. Lokales Spiel (`app/page.tsx`)

### Neuer "Beenden"-Button in der TopBar

- Position: zwischen Undo- und Reset-Button
- Icon: `Flag` (Lucide)
- Aria-label / Tooltip: `"Spiel beenden"`
- **Sichtbar nur wenn:** `game.status === "playing"`
- Styling: wie bestehende `IconButton` (kein `danger`-Prop — das ist kein destruktiver Reset)

### State

```ts
const [showEndGameModal, setShowEndGameModal] = useState(false);
```

Weitergegeben an `TopBar` als `onEndGame` prop.

### Modal-Inhalt

```
Titel:       "Spiel beenden?"
Beschreibung: "Der aktuelle Punktestand wird als Ergebnis gewertet."
Confirm:     "Beenden"  (danger=false, orange)
Cancel:      "Weiter spielen"
```

### Bei Bestätigung

```ts
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
```

### Bestehender "Reset"-Button

Bleibt erhalten — er löscht alle Daten und geht zu "home". Sein `confirm()` wird ebenfalls durch `ConfirmModal` ersetzt:

```
Titel:       "Spiel zurücksetzen?"
Beschreibung: "Alle Daten werden gelöscht. Das kann nicht rückgängig gemacht werden."
Confirm:     "Zurücksetzen"  (danger=true, rot)
Cancel:      "Abbrechen"
```

State: `const [showResetModal, setShowResetModal] = useState(false);`

---

## 3. Online-Spiel (`app/games/[id]/page.tsx`)

### Modal-State

Da mehrere Aktionen (Beenden, Archivieren, Spieler entfernen, Finale starten) bestätigt werden müssen, wird ein einziger `modalConfig`-State verwendet:

```ts
type ModalConfig =
  | { type: "endGame" }
  | { type: "archive" }
  | { type: "removePlayer"; playerId: string }
  | { type: "startEmpty" };

const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
```

Alle `confirm()`-Aufrufe werden durch `setModalConfig({ type: ... })` ersetzt. Ein einzelnes `<ConfirmModal>` am Ende des JSX rendert je nach `modalConfig`.

### Modal-Inhalte

| type | Titel | Beschreibung | Confirm | danger |
|------|-------|--------------|---------|--------|
| `endGame` | "Spiel beenden?" | "Alle Spieler sehen danach den Endstand." | "Beenden" | `true` |
| `archive` | "Spiel archivieren?" | "Das Spiel wird ins Archiv verschoben." | "Archivieren" | `false` |
| `removePlayer` | "Spieler entfernen?" | – | "Entfernen" | `true` |
| `startEmpty` | "Finale Runde starten?" | "Danach trinken alle leer und das Spiel endet." | "Starten" | `false` |

### Endstand-Ansicht (`game.status === "ended"`)

Wenn `game.status === "ended"` wird im `tab === "lobby"` ein **Ergebnisse-Banner** ganz oben eingefügt (vor der Spielerliste):

- Visuell: `coaster`-Card mit Crown-Icon, Überschrift "Spielende 🎉", sortierte Spielerliste nach `penalty_points` aufsteigend (wenigste = Gewinner)
- Platz 1 bekommt `Crown`-Icon + oranges Highlight
- Darunter: zwei Buttons — primär "Archivieren", sekundär "← Zur Spielliste" (Link zu `/games`)
- Tab wechselt automatisch zu `"lobby"` wenn `game.status` auf `"ended"` wechselt (via `useEffect`)
- Der Win-Burst (`winBurst`) läuft bereits — bleibt wie gehabt

### Auswirkung auf bestehenden Header-Button

Der "Beenden"-Button im Header bleibt. Er ruft jetzt `setModalConfig({ type: "endGame" })` statt `doEndGame()` direkt.

---

## 4. Page-Flow-Audit — Gefundene Probleme & Fixes

| Problem | Datei | Fix |
|---------|-------|-----|
| Lokales Spiel: kein "Beenden" mid-game | `app/page.tsx` | Neuer Button in TopBar (s. Abschnitt 2) |
| Lokales Spiel: `resetGame` nutzt `window.confirm()` | `app/page.tsx` | ConfirmModal |
| Online: `doEndGame` nutzt `confirm()` | `games/[id]/page.tsx` | ConfirmModal via `modalConfig` |
| Online: `doArchive` nutzt `confirm()` | `games/[id]/page.tsx` | ConfirmModal via `modalConfig` |
| Online: `doRemovePlayer` nutzt `confirm()` | `games/[id]/page.tsx` | ConfirmModal via `modalConfig` |
| Online: `doStartEmpty` nutzt `confirm()` | `games/[id]/page.tsx` | ConfirmModal via `modalConfig` |
| Online: Nach Spielende kein klares Ergebnis-UI | `games/[id]/page.tsx` | Endstand-Banner in Lobby-Tab |
| Online: `doEndGame` navigiert nach Beenden nicht weg | `games/[id]/page.tsx` | Kein navigate — Ergebnis bleibt auf Seite sichtbar |

---

## Dateien betroffen

| Datei | Änderungstyp |
|-------|--------------|
| `components/ConfirmModal.tsx` | Neu |
| `app/page.tsx` | Ergänzt (TopBar + Modal-States + End-Game-Handler) |
| `app/games/[id]/page.tsx` | Ergänzt (modalConfig-State + Endstand-Banner) |
