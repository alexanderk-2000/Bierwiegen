/**
 * Erlaubt nur app-interne Pfade als Redirect-Ziel.
 * Verhindert Open Redirects über `?next=//evil.com`, `?next=@evil.com` o. ä.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  // Steuerzeichen (Tab, Newline …) werden von Browsern teils entfernt → "/\t/evil.com"
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
