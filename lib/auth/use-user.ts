"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Liefert den eingeloggten User für die UI.
 * Liest die Session lokal (kein Netzwerk-Roundtrip pro Seitenaufruf) — die Middleware
 * frischt Tokens auf, und die eigentliche Zugriffskontrolle macht RLS in der Datenbank.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      // Supabase nicht konfiguriert → das lokale Spiel funktioniert trotzdem.
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const next = session?.user ?? null;
      // Token-Refreshes liefern ein neues Objekt für denselben User — Referenz behalten,
      // damit abhängige Effekte nicht bei jedem Tab-Fokus alles neu laden.
      setUser((previous) =>
        previous && next && previous.id === next.id && previous.updated_at === next.updated_at ? previous : next
      );
      setLoading(false);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
