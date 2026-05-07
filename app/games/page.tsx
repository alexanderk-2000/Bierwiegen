"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { listMyGames } from "@/lib/db/games";
import type { Database } from "@/lib/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

export default function GamesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [games, setGames] = useState<GameRow[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/games");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    listMyGames(user.id).then(setGames);
  }, [user]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;

  const groups = {
    playing: games.filter((g) => g.status === "playing" || g.status === "setup"),
    ended: games.filter((g) => g.status === "ended"),
    archived: games.filter((g) => g.status === "archived")
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-malt dark:text-nightText">Meine Spiele</h1>
          <Link
            href="/games/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow active:scale-95"
          >
            <Plus className="size-4" />
            Neues Spiel
          </Link>
        </div>

        <div className="grid flex-1 gap-3 overflow-hidden md:grid-cols-3">
          <Section title="Aktiv" games={groups.playing} empty="Keine laufenden Spiele." accent="amber" />
          <Section title="Beendet" games={groups.ended} empty="Noch nichts beendet." />
          <Section title="Archiv" games={groups.archived} empty="Leer." />
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  games,
  empty,
  accent
}: {
  title: string;
  games: GameRow[];
  empty: string;
  accent?: "amber";
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wide text-malt/55 dark:text-nightMuted">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-black ${
            accent === "amber" ? "bg-amberBeer text-malt" : "bg-cream text-malt dark:bg-nightSurface2 dark:text-nightText"
          }`}
        >
          {games.length}
        </span>
      </div>
      {games.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-malt/20 bg-white/40 p-3 text-center text-xs font-bold text-malt/50 dark:border-nightBorder dark:bg-nightBg/40">
          {empty}
        </div>
      ) : (
        <div className="grid flex-1 gap-1.5 overflow-y-auto">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="flex items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2 shadow-sm transition hover:shadow-board dark:bg-nightSurface2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-malt dark:text-nightText">{game.name}</div>
                <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                  {new Date(game.created_at).toLocaleDateString("de-DE")} · <span className="capitalize">{game.status}</span>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-malt/50 dark:text-nightMuted" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
