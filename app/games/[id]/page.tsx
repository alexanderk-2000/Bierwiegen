"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Coins,
  Copy,
  Crown,
  Mail,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserPlus
} from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import BeerMug from "@/components/fx/BeerMug";
import Burst from "@/components/fx/Burst";
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
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";
import type { Database } from "@/lib/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_players"]["Row"];
type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];
type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

const grams = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${Math.round(value)} g` : "—";

function levelOf(player: PlayerRow): number {
  const start = player.start_weight ?? 0;
  const current = player.current_weight ?? start;
  if (!start) return 0.6; // Default falls Startgewicht fehlt
  // current_weight ist das Flaschen-Gewicht, beide schrumpfen gleichmäßig.
  // Wir spiegeln nur die Veränderung als sichtbaren Pegel.
  const ratio = Math.max(0, Math.min(1, current / start));
  // Min-Anzeige: 5% Pegel, sonst sieht der Krug leer aus
  return Math.max(0.05, ratio);
}

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

  // FX-Trigger
  const [hitBurst, setHitBurst] = useState<number>(0);
  const [winBurst, setWinBurst] = useState<number>(0);
  const lastReviewedRoundRef = useRef<string | null>(null);
  const lastGameStatusRef = useRef<string | null>(null);

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

  // FX bei Review-Zustand: Volltreffer-Burst + Sounds
  useEffect(() => {
    if (!activeRound) return;
    if (activeRound.status !== "review") return;
    if (lastReviewedRoundRef.current === activeRound.id) return;
    lastReviewedRoundRef.current = activeRound.id;
    const exactHits = activeMeasurements.filter((m) => m.exact_hit).length;
    if (exactHits > 0) {
      setHitBurst((n) => n + 1);
      play("hit");
      vibrate("success");
    } else {
      play("boo");
      vibrate("alert");
    }
  }, [activeRound, activeMeasurements]);

  // FX bei Spielende
  useEffect(() => {
    if (!game) return;
    if (game.status === lastGameStatusRef.current) return;
    if (game.status === "ended" && lastGameStatusRef.current !== null) {
      setWinBurst((n) => n + 1);
      play("win");
      vibrate("success");
    }
    lastGameStatusRef.current = game.status;
  }, [game]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;
  if (!game) {
    return (
      <div className="flex h-dvh flex-col">
        <AccountHeader />
        <div className="grid flex-1 place-items-center font-bold text-malt/65 dark:text-nightMuted">Lade Spiel…</div>
      </div>
    );
  }

  const penaltyConfig = (game.penalty_config as Partial<RoundPenaltyConfig>) ?? DEFAULT_PENALTY_CONFIG;
  const cfg: RoundPenaltyConfig = { ...DEFAULT_PENALTY_CONFIG, ...penaltyConfig };

  const doStartRound = async () => {
    if (!callerId || !targetWeight) return;
    setBusy(true);
    setError(null);
    play("pour");
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
      vibrate("success");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Fehler");
      vibrate("fail");
    } finally {
      setBusy(false);
    }
  };

  const doStartEmpty = async () => {
    if (!confirm("Finale Runde starten? Danach trinken alle leer und das Spiel endet.")) return;
    setBusy(true);
    play("coin");
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
    play("swallow");
    vibrate("tap");
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
    play("bell");
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
    play("phase");
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
    play("warn");
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
    play("tap");
    await inviteUser({ gameId: game.id, invitedByUserId: user.id, invitedUserId });
    setSearchResults([]);
    setSearchQuery("");
  };

  const doInviteByEmail = async () => {
    if (!emailInvite.trim()) return;
    play("tap");
    await inviteByEmail({ gameId: game.id, invitedByUserId: user.id, email: emailInvite.trim() });
    setEmailInvite("");
  };

  const doCreateInviteLink = async () => {
    play("click");
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
    play("tap");
    await addGuestPlayer({ gameId: game.id, displayName: guestName.trim() });
    setGuestName("");
  };

  const doRemovePlayer = async (playerId: string) => {
    if (!confirm("Spieler entfernen?")) return;
    await removePlayer(playerId);
  };

  return (
    <div className="relative flex h-dvh flex-col">
      <AccountHeader />
      {/* Globale FX-Layer (Win) */}
      <div className="pointer-events-none fixed inset-0 z-30">
        <Burst trigger={winBurst || null} variant="confetti" count={140} origin={{ x: 0.5, y: 0.4 }} />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 overflow-hidden px-3 py-2 sm:px-5">
        {/* Game Header */}
        <header className="coaster relative flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          <div className="min-w-0">
            <Link
              href="/games"
              onClick={() => play("tap")}
              className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-malt/55 hover:text-malt dark:text-nightMuted"
            >
              ← Spiele
            </Link>
            <h1 className="truncate text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">{game.name}</h1>
            <div className="text-[0.65rem] font-bold uppercase tracking-wider text-malt/55 dark:text-nightMuted">
              {game.status} · {players.length} Spieler · Runde {rounds.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-cream/80 p-0.5 dark:bg-nightSurface2/80">
              <TabBtn active={tab === "lobby"} onClick={() => setTab("lobby")} label="Lobby" />
              <TabBtn active={tab === "play"} onClick={() => setTab("play")} label="Spiel" />
            </div>
            {isHost && game.status !== "ended" && game.status !== "archived" && (
              <button
                onClick={doEndGame}
                className="rounded-full bg-malt px-3 py-1.5 text-xs font-black text-goldHigh shadow active:scale-95 dark:bg-nightSurface2 dark:text-brassLight"
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
          <div className="rounded-xl border-2 border-wine/40 bg-dangerSoft px-3 py-2 text-xs font-bold text-wine">
            {error}
          </div>
        )}

        {tab === "lobby" ? (
          <LobbyView
            game={game}
            players={players}
            invitations={invitations}
            isHost={!!isHost}
            rounds={rounds}
            activeRound={activeRound}
            cfg={cfg}
            callerId={callerId}
            targetWeight={targetWeight}
            guestName={guestName}
            searchQuery={searchQuery}
            searchResults={searchResults}
            emailInvite={emailInvite}
            inviteLink={inviteLink}
            busy={busy}
            onCallerChange={setCallerId}
            onTargetChange={setTargetWeight}
            onGuestNameChange={setGuestName}
            onSearchProfiles={doSearchProfiles}
            onInviteUser={doInviteUser}
            onInviteByEmail={doInviteByEmail}
            onCreateInviteLink={doCreateInviteLink}
            onEmailChange={setEmailInvite}
            onStartRound={doStartRound}
            onStartEmpty={doStartEmpty}
            onAddGuest={doAddGuest}
            onRemovePlayer={doRemovePlayer}
          />
        ) : (
          <PlayPanel
            players={players}
            activeRound={activeRound}
            measurements={activeMeasurements}
            isHost={!!isHost}
            busy={busy}
            cfg={cfg}
            hitBurst={hitBurst}
            onEnterWeight={doEnterWeight}
            onEvaluate={doEvaluate}
            onComplete={doComplete}
            onDistribute={async (giverId, recipients) => {
              if (!activeRound) return;
              play("coin");
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

/* =====================================================
   LOBBY
   ===================================================== */

function LobbyView({
  game,
  players,
  invitations,
  isHost,
  rounds,
  activeRound,
  callerId,
  targetWeight,
  guestName,
  searchQuery,
  searchResults,
  emailInvite,
  inviteLink,
  busy,
  onCallerChange,
  onTargetChange,
  onGuestNameChange,
  onSearchProfiles,
  onInviteUser,
  onInviteByEmail,
  onCreateInviteLink,
  onEmailChange,
  onStartRound,
  onStartEmpty,
  onAddGuest,
  onRemovePlayer
}: {
  game: GameRow;
  players: PlayerRow[];
  invitations: InvitationRow[];
  isHost: boolean;
  rounds: RoundRow[];
  activeRound: RoundRow | null;
  cfg: RoundPenaltyConfig;
  callerId: string;
  targetWeight: string;
  guestName: string;
  searchQuery: string;
  searchResults: Awaited<ReturnType<typeof searchProfiles>>;
  emailInvite: string;
  inviteLink: string | null;
  busy: boolean;
  onCallerChange: (id: string) => void;
  onTargetChange: (value: string) => void;
  onGuestNameChange: (name: string) => void;
  onSearchProfiles: (query: string) => Promise<void>;
  onInviteUser: (userId: string) => Promise<void>;
  onInviteByEmail: () => Promise<void>;
  onCreateInviteLink: () => Promise<void>;
  onEmailChange: (email: string) => void;
  onStartRound: () => Promise<void>;
  onStartEmpty: () => Promise<void>;
  onAddGuest: () => Promise<void>;
  onRemovePlayer: (playerId: string) => Promise<void>;
}) {
  return (
    <div className="grid flex-1 gap-2 overflow-hidden phase-enter lg:grid-cols-[1fr_320px]">
      {/* Spielerliste mit Krug-Avataren */}
      <section className="coaster flex h-full flex-col p-3">
        <h2 className="mb-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
          An der Theke ({players.length})
        </h2>
        <div className="scroll-vintage grid flex-1 gap-2 overflow-y-auto pr-1">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-cream/85 px-3 py-2 shadow-sm dark:bg-nightSurface2/85"
            >
              <div className="flex min-w-0 items-center gap-3">
                <BeerMug
                  level={levelOf(player)}
                  bubbles
                  size={56}
                  highlight={
                    activeRound?.caller_game_player_id === player.id ? "caller" : "none"
                  }
                  label={player.display_name}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-black text-malt dark:text-nightText">
                    {player.display_name}
                    {player.role === "host" && (
                      <span className="rounded-full bg-orange px-1.5 py-0.5 text-[0.55rem] font-medium uppercase text-white">
                        Host
                      </span>
                    )}
                    {player.is_guest && (
                      <span className="rounded-full bg-malt/15 px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-malt dark:bg-nightBg dark:text-nightMuted">
                        Gast
                      </span>
                    )}
                  </div>
                  <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                    {player.beer_brand ?? "—"} · {player.bottle_size_liters ?? "—"} l · Start {grams(player.start_weight)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="score-tick text-2xl font-black text-wine">{player.penalty_points}</span>
                {isHost && player.role !== "host" && (
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="grid size-7 place-items-center rounded-full bg-dangerSoft text-wine active:scale-95"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isHost && game.status !== "ended" && (
          <div className="mt-2 grid gap-2 border-t border-malt/10 pt-2 dark:border-nightBorder">
            <div className="flex items-center gap-1.5">
              <input
                value={guestName}
                onChange={(event) => onGuestNameChange(event.target.value)}
                placeholder="Gast hinzufügen"
                className="tap-input h-9 flex-1 px-2 text-sm font-black"
              />
              <button
                onClick={onAddGuest}
                disabled={!guestName.trim()}
                className="grid size-9 place-items-center rounded-full bg-orange text-white active:scale-95 disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="grid gap-1">
              <div className="flex items-center gap-1.5">
                <UserPlus className="size-3.5 text-malt/55 dark:text-brassLight/55" />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchProfiles(event.target.value)}
                  placeholder="Account suchen…"
                  className="tap-input h-9 flex-1 px-2 text-sm font-black"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="grid gap-1 rounded-xl bg-cream/70 p-1.5 dark:bg-nightSurface2/70">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => onInviteUser(profile.user_id)}
                      className="flex items-center justify-between rounded-lg bg-foam px-2 py-1 text-left text-xs font-black text-malt active:scale-95 dark:bg-nightBg dark:text-nightText"
                    >
                      {profile.display_name}
                      <span className="text-[0.6rem] text-orangeBeer">Einladen</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-malt/55 dark:text-brassLight/55" />
              <input
                type="email"
                value={emailInvite}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="E-Mail einladen"
                className="tap-input h-9 flex-1 px-2 text-sm font-black"
              />
              <button
                onClick={onInviteByEmail}
                disabled={!emailInvite.trim()}
                className="grid size-9 place-items-center rounded-full bg-orange text-white active:scale-95 disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              onClick={onCreateInviteLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-malt px-3 py-2 text-xs font-black text-goldHigh shadow active:scale-95 dark:bg-nightSurface2 dark:text-brassLight"
            >
              <Copy className="size-3.5" />
              Einladungslink
            </button>
            {inviteLink && (
              <div className="rounded-lg bg-emerald/15 p-1.5 text-[0.6rem] font-black text-malt dark:text-nightText">
                📋 Kopiert: <span className="break-all opacity-80">{inviteLink}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sidebar */}
      <aside className="flex h-full flex-col gap-2 overflow-hidden">
        {invitations.filter((i) => i.status === "pending").length > 0 && (
          <section className="coaster p-2.5">
            <h3 className="mb-1 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
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
          <section className="coaster relative flex flex-1 flex-col overflow-hidden p-3">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--bar-rim)] opacity-90" />
            <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-malt dark:text-brassLight">
              <Target className="size-3.5" />
              Runde {rounds.length + 1}
            </h3>
            <select
              value={callerId}
              onChange={(event) => onCallerChange(event.target.value)}
              className="tap-input h-10 w-full px-2 text-sm font-black"
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
              onChange={(event) => onTargetChange(event.target.value)}
              inputMode="decimal"
              placeholder="Zielgewicht in g"
              className="tap-input mt-1.5 h-12 w-full px-2 text-lg font-black"
            />
            <button
              onClick={onStartRound}
              disabled={busy || !callerId || !targetWeight}
              className="brass-pill mt-2 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium active:scale-95 disabled:opacity-40"
            >
              Anstoßen
              <ArrowRight className="size-4" />
            </button>
            <button
              onClick={onStartEmpty}
              disabled={busy}
              className="mt-1.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-malt text-xs font-black text-goldHigh shadow active:scale-95 disabled:opacity-40 dark:bg-nightSurface2 dark:text-brassLight"
            >
              <Coins className="size-3.5" />
              Leer trinken (Finale)
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={() => {
        play("tap");
        onClick();
      }}
      className={`rounded-full px-3 py-1 text-xs font-black transition active:scale-95 ${
        active ? "bg-orange text-white" : "text-malt/65 dark:text-nightMuted"
      }`}
    >
      {label}
    </button>
  );
}

/* =====================================================
   PLAY PANEL
   ===================================================== */

function PlayPanel({
  players,
  activeRound,
  measurements,
  isHost,
  busy,
  cfg,
  hitBurst,
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
  hitBurst: number;
  onEnterWeight: (player: PlayerRow, value: string) => Promise<void>;
  onEvaluate: () => Promise<void>;
  onComplete: () => Promise<void>;
  onDistribute: (giverId: string, recipients: Array<{ playerId: string; points: number }>) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>({});

  if (!activeRound) {
    return (
      <div className="phase-enter flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-malt/15 bg-foam/40 dark:border-brassLight/15 dark:bg-nightSurface/40">
        <p className="text-center font-bold text-malt/65 dark:text-nightMuted">
          Keine aktive Runde. Starte eine in der Lobby.
        </p>
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

  const callerName = players.find((p) => p.id === activeRound.caller_game_player_id)?.display_name ?? "—";

  return (
    <div className="grid flex-1 gap-2 overflow-hidden phase-enter lg:grid-cols-[1fr_280px]">
      {/* Spieler-Liste */}
      <section className="flex h-full flex-col gap-2 overflow-hidden">
        {/* Phase-Header */}
        <div className="coaster relative overflow-hidden px-4 py-3">
          {/* Konfetti bei Volltreffer */}
          <Burst trigger={hitBurst || null} variant="confetti" count={90} origin={{ x: 0.5, y: 0.4 }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[0.6rem] font-black uppercase tracking-[0.25em] text-malt/55 dark:text-brassLight/60">
                Runde {activeRound.round_number} · {reviewing ? "Auswertung" : activeRound.type === "empty_finish" ? "Finale" : "Wiegen"}
              </div>
              <div className="text-xl font-black text-malt dark:text-brassLight sm:text-2xl">
                {activeRound.type === "empty_finish" ? (
                  <span>Leer trinken!</span>
                ) : (
                  <span>
                    Ziel <span className="font-semibold text-orange">{grams(activeRound.target_weight)}</span> · Ansager{" "}
                    <span className="font-semibold text-orange">{callerName}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Crown className="size-4 text-orange" />
              <span className="text-xs font-black uppercase text-malt/55 dark:text-nightMuted">
                {measurements.length}/{players.length}
              </span>
            </div>
          </div>
        </div>

        <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
          {players.map((player) => {
            const m = measureMap.get(player.id);
            const isCaller = activeRound.caller_game_player_id === player.id;
            const isExact = m?.exact_hit && reviewing;
            const isWorst = m?.is_worst && reviewing;
            return (
              <div
                key={player.id}
                className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 shadow-sm transition ${
                  isExact
                    ? "border-emerald/70 bg-emerald/15"
                    : isWorst
                    ? "drum-shake border-wine/60 bg-dangerSoft"
                    : "border-white/80 bg-foam/95 dark:border-nightBorder dark:bg-nightSurface/85"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <BeerMug
                      level={levelOf(player)}
                      bubbles={!reviewing}
                      size={56}
                      highlight={
                        isExact ? "win" : isWorst ? "loss" : isCaller ? "caller" : "none"
                      }
                      label={player.display_name}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-black text-malt dark:text-nightText">
                        {player.display_name}
                        {isCaller && (
                          <span className="rounded-full bg-orange px-1.5 py-0.5 text-[0.55rem] font-medium uppercase text-white">
                            Ansager
                          </span>
                        )}
                        {isExact && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-white">
                            <Sparkles className="size-2.5" />
                            Volltreffer
                          </span>
                        )}
                      </div>
                      <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                        vorher {grams(player.current_weight ?? player.start_weight)}
                        {m && reviewing && ` · Abw. ${grams(Number(m.deviation ?? 0))}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m ? (
                      <span className="text-2xl font-black text-malt dark:text-brassLight">{grams(Number(m.weight))}</span>
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
                          className="tap-input h-11 w-24 px-2 text-right text-lg font-black"
                        />
                      )
                    )}
                    <span className="score-tick text-2xl font-black text-wine">
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
                className="brass-pill inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-medium active:scale-95"
              >
                Auswerten
              </button>
            )}
            {reviewing && (
              <button
                onClick={onComplete}
                disabled={busy}
                className="brass-pill inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-medium active:scale-95"
              >
                Punkte übernehmen
              </button>
            )}
          </div>
        )}
      </section>

      {/* Verteilung / Punktestand */}
      <aside className="flex h-full flex-col overflow-hidden">
        {reviewing && exactHits.length > 0 ? (
          <section className="coaster flex h-full flex-col p-3">
            <h3 className="text-[0.65rem] font-black uppercase tracking-wider text-malt dark:text-brassLight">
              Volltreffer-Punkte verteilen
            </h3>
            <div className="scroll-vintage mt-2 grid flex-1 gap-2 overflow-y-auto pr-1">
              {exactHits.map((hit) => {
                const giver = players.find((p) => p.id === hit.game_player_id);
                const left = tokensLeft(hit.game_player_id);
                return (
                  <div key={hit.id} className="rounded-2xl bg-foam p-2.5 dark:bg-nightSurface">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-malt dark:text-nightText">{giver?.display_name}</div>
                      <span className="rounded-full bg-orange px-2 py-0.5 text-[0.6rem] font-medium text-white">{left}</span>
                    </div>
                    <div className="mt-1 grid gap-0.5">
                      {players
                        .filter((p) => p.id !== hit.game_player_id)
                        .map((target) => {
                          const count = distribution[hit.game_player_id]?.[target.id] ?? 0;
                          return (
                            <div
                              key={target.id}
                              className="flex items-center justify-between gap-1 rounded-md bg-cream/70 px-1.5 py-1 dark:bg-nightSurface2/70"
                            >
                              <span className="truncate text-xs font-black text-malt dark:text-nightText">
                                {target.display_name}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    play("click");
                                    setDistribution((current) => {
                                      const giverDist = { ...(current[hit.game_player_id] ?? {}) };
                                      giverDist[target.id] = Math.max(0, (giverDist[target.id] ?? 0) - 1);
                                      return { ...current, [hit.game_player_id]: giverDist };
                                    });
                                  }}
                                  className="grid size-6 place-items-center rounded-full bg-white text-xs font-black active:scale-95 dark:bg-nightBg"
                                >
                                  −
                                </button>
                                <span className="w-4 text-center text-xs font-black text-malt dark:text-nightText">{count}</span>
                                <button
                                  onClick={() => {
                                    if (left <= 0) return;
                                    play("click");
                                    setDistribution((current) => {
                                      const giverDist = { ...(current[hit.game_player_id] ?? {}) };
                                      giverDist[target.id] = (giverDist[target.id] ?? 0) + 1;
                                      return { ...current, [hit.game_player_id]: giverDist };
                                    });
                                  }}
                                  disabled={left <= 0}
                                  className="grid size-6 place-items-center rounded-full bg-orange text-xs text-white disabled:opacity-40"
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
                        className="mt-1 w-full rounded-full bg-emerald px-3 py-1 text-xs font-black text-white active:scale-95"
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
          <section className="coaster flex h-full flex-col p-3">
            <h3 className="mb-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
              Punktestand
            </h3>
            <div className="scroll-vintage grid flex-1 gap-1 overflow-y-auto pr-1">
              {[...players]
                .sort((a, b) => b.penalty_points - a.penalty_points)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-md px-2 py-1 ${
                      index === 0 ? "border border-wine/40 bg-dangerSoft" : "bg-cream/80 dark:bg-nightSurface2/80"
                    }`}
                  >
                    <span className="truncate text-xs font-black text-malt dark:text-nightText">
                      {index + 1}. {player.display_name}
                    </span>
                    <span className="shrink-0 text-base font-black text-wine">{player.penalty_points}</span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
