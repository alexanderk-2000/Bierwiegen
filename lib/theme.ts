// Eine Quelle der Wahrheit fürs Theme — genutzt vom lokalen Spiel, AccountHeader und den Auth-Seiten.

export type Theme = "light" | "dark";

export const THEME_KEY = "bw-theme";
const LEGACY_SETTINGS_KEY = "bierwiegen-v1-settings";
const THEME_EVENT = "bw-theme-change";

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

export function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_SETTINGS_KEY) ?? "{}") as { theme?: unknown };
    if (isTheme(legacy.theme)) return legacy.theme;
  } catch {
    // ignore
  }
  // Standard ist das helle, freundliche Design — dunkel nur auf ausdrücklichen Wunsch.
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Speichert das Theme, wendet es an und informiert andere Komponenten. */
export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    // Lokale Spiel-Settings synchron halten, damit beide Engines dasselbe Theme sehen.
    const raw = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.theme !== theme) {
        window.localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ ...parsed, theme }));
      }
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function onThemeChange(listener: (theme: Theme) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<Theme>).detail;
    if (isTheme(detail)) listener(detail);
  };
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}

/**
 * Läuft inline im <head>, bevor irgendetwas gemalt wird — verhindert das
 * Aufblitzen des hellen Themes. Muss dieselbe Logik wie readTheme() abbilden.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"&&t!=="light"){try{t=JSON.parse(localStorage.getItem("${LEGACY_SETTINGS_KEY}")||"{}").theme}catch(e){}}d.classList.toggle("dark",t==="dark")}catch(e){}})();`;
