# Bierwiegen — Komplettumbau auf den Prototyp

**Datum:** 2026-06-16
**Branch:** `rebuild/prototype-ui`
**Quelle der Wahrheit:** `~/Downloads/bierwiegen-prototype.html` (eigenständiger Vanilla-JS-Prototyp)

## Ziel

Die gesamte App (lokales **und** Online-Spiel) wird auf das Design und die
Spielregeln des Prototyps umgebaut. Drumherum (Login, Gruppen, Profil,
Statistiken) wird im neuen Look gestaltet, behält aber seine Funktion.

### Vom Nutzer bestätigte Eckpunkte

- **Umfang:** Alles neu — lokales und Online-Spiel auf neues Design + neue Regeln; Auth/Gruppen/Statistiken angepasst.
- **Regeln:** Prototyp ist maßgeblich (ersetzt abweichende Altregeln).
- **Speichern:** Lokaler Spielstand + Einstellungen in localStorage, Fortsetzen beim Neuladen.
- **Theme:** Prototyp-Look überall; Hell/Dunkel-Umschalter entfällt.
- **DB-Migration:** Datei schreiben, nach ausdrücklicher Freigabe über die verbundene Supabase-Instanz anwenden.
- **Ablauf:** In einem Rutsch umsetzen, Review am Ende.

## Architektur: gemeinsamer Kern, zwei Orchestratoren

```
lib/game-logic.ts        reine, getestete Engine (Prototyp-Regeln, keine Seiteneffekte)
components/game/*         wiederverwendbare UI-Bausteine (1:1 aus dem Prototyp)
app/page.tsx             Lokales Spiel  → Orchestrator über Engine + localStorage
app/games/[id]/page.tsx  Online-Spiel   → Orchestrator über Engine + Supabase (Realtime)
lib/db/rounds.ts         Online-Rundenlebenszyklus, nutzt dieselbe Engine
```

**Prinzip:** Lokal und Online importieren dieselben reinen Engine-Funktionen.
Damit sind die Regeln garantiert identisch; Unterschiede liegen nur in der
Persistenz (localStorage vs. Postgres) und im Realtime-Sync.

Verworfene Alternativen: Big-Bang-Rewrite ohne Engine-Naht (zu großer
Blast-Radius, kaum prüfbar, riskant auf der Live-DB); Online auf später
verschieben (widerspricht „auch Online").

## Design-System (Phase 0)

### Tokens → `tailwind.config.ts`

Aus dem Prototyp übernommen (ersetzt die bisherige `BeerBarTheme`-Palette):

| Token | Wert | Zweck |
|---|---|---|
| `ground` | `#133229` | App-Hintergrund (dunkelgrün) |
| `ground-2` | `#1C4538` | Panels |
| `ground-line` | `rgba(255,255,255,.08)` | Linien auf dunkel |
| `foam` | `#F3EBD8` | helle Panels/Karten |
| `paper` | `#FBF6E9` | Zeilen-/Eingabe-Hintergrund |
| `foam-line` | `#D8CCB0` | Linien auf hell |
| `ink` | `#1A1611` | Text auf hell |
| `ink-muted` | `#6B6253` | Sekundärtext hell |
| `ink-on-ground` | `#EADFC6` | Text auf dunkel |
| `brass` | `#C19A3B` | Primär-Akzent |
| `brass-deep` | `#9A7A2C` | Akzent gedrückt |
| `amber` | `#D38A1B` | Füllung/Leer-Aktion |
| `hit` | `#3F8F5E` | Treffer (grün) |
| `delta` | `#C24E2E` | Abweichung (rot) |

Radien `--r-sm/md/lg/pill`, fluide Größen (`clamp(...)` für `--read`, `--tap`,
`--ui`, `--title`) und Transition-Tokens werden als CSS-Variablen in
`app/globals.css` gespiegelt (der Prototyp ist stark `clamp()`-basiert; das
bleibt erhalten für die responsive Skalierung auf Handy/iPad/TV).

### Fonts → `next/font`

- Bricolage Grotesque (Display/Wordmark/Headlines)
- Hanken Grotesk (UI/Body)
- JetBrains Mono (Zahlen, `.num`, tabular-nums)

### Wiederverwendbare Komponenten → `components/game/`

Jede Komponente ist rein präsentational (Props rein, Callbacks raus), ohne
Datenzugriff — dadurch identisch von Lokal und Online nutzbar.

- `AppShell` — `#app`-Grid (Topbar / Main / Controls), `#frame`, Safe-Areas, Stage-Mode-Klasse.
- `TopBar` — Wordmark (Home), Phase-Pill (`Runde X · Phase · Ansager Y`), Schritt-Punkte, „Rundenübersicht", „Leer trinken", „Auf TV zeigen".
- `ScalePanel` — Glas mit Füllung, Ziellinie, Pfeil-Marker je Spieler, Readout (Name/Meta/Ziel/Schluck), Ist-Wert, Delta-Badge, eingebettetes Numpad.
- `Numpad` — Ziffern + Funktionstasten (`⌫`, `C`, `Ziel`), Varianten dunkel/hell.
- `PlayerRow` — Listenzeile mit Punkt-Farbe, Name, Bier/Größe, Ist/Δ-Spalten, Status (offen/✓), Tags (Ansager/Treffer/Daneben/Stechen).
- `DeltaBadge`, `Tag`, `Panel`, `Eyebrow` — kleinere Bausteine.
- `Coin` — Münze mit Flip-Animation + Ergebnis.
- `RankRow`, `AwardCard` — Ergebnis-/Award-Darstellung.
- `OverviewModal` — Rundenübersicht-Tabelle (R0 + Runden, Δ-Zellen, A/Treffer/Daneben-Markierung, Legende).
- `Dialog` / `ConfirmModal` — bestätigende Dialoge (bestehende `ConfirmModal` wird neu gestylt).

`prefers-reduced-motion` wird respektiert (wie im Prototyp).

## Spiel-Engine (Phase 1) — `lib/game-logic.ts`

Reine Funktionen, per TDD entwickelt. Zufall (Münzwurf) wird **nicht** in der
Engine gezogen, sondern als Parameter hereingereicht (testbar).

### Konstanten / Helfer

- `leerEst(bottleSizeLiters)` → geschätztes Leergewicht (0,5 l → 380 g, sonst 300 g) für die Glas-Skala.
- `fillPct(...)`, `deltaLabel(delta)` → reine Darstellungshelfer.

### Zielgrenzen

```ts
targetBounds(players): { min: number; max: number; suggested: number }
// minCur   = min(player.currentWeight)
// max      = minCur - 5          (Regel: mind. 5 g unter leichtester Flasche)
// min      = 50
// suggested= clamp(minCur - 30, min, max)
```

Der Ansager kann das Ziel per Stepper (±5, ±25) oder Numpad setzen; live auf
`max` gedeckelt, beim Bestätigen auf `[min, max]` geklemmt.

### Rundenwertung

```ts
computeRound(players, target, announcerId): RoundComputation
```

- `dev = |entry - target|` je Spieler; `maxDev = max(dev)`.
- `worst` = Spieler mit `dev === maxDev`; `exact` = Spieler mit `dev === 0`.
- Markierungen: Ansager → `ansager`; exakte → `treffer`.
- **Daneben-Strafe** (nur wenn `maxDev > 0`):
  - genau **ein** Schlechtester → `daneben`, Punkte = Ansager? 2 : 1.
  - **mehrere** Schlechteste → alle `daneben` + `stechen`, `needStechen = true`, **keine** Vorab-Strafe.
- **Treffer-Verteilung:** jeder exakte Treffer erhält Verteil-Tokens (Ansager 2, sonst 1) und verteilt sie per Antippen an Spieler; Rest kann verfallen.

```ts
type RoundComputation = {
  maxDev: number; maxDevTie: boolean;
  worstIds: string[]; exactIds: string[]; announcerId: string;
  marks: Record<string, Array<'ansager'|'treffer'|'daneben'|'stechen'>>;
  pending: Array<{ playerId: string; points: number; reason: string }>; // Daneben
  needStechen: boolean;
  distributions: Array<{ playerId: string; name: string; amount: number }>;
}
```

Verteil-Helfer (reiner Zustand, für Undo): `distLeft`, `distActive`,
`distDone`, `distRecv` arbeiten auf `Array<{playerId, amount, log[], forfeit}>`.
Hinweis: Wie im Prototyp kann ein Treffer Punkte an **jeden** Spieler vergeben
(die UI schränkt nicht ein).

### Stechen

```ts
evalStechen(participants, entries): { loserIds: string[]; maxDev: number; tie: boolean }
// je Teilnehmer: ziel = before - 5  (before = gewogener Wert dieser Runde)
//                dev  = |stechenEntry - ziel|
// loser = größte Abweichung; tie → erneutes Stechen mit den loserIds
```

Verlierer: +2 falls Ansager, sonst +1. Flaschengewichte der Teilnehmer werden
auf den Stechen-Wert aktualisiert.

### Münzwurf (Leer trinken)

```ts
resolveCoinFlip(players, emptyWeights, heavyLoses: boolean): { loserIds: string[]; extreme: number }
// heavyLoses=true → schwerste leere Flasche verliert, sonst leichteste
// Gleichstand am Extrem → alle betroffenen +1
```

`heavyLoses` zieht der Orchestrator per `Math.random() < 0.5`.

### Awards / Statistik

```ts
roundStats(history, playerId)  // avgDev, treffer, daneben, maxDrink
awards(history, players)       // Waagenmeister, Zielwasser, Komplett daneben, Größter Schluck
```

### Tests

Test-Runner **vitest** wird ergänzt (`npm run test`). `lib/game-logic.test.ts`
deckt ab: Zielgrenzen, einfacher Schlechtester vs. Gleichstand→Stechen,
Treffer-Verteilung inkl. Undo/Forfeit, Stechen-Auflösung inkl.
Wiederholung, Münzwurf-Extrem inkl. Gleichstand, Awards.

## Lokales Spiel (Phase 2) — `app/page.tsx`

Dünner Orchestrator. Zustandsmaschine wie im Prototyp, typisiert und
persistierbar:

```ts
type Phase = 'setup'|'ansage'|'wiegen'|'auswertung'|'stechen'|'leer'|'muenzwurf'|'ergebnis';

type LocalGameState = {
  phase: Phase; round: number; announcerIdx: number;
  players: Player[];
  target: number; minTarget: number; maxTarget: number; minCur: number;
  entries: Record<string, number>;     // Wiegen der laufenden Runde
  confirmed: string[];
  result: RoundComputation | null;
  distrib: DistribState[] | null;
  stechen: StechenState | null;
  leer: Record<string, number> | null;
  coin: CoinResult | null;
  history: HistoryEntry[];
  nextId: number;
};
```

Phasenfluss (entspricht Prototyp):
`setup → ansage → wiegen → auswertung → (stechen)* → nächste Runde`
und jederzeit aus ansage/wiegen/auswertung: `leer → muenzwurf → ergebnis`.

Gemeinsame Gewichts-Eingabe (Wiegen/Stechen/Leer) über ein konfigurierbares
„W"-Objekt wie im Prototyp (Spieler-Reihenfolge, Ziel-Funktion, min/max,
Labels, `onEval`).

**Persistenz:** `localStorage`-Keys
`bierwiegen-v2-game`, `bierwiegen-v2-settings`, `bierwiegen-v2-brands`.
Migration: alte v1-Stände werden ignoriert/verworfen (Regeln zu unterschiedlich;
kein Daten-Upgrade-Pfad nötig).

**Beibehaltene Zusatzfunktionen** (additiv, nicht im Prototyp): Sound/Haptik
(`lib/fx/*`), Undo-Stack, Einstellungen (Sound/Haptik/Auto-Advance/Pass-Phone),
optionaler „Pass-Phone"-Splash, Konfetti bei Treffer. **Entfällt:** Hell/Dunkel-Umschalter
(einheitlicher Prototyp-Look).

## DB-Migration (Phase 3) — `supabase/migrations/`

Neue Datei `…_prototype_rules.sql`. Nötige Änderungen (Rest des Schemas trägt
die Regeln bereits):

```sql
-- Stechen als Rundentyp
ALTER TABLE rounds DROP CONSTRAINT rounds_type_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_type_check
  CHECK (type IN ('normal','empty_finish','stechen'));
ALTER TABLE rounds ADD COLUMN stechen_parent_round_id uuid
  REFERENCES rounds(id) ON DELETE CASCADE;

-- Pro-Spieler-Ziel (Stechen: ziel = previous_weight - 5; auch Audit für Normalrunden)
ALTER TABLE measurements ADD COLUMN target_weight numeric;

-- Datenintegrität: eine Leer-Messung je Spieler/Runde
ALTER TABLE empty_bottle_measurements
  ADD CONSTRAINT empty_bottle_measurements_unique UNIQUE (round_id, game_player_id);
```

Bereits vorhanden und genutzt: `penalties.reason` (`exact_hit_distribution`,
`empty_bottle_coin_flip`), `penalties.awarded_by_game_player_id`,
`games.coin_flip_result`, `empty_bottle_measurements.coin_flip_loser`.

`lib/supabase/types.ts` wird entsprechend aktualisiert (manuell oder per
`generate_typescript_types`). RLS bleibt unverändert (neue Spalten erben die
Tabellen-Policies). Optionaler Folgepunkt (außerhalb dieses Umfangs): RLS für
`invitations`/`empty_bottle_measurements` prüfen.

**Anwendung:** Migrationsdatei wird geschrieben; das Anwenden auf die
verbundene Supabase-Instanz erfolgt erst nach ausdrücklicher Freigabe.

## Online-Spiel (Phase 4) — `app/games/[id]/page.tsx`, `lib/db/rounds.ts`

- `lib/db/rounds.ts` nutzt die Engine aus Phase 1. Neue/erweiterte Operationen:
  - `startRound` deckelt das Ziel über `targetBounds`.
  - `evaluateAndCommitRound` setzt einfache-Schlechtester-Regel bzw. erkennt `needStechen`.
  - `startStechenRound` / `evaluateStechen` (neuer Rundentyp, `stechen_parent_round_id`, Ziel je Teilnehmer = `previous_weight − 5`).
  - Leer-Trinken-Fluss (`startEmptyFinishRound` + `flipCoin`) auf Prototyp-Verhalten gebracht.
- Realtime: bestehender Kanal (`game-${id}`, `postgres_changes` → `refreshAll`) trägt die neuen Rundentypen ohne Änderung.
- UI: identische `components/game/*`-Bausteine wie lokal; Online-spezifisch nur „wer ist dran"/Sichtbarkeit.

## Reskin Drumherum (Phase 5)

Neues Design-System auf: `AccountHeader`, `app/(auth)/*`, `app/profile`,
`app/groups/*`, `app/games`, `app/games/new`, `app/invitations`,
`app/invite/[token]`. Navigation/IA bleibt. `AccountHeader` verliert den
Theme-Umschalter (Sound bleibt). Awards/Statistiken werden an das
Prototyp-Award-Set angeglichen, wo sinnvoll.

## Verifikation (vor Abschluss)

- `npm run test` (Engine), `npx tsc --noEmit`, `npm run lint`, `git diff --check` grün.
- `npm run build` erfolgreich.
- Manueller Durchlauf lokal: Setup → mehrere Runden inkl. einfachem Daneben, Treffer-Verteilung, Stechen → Leer trinken → Münzwurf → Ergebnis/Awards, plus Rundenübersicht und Stage-Mode.
- Online: ein Spiel mit zwei Sitzungen (Realtime), inkl. Stechen und Leer-trinken-Ende.

## Out of Scope

- Kein Daten-Upgrade alter v1-localStorage-Spielstände.
- Keine neuen Statistik-Materialized-Views; bestehende werden nur bei Bedarf angepasst.
- Kamera-/OCR-Wiegen (`source: 'camera'`) bleibt unberührt.
