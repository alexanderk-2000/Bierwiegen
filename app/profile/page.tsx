"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Beer,
  Crown,
  Edit3,
  Flame,
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
import { play } from "@/lib/fx/sound";

const grams = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value)} g` : "—";
const pct = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value * 100)}%` : "—";

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
    play("bell");
  };

  const awards = useMemo(() => {
    const out: Array<{ label: string; value: string; icon: React.ReactNode; tier: "gold" | "silver" | "bronze" }> = [];
    if (overall && overall.average_deviation !== null && (overall.average_deviation ?? 0) > 0) {
      out.push({
        label: "Waagenmeister",
        value: `Ø ${grams(overall.average_deviation)}`,
        icon: <Target className="size-4" />,
        tier: "gold"
      });
    }
    if (overall && (overall.exact_hits ?? 0) > 0) {
      out.push({
        label: "Goldenes Auge",
        value: `${overall.exact_hits} Volltreffer`,
        icon: <Sparkles className="size-4" />,
        tier: "gold"
      });
    }
    if (overall && (overall.caller_rounds ?? 0) > 0) {
      out.push({
        label: "Mutiger Ansager",
        value: `${overall.caller_rounds}× Ansager`,
        icon: <Crown className="size-4" />,
        tier: "silver"
      });
    }
    const mostBrand = [...beerStats].sort((a, b) => (b.games ?? 0) - (a.games ?? 0))[0];
    if (mostBrand?.brand) {
      out.push({
        label: "Markentreu",
        value: `${mostBrand.brand} (${mostBrand.games}×)`,
        icon: <Beer className="size-4" />,
        tier: "bronze"
      });
    }
    if (overall && (overall.biggest_sip_grams ?? 0) > 0) {
      out.push({
        label: "Größter Schluck",
        value: grams(overall.biggest_sip_grams),
        icon: <Flame className="size-4" />,
        tier: "silver"
      });
    }
    if (overall && (overall.games_won ?? 0) >= 1) {
      out.push({
        label: "Sieger-Krug",
        value: `${overall.games_won}× gewonnen`,
        icon: <Trophy className="size-4" />,
        tier: "gold"
      });
    }
    return out;
  }, [overall, beerStats]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;

  return (
    <div className="flex h-dvh flex-col">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-5">
        {/* Profile Hero */}
        <section className="coaster coaster-rim spotlight flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="brass-pill grid size-14 place-items-center rounded-full text-2xl font-black shadow-md">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="tap-input h-10 px-3 text-lg font-black"
                  />
                  <button
                    onClick={saveName}
                    className="brass-pill grid size-10 place-items-center rounded-full active:scale-95"
                  >
                    <Save className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="gold-text bg-clip-text text-2xl font-black sm:text-3xl">{displayName}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="grid size-7 place-items-center rounded-full bg-cream text-malt active:scale-95 dark:bg-nightSurface2 dark:text-nightText"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                </div>
              )}
              <div className="text-xs font-bold text-malt/65 dark:text-nightMuted">{user.email}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-cream/80 p-1 dark:bg-nightSurface2/80">
              <TabButton label="Stats" icon={<Trophy className="size-4" />} active={tab === "stats"} onClick={() => setTab("stats")} />
              <TabButton label="Bier" icon={<Beer className="size-4" />} active={tab === "beer"} onClick={() => setTab("beer")} />
              <TabButton label="Verlauf" icon={<History className="size-4" />} active={tab === "history"} onClick={() => setTab("history")} />
            </div>
            <Link
              href="/games/new"
              onClick={() => play("tap")}
              className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black active:scale-95"
            >
              Neues Spiel
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="flex-1 overflow-hidden phase-enter">
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
      onClick={() => {
        play("tap");
        onClick();
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition active:scale-95 ${
        active ? "brass-pill" : "text-malt/65 hover:text-malt dark:text-nightMuted"
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
  awards: Array<{ label: string; value: string; icon: React.ReactNode; tier: "gold" | "silver" | "bronze" }>;
}) {
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[2fr_1fr]">
      <div className="scroll-vintage grid h-full grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
        <StatCard label="Spiele" value={overall?.games_played ?? 0} icon={<History className="size-3.5" />} />
        <StatCard label="Gewonnen" value={overall?.games_won ?? 0} accent="hop" icon={<Trophy className="size-3.5" />} />
        <StatCard label="Verloren" value={overall?.games_lost ?? 0} accent="danger" icon={<Flame className="size-3.5" />} />
        <StatCard label="Strafpunkte" value={overall?.total_penalty_points ?? 0} icon={<Medal className="size-3.5" />} />
        <StatCard label="Ø SP/Spiel" value={(overall?.avg_penalty_points_per_game ?? 0).toFixed(1)} />
        <StatCard label="Ø Abweichung" value={grams(overall?.average_deviation)} icon={<Target className="size-3.5" />} />
        <StatCard label="Volltreffer" value={overall?.exact_hits ?? 0} accent="hop" icon={<Sparkles className="size-3.5" />} />
        <StatCard label="Trefferquote" value={pct(overall?.exact_hit_rate)} />
        <StatCard label="Ansager-Runden" value={overall?.caller_rounds ?? 0} icon={<Crown className="size-3.5" />} />
        <StatCard label="Daneben-Runden" value={overall?.worst_rounds ?? 0} accent="danger" />
        <StatCard label="Max. Abweichung" value={grams(overall?.max_deviation)} />
        <StatCard label="Größter Schluck" value={grams(overall?.biggest_sip_grams)} />
      </div>

      <aside className="coaster flex h-full flex-col overflow-hidden p-3">
        <h2 className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
          <Trophy className="size-4 text-orangeBeer" />
          Trophäenwand
        </h2>
        {awards.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">
            Spiel ein paar Online-Runden, um Awards freizuschalten.
          </p>
        ) : (
          <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
            {awards.map((award) => (
              <div
                key={award.label}
                className="flex items-center gap-2 rounded-xl border border-malt/8 bg-cream/80 px-2.5 py-2 shadow-sm dark:border-nightBorder dark:bg-nightSurface2/80"
              >
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    award.tier === "gold"
                      ? "brass-pill"
                      : award.tier === "silver"
                      ? "bg-gradient-to-b from-white to-[#cdcdcd] text-malt"
                      : "bg-gradient-to-b from-[#e2a868] to-[#a06a3b] text-malt"
                  }`}
                >
                  {award.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
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
      <div className="coaster flex h-full flex-col overflow-hidden p-3">
        <h2 className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
          <Beer className="size-4 text-orangeBeer" />
          Bier-Statistiken
        </h2>
        {beerStats.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">Noch keine Bier-Daten.</p>
        ) : (
          <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
            {beerStats.map((row) => (
              <div key={row.brand} className="rounded-xl bg-cream/80 px-3 py-2 dark:bg-nightSurface2/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-black text-malt dark:text-nightText">{row.brand}</div>
                  <span className="brass-pill shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-black">
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
          <div className="mt-2 rounded-xl border-2 border-emerald/50 bg-emerald/10 px-3 py-1.5 text-xs font-black text-malt dark:text-nightText">
            🏆 Beste: {bestBrand.brand} (Ø {grams(bestBrand.avg_deviation)})
          </div>
        )}
      </div>

      <div className="coaster flex h-full flex-col overflow-hidden p-3">
        <h2 className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
          <Scale className="size-4 text-emerald" />
          Flaschengrößen
        </h2>
        {bottleStats.length === 0 ? (
          <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">Noch keine Daten.</p>
        ) : (
          <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
            {bottleStats.map((row) => (
              <div key={row.size_liters} className="rounded-xl bg-cream/80 px-3 py-2 dark:bg-nightSurface2/80">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-malt dark:text-nightText">
                    {String(row.size_liters).replace(".", ",")} l
                  </div>
                  <span className="brass-pill rounded-full px-2 py-0.5 text-[0.6rem] font-black">{row.games}×</span>
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
          <div className="mt-2 rounded-xl border-2 border-amberBeer/60 bg-amberBeer/10 px-3 py-1.5 text-xs font-black text-malt dark:text-nightText">
            🍺 Bevorzugt: {String(bestSize.size_liters).replace(".", ",")} l
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: GameHistoryRow[] }) {
  return (
    <div className="coaster flex h-full flex-col overflow-hidden p-3">
      <h2 className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
        <History className="size-4 text-orangeBeer" />
        Spielhistorie
      </h2>
      {history.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="font-bold text-malt/55 dark:text-nightMuted">Noch keine Online-Spiele.</p>
            <Link
              href="/games/new"
              onClick={() => play("tap")}
              className="brass-pill mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black active:scale-95"
            >
              Erstes Spiel starten
            </Link>
          </div>
        </div>
      ) : (
        <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
          {history.map((row) => (
            <Link
              key={row.game_id}
              href={`/games/${row.game_id}`}
              onClick={() => play("tap")}
              className="group flex items-center justify-between gap-3 rounded-xl bg-cream/80 px-3 py-2 transition hover:-translate-y-0.5 hover:bg-cream dark:bg-nightSurface2/80"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-malt dark:text-nightText">{row.game_name}</div>
                <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                  {row.created_at && new Date(row.created_at).toLocaleDateString("de-DE")} · {row.player_count} Spieler ·{" "}
                  {row.beer_brand ?? "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.outcome === "won" && (
                  <span className="rounded-full bg-emerald px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                    Sieg
                  </span>
                )}
                {row.outcome === "lost" && (
                  <span className="rounded-full bg-wine px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                    Verlust
                  </span>
                )}
                <span className="text-xl font-black text-wine">{row.penalty_points}</span>
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
  accent,
  icon
}: {
  label: string;
  value: string | number;
  accent?: "hop" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl px-3 py-2.5 shadow-sm ${
        accent === "hop"
          ? "border-2 border-emerald/30 bg-emerald/10"
          : accent === "danger"
          ? "border-2 border-wine/30 bg-dangerSoft"
          : "border border-malt/10 bg-foam/85 dark:border-nightBorder dark:bg-nightSurface/85"
      }`}
    >
      <div className="flex items-center gap-1 text-[0.62rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-malt dark:text-nightText">{value}</div>
    </div>
  );
}
