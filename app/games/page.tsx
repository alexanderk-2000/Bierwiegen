"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search, Sparkles } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { listMyGames } from "@/lib/db/games";
import { play } from "@/lib/fx/sound";
import type { Database } from "@/lib/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

const STATUS_LABELS: Record<string, string> = {
  setup: "Setup",
  playing: "Läuft",
  ended: "Beendet",
  archived: "Archiv"
};

export default function GamesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [games, setGames] = useState<GameRow[]>([]);
  const [query, setQuery] = useState("");
  const [gamesLoading, setGamesLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/games");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadError(false);
    listMyGames(user.id)
      .then((rows) => {
        if (active) setGames(rows);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? games.filter((g) => g.name?.toLowerCase().includes(q)) : games;
  }, [games, query]);

  const groups = {
    playing: filtered.filter((g) => g.status === "playing" || g.status === "setup"),
    ended: filtered.filter((g) => g.status === "ended"),
    archived: filtered.filter((g) => g.status === "archived")
  };

  if (loading || !user) return <main className="h-dvh" aria-busy="true" />;

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 md:overflow-hidden px-3 py-3 sm:px-5">
        <section className="coaster px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-malt/55 dark:text-nightMuted">
                Deine Theke
              </div>
              <h1 className="text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">Meine Spiele</h1>
              <p className="text-xs font-bold text-malt/65 dark:text-nightMuted">
                {gamesLoading
                  ? "Lade deine Spiele…"
                  : `${games.length} ${games.length === 1 ? "Spiel" : "Spiele"} insgesamt · ${groups.playing.length} ${
                      groups.playing.length === 1 ? "läuft" : "laufen"
                    } gerade`}
              </p>
            </div>
            <Link
              href="/games/new"
              onClick={() => play("tap")}
              className="brass-pill inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium active:scale-95"
            >
              <Plus className="size-4" />
              Neues Spiel
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-malt/55 dark:text-nightMuted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                aria-label="Spiel suchen"
                placeholder="Spiel suchen…"
                className="tap-input h-11 w-full pl-9 pr-3 text-base font-semibold sm:text-sm"
              />
            </div>
          </div>
        </section>

        {loadError && (
          <div role="alert" className="rounded-xl border border-wine/30 bg-dangerSoft px-3 py-2 text-sm font-bold text-wine dark:border-[#ff8a7a]/25 dark:bg-[#3a1814] dark:text-[#ffb4a8]">
            Deine Spiele konnten nicht geladen werden. Prüfe deine Verbindung und lade die Seite neu.
          </div>
        )}

        <div className="grid flex-1 gap-3 overflow-hidden md:grid-cols-3">
          <Section title="Aktiv" games={groups.playing} empty={gamesLoading ? "Lade…" : "Noch nichts am Laufen."} accent="amber" />
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
    <section className="coaster flex h-full flex-col overflow-hidden p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${
            accent === "amber"
              ? "bg-orange text-white"
              : "bg-black/5 text-malt dark:bg-white/5 dark:text-nightText"
          }`}
        >
          {games.length}
        </span>
      </div>
      {games.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-malt/15 bg-foam/40 p-3 text-center text-xs font-bold text-malt/55 dark:text-nightMuted dark:border-nightBorder dark:bg-nightBg/40">
          {empty}
        </div>
      ) : (
        <div className="scroll-vintage grid flex-1 content-start gap-1.5 overflow-y-auto pr-1">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </section>
  );
}

function GameCard({ game }: { game: GameRow }) {
  const date = new Date(game.created_at).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const isLive = game.status === "playing" || game.status === "setup";
  return (
    <Link
      href={`/games/${game.id}`}
      onClick={() => play("tap")}
      className="group relative flex items-center justify-between gap-2 overflow-hidden rounded-2xl bg-cream/80 px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-coaster dark:bg-nightSurface2/80"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--bar-rim)] opacity-80" />
      <div className="min-w-0 flex-1 pl-1">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-sm font-black text-malt dark:text-nightText">{game.name}</div>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-emerald">
              <Sparkles className="size-2.5" />
              Live
            </span>
          )}
        </div>
        <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
          {date} · {STATUS_LABELS[game.status] ?? game.status}
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-malt/50 transition group-hover:translate-x-0.5 group-hover:text-malt dark:text-nightMuted" />
    </Link>
  );
}
