"use client";

// Fragt bei Supabase ab, welche OAuth-Anbieter wirklich aktiviert sind,
// damit kein Button in eine "Unsupported provider"-Sackgasse führt.

export type OAuthProvider = "google" | "apple";
export type ProviderAvailability = Record<OAuthProvider, boolean>;

const CACHE_KEY = "bw-auth-providers";
let inflight: Promise<ProviderAvailability | null> | null = null;

export function readCachedProviders(): ProviderAvailability | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProviderAvailability) : null;
  } catch {
    return null;
  }
}

/** Liefert `null`, wenn die Abfrage scheitert — dann zeigen wir vorsichtshalber alle Anbieter. */
export function fetchEnabledProviders(): Promise<ProviderAvailability | null> {
  if (inflight) return inflight;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Promise.resolve(null);
  inflight = fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { external?: Record<string, boolean> };
      if (!body.external) return null;
      const result: ProviderAvailability = {
        google: Boolean(body.external.google),
        apple: Boolean(body.external.apple)
      };
      try {
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch {
        // ignore
      }
      return result;
    })
    .catch(() => null);
  return inflight;
}
