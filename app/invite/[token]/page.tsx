"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Beer, Check, Loader2 } from "lucide-react";
import { useUser } from "@/lib/auth/use-user";
import { lookupByToken } from "@/lib/db/invitations";
import { ensureProfile } from "@/lib/db/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthCard, AuthNotice } from "@/components/auth/ui";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();
  const { user, loading } = useUser();
  const [gameName, setGameName] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const inv = await lookupByToken(token);
        if (!active) return;
        if (!inv) {
          setError("Einladung nicht gefunden oder bereits eingelöst.");
          return;
        }
        if (inv.status !== "pending" || (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now())) {
          setError("Diese Einladung ist nicht mehr gültig. Bitte den Host um einen neuen Link.");
          return;
        }
        setGameId(inv.game_id);
        const { data: game } = await getSupabaseBrowserClient()
          .from("games")
          .select("name")
          .eq("id", inv.game_id)
          .maybeSingle();
        if (active) setGameName(game?.name ?? null);
      } catch {
        if (active) setError("Die Einladung konnte nicht geladen werden. Prüfe deine Verbindung.");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const accept = async () => {
    if (!user || !gameId || !token || accepting) return;
    setAccepting(true);
    setAcceptError(null);
    play("tap");
    try {
      const supabase = getSupabaseBrowserClient();
      const profile = await ensureProfile(user.id, {
        display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Spieler"
      });
      // Erst als Spieler eintragen, dann die Einladung als angenommen markieren —
      // schlägt der Beitritt fehl, bleibt der Link weiter nutzbar.
      const { error: joinError } = await supabase.from("game_players").upsert(
        {
          game_id: gameId,
          user_id: user.id,
          display_name: profile.display_name,
          role: "player"
        },
        { onConflict: "game_id,user_id" }
      );
      if (joinError) throw joinError;
      await supabase
        .from("invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString(), invited_user_id: user.id })
        .eq("invite_token", token);
      play("bell");
      vibrate("success");
      router.push(`/games/${gameId}`);
    } catch {
      setAcceptError("Beitreten hat nicht geklappt. Bitte versuch es noch einmal.");
      vibrate("fail");
      setAccepting(false);
    }
  };

  const nextParam = encodeURIComponent(`/invite/${token}`);

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <div className="h-[3px] w-full bg-[var(--bar-rim)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(240,78,27,0.14),transparent_75%)]"
      />
      <div className="mx-auto flex min-h-[calc(100dvh-3px)] w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Bierwiegen – zur Startseite">
            <span className="grid size-10 place-items-center rounded-full bg-orange text-white shadow-md">
              <Beer className="size-5" />
            </span>
            <span className="text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 flex-col justify-center py-6">
          {error ? (
            <AuthCard title="Hoppla." subtitle={error}>
              <Link
                href="/"
                className="brass-pill mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl text-base font-semibold"
              >
                Zur Startseite
              </Link>
            </AuthCard>
          ) : checking ? (
            <div className="grid place-items-center gap-3 py-16 text-malt/60 dark:text-nightMuted" role="status">
              <Loader2 className="size-7 animate-spin" />
              <span className="text-sm font-semibold">Einladung wird geprüft…</span>
            </div>
          ) : (
            <AuthCard
              title={gameName ? `Du bist bei „${gameName}“ dabei?` : "Du wurdest zu einem Spiel eingeladen"}
              subtitle={
                user
                  ? "Ein Klick und du sitzt mit an der Theke."
                  : "Logge dich ein oder erstelle einen Account, um beizutreten."
              }
            >
              <div className="mt-5 grid gap-2.5">
                {acceptError && <AuthNotice tone="error">{acceptError}</AuthNotice>}
                {!loading && !user && (
                  <>
                    <Link
                      href={`/login?next=${nextParam}`}
                      className="brass-pill inline-flex h-13 items-center justify-center rounded-2xl text-base font-semibold shadow-[0_6px_18px_rgba(240,78,27,0.28)]"
                    >
                      Einloggen &amp; beitreten
                    </Link>
                    <Link
                      href={`/signup?next=${nextParam}`}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-malt/15 bg-white text-sm font-semibold text-malt hover:border-malt/30 active:scale-[0.98] dark:border-nightBorder dark:bg-nightSurface2 dark:text-nightText"
                    >
                      Account erstellen
                    </Link>
                  </>
                )}
                {user && gameId && (
                  <button
                    onClick={accept}
                    disabled={accepting}
                    className="brass-pill inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-[0_6px_18px_rgba(240,78,27,0.28)] disabled:opacity-50"
                  >
                    {accepting ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                    {accepting ? "Trete bei…" : "Beitreten"}
                  </button>
                )}
              </div>
            </AuthCard>
          )}
        </div>
      </div>
    </main>
  );
}
