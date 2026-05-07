"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Beer,
  Edit3,
  History,
  Medal,
  Save,
  Scale,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import {
  getOverallStats,
  getBeerStats,
  getBottleSizeStats,
  getGameHistory,
  type OverallStats,
  type BeerStats,
  type BottleSizeStats,
  type GameHistoryRow
} from "@/lib/db/stats";
import { ensureProfile, updateMyProfile } from "@/lib/db/profile";

const grams = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value)} g` : "-";
const pct = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value * 100)}%` : "-";

type Tab = "stats" | "beer" | "history";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [beerStats, setBeerStats] = useState<BeerStats[]>([]);
  const [bottleStats, setBottleStats] = useState<BottleSizeStats[]>([]);
  const [history, setHistory] = useState<GameHistoryRow[]>([]);
  const [tab, setTab] = useState<Tab>("stats");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/profile");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await ensureProfile(user.id, {
        display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Spieler"
      });
      setDisplayName(profile.display_name);
      const [o, b, s, h] = await Promise.all([
        getOverallStats(user.id),
        getBeerStats(user.id),
        getBottleSizeStats(user.id),
        getGameHistory(user.id)
      ]);
      setOverall(o);
      setBeerStats(b);
      setBottleStats(s);
      setHistory(h);
    })();
  }, [user]);

  const saveName = async () => {
    if (!user || !displayName.trim()) return;
    await updateMyProfile(user.id, { display_name: displayName.trim() });
    setEditing(false);
  };

  const awards = useMemo(() => {
    const out: Array<{ label: string; value: string; icon: React.ReactNode }> = [];
    if (overall && overall.average_deviation !== null && (overall.average_deviation ?? 0) > 0) {
      out.push({
        label: "Waagenmeister",
        value: `Ø ${grams(overall.average_deviation)}`,
        icon: <Target className="size-4" />
      });
    }
    if (overall && (overall.exact_hits ?? 0) > 0) {
      out.push({
        label: "Zielwasser",
        value: `${overall.exact_hits} Treffer`,
        icon: <Sparkles className="size-4" />
      });
    }
    if (overall && (overall.caller_rounds ?? 0) > 0) {
      out.push({
        label: "Mutiger Ansager",
        value: `${overall.caller_rounds}× Ansager`,
        icon: <Trophy className="size-4" />
      });
    }
    const mostBrand = [...beerStats].sort((a, b) => (b.games ?? 0) - (a.games ?? 0))[0];
    if (mostBrand?.brand) {
      out.push({
        label: "Markentreu",
        value: `${mostBrand.brand} (${mostBrand.games}×)`,
        icon: <Beer className="size-4" />
      });
    }
    if (overall && (overall.biggest_sip_grams ?? 0) > 0) {
      out.push({
        label: "Größter Schluck",
        value: grams(overall.biggest_sip_grams),
        icon: <Medal className="size-4" />
      });
    }
    return out;
  }, [overall, beerStats]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-5">
        {/* Compact Header */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-amberBeer text-2xl font-black text-malt">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-9 rounded-lg border-2 border-amberBeer bg-foam px-2 text-lg font-black outline-none dark:bg-nightBg dark:text-nightText"
                  />
                  <button
                    onClick={saveName}
                    className="grid size-9 place-items-center rounded-full bg-amberBeer text-malt"
                  >
                    <Save className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-malt dark:text-nightText">{displayName}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="grid size-7 place-items-center rounded-full bg-cream text-malt dark:bg-nightSurface2 dark:text-nightText"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                </div>
              )}
              <div className="text-xs font-bold text-malt/65 dark:text-nightMuted">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab-Switch */}
            <div className="inline-flex rounded-full bg-cream p-1 dark:bg-nightSurface2">
              <TabButton label="Stats" icon={<Trophy className="size-4" />} active={tab === "stats"} onClick={() => setTab("stats")} />
              <TabButton label="Bier" icon={<Beer className="size-4" />} active={tab === "beer"} onClick={() => setTab("beer")} />
              <TabButton label="Verlauf" icon={<History className="size-4" />} active={tab === "history"} onClick={() => setTab("history")} />
            </div>
            <Link
              href="/games/new"
              className="inline-flex items-center gap-2 rounded-xl bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow active:scale-95"
            >
              Neues Spiel
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Tab Content */}
        <section className="flex-1 overflow-hidden">
          {tab === "stats" && <StatsTab overall={overall} awards={awards} />}
          {tab === "beer" && <BeerTab beerStats={beerStats} bottleStats={bottleStats} />}
          {tab === "history" && <HistoryTab history={history} />}
        </section>
      </main>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition ${
        active ? "bg-amberBeer text-malt shadow" : "text-malt/65 dark:text-nightMuted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatsTab({
  overall,
  awards
}: {
  overall: OverallStats | null;
  awards: Array<{ label: string; value: string; icon: React.ReactNode }>;
}) {
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[2fr_1fr]">
      {/* Stat Grid */}
      <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        <StatCard label="Spiele" value={overall?.games_played ?? 0} />
        <StatCard label="Gewonnen" value={overall?.games_won ?? 0} accent="hop" />
        <StatCard label="Verloren" value={overall?.games_lost ?? 0} accent="danger" />
        <StatCard label="Strafpunkte" value={overall?.total_penalty_points ?? 0} />
        <StatCard label="Ø SP/Spiel" value={(overall?.avg_penalty_points_per_game ?? 0).toFixed(1)} />
        <StatCard label="Ø Abweichung" value={grams(overall?.average_deviation)} />
        <StatCard label="Treffer" value={overall?.exact_hits ?? 0} accent="hop" />
        <StatCard label="Trefferquote" value={pct(overall?.exact_hit_rate)} />
        <StatCard label="Ansager-Runden" value={overall?.caller_rounds ?? 0} />
        <StatCard label="Daneben-Runden" value={overall?.worst_rounds ?? 0} accent="danger" />
        <StatCard label="Max. Abweichung" value={grams(overall?.max_deviation)} />
        <StatCard label="Größter Schluck" value={grams(overall?.biggest_sip_grams)} />
      </div>

      {/* Awards */}
      <aside className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-malt/55 dark:text-nightMuted">
          <Trophy className="size-4 text-orangeBeer" />
          Awards
        </h2>
        {awards.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">
            Spiel ein paar Online-Runden, um Awards freizuschalten.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {awards.map((award) => (
              <div
                key={award.label}
                className="flex items-center gap-2 rounded-xl bg-cream px-2 py-1.5 dark:bg-nightSurface2"
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-amberBeer text-malt">
                  {award.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.65rem] font-black uppercase text-malt/55 dark:text-nightMuted">
                    {award.label}
                  </div>
                  <div className="truncate text-sm font-black text-malt dark:text-nightText">{award.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function BeerTab({ beerStats, bottleStats }: { beerStats: BeerStats[]; bottleStats: BottleSizeStats[] }) {
  const bestBrand = beerStats[0];
  const bestSize = bottleStats[0];
  return (
    <div className="grid h-full gap-3 overflow-hidden md:grid-cols-2">
      <div className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-malt/55 dark:text-nightMuted">
          <Beer className="size-4 text-orangeBeer" />
          Bier-Statistiken
        </h2>
        {beerStats.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">Noch keine Bier-Daten.</p>
        ) : (
          <div className="grid flex-1 gap-1.5 overflow-y-auto">
            {beerStats.map((row) => (
              <div key={row.brand} className="rounded-xl bg-cream px-3 py-2 dark:bg-nightSurface2">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-black text-malt dark:text-nightText">{row.brand}</div>
                  <span className="shrink-0 rounded-full bg-amberBeer px-2 py-0.5 text-[0.6rem] font-black text-malt">
                    {row.games}×
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[0.65rem] font-bold text-malt/65 dark:text-nightMuted">
                  <span>Ø Abw. {grams(row.avg_deviation)}</span>
                  <span>Treffer {row.exact_hits}</span>
                  <span>SP {row.total_penalty_points}</span>
                  <span>Ø Schluck {grams(row.avg_consumed_per_round)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {bestBrand?.brand && (
          <div className="mt-2 rounded-lg border-2 border-hop bg-hop/10 px-2 py-1.5 text-xs font-black text-malt dark:text-nightText">
            🏆 Beste: {bestBrand.brand} (Ø {grams(bestBrand.avg_deviation)})
          </div>
        )}
      </div>

      <div className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-malt/55 dark:text-nightMuted">
          <Scale className="size-4 text-hop" />
          Flaschengrößen
        </h2>
        {bottleStats.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">Noch keine Daten.</p>
        ) : (
          <div className="grid flex-1 gap-1.5 overflow-y-auto">
            {bottleStats.map((row) => (
              <div key={row.size_liters} className="rounded-xl bg-cream px-3 py-2 dark:bg-nightSurface2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-malt dark:text-nightText">
                    {String(row.size_liters).replace(".", ",")} l
                  </div>
                  <span className="rounded-full bg-cream px-2 py-0.5 text-[0.6rem] font-black text-malt dark:bg-nightBg dark:text-nightText">
                    {row.games}×
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[0.65rem] font-bold text-malt/65 dark:text-nightMuted">
                  <span>Ø Abw. {grams(row.avg_deviation)}</span>
                  <span>SP {row.total_penalty_points}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {bestSize?.size_liters !== null && bestSize?.size_liters !== undefined && (
          <div className="mt-2 rounded-lg border-2 border-amberBeer bg-amberBeer/10 px-2 py-1.5 text-xs font-black text-malt dark:text-nightText">
            🍺 Bevorzugt: {String(bestSize.size_liters).replace(".", ",")} l
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: GameHistoryRow[] }) {
  return (
    <div className="h-full rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-malt/55 dark:text-nightMuted">
        <History className="size-4 text-orangeBeer" />
        Spielhistorie
      </h2>
      {history.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="font-bold text-malt/55 dark:text-nightMuted">Noch keine Online-Spiele.</p>
            <Link
              href="/games/new"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow active:scale-95"
            >
              Erstes Spiel starten
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid h-[calc(100%-2rem)] gap-1.5 overflow-y-auto">
          {history.map((row) => (
            <Link
              key={row.game_id}
              href={`/games/${row.game_id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2 transition hover:bg-cream/70 dark:bg-nightSurface2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-malt dark:text-nightText">{row.game_name}</div>
                <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                  {row.created_at && new Date(row.created_at).toLocaleDateString("de-DE")} · {row.player_count}{" "}
                  Spieler · {row.beer_brand ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.outcome === "won" && (
                  <span className="rounded-full bg-hop px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                    Sieg
                  </span>
                )}
                {row.outcome === "lost" && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                    Verlust
                  </span>
                )}
                <span className="text-xl font-black text-red-700 dark:text-red-400">{row.penalty_points}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string | number;
  accent?: "hop" | "danger";
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border px-3 py-2 shadow-sm ${
        accent === "hop"
          ? "border-hop/30 bg-hop/10"
          : accent === "danger"
          ? "border-red-300 bg-dangerSoft"
          : "border-white/80 bg-white/95 dark:border-nightBorder dark:bg-nightSurface"
      }`}
    >
      <div className="text-[0.65rem] font-black uppercase text-malt/55 dark:text-nightMuted">{label}</div>
      <div className="text-xl font-black text-malt dark:text-nightText">{value}</div>
    </div>
  );
}
