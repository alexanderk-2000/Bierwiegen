# Bierwiegen 2 — Redesign: Craft Bar mit Charakter

**Datum:** 2026-05-09  
**Status:** Approved  
**Ziel:** Komplette visuelle Überarbeitung — edel aber spielerisch, nicht hochgestochen.

---

## Leitprinzip

Das neue Design soll wirken wie ein richtig gutes Craft-Beer-Label: handwerklich, selbstbewusst, mit Energie. Weg vom rustikalen Bier-Bar-Dekor, hin zu einem modernen, cleanen Look mit konsequentem Orange-Akzent. Kein Gold mehr, nirgendwo.

---

## 1. Farben & Hintergrund

### Palette

| Token | Light | Dark |
|-------|-------|------|
| `--bg-page` | Warmes Off-White `#f7f4f0` + feines Noise | Tiefbraun-Schwarz `#14100a` + feines Noise |
| `--bg-solid` | `#f7f4f0` | `#14100a` |
| `--surface` | `#ffffff` | `#252015` |
| `--surface-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.07)` |
| `--color-text` | `#1a1510` | `#f0ead8` |
| `--color-muted` | `rgba(26,21,16,0.5)` | `rgba(240,234,216,0.5)` |
| `--accent` | `#f04e1b` | `#f04e1b` |
| `--accent-hover` | `#f26040` | `#f26040` |
| `--accent-press` | `#c73a0f` | `#c73a0f` |
| `--focus-ring` | `rgba(240,78,27,0.4)` | `rgba(240,78,27,0.45)` |

### Hintergrund-Textur
- Sehr feines Noise-Overlay (`opacity: 0.03–0.05`) auf `--bg-page`
- Kein Holz, kein Messing, keine Maserung
- Radiale Farbverläufe: sehr subtil, maximal 2 (kein `rgba` über 0.12)

### Was komplett entfernt wird
- `--bar-rim`, `--bar-wood`, `--bar-wood-grain` CSS-Variablen
- `--gold-text`, `--beer-pilsner`, `--beer-stout` (nicht mehr referenziert)
- `--foam-color`, `--shadow-deepwell`
- Alle Gold/Messing-Tailwind-Tokens: `brass`, `brassDark`, `brassLight`, `gold`, `goldHigh`
- Alle Bier-Farb-Tokens: `pilsner`, `lager`, `ipa`, `stout`, `porter`, `head`, `headSoft`
- Holz-Tokens: `oak`, `oakDark`, `mahogany`, `ebony`

### Neue Tailwind-Tokens (Ersatz)
```ts
orange: "#f04e1b",
orangeHover: "#f26040",
orangePress: "#c73a0f",
surface: "#ffffff",          // Light surface
surfaceDark: "#252015",      // Dark surface
bgLight: "#f7f4f0",
bgDark: "#14100a",
textLight: "#1a1510",
textDark: "#f0ead8",
mutedLight: "rgba(26,21,16,0.5)",
mutedDark: "rgba(240,234,216,0.5)",
```

---

## 2. Typografie

### Gewichte
- **Headlines / Titles:** `font-semibold` (600)
- **Eyebrow-Labels** (z.B. "Runde 3", "Deine Theke"): `text-xs tracking-widest uppercase font-medium opacity-60`
- **Scores / Gewichte / Zahlen:** `font-bold tabular-nums`
- **Body / Buttons:** `font-medium`
- **Kein `font-black` (900)** mehr — außer als explizite Ausnahme für einzelne Hero-Momente

### Was entfernt wird
- `.gold-text` Klasse (Gradient-Clip-Text) — vollständig entfernt
- `.embossed-text` Klasse — entfernt
- Alle `text-shadow` für Goldeffekte

### Neue Eyebrow-Konvention
```tsx
// Vorher: text-[0.6rem] font-black uppercase tracking-[0.25em] text-malt/55
// Nachher:
<span className="text-xs font-medium uppercase tracking-widest text-muted">
```

---

## 3. Karten & Surfaces

### `.coaster` — visuell neu, Klassenname bleibt
Kein Umbenennen — zu viele TSX-Dateien würden berührt. Die CSS-Implementierung wird komplett ersetzt, der Klassenname `.coaster` bleibt.

```css
/* Light */
.coaster {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  border-radius: 20px;
}

/* Dark */
.dark .coaster {
  background: #252015;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25);
}
```

- `.coaster-rim` (Brass-Linie oben) — komplett entfernt
- `backdrop-filter: blur` — entfernt (war dekorativ, verlangsamt mobile)
- Border-Radius bleibt groß (`rounded-2xl` / `rounded-3xl`) — spielerischer Touch

---

## 4. Buttons

### Primär-Button (Orange)
```css
.btn-primary {
  background: #f04e1b;
  color: #ffffff;
  border-radius: 14px;
  font-weight: 500;
  transition: background 120ms ease, transform 100ms ease;
}
.btn-primary:hover { background: #f26040; }
.btn-primary:active { transform: scale(0.96); background: #c73a0f; }
```
- Kein Gradient, kein Shimmer, kein `cta-pulse`
- Kein `brass-pill` mehr

### Sekundär-Button
```css
.btn-secondary {
  background: transparent;
  border: 1.5px solid rgba(0, 0, 0, 0.12); /* Dark: rgba(255,255,255,0.12) */
  color: #f04e1b;
  border-radius: 14px;
  font-weight: 500;
}
.btn-secondary:active { transform: scale(0.96); }
```

### Inputs
- Flat: heller Hintergrund, 1.5px Border
- Kein Inset-Shadow
- Focus-Ring: `0 0 0 3px rgba(240,78,27,0.3)` — Orange statt Gold
- `.tap-input` bleibt als Klassenname, aber visuell komplett neu

---

## 5. Animationen

### Entfernt (dekorativ ohne Spielwert)
- `gold-shimmer` / `.gold-shimmer`
- `candle-flicker` / `.candle-flicker`
- `bubble-rise` / `.bubble`
- `cta-pulse` / `.cta-pulse`
- `foam-jiggle`
- `spotlight` / `.spotlight::before`
- `neon-flicker`
- `spotlight-sweep`
- `tap-pull`

### Behalten & poliert
- `score-tick` — Score-Pop beim Aktualisieren
- `phase-enter` — Fade-Up beim Phasenwechsel
- `hit-pop` — Bounce bei Exact-Hit
- `confetti` — Spielende
- `drum-shake` — Trommelwirbel
- `wobble` — Fehler-Feedback
- `press` — Allgemeines Button-Feedback

### Neu
**Orange Pulse Ring** — einmaliger Ausstrahlen-Effekt bei Live-Events (nicht infinit):
```css
@keyframes orangePulseOnce {
  0% { box-shadow: 0 0 0 0 rgba(240,78,27,0.5); }
  100% { box-shadow: 0 0 0 14px rgba(240,78,27,0); }
}
```

**Zahl-Flip** — bei Score-Updates:
```css
@keyframes numFlipOut { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-8px); opacity: 0; } }
@keyframes numFlipIn { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
```

**Snappy Press** — auf allen interaktiven Elementen:
```css
/* scale(0.96) in 100ms, zurück in 100ms */
```

---

## 6. Utility-Klassen — Mapping

| Alt | Neu | Aktion |
|-----|-----|--------|
| `.coaster` | `.coaster` | Klassenname bleibt, CSS komplett neu |
| `.coaster-rim` | — | Entfernen |
| `.brass-pill` | `.btn-primary` | Ersetzen |
| `.gold-text` | — | Entfernen, normaler Text |
| `.embossed-text` | — | Entfernen |
| `.gold-shimmer` | — | Entfernen |
| `.tap-input` | `.tap-input` | Behalten, visuell neu |
| `.bar-wood` | — | Entfernen |
| `.foam-cap` | — | Entfernen |
| `.spotlight` | — | Entfernen |
| `.mug-glow` | `.mug-glow` | Anpassen (Orange statt Gold) |
| `.bubble` | — | Entfernen |
| `.cta-pulse` | — | Entfernen |
| `.candle-flicker` | — | Entfernen |
| `.scroll-vintage` | `.scroll-soft` | Anpassen (Orange statt Gold) |

---

## 7. Scope

Die Änderungen betreffen:
- `app/globals.css` — Hauptdatei, alle CSS-Variablen und Utility-Klassen
- `tailwind.config.ts` — Token-Palette bereinigen und erweitern
- Alle `.tsx`-Dateien die alte Klassen referenzieren (`.brass-pill`, `.coaster`, `.gold-text`, `.coaster-rim`, `.gold-shimmer`, `.bar-wood`, `.spotlight`, `.cta-pulse`, `.candle-flicker`, `.bubble`, `.embossed-text`, `.foam-cap`)

### Nicht im Scope
- Spiellogik (`lib/game-logic.ts`, `lib/db/`)
- Auth-Flow
- FX-Komponenten (`components/fx/BeerMug`, `components/fx/Burst`) — behalten wie sie sind, visuelle Anpassungen nur bei `mug-glow`
- Sound & Haptics

---

## 8. Erfolgskriterien

1. Kein Gold / Messing / Holz sichtbar in Light- oder Dark-Mode
2. Orange ist der einzige konsequente Farbakzent
3. Alle dekorativen Endlos-Animationen entfernt
4. Karten und Buttons wirken modern und clean
5. Spielmomente (Score, Hit, Runde) haben weiterhin Feedback-Animationen
6. Light-Mode ist warm-grau, nicht gelb-cream
7. Dark-Mode ist tief und kontrastreich
