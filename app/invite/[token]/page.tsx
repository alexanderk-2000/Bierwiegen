"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Beer, Check } from "lucide-react";
import { useUser } from "@/lib/auth/use-user";
import { lookupByToken } from "@/lib/db/invitations";
import { ensureProfile } from "@/lib/db/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const router = useRouter();
  const { user, loading } = useUser();
  const [gameName, setGameName] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const inv = await lookupByToken(token);
      if (!inv) {
        setError("Einladung nicht gefunden oder bereits eingelöst.");
        return;
      }
      if (inv.status !== "pending") {
        setError("Diese Einladung ist nicht mehr gültig.");
        return;
      }
      setGameId(inv.game_id);
      const supabase = getSupabaseBrowserClient();
      const { data: game } = await supabase.from("games").select("name").eq("id", inv.game_id).maybeSingle();
      setGameName(game?.name ?? null);
    })();
  }, [token]);

  const accept = async () => {
    if (!user || !gameId || !token) return;
    setAccepting(true);
    const supabase = getSupabaseBrowserClient();
    const profile = await ensureProfile(user.id, {
      display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Spieler"
    });
    // Update invitation status
    await supabase
      .from("invitations")
      .update({ status: "accepted", responded_at: new Date().toISOString(), invited_user_id: user.id })
      .eq("invite_token", token);
    // Add as player
    await supabase.from("game_players").upsert(
      {
        game_id: gameId,
        user_id: user.id,
        display_name: profile.display_name,
        role: "player"
      },
      { onConflict: "game_id,user_id" }
    );
    setAccepting(false);
    router.push(`/games/${gameId}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,#fff0bd_0,#fff7e8_28%,#fffdf7_72%)] dark:bg-[radial-gradient(circle_at_15%_0%,#2a1d12_0,#1a1410_32%,#120e0a_78%)]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-3xl border border-white/80 bg-white/95 p-6 shadow-board dark:border-nightBorder dark:bg-nightSurface">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange/15 px-3 py-1 text-xs font-medium uppercase text-orange dark:text-orange">
            <Beer className="size-4" />
            Einladung
          </div>
          {error ? (
            <>
              <h1 className="text-2xl font-black text-malt dark:text-nightText">Hoppla.</h1>
              <p className="mt-2 font-bold text-malt/65 dark:text-nightMuted">{error}</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-malt dark:text-nightText">
                Du wurdest zu {gameName ? `„${gameName}"` : "einem Spiel"} eingeladen
              </h1>
              <p className="mt-2 font-bold text-malt/65 dark:text-nightMuted">
                Logge dich ein oder erstelle einen Account, um beizutreten.
              </p>

              {!loading && !user && (
                <div className="mt-5 grid gap-2">
                  <a
                    href={`/login?next=/invite/${token}`}
                    className="inline-flex h-14 items-center justify-center rounded-full bg-orange text-lg font-medium text-white shadow-lg active:scale-95"
                  >
                    Einloggen & beitreten
                  </a>
                  <a
                    href={`/signup?next=/invite/${token}`}
                    className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[#efdcb9] bg-white font-black text-malt active:scale-95 dark:border-nightBorder dark:bg-nightSurface2 dark:text-nightText"
                  >
                    Account erstellen
                  </a>
                </div>
              )}

              {user && gameId && (
                <button
                  onClick={accept}
                  disabled={accepting}
                  className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-orange text-lg font-medium text-white shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <Check className="size-5" />
                  {accepting ? "Trete bei..." : "Beitreten"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
