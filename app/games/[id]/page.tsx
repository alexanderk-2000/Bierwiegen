"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Coins, Copy, Mail, Plus, Trash2, UserPlus } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { getGame, archiveGame } from "@/lib/db/games";
import { addGuestPlayer, removePlayer, searchProfiles, updatePlayer } from "@/lib/db/players";
import {
  startRound,
  startEmptyFinishRound,
  upsertMeasurement,
  evaluateAndCommitRound,
  applyExactHitDistribution,
  completeRound,
  endGame
} from "@/lib/db/rounds";
import { createInviteLink, inviteByEmail, inviteUser } from "@/lib/db/invitations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_PENALTY_CONFIG, type RoundPenaltyConfig, exactHitTokensForCaller } from "@/lib/game-logic";
import type { Database } from "@/lib/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_players"]["Row"];
type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];
type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

const grams = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value)} g` : "-";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useUser();
  const gameId = params?.id;

  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"play" | "lobby">("lobby");

  const [callerId, setCallerId] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [guestName, setGuestName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchProfiles>>>([]);
  const [emailInvite, setEmailInvite] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const isHost = user && game ? user.id === game.host_user_id : false;
  const activeRound = useMemo(
    () => rounds.find((round) => round.id === game?.active_round_id) ?? null,
    [rounds, game?.active_round_id]
  );
  const activeMeasurements = useMemo(
    () => (activeRound ? measurements.filter((m) => m.round_id === activeRound.id) : []),
    [measurements, activeRound]
  );

  const refreshAll = useCallback(async () => {
    if (!gameId) return;
    const data = await getGame(gameId);
    setGame(data.game);
    setPlayers(data.players);
    setRounds(data.rounds as RoundRow[]);
    setInvitations(data.invitations as InvitationRow[]);
    if (data.game?.active_round_id) {
      const supabase = getSupabaseBrowserClient();
      const { data: ms } = await supabase
        .from("measurements")
        .select("*")
        .eq("round_id", data.game.active_round_id);
      setMeasurements((ms ?? []) as MeasurementRow[]);
    }
  }, [gameId]);

  useEffect(() => {
    if (!loading && !user) router.push(`/login?next=/games/${gameId}`);
  }, [loading, user, gameId, router]);

  useEffect(() => {
    if (user && gameId) refreshAll();
  }, [user, gameId, refreshAll]);

  useEffect(() => {
    if (!gameId || !user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `game_id=eq.${gameId}` }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "measurements" }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "invitations", filter: `game_id=eq.${gameId}` }, () => refreshAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user, refreshAll]);

  useEffect(() => {
    if (activeRound) setTab("play");
  }, [activeRound]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;
  if (!game) {
    return (
      <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
        <AccountHeader />
        <div className="grid flex-1 place-items-center font-bold text-malt/65 dark:text-nightMuted">Lade Spiel...</div>
      </div>
    );
  }

  const penaltyConfig = (game.penalty_config as Partial<RoundPenaltyConfig>) ?? DEFAULT_PENALTY_CONFIG;
  const cfg: RoundPenaltyConfig = { ...DEFAULT_PENALTY_CONFIG, ...penaltyConfig };

  const doStartRound = async () => {
    if (!callerId || !targetWeight) return;
    setBusy(true);
    setError(null);
    try {
      await startRound({
        gameId: game.id,
        callerGamePlayerId: callerId,
        targetWeight: Number(targetWeight.replace(",", ".")),
        penaltyConfig: cfg,
        roundNumber: rounds.length + 1
      });
      setTargetWeight("");
      setTab("play");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const doStartEmpty = async () => {
    if (!confirm("Finale Runde starten? Danach trinken alle leer und das Spiel endet.")) return;
    setBusy(true);
    try {
      await startEmptyFinishRound({ gameId: game.id, roundNumber: rounds.length + 1, penaltyConfig: cfg });
      setTab("play");
    } finally {
      setBusy(false);
    }
  };

  const doEnterWeight = async (player: PlayerRow, value: string) => {
    if (!activeRound || activeRound.type !== "normal") return;
    const weight = Number(value.replace(",", "."));
    if (!Number.isFinite(weight)) return;
    const previousWeight = player.current_weight ?? player.start_weight ?? 0;
    await upsertMeasurement({
      roundId: activeRound.id,
      gamePlayerId: player.id,
      previousWeight,
      weight,
      targetWeight: activeRound.target_weight ?? 0,
      isCaller: activeRound.caller_game_player_id === player.id
    });
    await updatePlayer(player.id, { current_weight: weight });
  };

  const doEvaluate = async () => {
    if (!activeRound || activeRound.type !== "normal") return;
    setBusy(true);
    try {
      await evaluateAndCommitRound({
        gameId: game.id,
        roundId: activeRound.id,
        targetWeight: activeRound.target_weight ?? 0,
        penaltyConfig: cfg,
        measurements: activeMeasurements.map((m) => ({
          playerId: m.game_player_id,
          weight: Number(m.weight),
          isCaller: m.is_caller
        }))
      });
    } finally {
      setBusy(false);
    }
  };

  const doComplete = async () => {
    if (!activeRound) return;
    setBusy(true);
    try {
      await completeRound(activeRound.id, game.id);
      await getSupabaseBrowserClient().from("games").update({ active_round_id: null }).eq("id", game.id);
      setTab("lobby");
    } finally {
      setBusy(false);
    }
  };

  const doEndGame = async () => {
    if (!confirm("Spiel beenden?")) return;
    await endGame(game.id);
  };

  const doArchive = async () => {
    if (!confirm("Spiel archivieren?")) return;
    await archiveGame(game.id);
    router.push("/games");
  };

  const doSearchProfiles = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchProfiles(query);
    setSearchResults(results);
  };

  const doInviteUser = async (invitedUserId: string) => {
    await inviteUser({ gameId: game.id, invitedByUserId: user.id, invitedUserId });
    setSearchResults([]);
    setSearchQuery("");
  };

  const doInviteByEmail = async () => {
    if (!emailInvite.trim()) return;
    await inviteByEmail({ gameId: game.id, invitedByUserId: user.id, email: emailInvite.trim() });
    setEmailInvite("");
  };

  const doCreateInviteLink = async () => {
    const inv = await createInviteLink({ gameId: game.id, invitedByUserId: user.id });
    if (inv.invite_token) {
      const url = `${window.location.origin}/invite/${inv.invite_token}`;
      setInviteLink(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
    }
  };

  const doAddGuest = async () => {
    if (!guestName.trim()) return;
    await addGuestPlayer({ gameId: game.id, displayName: guestName.trim() });
    setGuestName("");
  };

  const doRemovePlayer = async (playerId: string) => {
    if (!confirm("Spieler entfernen?")) return;
    await removePlayer(playerId);
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-3 py-2 sm:px-5">
        {/* Compact Header */}
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2 shadow-sm dark:border-nightBorder dark:bg-nightSurface">
          <div className="min-w-0">
            <Link
              href="/games"
              className="text-[0.6rem] font-black uppercase text-malt/55 hover:text-malt dark:text-nightMuted"
            >
              ← Spiele
            </Link>
            <h1 className="truncate text-xl font-black text-malt dark:text-nightText">{game.name}</h1>
            <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
              {game.status} · {players.length} Spieler · Runde {rounds.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-cream p-0.5 dark:bg-nightSurface2">
              <TabBtn active={tab === "lobby"} onClick={() => setTab("lobby")} label="Lobby" />
              <TabBtn active={tab === "play"} onClick={() => setTab("play")} label="Spiel" />
            </div>
            {isHost && game.status !== "ended" && game.status !== "archived" && (
              <button
                onClick={doEndGame}
                className="rounded-full bg-malt px-3 py-1.5 text-xs font-black text-white shadow active:scale-95"
              >
                Beenden
              </button>
            )}
            {game.status === "ended" && isHost && (
              <button
                onClick={doArchive}
                className="rounded-full bg-cream px-3 py-1.5 text-xs font-black text-malt active:scale-95 dark:bg-nightSurface2 dark:text-nightText"
              >
                Archivieren
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="rounded-xl bg-dangerSoft px-3 py-1.5 text-xs font-bold text-red-700">{error}</div>
        )}

        {tab === "lobby" ? (
          <div className="grid flex-1 gap-2 overflow-hidden lg:grid-cols-[1fr_320px]">
            {/* Spielerliste */}
            <section className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
              <h2 className="mb-2 text-xs font-black uppercase text-malt/55 dark:text-nightMuted">
                Spieler ({players.length})
              </h2>
              <div className="grid flex-1 gap-1.5 overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2 dark:bg-nightSurface2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-black text-malt dark:text-nightText">
                        {player.display_name}
                        {player.role === "host" && (
                          <span className="rounded-full bg-amberBeer px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-malt">
                            H
                          </span>
                        )}
                        {player.is_guest && (
                          <span className="rounded-full bg-malt/15 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-malt dark:bg-nightBg dark:text-nightMuted">
                            G
                          </span>
                        )}
                      </div>
                      <div className="text-[0.6rem] font-bold text-malt/55 dark:text-nightMuted">
                        {player.beer_brand ?? "-"} · {player.bottle_size_liters ?? "-"} l · Start{" "}
                        {grams(player.start_weight)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-red-700 dark:text-red-400">
                        {player.penalty_points}
                      </span>
                      {isHost && player.role !== "host" && (
                        <button
                          onClick={() => doRemovePlayer(player.id)}
                          className="grid size-7 place-items-center rounded-full bg-dangerSoft text-red-700"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isHost && game.status !== "ended" && (
                <div className="mt-2 grid gap-1.5 border-t border-malt/10 pt-2 dark:border-nightBorder">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="Gast hinzufügen"
                      className="h-9 flex-1 rounded-lg border-2 border-[#efdcb9] bg-foam px-2 text-sm font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                    />
                    <button
                      onClick={doAddGuest}
                      disabled={!guestName.trim()}
                      className="grid size-9 place-items-center rounded-full bg-amberBeer text-malt shadow active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="size-3.5 text-malt/55" />
                      <input
                        value={searchQuery}
                        onChange={(event) => doSearchProfiles(event.target.value)}
                        placeholder="Account suchen"
                        className="h-9 flex-1 rounded-lg border-2 border-[#efdcb9] bg-foam px-2 text-sm font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="grid gap-0.5 rounded-lg bg-cream p-1.5 dark:bg-nightSurface2">
                        {searchResults.map((profile) => (
                          <button
                            key={profile.user_id}
                            onClick={() => doInviteUser(profile.user_id)}
                            className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-left text-xs font-black text-malt active:scale-95 dark:bg-nightBg dark:text-nightText"
                          >
                            {profile.display_name}
                            <span className="text-[0.6rem] text-orangeBeer">Einladen</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-malt/55" />
                    <input
                      type="email"
                      value={emailInvite}
                      onChange={(event) => setEmailInvite(event.target.value)}
                      placeholder="E-Mail einladen"
                      className="h-9 flex-1 rounded-lg border-2 border-[#efdcb9] bg-foam px-2 text-sm font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                    />
                    <button
                      onClick={doInviteByEmail}
                      disabled={!emailInvite.trim()}
                      className="grid size-9 place-items-center rounded-full bg-amberBeer text-malt shadow active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={doCreateInviteLink}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-malt px-3 py-2 text-xs font-black text-white shadow active:scale-95"
                  >
                    <Copy className="size-3.5" />
                    Einladungslink
                  </button>
                  {inviteLink && (
                    <div className="rounded-md bg-hop/15 p-1.5 text-[0.6rem] font-black text-malt dark:text-nightText">
                      📋 Kopiert: <span className="break-all opacity-80">{inviteLink}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="flex h-full flex-col gap-2 overflow-hidden">
              {invitations.filter((i) => i.status === "pending").length > 0 && (
                <section className="rounded-xl border border-white/80 bg-white/80 p-2.5 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
                  <h3 className="mb-1 text-[0.65rem] font-black uppercase text-malt/55 dark:text-nightMuted">
                    Offene Einladungen
                  </h3>
                  <div className="grid max-h-32 gap-0.5 overflow-y-auto">
                    {invitations
                      .filter((i) => i.status === "pending")
                      .map((inv) => (
                        <div key={inv.id} className="rounded-md bg-cream px-2 py-1 text-xs dark:bg-nightSurface2">
                          <div className="truncate font-black text-malt dark:text-nightText">
                            {inv.invited_email ?? inv.invited_user_id?.slice(0, 8) ?? "Link"}
                          </div>
                          <div className="text-[0.6rem] font-bold text-malt/55 dark:text-nightMuted">
                            {new Date(inv.created_at).toLocaleDateString("de-DE")}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {isHost && game.status !== "ended" && players.length >= 2 && !activeRound && (
                <section className="flex flex-1 flex-col rounded-2xl border-2 border-amberBeer bg-amberBeer/10 p-3 shadow-sm">
                  <h3 className="mb-2 text-xs font-black uppercase text-malt dark:text-nightText">
                    Runde {rounds.length + 1}
                  </h3>
                  <select
                    value={callerId}
                    onChange={(event) => setCallerId(event.target.value)}
                    className="h-10 w-full rounded-lg border-2 border-[#efdcb9] bg-foam px-2 text-sm font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                  >
                    <option value="">Ansager wählen</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.display_name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={targetWeight}
                    onChange={(event) => setTargetWeight(event.target.value)}
                    inputMode="decimal"
                    placeholder="Zielgewicht g"
                    className="mt-1.5 h-11 w-full rounded-lg border-2 border-[#efdcb9] bg-foam px-2 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                  />
                  <button
                    onClick={doStartRound}
                    disabled={busy || !callerId || !targetWeight}
                    className="mt-1.5 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-amberBeer text-sm font-black text-malt shadow active:scale-95 disabled:opacity-40"
                  >
                    Starten
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    onClick={doStartEmpty}
                    disabled={busy}
                    className="mt-1.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-malt text-xs font-black text-white shadow active:scale-95 disabled:opacity-40"
                  >
                    <Coins className="size-3.5" />
                    Leer trinken
                  </button>
                </section>
              )}
            </aside>
          </div>
        ) : (
          <PlayPanel
            players={players}
            activeRound={activeRound}
            measurements={activeMeasurements}
            isHost={isHost}
            busy={busy}
            cfg={cfg}
            onEnterWeight={doEnterWeight}
            onEvaluate={doEvaluate}
            onComplete={doComplete}
            onDistribute={async (giverId, recipients) => {
              if (!activeRound) return;
              await applyExactHitDistribution({
                gameId: game.id,
                roundId: activeRound.id,
                giverGamePlayerId: giverId,
                recipients
              });
            }}
          />
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-amberBeer text-malt shadow" : "text-malt/65 dark:text-nightMuted"
      }`}
    >
      {label}
    </button>
  );
}

function PlayPanel({
  players,
  activeRound,
  measurements,
  isHost,
  busy,
  cfg,
  onEnterWeight,
  onEvaluate,
  onComplete,
  onDistribute
}: {
  players: PlayerRow[];
  activeRound: RoundRow | null;
  measurements: MeasurementRow[];
  isHost: boolean;
  busy: boolean;
  cfg: RoundPenaltyConfig;
  onEnterWeight: (player: PlayerRow, value: string) => Promise<void>;
  onEvaluate: () => Promise<void>;
  onComplete: () => Promise<void>;
  onDistribute: (giverId: string, recipients: Array<{ playerId: string; points: number }>) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>({});

  if (!activeRound) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-malt/20 bg-white/40 dark:border-nightBorder dark:bg-nightSurface/40">
        <p className="font-bold text-malt/65 dark:text-nightMuted">Keine aktive Runde. Starte eine in der Lobby.</p>
      </div>
    );
  }

  const measureMap = new Map(measurements.map((m) => [m.game_player_id, m]));
  const allEntered = activeRound.type === "normal" && measurements.length === players.length;
  const reviewing = activeRound.status === "review";
  const exactHits = measurements.filter((m) => m.exact_hit);
  const tokensLeft = (giverId: string) => {
    const giver = measurements.find((m) => m.game_player_id === giverId);
    if (!giver) return 0;
    const total = exactHitTokensForCaller(giver.is_caller, cfg);
    const used = Object.values(distribution[giverId] ?? {}).reduce((sum, value) => sum + value, 0);
    return total - used;
  };

  return (
    <div className="grid flex-1 gap-2 overflow-hidden lg:grid-cols-[1fr_280px]">
      {/* Spieler-Liste */}
      <section className="flex h-full flex-col gap-2 overflow-hidden">
        <div className="rounded-xl border-2 border-amberBeer bg-amberBeer/10 px-3 py-1.5">
          <div className="text-[0.6rem] font-black uppercase text-malt/65 dark:text-nightMuted">
            Runde {activeRound.round_number}
          </div>
          <div className="text-base font-black text-malt dark:text-nightText">
            {activeRound.type === "empty_finish"
              ? "Leer trinken"
              : `Ziel ${grams(activeRound.target_weight)} · Ansager ${
                  players.find((p) => p.id === activeRound.caller_game_player_id)?.display_name ?? "—"
                }`}
          </div>
        </div>

        <div className="grid flex-1 gap-1.5 overflow-y-auto">
          {players.map((player) => {
            const m = measureMap.get(player.id);
            return (
              <div
                key={player.id}
                className={`rounded-xl border px-3 py-2 ${
                  m?.exact_hit && reviewing
                    ? "border-hop bg-hop/15"
                    : m?.is_worst && reviewing
                    ? "border-red-500 bg-dangerSoft"
                    : "border-white/80 bg-white/95 dark:border-nightBorder dark:bg-nightSurface"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-sm font-black text-malt dark:text-nightText">
                      {player.display_name}
                      {player.id === activeRound.caller_game_player_id && (
                        <span className="rounded-full bg-goldBeer px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-malt">
                          Ansager
                        </span>
                      )}
                    </div>
                    <div className="text-[0.6rem] font-bold text-malt/55 dark:text-nightMuted">
                      vorher {grams(player.current_weight ?? player.start_weight)}
                      {m && reviewing && ` · Abw. ${grams(Number(m.deviation ?? 0))}`}
                      {m?.exact_hit && reviewing && " · 🎯"}
                      {m?.is_worst && reviewing && " · 💥"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m ? (
                      <span className="text-xl font-black text-malt dark:text-nightText">
                        {grams(Number(m.weight))}
                      </span>
                    ) : (
                      isHost && (
                        <input
                          value={drafts[player.id] ?? ""}
                          onChange={(event) => setDrafts((current) => ({ ...current, [player.id]: event.target.value }))}
                          onBlur={async (event) => {
                            if (event.target.value) await onEnterWeight(player, event.target.value);
                          }}
                          inputMode="decimal"
                          placeholder="g"
                          className="h-10 w-20 rounded-lg border-2 border-amberBeer bg-foam px-2 text-right text-lg font-black outline-none dark:bg-nightBg dark:text-nightText"
                        />
                      )
                    )}
                    <span className="text-xl font-black text-red-700 dark:text-red-400">
                      {player.penalty_points}
                      {m && reviewing && m.penalty_points_received > 0 && (
                        <span className="ml-0.5 text-xs">+{m.penalty_points_received}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isHost && (
          <div className="flex flex-wrap gap-2">
            {!reviewing && allEntered && (
              <button
                onClick={onEvaluate}
                disabled={busy}
                className="cta-pulse inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-amberBeer px-4 py-3 text-base font-black text-malt shadow-lg active:scale-95"
              >
                Auswerten
              </button>
            )}
            {reviewing && (
              <button
                onClick={onComplete}
                disabled={busy}
                className="cta-pulse inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-amberBeer px-4 py-3 text-base font-black text-malt shadow-lg active:scale-95"
              >
                Punkte übernehmen
              </button>
            )}
          </div>
        )}
      </section>

      {/* Verteilung */}
      <aside className="flex h-full flex-col overflow-hidden">
        {reviewing && exactHits.length > 0 ? (
          <section className="flex h-full flex-col rounded-2xl border-2 border-hop bg-hop/10 p-3">
            <h3 className="text-xs font-black uppercase text-malt dark:text-nightText">Volltreffer-Punkte</h3>
            <div className="mt-2 grid flex-1 gap-2 overflow-y-auto">
              {exactHits.map((hit) => {
                const giver = players.find((p) => p.id === hit.game_player_id);
                const left = tokensLeft(hit.game_player_id);
                return (
                  <div key={hit.id} className="rounded-xl bg-white p-2 dark:bg-nightSurface">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-malt dark:text-nightText">{giver?.display_name}</div>
                      <span className="rounded-full bg-hop px-1.5 py-0.5 text-[0.6rem] font-black text-white">
                        {left}
                      </span>
                    </div>
                    <div className="mt-1 grid gap-0.5">
                      {players
                        .filter((p) => p.id !== hit.game_player_id)
                        .map((target) => {
                          const count = distribution[hit.game_player_id]?.[target.id] ?? 0;
                          return (
                            <div
                              key={target.id}
                              className="flex items-center justify-between gap-1 rounded-md bg-cream px-1.5 py-1 dark:bg-nightSurface2"
                            >
                              <span className="truncate text-xs font-black text-malt dark:text-nightText">
                                {target.display_name}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() =>
                                    setDistribution((current) => {
                                      const giverDist = { ...(current[hit.game_player_id] ?? {}) };
                                      giverDist[target.id] = Math.max(0, (giverDist[target.id] ?? 0) - 1);
                                      return { ...current, [hit.game_player_id]: giverDist };
                                    })
                                  }
                                  className="grid size-6 place-items-center rounded-full bg-white text-xs font-black"
                                >
                                  −
                                </button>
                                <span className="w-4 text-center text-xs font-black">{count}</span>
                                <button
                                  onClick={() =>
                                    setDistribution((current) => {
                                      if (left <= 0) return current;
                                      const giverDist = { ...(current[hit.game_player_id] ?? {}) };
                                      giverDist[target.id] = (giverDist[target.id] ?? 0) + 1;
                                      return { ...current, [hit.game_player_id]: giverDist };
                                    })
                                  }
                                  disabled={left <= 0}
                                  className="grid size-6 place-items-center rounded-full bg-amberBeer text-xs font-black text-malt disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {left === 0 && (
                      <button
                        onClick={async () => {
                          const recipients = Object.entries(distribution[hit.game_player_id] ?? {})
                            .filter(([, count]) => count > 0)
                            .flatMap(([playerId, count]) =>
                              Array.from({ length: count }, () => ({ playerId, points: 1 }))
                            );
                          if (recipients.length > 0) {
                            await onDistribute(hit.game_player_id, recipients);
                            setDistribution((current) => ({ ...current, [hit.game_player_id]: {} }));
                          }
                        }}
                        className="mt-1 w-full rounded-full bg-hop px-3 py-1 text-xs font-black text-white active:scale-95"
                      >
                        Verbuchen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
            <h3 className="mb-2 text-xs font-black uppercase text-malt/55 dark:text-nightMuted">Punktestand</h3>
            <div className="grid flex-1 gap-1 overflow-y-auto">
              {[...players]
                .sort((a, b) => b.penalty_points - a.penalty_points)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-md px-2 py-1 ${
                      index === 0 ? "bg-dangerSoft" : "bg-cream dark:bg-nightSurface2"
                    }`}
                  >
                    <span className="truncate text-xs font-black text-malt dark:text-nightText">
                      {index + 1}. {player.display_name}
                    </span>
                    <span className="shrink-0 text-base font-black text-red-700 dark:text-red-400">
                      {player.penalty_points}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
