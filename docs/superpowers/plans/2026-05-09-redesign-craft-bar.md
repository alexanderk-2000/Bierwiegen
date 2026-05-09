# Redesign: Craft Bar mit Charakter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Komplettes visuelles Redesign von Bierwiegen 2 — weg von Holz/Gold/Messing, hin zu einem modernen Craft-Bar-Look mit Electric Orange als einzigem Akzent.

**Architecture:** Reine CSS- und Tailwind-Änderungen — keine Logik, keine Komponenten-Struktur. Drei Schichten: (1) CSS-Variablen und Utility-Klassen in `globals.css`, (2) Design-Tokens in `tailwind.config.ts`, (3) Klassen-Bereinigung in allen `.tsx`-Dateien.

**Tech Stack:** Next.js 15, Tailwind CSS v3, CSS Custom Properties

**Kernsubstitutionen (Referenz für alle Tasks):**

| Alt | Neu | Verhalten |
|-----|-----|-----------|
| `.brass-pill` | bleibt | CSS neu: solid orange `#f04e1b`, weißer Text |
| `.gold-text bg-clip-text` | entfernen | normaler Text, erbt Farbe |
| `.coaster-rim` | entfernen | CSS-Klasse bleibt definiert aber leer |
| `.spotlight` | entfernen | CSS-Klasse bleibt definiert aber leer |
| `.cta-pulse` | entfernen | inkl. konditionaler Verwendung |
| `.gold-shimmer` | entfernen | inkl. Element-Klassen |
| `.candle-flicker` | entfernen | |
| `.scroll-vintage` | bleibt | CSS neu: orange Scrollbar |
| `bg-amberBeer text-malt` auf CTAs | `bg-orange text-white` | neuer Token |
| `text-amberBeer` auf Icons | `text-orange` | |

---

## Task 1: tailwind.config.ts — Token-Palette updaten

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Orange-Token hinzufügen und Tokens bereinigen**

Ersetze den gesamten `colors`-Block in `tailwind.config.ts`:

```ts
colors: {
  // Basis
  cream: "#fbf0dc",         // Legacy — noch in globals.css verwendet
  foam: "#fffaf1",          // Legacy
  malt: "#432b1d",          // Textfarbe Light
  ink: "#24201b",
  hop: "#2f8f68",
  dangerSoft: "#fae1dc",
  // Dark mode
  nightBg: "#14100a",
  nightSurface: "#252015",
  nightSurface2: "#2e2318",
  nightBorder: "#3a2f25",
  nightText: "#f0ead8",
  nightMuted: "#a89880",
  // Orange Akzent (neu, einziger Akzent)
  orange: "#f04e1b",
  orangeHover: "#f26040",
  orangePress: "#c73a0f",
  // Behalte amberBeer für Legacy-Referenzen in page.tsx bis Task 9
  amberBeer: "#f3b63f",
  orangeBeer: "#e87932",
  // Grün für Erfolg
  emerald: "#2e8a64",
  wine: "#7a1e2e",
  // UI helper
  glassEdge: "rgba(255,255,255,0.55)"
},
```

- [ ] **Step 2: boxShadow-Block updaten**

Ersetze den gesamten `boxShadow`-Block:

```ts
boxShadow: {
  board: "0 22px 60px rgba(67, 43, 29, 0.13), 0 2px 10px rgba(67, 43, 29, 0.08)",
  surface: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
  surfaceDark: "0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)",
  glow: "0 0 0 4px rgba(240,78,27,0.22)",
  glowDanger: "0 0 0 4px rgba(220, 38, 38, 0.35)",
  glowHit: "0 0 0 4px rgba(63, 155, 99, 0.35)",
  orangeRing: "0 0 0 3px rgba(240,78,27,0.35)",
},
```

- [ ] **Step 3: backgroundImage-Block auf verwendete Bilder reduzieren**

Ersetze den gesamten `backgroundImage`-Block:

```ts
backgroundImage: {
  "pilsner-fill": "linear-gradient(180deg, #f5c958 0%, #e8a92b 70%, #c8801b 100%)",
  "stout-fill":   "linear-gradient(180deg, #5b3019 0%, #3d2412 60%, #1d100a 100%)",
},
```

- [ ] **Step 4: animation-Block updaten (dekorative Animationen entfernen)**

Ersetze den gesamten `animation`-Block:

```ts
animation: {
  wobble:        "wobble 0.7s ease-in-out",
  "drum-roll":   "drumRoll 1.4s ease-in-out",
  "reveal-pop":  "revealPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
  "fade-up":     "fadeUp 0.4s ease-out",
  "fade-in":     "fadeIn 0.35s ease-out",
  press:         "press 0.15s ease-out",
  confetti:      "confettiFall 1.6s ease-out forwards",
  shake:         "shake 0.5s ease-in-out",
  "pulse-grow":  "pulseGrow 1.5s ease-in-out infinite",
  "score-tick":  "scoreTick 0.45s cubic-bezier(0.34,1.56,0.64,1)",
  "num-flip-out":"numFlipOut 0.15s ease-in forwards",
  "num-flip-in": "numFlipIn 0.2s ease-out forwards",
  "orange-pulse-once": "orangePulseOnce 0.6s ease-out forwards",
},
```

- [ ] **Step 5: keyframes-Block updaten**

Ersetze den gesamten `keyframes`-Block:

```ts
keyframes: {
  wobble: {
    "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
    "15%": { transform: "translateX(-8px) rotate(-3deg)" },
    "30%": { transform: "translateX(7px) rotate(3deg)" },
    "45%": { transform: "translateX(-5px) rotate(-2deg)" },
    "60%": { transform: "translateX(4px) rotate(1deg)" },
    "75%": { transform: "translateX(-2px) rotate(-1deg)" }
  },
  drumRoll: {
    "0%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
    "20%": { transform: "scale(1.05) rotate(3deg)" },
    "40%": { transform: "scale(0.98) rotate(-2deg)" },
    "60%": { transform: "scale(1.02) rotate(2deg)" },
    "80%": { transform: "scale(1) rotate(-1deg)" },
    "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" }
  },
  revealPop: {
    "0%": { transform: "scale(0) rotate(-180deg)", opacity: "0" },
    "60%": { transform: "scale(1.15) rotate(10deg)", opacity: "1" },
    "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" }
  },
  fadeUp: {
    "0%": { transform: "translateY(12px)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" }
  },
  fadeIn: {
    "0%": { opacity: "0" },
    "100%": { opacity: "1" }
  },
  press: {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(0.93)" },
    "100%": { transform: "scale(1)" }
  },
  confettiFall: {
    "0%": { transform: "translateY(-20vh) rotate(0deg)", opacity: "1" },
    "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" }
  },
  shake: {
    "0%, 100%": { transform: "translateX(0)" },
    "25%": { transform: "translateX(-6px)" },
    "75%": { transform: "translateX(6px)" }
  },
  pulseGrow: {
    "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(240, 78, 27, 0.4)" },
    "50%": { transform: "scale(1.03)", boxShadow: "0 0 0 14px rgba(240, 78, 27, 0)" }
  },
  scoreTick: {
    "0%": { transform: "translateY(8px)", opacity: "0" },
    "60%": { transform: "translateY(-3px)", opacity: "1" },
    "100%": { transform: "translateY(0)", opacity: "1" }
  },
  numFlipOut: {
    "0%": { transform: "translateY(0)", opacity: "1" },
    "100%": { transform: "translateY(-8px)", opacity: "0" }
  },
  numFlipIn: {
    "0%": { transform: "translateY(8px)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" }
  },
  orangePulseOnce: {
    "0%": { boxShadow: "0 0 0 0 rgba(240,78,27,0.5)" },
    "100%": { boxShadow: "0 0 0 14px rgba(240,78,27,0)" }
  },
},
```

- [ ] **Step 6: Type-Check ausführen**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler (tailwind.config.ts ist kein TS-Laufzeit-Code, aber Fehler in der Config-Syntax werden gemeldet).

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts
git commit -m "design: update tailwind tokens — orange accent, remove gold/brass"
```

---

## Task 2: globals.css — Komplette Überarbeitung

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: CSS-Variablen neu schreiben**

Ersetze den gesamten `:root`-Block:

```css
:root {
  color-scheme: light;
  --bg-page:
    radial-gradient(900px 600px at 15% -15%, rgba(240,78,27,0.06), transparent 60%),
    radial-gradient(700px 500px at 85% -5%, rgba(240,78,27,0.04), transparent 55%),
    linear-gradient(180deg, #f7f4f0 0%, #f3f0ea 100%);
  --bg-solid: #f7f4f0;
  --color-text: #1a1510;
  --focus-ring: rgba(240, 78, 27, 0.4);
}
```

- [ ] **Step 2: `.dark`-Variablen neu schreiben**

Ersetze den gesamten `.dark`-Block:

```css
.dark {
  color-scheme: dark;
  --bg-page:
    radial-gradient(1000px 600px at 50% -10%, rgba(240,78,27,0.09), transparent 60%),
    radial-gradient(800px 500px at 5% 100%, rgba(240,78,27,0.05), transparent 65%),
    linear-gradient(180deg, #1a1510 0%, #14100a 50%, #0e0b07 100%);
  --bg-solid: #14100a;
  --color-text: #f0ead8;
  --focus-ring: rgba(240, 78, 27, 0.5);
}
```

- [ ] **Step 3: body-Styles aktualisieren**

Das `body::before`-Noise-Overlay bleibt, wird aber dezenter:

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
    radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px);
  background-size: 7px 7px, 11px 11px;
  background-position: 0 0, 3px 4px;
  opacity: 0.18;
  mix-blend-mode: multiply;
  z-index: 0;
}

.dark body::before {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  mix-blend-mode: screen;
  opacity: 0.18;
}
```

- [ ] **Step 4: `.coaster` neu implementieren (Klassenname bleibt)**

Ersetze den gesamten `.coaster`- und `.dark .coaster`-Block:

```css
.coaster {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  position: relative;
}

.dark .coaster {
  background: #252015;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 5: `.coaster-rim` leeren (Klassenname bleibt für Kompatibilität)**

```css
/* Leer — war die goldene Brass-Linie oben, jetzt entfernt */
.coaster-rim {}
.coaster-rim::before { display: none; }
```

- [ ] **Step 6: `.brass-pill` neu implementieren (solid orange)**

Ersetze den gesamten `.brass-pill`- und `.brass-pill:active`-Block:

```css
.brass-pill {
  background: #f04e1b;
  color: #ffffff;
  transition: background 120ms ease, transform 100ms ease, box-shadow 120ms ease;
}

.brass-pill:hover:not(:disabled) {
  background: #f26040;
}

.brass-pill:active:not(:disabled) {
  background: #c73a0f;
  transform: scale(0.96);
}
```

- [ ] **Step 7: `.gold-text` löschen**

Entferne den gesamten `.gold-text`- und `.dark .gold-text`-Block (ca. 10 Zeilen). Die Klasse wird in TSX-Dateien in späteren Tasks entfernt.

- [ ] **Step 8: `.gold-shimmer` löschen**

Entferne den gesamten `.gold-shimmer`-, `.gold-shimmer::after`- und `@keyframes goldShimmer`-Block.

- [ ] **Step 9: `.embossed-text` löschen**

Entferne den gesamten `.embossed-text`- und `.dark .embossed-text`-Block.

- [ ] **Step 10: `.bar-wood` löschen**

Entferne den gesamten `.bar-wood`- und `.bar-wood::after`-Block.

- [ ] **Step 11: `.foam-cap` löschen**

Entferne den gesamten `.foam-cap`-, `.foam-cap::before`- und `.foam-cap::after`-Block.

- [ ] **Step 12: `.spotlight` leeren**

```css
/* Leer — war der goldene Lichtkegel, jetzt entfernt */
.spotlight {}
.spotlight::before { display: none; }
```

- [ ] **Step 13: `.tap-input` neu implementieren (flat, orange focus)**

Ersetze den gesamten `.tap-input`-Block:

```css
.tap-input {
  background: #ffffff;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
  color: var(--color-text);
}

.tap-input:focus {
  border-color: #f04e1b;
  box-shadow: 0 0 0 3px rgba(240, 78, 27, 0.2);
  outline: none;
}

.dark .tap-input {
  background: #1e1812;
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--color-text);
}

.dark .tap-input:focus {
  border-color: #f04e1b;
  box-shadow: 0 0 0 3px rgba(240, 78, 27, 0.25);
}
```

- [ ] **Step 14: `.mug-glow` auf orange umstellen**

```css
.mug-glow {
  filter: drop-shadow(0 8px 18px rgba(240, 78, 27, 0.2));
}

.dark .mug-glow {
  filter: drop-shadow(0 8px 28px rgba(240, 78, 27, 0.28));
}
```

- [ ] **Step 15: `.bubble` und `@keyframes bubbleRise` löschen**

Entferne den gesamten `.bubble`-Block und den `@keyframes bubbleRise`-Block.

- [ ] **Step 16: `.cta-pulse` und beide `@keyframes ctaPulse*` löschen**

Entferne `.cta-pulse`, `.dark .cta-pulse`, `@keyframes ctaPulse` und `@keyframes ctaPulseDark`.

- [ ] **Step 17: `.candle-flicker` und `@keyframes candleFlicker` löschen**

Entferne `.candle-flicker`- und `@keyframes candleFlicker`-Block.

- [ ] **Step 18: Neue Animationen hinzufügen**

Füge nach den bestehenden `@keyframes` hinzu:

```css
@keyframes orangePulseOnce {
  0%   { box-shadow: 0 0 0 0 rgba(240, 78, 27, 0.5); }
  100% { box-shadow: 0 0 0 14px rgba(240, 78, 27, 0); }
}

@keyframes numFlipOut {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-8px); opacity: 0; }
}

@keyframes numFlipIn {
  0%   { transform: translateY(8px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

- [ ] **Step 19: `.scroll-vintage` auf orange Scrollbar umstellen**

```css
.scroll-vintage {
  scrollbar-width: thin;
  scrollbar-color: rgba(240, 78, 27, 0.35) transparent;
}
.scroll-vintage::-webkit-scrollbar { width: 8px; height: 8px; }
.scroll-vintage::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #f26040, #c73a0f);
  border-radius: 8px;
}
.scroll-vintage::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 20: `.scrollbar-soft` auf orange umstellen**

```css
.scrollbar-soft {
  scrollbar-color: rgba(240, 78, 27, 0.3) transparent;
  scrollbar-width: thin;
}

.dark .scrollbar-soft {
  scrollbar-color: rgba(240, 78, 27, 0.25) transparent;
}
```

- [ ] **Step 21: focus-visible Ring auf orange**

```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}
```

(Dieser Block existiert schon — `--focus-ring` ist jetzt orange dank Step 1.)

- [ ] **Step 22: `::selection` auf orange**

```css
::selection {
  background: rgba(240, 78, 27, 0.3);
}
```

- [ ] **Step 23: Dev-Server starten und visuell prüfen**

```bash
npm run dev
```

Öffne `http://localhost:3000` im Browser:
- Hintergrund ist warm-grau (nicht cremig-gelb)
- Kein Gold sichtbar
- Dark Mode: tief dunkel, kein Goldschimmer
- `.brass-pill`-Buttons sind jetzt orange solid

- [ ] **Step 24: Commit**

```bash
git add app/globals.css
git commit -m "design: rewrite globals.css — orange accent, no gold/wood/brass"
```

---

## Task 3: AccountHeader.tsx + auth/layout.tsx

**Files:**
- Modify: `components/AccountHeader.tsx`
- Modify: `app/(auth)/layout.tsx`

- [ ] **Step 1: AccountHeader.tsx — `gold-text` entfernen**

Datei lesen und folgende Stellen ändern:

Zeile ~156:
```tsx
// Vorher:
<span className="gold-text bg-clip-text text-xl font-black">Bierwiegen</span>

// Nachher:
<span className="text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
```

Zeile ~158:
```tsx
// Vorher:
<span className="gold-text bg-clip-text text-xl font-black sm:hidden">Bierwiegen</span>

// Nachher:
<span className="text-xl font-semibold text-malt dark:text-nightText sm:hidden">Bierwiegen</span>
```

- [ ] **Step 2: AccountHeader.tsx — `brass-pill` auf Icon-Circles prüfen**

Zeile ~118 (Theme-Toggle-Button):
```tsx
// Vorher:
? "brass-pill text-malt"
// Nachher:
? "bg-orange text-white"
```

Zeile ~149 (Avatar-Circle):
```tsx
// Vorher:
<span className="brass-pill grid size-10 place-items-center rounded-full text-malt shadow-md">
// Nachher:
<span className="grid size-10 place-items-center rounded-full bg-orange text-white shadow-md">
```

Zeile ~188 (Profil-Button):
```tsx
// Vorher:
className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black active:scale-95"
// Nachher:
className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-medium text-white active:scale-95"
```

- [ ] **Step 3: auth/layout.tsx — gold-text und brass-pill entfernen**

Zeile ~21:
```tsx
// Vorher:
<span className="brass-pill grid size-10 place-items-center rounded-full">
// Nachher:
<span className="grid size-10 place-items-center rounded-full bg-orange text-white">
```

Zeile ~28:
```tsx
// Vorher:
<span className="gold-text bg-clip-text text-xl font-black">Bierwiegen</span>
// Nachher:
<span className="text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
```

- [ ] **Step 4: Type-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add components/AccountHeader.tsx "app/(auth)/layout.tsx"
git commit -m "design: remove gold-text/brass-pill from AccountHeader and auth layout"
```

---

## Task 4: Auth-Seiten (Login, Signup, Reset-Password)

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`

Alle drei Seiten haben dasselbe Muster. Für jede Datei:

- [ ] **Step 1: login/page.tsx — `coaster-rim`, `gold-text`, `cta-pulse` entfernen**

Zeile ~85:
```tsx
// Vorher:
<div className="coaster coaster-rim p-6 phase-enter">
// Nachher:
<div className="coaster p-6 phase-enter">
```

Zeile ~86:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-3xl font-black">Willkommen zurück</h1>
// Nachher:
<h1 className="text-3xl font-semibold text-malt dark:text-nightText">Willkommen zurück</h1>
```

Zeile ~120:
```tsx
// Vorher:
className="brass-pill cta-pulse mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-black disabled:opacity-50"
// Nachher:
className="brass-pill mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-medium disabled:opacity-50"
```

- [ ] **Step 2: signup/page.tsx — gleiche Änderungen**

Zeile ~63:
```tsx
// Vorher:
<div className="coaster coaster-rim p-6 phase-enter">
// Nachher:
<div className="coaster p-6 phase-enter">
```

Zeile ~64:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-3xl font-black">Account erstellen</h1>
// Nachher:
<h1 className="text-3xl font-semibold text-malt dark:text-nightText">Account erstellen</h1>
```

Zeile ~107:
```tsx
// Vorher:
className="brass-pill cta-pulse mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-black disabled:opacity-50"
// Nachher:
className="brass-pill mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-medium disabled:opacity-50"
```

- [ ] **Step 3: reset-password/page.tsx — gleiche Änderungen**

Zeile ~42:
```tsx
// Vorher:
<div className="coaster coaster-rim p-6 phase-enter">
// Nachher:
<div className="coaster p-6 phase-enter">
```

Zeile ~43:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-3xl font-black">Passwort zurücksetzen</h1>
// Nachher:
<h1 className="text-3xl font-semibold text-malt dark:text-nightText">Passwort zurücksetzen</h1>
```

Zeile ~67:
```tsx
// Vorher:
className="brass-pill cta-pulse inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-black disabled:opacity-50"
// Nachher:
className="brass-pill inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-medium disabled:opacity-50"
```

- [ ] **Step 4: Type-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/signup/page.tsx" "app/(auth)/reset-password/page.tsx"
git commit -m "design: remove gold-text/cta-pulse/coaster-rim from auth pages"
```

---

## Task 5: games/page.tsx

**Files:**
- Modify: `app/games/page.tsx`

- [ ] **Step 1: Header-Section bereinigen**

Zeile ~54:
```tsx
// Vorher:
<section className="coaster coaster-rim spotlight px-4 py-3 sm:px-6 sm:py-4">
// Nachher:
<section className="coaster px-4 py-3 sm:px-6 sm:py-4">
```

Zeile ~60:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-2xl font-black sm:text-3xl">Meine Spiele</h1>
// Nachher:
<h1 className="text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">Meine Spiele</h1>
```

Zeile ~68:
```tsx
// Vorher:
className="brass-pill cta-pulse inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black active:scale-95"
// Nachher:
className="brass-pill inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium active:scale-95"
```

- [ ] **Step 2: Section-Komponente bereinigen**

Zeile ~115 (Badge für aktive Spiele):
```tsx
// Vorher:
accent === "amber"
  ? "brass-pill"
  : "bg-cream text-malt dark:bg-nightSurface2 dark:text-nightText"

// Nachher:
accent === "amber"
  ? "bg-orange text-white"
  : "bg-black/5 text-malt dark:bg-white/5 dark:text-nightText"
```

Zeile ~127:
```tsx
// Vorher:
<div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
// Nachher: (scroll-vintage bleibt — CSS wird in globals.css schon aktualisiert)
<div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
```
(Keine Änderung nötig — scroll-vintage ist in globals.css bereits orange.)

- [ ] **Step 3: Eyebrow-Label modernisieren**

Zeile ~57 (falls vorhanden, suche nach `text-[0.6rem] font-black uppercase tracking-[0.25em]`):
```tsx
// Vorher:
<div className="text-[0.6rem] font-black uppercase tracking-[0.25em] text-malt/55 dark:text-brassLight/60">
  Deine Theke
</div>
// Nachher:
<div className="text-xs font-medium uppercase tracking-widest text-malt/50 dark:text-nightMuted">
  Deine Theke
</div>
```

- [ ] **Step 4: Type-Check und Commit**

```bash
npx tsc --noEmit
git add app/games/page.tsx
git commit -m "design: clean up games/page.tsx — remove gold/brass/cta-pulse"
```

---

## Task 6: games/new/page.tsx

**Files:**
- Modify: `app/games/new/page.tsx`

- [ ] **Step 1: Header-Section bereinigen**

Zeile ~119:
```tsx
// Vorher:
<section className="coaster coaster-rim spotlight px-4 py-3 sm:px-6 sm:py-4">
// Nachher:
<section className="coaster px-4 py-3 sm:px-6 sm:py-4">
```

Zeile ~125:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-2xl font-black sm:text-3xl">Neues Online-Spiel</h1>
// Nachher:
<h1 className="text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">Neues Online-Spiel</h1>
```

- [ ] **Step 2: Buttons bereinigen**

Zeile ~170 und ~199 (Toggle-Buttons in `brass-pill`-Variante):
```tsx
// Vorher:
? "brass-pill"
// Nachher:
? "bg-orange text-white"
```

Zeile ~233 (Primär-CTA):
```tsx
// Vorher:
className="brass-pill cta-pulse mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-black active:scale-95 disabled:opacity-50"
// Nachher:
className="brass-pill mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-medium active:scale-95 disabled:opacity-50"
```

Zeile ~251 (kleiner Button):
```tsx
// Vorher:
className="brass-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black active:scale-95"
// Nachher:
className="brass-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium active:scale-95"
```

Zeile ~262:
```tsx
// Vorher:
<div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
// Nachher: keine Änderung (scroll-vintage bleibt)
```

- [ ] **Step 3: Type-Check und Commit**

```bash
npx tsc --noEmit
git add app/games/new/page.tsx
git commit -m "design: clean up games/new/page.tsx — remove gold/brass/cta-pulse"
```

---

## Task 7: games/[id]/page.tsx

**Files:**
- Modify: `app/games/[id]/page.tsx`

Diese Datei ist groß (~1100 Zeilen). Ändere genau die identifizierten Stellen:

- [ ] **Step 1: Header bereinigen (Zeile ~346, ~355)**

```tsx
// Vorher:
<header className="coaster coaster-rim spotlight relative flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
// Nachher:
<header className="coaster relative flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
```

```tsx
// Vorher:
<h1 className="gold-text bg-clip-text truncate text-2xl font-black sm:text-3xl">{game.name}</h1>
// Nachher:
<h1 className="truncate text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">{game.name}</h1>
```

- [ ] **Step 2: Tab-Toggle-Buttons (Zeile ~722)**

```tsx
// Vorher:
active ? "brass-pill" : "text-malt/65 dark:text-nightMuted"
// Nachher:
active ? "bg-orange text-white" : "text-malt/65 dark:text-nightMuted"
```

- [ ] **Step 3: Runden-Info-Panel (Zeile ~791)**

```tsx
// Vorher:
<div className="coaster coaster-rim spotlight relative overflow-hidden px-4 py-3">
// Nachher:
<div className="coaster relative overflow-hidden px-4 py-3">
```

Zeile ~804–805:
```tsx
// Vorher:
Ziel <span className="gold-text bg-clip-text">{grams(activeRound.target_weight)}</span> · Ansager{" "}
<span className="gold-text bg-clip-text">{callerName}</span>
// Nachher:
Ziel <span className="font-semibold text-orange">{grams(activeRound.target_weight)}</span> · Ansager{" "}
<span className="font-semibold text-orange">{callerName}</span>
```

Zeile ~811 (`candle-flicker` entfernen):
```tsx
// Vorher:
<Crown className="size-4 text-amberBeer candle-flicker" />
// Nachher:
<Crown className="size-4 text-orange" />
```

- [ ] **Step 4: Badges (Zeile ~536, ~851, ~937)**

Alle `brass-pill rounded-full px-*` auf Badges (keine Buttons!):
```tsx
// Vorher:
<span className="brass-pill rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase">
// Nachher:
<span className="rounded-full bg-orange px-1.5 py-0.5 text-[0.55rem] font-medium uppercase text-white">
```

(Alle 3 Badge-Stellen gleich behandeln.)

- [ ] **Step 5: Action-Buttons (Zeile ~578, ~620, ~694, ~904, ~913, ~978)**

Alle `brass-pill` auf runde Icon-Buttons und CTA-Buttons:
```tsx
// Vorher: (Icon-Kreis-Buttons)
className="brass-pill grid size-9 place-items-center rounded-full active:scale-95 disabled:opacity-40"
// Nachher:
className="grid size-9 place-items-center rounded-full bg-orange text-white active:scale-95 disabled:opacity-40"
```

```tsx
// Vorher: (kleine Icon-Buttons, Zeile ~978)
className="brass-pill grid size-6 place-items-center rounded-full text-xs font-black disabled:opacity-40"
// Nachher:
className="grid size-6 place-items-center rounded-full bg-orange text-xs text-white disabled:opacity-40"
```

```tsx
// Vorher: (CTA-Buttons mit cta-pulse, Zeile ~694)
className="brass-pill cta-pulse mt-2 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-sm font-black active:scale-95 disabled:opacity-40"
// Nachher:
className="brass-pill mt-2 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium active:scale-95 disabled:opacity-40"
```

```tsx
// Vorher: (Zeile ~904, ~913)
className="brass-pill cta-pulse inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-black active:scale-95"
// Nachher:
className="brass-pill inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-medium active:scale-95"
```

- [ ] **Step 6: scroll-vintage bleibt (kein Änderungsbedarf)**

Alle `scroll-vintage`-Vorkommen können bleiben — die CSS-Definition wurde bereits in Task 2 aktualisiert.

- [ ] **Step 7: Type-Check und Commit**

```bash
npx tsc --noEmit
git add "app/games/[id]/page.tsx"
git commit -m "design: clean up games/[id]/page.tsx — remove gold/brass/cta-pulse/candle-flicker"
```

---

## Task 8: profile/page.tsx

**Files:**
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Header-Section bereinigen (Zeile ~145)**

```tsx
// Vorher:
<section className="coaster coaster-rim spotlight flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
// Nachher:
<section className="coaster flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
```

- [ ] **Step 2: Avatar-Circle (Zeile ~147)**

```tsx
// Vorher:
<div className="brass-pill grid size-14 place-items-center rounded-full text-2xl font-black shadow-md">
// Nachher:
<div className="grid size-14 place-items-center rounded-full bg-orange text-2xl font-bold text-white shadow-md">
```

- [ ] **Step 3: Icon-Buttons und Action-Buttons (Zeilen ~160, ~188, ~387)**

Zeile ~160:
```tsx
// Vorher:
className="brass-pill grid size-10 place-items-center rounded-full active:scale-95"
// Nachher:
className="grid size-10 place-items-center rounded-full bg-orange text-white active:scale-95"
```

Zeile ~188 und ~387:
```tsx
// Vorher:
className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black active:scale-95"
// Nachher:
className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium active:scale-95"
```

- [ ] **Step 4: gold-text (Zeile ~167)**

```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-2xl font-black sm:text-3xl">{displayName}</h1>
// Nachher:
<h1 className="text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">{displayName}</h1>
```

- [ ] **Step 5: Tab-Toggle (Zeile ~224)**

```tsx
// Vorher:
active ? "brass-pill" : "text-malt/65 hover:text-malt dark:text-nightMuted"
// Nachher:
active ? "bg-orange text-white" : "text-malt/65 hover:text-malt dark:text-nightMuted"
```

- [ ] **Step 6: Badges (Zeilen ~276, ~317, ~353)**

```tsx
// Vorher:
? "brass-pill"
// (in Badge-Kontext)
// Nachher:
? "bg-orange text-white"
```

```tsx
// Vorher:
<span className="brass-pill shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-black">
// Nachher:
<span className="shrink-0 rounded-full bg-orange px-2 py-0.5 text-[0.6rem] font-medium text-white">
```

```tsx
// Vorher:
<span className="brass-pill rounded-full px-2 py-0.5 text-[0.6rem] font-black">{row.games}×</span>
// Nachher:
<span className="rounded-full bg-orange px-2 py-0.5 text-[0.6rem] font-medium text-white">{row.games}×</span>
```

- [ ] **Step 7: scroll-vintage bleibt (kein Änderungsbedarf)**

- [ ] **Step 8: Type-Check und Commit**

```bash
npx tsc --noEmit
git add app/profile/page.tsx
git commit -m "design: clean up profile/page.tsx — remove gold/brass"
```

---

## Task 9: app/page.tsx (Haupt-Spielseite — größte Datei)

**Files:**
- Modify: `app/page.tsx`

Diese Datei hat über 50 Klassennamen-Vorkommen, die geändert werden müssen. Arbeite mit `replace_all` wo möglich.

- [ ] **Step 1: `cta-pulse` entfernen — alle statischen Vorkommen**

Suche nach allen Stellen mit `"cta-pulse"` als statische Klasse (nicht konditional). Beispiele:

Zeile ~1560:
```tsx
// Vorher:
className="cta-pulse inline-flex items-center gap-2 rounded-full bg-amberBeer px-5 py-3 text-sm font-black text-malt shadow-lg active:scale-95"
// Nachher:
className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-medium text-white shadow-lg active:scale-95"
```

Zeile ~3361:
```tsx
// Vorher:
className="cta-pulse mt-3 w-full rounded-full bg-amberBeer px-4 py-3 text-base font-black text-malt shadow-lg"
// Nachher:
className="mt-3 w-full rounded-full bg-orange px-4 py-3 text-base font-medium text-white shadow-lg"
```

Zeile ~3426:
```tsx
// Vorher:
className="cta-pulse rounded-full bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow-lg"
// Nachher:
className="rounded-full bg-orange px-4 py-2 text-sm font-medium text-white shadow-lg"
```

- [ ] **Step 2: `cta-pulse` entfernen — alle konditionalen Vorkommen**

Zeile ~2508:
```tsx
// Vorher:
ready && "cta-pulse"
// Nachher: (entfernen — einfach löschen oder auf leer setzen)
// Lösche diese Zeile / diesen Ausdruck aus dem className
```

Zeile ~2608:
```tsx
// Vorher:
className="cta-pulse inline-flex items-center gap-2 rounded-full bg-amberBeer px-5 py-3 text-sm font-black text-malt shadow-lg active:scale-95"
// Nachher:
className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-medium text-white shadow-lg active:scale-95"
```

Zeile ~2629:
```tsx
// Vorher:
complete && !readonly ? "cta-pulse bg-amberBeer text-malt" : "bg-malt text-white"
// Nachher:
complete && !readonly ? "bg-orange text-white" : "bg-malt text-white"
```

Zeile ~3071:
```tsx
// Vorher:
!hasOpenSpecials && "cta-pulse"
// Nachher: (Zeile löschen / entfernen)
```

Zeile ~3371:
```tsx
// Vorher:
complete && !coinSpinning && "cta-pulse"
// Nachher: (Zeile löschen / entfernen)
```

Zeile ~3843:
```tsx
// Vorher:
value && value !== "," && "cta-pulse"
// Nachher: (Zeile löschen / entfernen)
```

- [ ] **Step 3: `gold-text` entfernen (Zeilen ~1875, ~2000)**

Zeile ~1875:
```tsx
// Vorher:
<h1 className="gold-text bg-clip-text text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-[6.5rem]">
// Nachher:
<h1 className="text-6xl font-semibold leading-[0.95] tracking-tight text-malt dark:text-nightText sm:text-7xl lg:text-[6.5rem]">
```

Zeile ~2000:
```tsx
// Vorher:
<div className="gold-text bg-clip-text mt-1 text-7xl font-black leading-none">289 g</div>
// Nachher:
<div className="mt-1 text-7xl font-bold leading-none text-orange tabular-nums">289 g</div>
```

- [ ] **Step 4: `gold-shimmer` und `candle-flicker` entfernen**

Zeile ~1872:
```tsx
// Vorher:
<Sparkles className="size-3 text-orangeBeer candle-flicker" />
// Nachher:
<Sparkles className="size-3 text-orange" />
```

Zeile ~1889:
```tsx
// Vorher:
className="brass-pill cta-pulse gold-shimmer inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-black active:scale-95"
// Nachher:
className="brass-pill inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-medium active:scale-95"
```

Zeile ~2007:
```tsx
// Vorher:
<Medal className="size-3.5 candle-flicker text-amberBeer" />
// Nachher:
<Medal className="size-3.5 text-orange" />
```

- [ ] **Step 5: `brass-pill` auf Hero und statische Buttons**

Zeile ~1848:
```tsx
// Vorher:
className="brass-pill inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black shadow active:scale-95"
// Nachher:
className="brass-pill inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow active:scale-95"
```

Zeile ~1976 (Pill-Badge):
```tsx
// Vorher:
<div className="brass-pill rounded-full px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wider">
// Nachher:
<div className="rounded-full bg-orange px-3 py-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-white">
```

Zeile ~2118 (konditionales Badge):
```tsx
// Vorher:
? "brass-pill"
// Nachher:
? "bg-orange text-white"
```

- [ ] **Step 6: `bg-amberBeer text-malt` auf restliche CTA-Buttons**

Suche alle verbleibenden `bg-amberBeer text-malt`-Kombinationen in Buttons und ersetze:
```tsx
// Vorher: bg-amberBeer ... text-malt
// Nachher: bg-orange ... text-white
```

- [ ] **Step 7: Type-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler. Falls `text-orange` nicht gefunden wird — prüfe ob der Token in `tailwind.config.ts` aus Task 1 korrekt eingetragen ist.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx
git commit -m "design: clean up app/page.tsx — remove cta-pulse/gold/shimmer/candle, orange CTAs"
```

---

## Task 10: invite/[token]/page.tsx

**Files:**
- Modify: `app/invite/[token]/page.tsx`

- [ ] **Step 1: CTA-Button bereinigen (Zeile ~109)**

```tsx
// Vorher:
className="cta-pulse mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-amberBeer text-lg font-black text-malt shadow-lg active:scale-95 disabled:opacity-50"
// Nachher:
className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-orange text-lg font-medium text-white shadow-lg active:scale-95 disabled:opacity-50"
```

- [ ] **Step 2: Type-Check und Commit**

```bash
npx tsc --noEmit
git add "app/invite/[token]/page.tsx"
git commit -m "design: clean up invite page — remove cta-pulse, orange CTA"
```

---

## Task 11: components/fx/BeerMug.tsx

**Files:**
- Modify: `components/fx/BeerMug.tsx`

- [ ] **Step 1: mug-glow-Klasse prüfen**

Zeile ~55: Die Klasse `mug-glow` bleibt — sie ist in globals.css (Task 2, Step 14) bereits auf orange umgestellt. Keine TSX-Änderung nötig.

- [ ] **Step 2: Sicherstellen, dass keine Goldfarben inline verwendet werden**

Datei lesen und nach `#f5d27a`, `#e6b34a`, `#c8932b`, `#fff2c2`, `gold`, `brass` suchen. Falls gefunden, auf entsprechende Orange-Töne anpassen:
- `#f5d27a` → `#f26040`
- `#e6b34a` → `#f04e1b`
- `#c8932b` → `#c73a0f`

- [ ] **Step 3: Type-Check und Commit**

```bash
npx tsc --noEmit
git add components/fx/BeerMug.tsx
git commit -m "design: update BeerMug — orange glow, no gold inline colors"
```

---

## Task 12: Finale Verifikation

**Files:** Keine neuen Änderungen — nur Prüfung.

- [ ] **Step 1: Type-Check final**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler.

- [ ] **Step 2: Dev-Server starten**

```bash
npm run dev
```

- [ ] **Step 3: Visuell prüfen — Light Mode**

Öffne `http://localhost:3000` und überprüfe:
- [ ] Hintergrund ist warm-grau (nicht cremig-gelb)
- [ ] Kein Gold in Headings, Buttons oder Badges sichtbar
- [ ] Primär-Buttons sind solid orange
- [ ] Karten (`.coaster`) sind weiß mit feinem Schatten
- [ ] Input-Felder sind flat mit orange Focus-Ring
- [ ] Eyebrow-Labels sind `font-medium uppercase tracking-widest`

- [ ] **Step 4: Visuell prüfen — Dark Mode**

Toggle Dark Mode und überprüfe:
- [ ] Hintergrund ist tief dunkelbraun (nicht schwarz)
- [ ] Karten sind `#252015` (dunkelbraun), klar abgesetzt
- [ ] Kein Goldschimmer, keine Messinglinien
- [ ] Orange Buttons bleiben gut lesbar
- [ ] Focus-Ring ist orange

- [ ] **Step 5: Spielseite prüfen (`/`)**

- [ ] Hero-Titel ohne Gold-Gradient
- [ ] CTA-Buttons sind orange
- [ ] Keine Endlos-Animationen (kein Shimmer, kein Kerzen-Flackern)
- [ ] Score-Anzeige gut lesbar
- [ ] Spielmomente (Hit, Score-Update) haben noch Feedback

- [ ] **Step 6: Auth-Seiten prüfen (`/login`, `/signup`)**

- [ ] Karten ohne Brass-Linie oben
- [ ] Titel normal (kein Goldgradient)
- [ ] Submit-Button orange

- [ ] **Step 7: Profile-Seite prüfen (`/profile`)**

- [ ] Avatar-Kreis ist orange
- [ ] Tab-Toggle zeigt orange für aktiven Tab
- [ ] Badges sind orange

- [ ] **Step 8: `font-black` Rest-Cleanup (optional)**

Falls nach der Redesign-Überprüfung noch zu viele "schreienende" Schriften auffallen:
```bash
grep -rn "font-black" app/ components/ --include="*.tsx" | grep -v "node_modules"
```
Ergebnis durchgehen und `font-black` auf `font-semibold` (Headings) oder `font-medium` (Labels/Buttons) ändern, wo es visuell auffällt.

- [ ] **Step 9: Finaler Commit falls nötig**

```bash
git add -p  # nur ungestagete Fixes
git commit -m "design: final visual fixes after redesign review"
```
