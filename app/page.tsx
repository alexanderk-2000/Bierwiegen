"use client";

import clsx from "clsx";
import NextLink from "next/link";
import {
  ArrowRight,
  BarChart3,
  Beer,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Delete,
  Globe2,
  History,
  Medal,
  Moon,
  PartyPopper,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BottleSize = 0.25 | 0.33 | 0.5 | number;

type BeerInfo = {
  brand: string;
  bottleSizeLiters: BottleSize;
};

type Player = {
  id: string;
  name: string;
  beer: BeerInfo;
  startWeight: number;
  currentWeight: number;
  emptyBottleWeight?: number;
  penaltyPoints: number;
};

type Measurement = {
  playerId: string;
  weight: number;
  previousWeight: number;
  deviation: number;
  exactHit: boolean;
  isCaller: boolean;
  isWorst: boolean;
  penaltyPointsReceived: number;
  source: "manual" | "corrected";
};

type Penalty = {
  playerId: string;
  points: number;
  reason:
    | "worst_deviation"
    | "caller_worst_deviation"
    | "exact_hit_distribution"
    | "empty_bottle_coin_flip";
};

type RoundType = "normal" | "empty_finish";

type EmptyBottleMeasurement = {
  playerId: string;
  previousWeight: number;
  emptyBottleWeight: number;
  consumedInFinalRound: number;
  coinFlipLoser: boolean;
};

type RoundPenaltyConfig = {
  worst: number;
  callerWorst: number;
  exactHit: number;
  callerExactHit: number;
};

type Round = {
  id: string;
  roundNumber: number;
  type: RoundType;
  callerId?: string;
  targetWeight?: number;
  measurements: Measurement[];
  emptyBottleMeasurements?: EmptyBottleMeasurement[];
  worstPlayerIds: string[];
  exactHitPlayerIds: string[];
  penalties: Penalty[];
  specialPenaltyDistributions: Penalty[];
  status: "setup" | "input" | "review" | "completed";
  createdAt: string;
  completedAt?: string;
  penaltyConfig?: RoundPenaltyConfig;
};

const DEFAULT_PENALTY_CONFIG: RoundPenaltyConfig = {
  worst: 1,
  callerWorst: 2,
  exactHit: 1,
  callerExactHit: 2
};

const penaltyConfigOf = (round: Round): RoundPenaltyConfig =>
  round.penaltyConfig ?? DEFAULT_PENALTY_CONFIG;

type Game = {
  id: string;
  players: Player[];
  rounds: Round[];
  status: "setup" | "playing" | "ended";
  activeRoundId?: string;
  coinFlipResult?: "heaviest" | "lightest";
  createdAt: string;
  updatedAt: string;
};

type Screen = "home" | "setup" | "play" | "roundSetup" | "review" | "endgame" | "final";

type UndoSnapshot = {
  label: string;
  game: Game;
  screen: Screen;
};

type GameSettings = {
  bigTapMode: boolean;
  sound: boolean;
  vibration: boolean;
  theme: "light" | "dark";
  passPhoneSplash: boolean;
  autoAdvance: boolean;
  hideValuesUntilReveal: boolean;
  penalties: {
    worst: number;
    callerWorst: number;
    exactHit: number;
    callerExactHit: number;
    coinFlipLoss: number;
  };
};

const DEFAULT_SETTINGS: GameSettings = {
  bigTapMode: true,
  sound: true,
  vibration: true,
  theme: "light",
  passPhoneSplash: true,
  autoAdvance: true,
  hideValuesUntilReveal: false,
  penalties: {
    worst: 1,
    callerWorst: 2,
    exactHit: 1,
    callerExactHit: 2,
    coinFlipLoss: 1
  }
};

const STORAGE_KEY = "bierwiegen-v1-game";
const BRANDS_STORAGE_KEY = "bierwiegen-v1-brands";
const SETTINGS_STORAGE_KEY = "bierwiegen-v1-settings";
const DEFAULT_BEER: BeerInfo = { brand: "Augustiner", bottleSizeLiters: 0.33 };
const DEFAULT_BRANDS = [
  "Augustiner",
  "Tegernseer",
  "Rothaus",
  "Astra",
  "Beck's",
  "Warsteiner",
  "Krombacher",
  "Jever",
  "Heineken",
  "Corona"
];
const BOTTLE_SIZE_OPTIONS = [0.33, 0.5, 0.25];
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const now = () => new Date().toISOString();
const grams = (value?: number) => (Number.isFinite(value) ? `${Math.round(value as number)} g` : "-");
const milliliters = (value?: number) => (Number.isFinite(value) ? `${Math.round(value as number)} ml` : "-");
const bottleSizeLabel = (value?: number) =>
  Number.isFinite(value) ? `${String(value).replace(".", ",")} l` : "-";
const playerName = (players: Player[], id?: string) => players.find((player) => player.id === id)?.name ?? "-";
const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};
const normalizeBeer = (beer?: Partial<BeerInfo>): BeerInfo => ({
  brand: beer?.brand?.trim() || DEFAULT_BEER.brand,
  bottleSizeLiters: Number.isFinite(beer?.bottleSizeLiters) ? (beer?.bottleSizeLiters as BottleSize) : DEFAULT_BEER.bottleSizeLiters
});

function migrateGame(rawGame: Game): Game {
  return {
    ...rawGame,
    players: rawGame.players.map((player) => ({
      ...player,
      beer: normalizeBeer(player.beer)
    })),
    rounds: rawGame.rounds.map((round) => ({
      ...round,
      type: round.type ?? "normal",
      measurements: round.measurements ?? [],
      emptyBottleMeasurements: round.emptyBottleMeasurements ?? []
    }))
  };
}

const emptyGame = (): Game => ({
  id: uid(),
  players: [],
  rounds: [],
  status: "setup",
  createdAt: now(),
  updatedAt: now()
});

function roundPreviousWeight(game: Game, playerId: string, roundNumber: number) {
  if (roundNumber === 1) {
    return game.players.find((player) => player.id === playerId)?.startWeight ?? 0;
  }

  const previousRound = [...game.rounds]
    .filter((round) => round.roundNumber < roundNumber && round.status === "completed")
    .sort((a, b) => b.roundNumber - a.roundNumber)[0];
  return (
    previousRound?.emptyBottleMeasurements?.find((measurement) => measurement.playerId === playerId)
      ?.emptyBottleWeight ??
    previousRound?.measurements.find((measurement) => measurement.playerId === playerId)?.weight ??
    0
  );
}

function recalculateRound(game: Game, round: Round): Round {
  if (round.type === "empty_finish") {
    return {
      ...round,
      measurements: [],
      worstPlayerIds: [],
      exactHitPlayerIds: [],
      specialPenaltyDistributions: []
    };
  }

  const complete = round.measurements.length === game.players.length;
  const normalizedMeasurements = round.measurements.map((measurement) => {
    const targetWeight = round.targetWeight ?? 0;
    const deviation = Math.abs(measurement.weight - targetWeight);
    return {
      ...measurement,
      deviation,
      exactHit: deviation === 0,
      isCaller: measurement.playerId === round.callerId,
      isWorst: false,
      penaltyPointsReceived: 0
    };
  });

  if (!complete) {
    return {
      ...round,
      measurements: normalizedMeasurements,
      worstPlayerIds: [],
      exactHitPlayerIds: normalizedMeasurements.filter((item) => item.exactHit).map((item) => item.playerId),
      penalties: []
    };
  }

  const maxDeviation = Math.max(...normalizedMeasurements.map((measurement) => measurement.deviation));
  const worstPlayerIds = normalizedMeasurements
    .filter((measurement) => measurement.deviation === maxDeviation)
    .map((measurement) => measurement.playerId);
  const exactHitPlayerIds = normalizedMeasurements
    .filter((measurement) => measurement.exactHit)
    .map((measurement) => measurement.playerId);
  const cfg = penaltyConfigOf(round);
  const penalties: Penalty[] = worstPlayerIds.map((playerId) => ({
    playerId,
    points: playerId === round.callerId ? cfg.callerWorst : cfg.worst,
    reason: playerId === round.callerId ? "caller_worst_deviation" : "worst_deviation"
  }));
  const withFlags = normalizedMeasurements.map((measurement) => ({
    ...measurement,
    isWorst: worstPlayerIds.includes(measurement.playerId),
    penaltyPointsReceived:
      penalties.find((penalty) => penalty.playerId === measurement.playerId)?.points ?? 0
  }));

  return {
    ...round,
    measurements: withFlags,
    worstPlayerIds,
    exactHitPlayerIds,
    penalties
  };
}

function totalsForRound(round: Round) {
  const totals = new Map<string, number>();
  [...round.penalties, ...round.specialPenaltyDistributions].forEach((penalty) => {
    totals.set(penalty.playerId, (totals.get(penalty.playerId) ?? 0) + penalty.points);
  });
  return totals;
}

function recalculatePlayerTotals(game: Game): Game {
  const players = game.players.map((player) => {
    const completedRounds = game.rounds.filter((round) => round.status === "completed");
    const latestWeight =
      [...completedRounds]
        .reverse()
        .flatMap((round) => round.emptyBottleMeasurements ?? [])
        .find((measurement) => measurement.playerId === player.id)?.emptyBottleWeight ??
      [...completedRounds]
        .reverse()
        .flatMap((round) => round.measurements)
        .find((measurement) => measurement.playerId === player.id)?.weight;
    const roundPoints = completedRounds.reduce((sum, round) => {
      const roundTotal = [...round.penalties, ...round.specialPenaltyDistributions]
        .filter((penalty) => penalty.playerId === player.id)
        .reduce((innerSum, penalty) => innerSum + penalty.points, 0);
      return sum + roundTotal;
    }, 0);

    return {
      ...player,
      beer: normalizeBeer(player.beer),
      currentWeight: latestWeight ?? player.startWeight,
      penaltyPoints: roundPoints
    };
  });

  return { ...game, players, updatedAt: now() };
}

function createRound(
  game: Game,
  callerId: string,
  targetWeight: number,
  penaltyConfig: RoundPenaltyConfig = DEFAULT_PENALTY_CONFIG
): Round {
  return {
    id: uid(),
    roundNumber: game.rounds.length + 1,
    type: "normal",
    callerId,
    targetWeight,
    measurements: [],
    emptyBottleMeasurements: [],
    worstPlayerIds: [],
    exactHitPlayerIds: [],
    penalties: [],
    specialPenaltyDistributions: [],
    status: "input",
    createdAt: now(),
    penaltyConfig
  };
}

function createEmptyFinishRound(
  game: Game,
  penaltyConfig: RoundPenaltyConfig = DEFAULT_PENALTY_CONFIG
): Round {
  return {
    id: uid(),
    roundNumber: game.rounds.length + 1,
    type: "empty_finish",
    measurements: [],
    emptyBottleMeasurements: [],
    worstPlayerIds: [],
    exactHitPlayerIds: [],
    penalties: [],
    specialPenaltyDistributions: [],
    status: "input",
    createdAt: now(),
    penaltyConfig
  };
}

function statsForPlayer(game: Game, playerId: string) {
  const completedRounds = game.rounds.filter((round) => round.status === "completed");
  const regularRounds = completedRounds.filter((round) => round.type === "normal");
  const measurements = regularRounds
    .map((round) => round.measurements.find((measurement) => measurement.playerId === playerId))
    .filter(Boolean) as Measurement[];
  const finalMeasurement = completedRounds
    .flatMap((round) => round.emptyBottleMeasurements ?? [])
    .find((measurement) => measurement.playerId === playerId);
  const exactHits = measurements.filter((measurement) => measurement.exactHit).length;
  const worstCount = measurements.filter((measurement) => measurement.isWorst).length;
  const callerRounds = regularRounds.filter((round) => round.callerId === playerId);
  const callerMeasurements = callerRounds
    .map((round) => round.measurements.find((measurement) => measurement.playerId === playerId))
    .filter(Boolean) as Measurement[];
  const callerPenaltyPoints = completedRounds.reduce((sum, round) => {
    if (round.callerId !== playerId) return sum;
    return (
      sum +
      [...round.penalties, ...round.specialPenaltyDistributions]
        .filter((penalty) => penalty.playerId === playerId)
        .reduce((inner, penalty) => inner + penalty.points, 0)
    );
  }, 0);
  const avgDeviation =
    measurements.length > 0
      ? measurements.reduce((sum, measurement) => sum + measurement.deviation, 0) / measurements.length
      : 0;
  const avgCallerDeviation =
    callerMeasurements.length > 0
      ? callerMeasurements.reduce((sum, measurement) => sum + measurement.deviation, 0) /
        callerMeasurements.length
      : 0;
  const highestDeviation = measurements.reduce(
    (max, measurement) => Math.max(max, measurement.deviation),
    0
  );
  const consumedByRound = measurements.map((measurement) =>
    Math.max(0, measurement.previousWeight - measurement.weight)
  );
  if (finalMeasurement) consumedByRound.push(finalMeasurement.consumedInFinalRound);
  const player = game.players.find((item) => item.id === playerId);
  const totalConsumedGrams = Math.max(
    0,
    player?.startWeight && player.emptyBottleWeight
      ? player.startWeight - player.emptyBottleWeight
      : consumedByRound.reduce((sum, value) => sum + value, 0)
  );
  const avgConsumedPerRound =
    consumedByRound.length > 0
      ? consumedByRound.reduce((sum, value) => sum + value, 0) / consumedByRound.length
      : 0;
  const maxConsumedInRound = consumedByRound.reduce((max, value) => Math.max(max, value), 0);
  const minConsumedInRound = consumedByRound.length > 0 ? Math.min(...consumedByRound) : 0;
  const consumptionVariance =
    consumedByRound.length > 0
      ? consumedByRound.reduce((sum, value) => sum + Math.abs(value - avgConsumedPerRound), 0) /
        consumedByRound.length
      : Number.POSITIVE_INFINITY;

  return {
    exactHits,
    worstCount,
    callerCount: callerRounds.length,
    callerPenaltyPoints,
    avgDeviation,
    avgCallerDeviation,
    highestDeviation,
    totalConsumedGrams,
    estimatedMl: totalConsumedGrams,
    avgConsumedPerRound,
    maxConsumedInRound,
    minConsumedInRound,
    consumptionVariance,
    lastDeviation: measurements.at(-1)?.deviation ?? 0,
    lastRoundPenalty:
      completedRounds.at(-1) &&
      [...(completedRounds.at(-1)?.penalties ?? []), ...(completedRounds.at(-1)?.specialPenaltyDistributions ?? [])]
        .filter((penalty) => penalty.playerId === playerId)
        .reduce((sum, penalty) => sum + penalty.points, 0)
  };
}

function beerAnalytics(game: Game) {
  const playerRows = game.players.map((player) => ({ player, stats: statsForPlayer(game, player.id) }));
  const brandRows = new Map<
    string,
    {
      brand: string;
      playerCount: number;
      deviations: number[];
      penaltyPoints: number;
      exactHits: number;
      consumedPerRound: number[];
      emptyWeights: number[];
    }
  >();
  const sizeRows = new Map<
    string,
    {
      size: number;
      playerCount: number;
      deviations: number[];
      penaltyPoints: number;
      roundsUntilEmpty: number[];
      consumedPerRound: number[];
    }
  >();

  for (const { player, stats } of playerRows) {
    const brand = normalizeBeer(player.beer).brand;
    const size = normalizeBeer(player.beer).bottleSizeLiters;
    const brandRow =
      brandRows.get(brand) ??
      {
        brand,
        playerCount: 0,
        deviations: [],
        penaltyPoints: 0,
        exactHits: 0,
        consumedPerRound: [],
        emptyWeights: []
      };
    const sizeKey = bottleSizeLabel(size);
    const sizeRow =
      sizeRows.get(sizeKey) ??
      {
        size,
        playerCount: 0,
        deviations: [],
        penaltyPoints: 0,
        roundsUntilEmpty: [],
        consumedPerRound: []
      };
    const measurements = game.rounds
      .filter((round) => round.status === "completed" && round.type === "normal")
      .map((round) => round.measurements.find((measurement) => measurement.playerId === player.id))
      .filter(Boolean) as Measurement[];
    const finalMeasurement = game.rounds
      .filter((round) => round.status === "completed")
      .flatMap((round) => round.emptyBottleMeasurements ?? [])
      .find((measurement) => measurement.playerId === player.id);
    const consumedPerRound = measurements.map((measurement) =>
      Math.max(0, measurement.previousWeight - measurement.weight)
    );
    if (finalMeasurement) consumedPerRound.push(finalMeasurement.consumedInFinalRound);

    brandRow.playerCount += 1;
    brandRow.deviations.push(...measurements.map((measurement) => measurement.deviation));
    brandRow.penaltyPoints += player.penaltyPoints;
    brandRow.exactHits += stats.exactHits;
    brandRow.consumedPerRound.push(...consumedPerRound);
    if (Number.isFinite(player.emptyBottleWeight)) brandRow.emptyWeights.push(player.emptyBottleWeight as number);
    brandRows.set(brand, brandRow);

    sizeRow.playerCount += 1;
    sizeRow.deviations.push(...measurements.map((measurement) => measurement.deviation));
    sizeRow.penaltyPoints += player.penaltyPoints;
    sizeRow.roundsUntilEmpty.push(consumedPerRound.length);
    sizeRow.consumedPerRound.push(...consumedPerRound);
    sizeRows.set(sizeKey, sizeRow);
  }

  const avg = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const brandStats = [...brandRows.values()].map((row) => ({
    ...row,
    avgDeviation: avg(row.deviations),
    avgPenaltyPoints: row.playerCount > 0 ? row.penaltyPoints / row.playerCount : 0,
    avgConsumedPerRound: avg(row.consumedPerRound),
    avgEmptyBottleWeight: avg(row.emptyWeights)
  }));
  const sizeStats = [...sizeRows.values()].map((row) => ({
    ...row,
    label: bottleSizeLabel(row.size),
    avgDeviation: avg(row.deviations),
    avgPenaltyPoints: row.playerCount > 0 ? row.penaltyPoints / row.playerCount : 0,
    avgRoundsUntilEmpty: avg(row.roundsUntilEmpty),
    avgConsumedPerRound: avg(row.consumedPerRound)
  }));

  return {
    playerRows,
    brandStats,
    sizeStats,
    mostConsumedBrand: [...brandStats].sort((a, b) => b.playerCount - a.playerCount)[0],
    bestBrand: [...brandStats].filter((row) => row.deviations.length > 0).sort((a, b) => a.avgDeviation - b.avgDeviation)[0],
    worstBrand: [...brandStats].filter((row) => row.deviations.length > 0).sort((a, b) => b.avgDeviation - a.avgDeviation)[0],
    bestSize: [...sizeStats].filter((row) => row.deviations.length > 0).sort((a, b) => a.avgDeviation - b.avgDeviation)[0],
    biggestTotalDrinker: [...playerRows].sort((a, b) => b.stats.totalConsumedGrams - a.stats.totalConsumedGrams)[0],
    biggestSip: [...playerRows].sort((a, b) => b.stats.maxConsumedInRound - a.stats.maxConsumedInRound)[0],
    mostConsistentDrinker: [...playerRows]
      .filter((row) => Number.isFinite(row.stats.consumptionVariance))
      .sort((a, b) => a.stats.consumptionVariance - b.stats.consumptionVariance)[0]
  };
}

function awardWinners(game: Game) {
  const players = game.players;
  const rows = players.map((player) => ({ player, stats: statsForPlayer(game, player.id) }));
  const beer = beerAnalytics(game);
  const minAvg = Math.min(...rows.map((row) => row.stats.avgDeviation || Number.POSITIVE_INFINITY));
  const maxExact = Math.max(...rows.map((row) => row.stats.exactHits));
  const maxDeviation = Math.max(...rows.map((row) => row.stats.highestDeviation));
  const maxPenalty = Math.max(...players.map((player) => player.penaltyPoints));
  const maxCaller = Math.max(...rows.map((row) => row.stats.callerCount));
  return {
    waagenmeister: rows.find((row) => row.stats.avgDeviation === minAvg)?.player,
    zielwasser: rows.find((row) => row.stats.exactHits === maxExact)?.player,
    daneben: rows.find((row) => row.stats.highestDeviation === maxDeviation)?.player,
    strafpunktKoenig: players.find((player) => player.penaltyPoints === maxPenalty),
    mutigerAnsager: rows.find((row) => row.stats.callerCount === maxCaller)?.player,
    markentreu: beer.mostConsumedBrand,
    halbeLiterHeld: beer.playerRows
      .filter((row) => row.player.beer.bottleSizeLiters === 0.5)
      .sort((a, b) => a.stats.avgDeviation - b.stats.avgDeviation)[0]?.player,
    drittelProfi: beer.playerRows
      .filter((row) => row.player.beer.bottleSizeLiters === 0.33)
      .sort((a, b) => a.stats.avgDeviation - b.stats.avgDeviation)[0]?.player,
    groessterSchluck: beer.biggestSip?.player,
    konstanterTrinker: beer.mostConsistentDrinker?.player,
    bierSommelier: beer.bestBrand
  };
}

// ─────────────────────────────────────────────────────────
// Audio (Web Audio API – keine externen Dateien nötig)
// ─────────────────────────────────────────────────────────
type SoundName = "tap" | "next" | "hit" | "worst" | "drumroll" | "win" | "coin" | "error";

let audioCtxSingleton: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtxSingleton) {
      const Ctx = (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctx) return null;
      audioCtxSingleton = new Ctx();
    }
    if (audioCtxSingleton.state === "suspended") audioCtxSingleton.resume().catch(() => undefined);
    return audioCtxSingleton;
  } catch {
    return null;
  }
};

const tone = (
  ctx: AudioContext,
  frequency: number,
  duration: number,
  options: { type?: OscillatorType; gain?: number; delay?: number; sweep?: number } = {}
) => {
  const start = ctx.currentTime + (options.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(frequency, start);
  if (options.sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, options.sweep), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.18, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

const playSound = (name: SoundName, enabled: boolean) => {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  switch (name) {
    case "tap":
      tone(ctx, 880, 0.05, { type: "square", gain: 0.08 });
      break;
    case "next":
      tone(ctx, 660, 0.08, { type: "triangle", gain: 0.16 });
      tone(ctx, 990, 0.1, { type: "triangle", gain: 0.14, delay: 0.08 });
      break;
    case "hit":
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) =>
        tone(ctx, freq, 0.18, { type: "triangle", gain: 0.22, delay: index * 0.07 })
      );
      break;
    case "worst":
      tone(ctx, 200, 0.4, { type: "sawtooth", gain: 0.22, sweep: 60 });
      break;
    case "drumroll":
      for (let i = 0; i < 14; i += 1) {
        tone(ctx, 110 + i * 4, 0.05, { type: "square", gain: 0.12, delay: i * 0.07 });
      }
      break;
    case "win":
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, index) =>
        tone(ctx, freq, 0.22, { type: "triangle", gain: 0.24, delay: index * 0.1 })
      );
      break;
    case "coin":
      for (let i = 0; i < 8; i += 1) {
        tone(ctx, 600 + Math.random() * 800, 0.06, { type: "square", gain: 0.1, delay: i * 0.09 });
      }
      break;
    case "error":
      tone(ctx, 220, 0.16, { type: "sawtooth", gain: 0.18 });
      break;
  }
};

const vibrate = (pattern: number | number[], enabled: boolean) => {
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────────────────
// Settings Hook
// ─────────────────────────────────────────────────────────
function useSettings() {
  const [settings, setSettingsState] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GameSettings>;
        setSettingsState({
          ...DEFAULT_SETTINGS,
          ...parsed,
          penalties: { ...DEFAULT_SETTINGS.penalties, ...(parsed.penalties ?? {}) }
        });
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  const setSettings = useCallback((updater: (previous: GameSettings) => GameSettings) => {
    setSettingsState((previous) => updater(previous));
  }, []);

  return { settings, setSettings };
}

function useLocalGame() {
  const [game, setGameState] = useState<Game>(() => emptyGame());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGameState(recalculatePlayerTotals(migrateGame(JSON.parse(saved) as Game)));
      } catch {
        setGameState(emptyGame());
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, loaded]);

  const setGame = useCallback((updater: Game | ((previous: Game) => Game)) => {
    setGameState((previous) => {
      const next = typeof updater === "function" ? (updater as (previous: Game) => Game)(previous) : updater;
      return recalculatePlayerTotals({ ...next, updatedAt: now() });
    });
  }, []);

  return { game, setGame, hasSavedGame: loaded && localStorage.getItem(STORAGE_KEY) !== null, loaded };
}

export default function BierwiegenApp() {
  const { game, setGame, hasSavedGame, loaded } = useLocalGame();
  const { settings, setSettings } = useSettings();
  const [screen, setScreen] = useState<Screen>("home");
  const [setupName, setSetupName] = useState("");
  const [setupWeight, setSetupWeight] = useState("");
  const [setupBrand, setSetupBrand] = useState(DEFAULT_BEER.brand);
  const [setupBottleSize, setSetupBottleSize] = useState(String(DEFAULT_BEER.bottleSizeLiters));
  const [sameBrandForAll, setSameBrandForAll] = useState(true);
  const [sameBottleSizeForAll, setSameBottleSizeForAll] = useState(true);
  const [knownBrands, setKnownBrands] = useState(DEFAULT_BRANDS);
  const [setupError, setSetupError] = useState("");
  const [roundCaller, setRoundCaller] = useState("");
  const [roundTarget, setRoundTarget] = useState("");
  const [specials, setSpecials] = useState<Record<string, number>>({});
  const [emptyWeights, setEmptyWeights] = useState<Record<string, string>>({});
  const [coinSpinning, setCoinSpinning] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Big-Tap-Mode + Spielfluss
  const [numpadPlayerId, setNumpadPlayerId] = useState<string | null>(null);
  const [numpadContext, setNumpadContext] = useState<"weight" | "empty" | "target" | "startWeight" | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [revealStage, setRevealStage] = useState<"idle" | "drumroll" | "revealed">("idle");
  const [confettiKey, setConfettiKey] = useState(0);

  const sound = useCallback((name: SoundName) => playSound(name, settings.sound), [settings.sound]);
  const buzz = useCallback((pattern: number | number[]) => vibrate(pattern, settings.vibration), [settings.vibration]);

  // Stable ref auf reviewRound, damit der Auto-Advance-Effect kein "missing dep"-Problem hat
  const reviewRoundRef = useRef<() => void>(() => undefined);

  const activeRound = game.rounds.find((round) => round.id === game.activeRoundId);
  const activeRoundId = activeRound?.id;
  const rankings = [...game.players].sort((a, b) => b.penaltyPoints - a.penaltyPoints);
  const progress = activeRound
    ? activeRound.type === "empty_finish"
      ? `${activeRound.emptyBottleMeasurements?.length ?? 0}/${game.players.length}`
      : `${activeRound.measurements.length}/${game.players.length}`
    : "0/0";

  const pushUndo = useCallback(
    (label: string) => {
      setUndoStack((stack) => [...stack.slice(-4), { label, game: structuredClone(game), screen }]);
    },
    [game, screen]
  );

  const updateGame = useCallback(
    (label: string, updater: (previous: Game) => Game) => {
      pushUndo(label);
      setGame(updater);
    },
    [pushUndo, setGame]
  );

  const scrollToCurrentRound = useCallback(() => {
    window.requestAnimationFrame(() => {
      tableRef.current?.querySelector("[data-current-round='true']")?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    });
  }, []);

  useEffect(() => {
    if (screen === "play" && activeRoundId) scrollToCurrentRound();
  }, [activeRoundId, screen, scrollToCurrentRound]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    try {
      const savedBrands = JSON.parse(localStorage.getItem(BRANDS_STORAGE_KEY) ?? "[]") as string[];
      setKnownBrands([...new Set([...savedBrands, ...DEFAULT_BRANDS])].filter(Boolean));
      if (savedBrands[0]) setSetupBrand(savedBrands[0]);
    } catch {
      setKnownBrands(DEFAULT_BRANDS);
    }
  }, []);

  const rememberBrand = (brand: string) => {
    const normalized = brand.trim();
    if (!normalized) return;
    const nextBrands = [normalized, ...knownBrands.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 16);
    setKnownBrands(nextBrands);
    localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(nextBrands));
  };

  const startNewGame = () => {
    const next = emptyGame();
    setUndoStack([]);
    setGame(next);
    setSetupName("");
    setSetupWeight("");
    setSetupBrand(knownBrands[0] ?? DEFAULT_BEER.brand);
    setSetupBottleSize(String(DEFAULT_BEER.bottleSizeLiters));
    setSameBrandForAll(true);
    setSameBottleSizeForAll(true);
    setScreen("setup");
  };

  const continueGame = () => {
    const currentRound = game.rounds.find((round) => round.id === game.activeRoundId);
    if (game.status === "ended") {
      setScreen("final");
    } else if (currentRound?.type === "empty_finish") {
      setEmptyWeights(
        Object.fromEntries(
          game.players.map((player) => [
            player.id,
            String(
              currentRound.emptyBottleMeasurements?.find((measurement) => measurement.playerId === player.id)
                ?.emptyBottleWeight ?? ""
            )
          ])
        )
      );
      setScreen("endgame");
    } else if (currentRound) {
      setScreen("play");
    } else {
      const nextCaller = game.players[game.rounds.length % game.players.length]?.id ?? game.players[0]?.id ?? "";
      setRoundCaller(nextCaller);
      setScreen(game.players.length ? "roundSetup" : "setup");
    }
  };

  const addPlayer = () => {
    const weight = toNumber(setupWeight);
    if (!setupName.trim()) {
      setSetupError("Bitte einen Spielernamen eingeben.");
      return;
    }
    if (!weight || weight <= 0) {
      setSetupError("Bitte ein gültiges Startgewicht eintragen.");
      return;
    }
    const bottleSize = toNumber(setupBottleSize) ?? DEFAULT_BEER.bottleSizeLiters;
    const brand = setupBrand.trim() || DEFAULT_BEER.brand;
    rememberBrand(brand);
    setSetupError("");
    updateGame("Spieler hinzugefügt", (previous) => ({
      ...previous,
      players: [
        ...previous.players,
        {
          id: uid(),
          name: setupName.trim(),
          beer: { brand, bottleSizeLiters: bottleSize },
          startWeight: weight,
          currentWeight: weight,
          penaltyPoints: 0
        }
      ]
    }));
    setSetupName("");
    setSetupWeight("");
    if (!sameBrandForAll) setSetupBrand(knownBrands[0] ?? DEFAULT_BEER.brand);
    if (!sameBottleSizeForAll) setSetupBottleSize(String(DEFAULT_BEER.bottleSizeLiters));
  };

  const removePlayer = (playerId: string) => {
    updateGame("Spieler gelöscht", (previous) => ({
      ...previous,
      players: previous.players.filter((player) => player.id !== playerId)
    }));
  };

  const editPlayerWeight = (playerId: string, value: string) => {
    const weight = toNumber(value);
    if (!weight) return;
    setGame((previous) => ({
      ...previous,
      players: previous.players.map((player) =>
        player.id === playerId ? { ...player, startWeight: weight, currentWeight: weight } : player
      )
    }));
  };

  const editPlayerBeer = (playerId: string, beer: Partial<BeerInfo>) => {
    if (beer.brand) rememberBrand(beer.brand);
    setGame((previous) => ({
      ...previous,
      players: previous.players.map((player) =>
        player.id === playerId ? { ...player, beer: normalizeBeer({ ...player.beer, ...beer }) } : player
      )
    }));
  };

  const startRoundSetup = () => {
    if (game.players.length < 2) {
      setSetupError("Mindestens 2 Spieler sind nötig.");
      return;
    }
    setGame((previous) => ({ ...previous, status: "playing" }));
    setRoundCaller(game.players[game.rounds.length % game.players.length]?.id ?? game.players[0]?.id ?? "");
    setRoundTarget("");
    setScreen("roundSetup");
  };

  const currentPenaltyConfig = useMemo<RoundPenaltyConfig>(
    () => ({
      worst: settings.penalties.worst,
      callerWorst: settings.penalties.callerWorst,
      exactHit: settings.penalties.exactHit,
      callerExactHit: settings.penalties.callerExactHit
    }),
    [settings.penalties]
  );

  const startRound = () => {
    const target = toNumber(roundTarget);
    if (!roundCaller || !target) return;
    updateGame("Runde gestartet", (previous) => {
      const round = createRound(previous, roundCaller, target, currentPenaltyConfig);
      return {
        ...previous,
        status: "playing",
        activeRoundId: round.id,
        rounds: [...previous.rounds, round]
      };
    });
    setSpecials({});
    setScreen("play");
    setRevealStage("idle");
    sound("next");
    buzz(20);
    // Direkt ersten Spieler im Big-Tap öffnen
    if (settings.bigTapMode && game.players[0]) {
      setNumpadContext("weight");
      setNumpadPlayerId(game.players[0].id);
    }
  };

  const startEmptyFinishRound = () => {
    if (!window.confirm("Finale Runde starten? Danach trinken alle leer und das Spiel endet.")) return;
    updateGame("Leer trinken gestartet", (previous) => {
      const round = createEmptyFinishRound(previous, currentPenaltyConfig);
      return {
        ...previous,
        status: "playing",
        coinFlipResult: undefined,
        activeRoundId: round.id,
        rounds: [...previous.rounds, round]
      };
    });
    setEmptyWeights(Object.fromEntries(game.players.map((player) => [player.id, ""])));
    setCoinSpinning(false);
    setScreen("endgame");
    sound("next");
    buzz(40);
    if (settings.bigTapMode && game.players[0]) {
      setNumpadContext("empty");
      setNumpadPlayerId(game.players[0].id);
    }
  };

  const upsertMeasurement = (playerId: string, rawValue: string) => {
    const weight = toNumber(rawValue);
    if (!activeRound || activeRound.type !== "normal" || weight === undefined) return;
    setGame((previous) => {
      const round = previous.rounds.find((item) => item.id === activeRound.id);
      if (!round || round.type !== "normal") return previous;
      const previousWeight = roundPreviousWeight(previous, playerId, round.roundNumber);
      const existing = round.measurements.find((measurement) => measurement.playerId === playerId);
      const targetWeight = round.targetWeight ?? 0;
      const measurement: Measurement = {
        playerId,
        weight,
        previousWeight,
        deviation: Math.abs(weight - targetWeight),
        exactHit: Math.abs(weight - targetWeight) === 0,
        isCaller: playerId === round.callerId,
        isWorst: false,
        penaltyPointsReceived: 0,
        source: existing ? "corrected" : "manual"
      };
      const measurements = existing
        ? round.measurements.map((item) => (item.playerId === playerId ? measurement : item))
        : [...round.measurements, measurement];
      const recalculated = recalculateRound(previous, { ...round, measurements });
      return {
        ...previous,
        rounds: previous.rounds.map((item) => (item.id === round.id ? recalculated : item))
      };
    });
  };

  const upsertEmptyBottleMeasurement = (playerId: string, rawValue: string) => {
    const emptyBottleWeight = toNumber(rawValue);
    setEmptyWeights((previous) => ({ ...previous, [playerId]: rawValue }));
    if (!activeRound || activeRound.type !== "empty_finish" || emptyBottleWeight === undefined) return;
    setGame((previous) => {
      const round = previous.rounds.find((item) => item.id === activeRound.id);
      if (!round || round.type !== "empty_finish") return previous;
      const previousWeight = roundPreviousWeight(previous, playerId, round.roundNumber);
      const existing = round.emptyBottleMeasurements?.find((measurement) => measurement.playerId === playerId);
      const measurement: EmptyBottleMeasurement = {
        playerId,
        previousWeight,
        emptyBottleWeight,
        consumedInFinalRound: Math.max(0, previousWeight - emptyBottleWeight),
        coinFlipLoser: existing?.coinFlipLoser ?? false
      };
      const measurements = existing
        ? (round.emptyBottleMeasurements ?? []).map((item) => (item.playerId === playerId ? measurement : item))
        : [...(round.emptyBottleMeasurements ?? []), measurement];
      return {
        ...previous,
        rounds: previous.rounds.map((item) =>
          item.id === round.id
            ? {
                ...round,
                emptyBottleMeasurements: measurements,
                penalties: [],
                status: "input"
              }
            : item
        )
      };
    });
  };

  const focusNextInput = (playerId: string) => {
    const index = game.players.findIndex((player) => player.id === playerId);
    const nextPlayer = game.players[index + 1];
    window.requestAnimationFrame(() => {
      if (nextPlayer) {
        document.getElementById(`weight-${nextPlayer.id}`)?.focus();
      } else {
        document.getElementById("review-round-button")?.focus();
      }
    });
  };

  // Numpad öffnen für einen Spieler
  const openNumpadFor = (playerId: string, context: "weight" | "empty" = "weight") => {
    setNumpadContext(context);
    setNumpadPlayerId(playerId);
    sound("tap");
    buzz(15);
  };

  const closeNumpad = () => {
    setNumpadPlayerId(null);
    setNumpadContext(null);
  };

  // Wird vom Numpad aufgerufen, wenn ein Wert übernommen wird
  const submitNumpadValue = (playerId: string, value: string) => {
    if (numpadContext === "weight") {
      upsertMeasurement(playerId, value);
    } else if (numpadContext === "empty") {
      upsertEmptyBottleMeasurement(playerId, value);
    }
    sound("next");
    buzz(20);

    // Auto-Advance: nächsten Spieler öffnen
    if (settings.autoAdvance) {
      const index = game.players.findIndex((player) => player.id === playerId);
      const nextPlayer = game.players[index + 1];
      if (nextPlayer) {
        if (settings.passPhoneSplash) {
          setHandoffMessage(nextPlayer.name);
          window.setTimeout(() => setHandoffMessage(null), 850);
          window.setTimeout(() => {
            setNumpadPlayerId(nextPlayer.id);
          }, 100);
        } else {
          setNumpadPlayerId(nextPlayer.id);
        }
      } else {
        // Letzter Spieler – Numpad schließen
        closeNumpad();
        // Falls Mess-Runde komplett: nach kurzer Pause zur Auswertung
        if (numpadContext === "weight") {
          window.setTimeout(() => {
            const round = game.rounds.find((item) => item.id === game.activeRoundId);
            if (round && round.measurements.length + 1 >= game.players.length) {
              // measurements.length wurde gerade erhöht
              // (state ist async — wir verlassen uns auf nächste Render)
            }
          }, 200);
        }
      }
    } else {
      closeNumpad();
    }
  };

  const reviewRound = () => {
    if (!activeRound || activeRound.measurements.length !== game.players.length) return;
    updateGame("Runde auswerten", (previous) => ({
      ...previous,
      rounds: previous.rounds.map((round) =>
        round.id === activeRound.id ? { ...recalculateRound(previous, round), status: "review" } : round
      )
    }));
    const round = recalculateRound(game, activeRound);
    const cfg = penaltyConfigOf(round);
    const initialSpecials: Record<string, number> = {};
    round.exactHitPlayerIds.forEach((playerId) => {
      initialSpecials[playerId] = playerId === round.callerId ? cfg.callerExactHit : cfg.exactHit;
    });
    setSpecials(initialSpecials);
    setScreen("review");

    // Reveal-Choreografie: Drumroll → Reveal
    setRevealStage("drumroll");
    sound("drumroll");
    buzz([30, 60, 30, 60, 30, 60, 30]);
    window.setTimeout(() => {
      setRevealStage("revealed");
      if (round.exactHitPlayerIds.length > 0) {
        sound("hit");
        buzz([30, 30, 30]);
        setConfettiKey((value) => value + 1);
      } else {
        sound("worst");
        buzz([100, 50, 200]);
      }
    }, 1400);
  };

  const applyRoundPoints = () => {
    if (!activeRound) return;
    updateGame("Punkte übernommen", (previous) => ({
      ...previous,
      rounds: previous.rounds.map((round) =>
        round.id === activeRound.id
          ? {
              ...round,
              status: "completed",
              completedAt: now()
            }
          : round
      )
    }));
    setRoundCaller(game.players[(activeRound.roundNumber) % game.players.length]?.id ?? game.players[0]?.id ?? "");
    setRoundTarget("");
    setRevealStage("idle");
    setScreen("roundSetup");
    sound("next");
    buzz(30);
  };

  const addSpecialToPlayer = (giverId: string, targetId: string) => {
    if ((specials[giverId] ?? 0) <= 0 || !activeRound) return;
    const penalty: Penalty = {
      playerId: targetId,
      points: 1,
      reason: "exact_hit_distribution"
    };
    setSpecials((previous) => ({ ...previous, [giverId]: (previous[giverId] ?? 0) - 1 }));
    setGame((previous) => ({
      ...previous,
      rounds: previous.rounds.map((round) =>
        round.id === activeRound.id
          ? { ...round, specialPenaltyDistributions: [...round.specialPenaltyDistributions, penalty] }
          : round
      )
    }));
  };

  const removeSpecialFromPlayer = (giverId: string, targetId: string) => {
    if (!activeRound) return;
    let removed = false;
    setGame((previous) => ({
      ...previous,
      rounds: previous.rounds.map((round) => {
        if (round.id !== activeRound.id) return round;
        const next = round.specialPenaltyDistributions.filter((penalty) => {
          if (!removed && penalty.playerId === targetId && penalty.reason === "exact_hit_distribution") {
            removed = true;
            return false;
          }
          return true;
        });
        return { ...round, specialPenaltyDistributions: next };
      })
    }));
    if (removed) {
      setSpecials((previous) => ({ ...previous, [giverId]: (previous[giverId] ?? 0) + 1 }));
    }
  };

  const flipCoin = () => {
    if (!activeRound || activeRound.type !== "empty_finish") return;
    const allWeights = game.players.every((player) => toNumber(emptyWeights[player.id]) !== undefined);
    if (!allWeights) return;
    setCoinSpinning(true);
    sound("coin");
    buzz([20, 30, 20, 30, 20, 30, 20, 30, 50]);
    window.setTimeout(() => {
      const result: "heaviest" | "lightest" = Math.random() < 0.5 ? "heaviest" : "lightest";
      updateGame("Münzwurf", (previous) => ({
        ...previous,
        coinFlipResult: result,
        rounds: previous.rounds.map((round) => {
          if (round.id !== activeRound.id || round.type !== "empty_finish") return round;
          const measurements = previous.players.map((player) => {
            const previousWeight = roundPreviousWeight(previous, player.id, round.roundNumber);
            const emptyBottleWeight = toNumber(emptyWeights[player.id]) ?? 0;
            return {
              playerId: player.id,
              previousWeight,
              emptyBottleWeight,
              consumedInFinalRound: Math.max(0, previousWeight - emptyBottleWeight),
              coinFlipLoser: false
            };
          });
          const targetWeight =
            result === "heaviest"
              ? Math.max(...measurements.map((measurement) => measurement.emptyBottleWeight))
              : Math.min(...measurements.map((measurement) => measurement.emptyBottleWeight));
          const affectedIds = measurements
            .filter((measurement) => measurement.emptyBottleWeight === targetWeight)
            .map((measurement) => measurement.playerId);
          return {
            ...round,
            emptyBottleMeasurements: measurements.map((measurement) => ({
              ...measurement,
              coinFlipLoser: affectedIds.includes(measurement.playerId)
            })),
            worstPlayerIds: affectedIds,
            penalties: affectedIds.map((playerId) => ({
              playerId,
              points: 1,
              reason: "empty_bottle_coin_flip"
            })),
            status: "review"
          };
        }),
        players: previous.players.map((player) => ({
          ...player,
          emptyBottleWeight: toNumber(emptyWeights[player.id])
        }))
      }));
      setCoinSpinning(false);
    }, 1250);
  };

  const evaluateEmptyFinishRound = () => {
    if (!activeRound || activeRound.type !== "empty_finish" || activeRound.penalties.length === 0) return;
    updateGame("Spiel ausgewertet", (previous) => ({
      ...previous,
      status: "ended",
      activeRoundId: undefined,
      rounds: previous.rounds.map((round) =>
        round.id === activeRound.id
          ? {
              ...round,
              status: "completed",
              completedAt: now()
            }
          : round
      )
    }));
    setScreen("final");
    sound("win");
    buzz([100, 50, 100, 50, 200]);
    setConfettiKey((value) => value + 1);
  };

  // Ref für Auto-Advance: zeigt immer auf die aktuelle reviewRound-Closure
  reviewRoundRef.current = reviewRound;

  const undo = () => {
    const snapshot = undoStack.at(-1);
    if (!snapshot) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setGame(snapshot.game);
    setScreen(snapshot.screen);
  };

  const resetGame = () => {
    if (!window.confirm("Spiel wirklich zurücksetzen?")) return;
    setUndoStack([]);
    localStorage.removeItem(STORAGE_KEY);
    setGame(emptyGame());
    setScreen("home");
  };

  // Auto-Trigger: Wenn alle Messungen einer Runde da sind, Auswertung anbieten
  const allMeasurementsIn =
    activeRound?.type === "normal" && activeRound.measurements.length === game.players.length;

  // Currently active player for numpad
  const numpadPlayer = game.players.find((player) => player.id === numpadPlayerId);

  // Helper: Wenn alles für eine Mess-Runde drin ist und Auto-Advance an, automatisch zur Auswertung
  useEffect(() => {
    if (settings.autoAdvance && allMeasurementsIn && screen === "play" && numpadPlayerId === null) {
      // Kurze Verzögerung, damit man die letzte Eingabe sieht
      const timeout = window.setTimeout(() => {
        if (game.rounds.find((round) => round.id === game.activeRoundId)?.status === "input") {
          reviewRoundRef.current();
        }
      }, 500);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [allMeasurementsIn, screen, numpadPlayerId, settings.autoAdvance, game.activeRoundId, game.rounds]);

  // Auto-Weiterspielen nach Seiten-Reload: gespeichertes Spiel direkt fortsetzen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (loaded && hasSavedGame) continueGame(); }, [loaded]);

  // Auto-Auswerten: wenn keine Punkte verteilt werden müssen, Runde nach Reveal automatisch abschließen
  const noSpecialsNeeded = screen === "review" && (activeRound?.exactHitPlayerIds.length ?? 1) === 0;
  useEffect(() => {
    if (!noSpecialsNeeded || revealStage !== "revealed") return;
    const timeout = window.setTimeout(applyRoundPoints, 2000);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noSpecialsNeeded, revealStage, activeRound?.id]);

  return (
    <main
      className={clsx(
        "h-dvh overflow-hidden text-ink transition-colors",
        settings.theme === "dark"
          ? "bg-[linear-gradient(135deg,rgba(47,143,104,0.12),transparent_34%),radial-gradient(circle_at_15%_0%,#2b2118_0,#1a1410_34%,#100c08_78%)] text-nightText"
          : "bg-[linear-gradient(135deg,rgba(47,143,104,0.08),transparent_36%),radial-gradient(circle_at_15%_0%,#fff1bd_0,#fbf0dc_30%,#fffaf1_74%)]"
      )}
    >
      <div className="mx-auto flex h-dvh w-full max-w-[1600px] flex-col px-3 py-2 sm:px-5 lg:px-6">
        {screen !== "home" && (
          <TopBar
            game={game}
            activeRound={activeRound}
            pendingCallerId={screen === "roundSetup" ? roundCaller : undefined}
            progress={progress}
            onUndo={undo}
            undoLabel={undoStack.at(-1)?.label}
            onReset={resetGame}
            onOpenSettings={() => setShowSettings(true)}
            theme={settings.theme}
          />
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
        {screen === "home" && (
          <HomeScreen
            hasSavedGame={hasSavedGame}
            onNew={startNewGame}
            onContinue={continueGame}
            onOpenSettings={() => setShowSettings(true)}
            theme={settings.theme}
          />
        )}
        {screen === "setup" && (
          <SetupScreen
            players={game.players}
            name={setupName}
            weight={setupWeight}
            brand={setupBrand}
            bottleSize={setupBottleSize}
            sameBrandForAll={sameBrandForAll}
            sameBottleSizeForAll={sameBottleSizeForAll}
            knownBrands={knownBrands}
            error={setupError}
            setName={setSetupName}
            setWeight={setSetupWeight}
            setBrand={setSetupBrand}
            setBottleSize={setSetupBottleSize}
            setSameBrandForAll={setSameBrandForAll}
            setSameBottleSizeForAll={setSameBottleSizeForAll}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            editPlayerWeight={editPlayerWeight}
            editPlayerBeer={editPlayerBeer}
            startGame={startRoundSetup}
            theme={settings.theme}
            bigTapMode={settings.bigTapMode}
            onOpenWeightNumpad={(playerId) => {
              setNumpadContext("startWeight");
              setNumpadPlayerId(playerId);
            }}
          />
        )}
        {screen === "roundSetup" && (
          <RoundSetupScreen
            game={game}
            callerId={roundCaller}
            targetWeight={roundTarget}
            setCallerId={setRoundCaller}
            setTargetWeight={setRoundTarget}
            onStart={startRound}
            onEmptyFinish={startEmptyFinishRound}
            theme={settings.theme}
            bigTapMode={settings.bigTapMode}
            onOpenTargetNumpad={() => {
              setNumpadContext("target");
              setNumpadPlayerId("__target__");
            }}
          />
        )}
        {(screen === "play" || screen === "review") && activeRound && (
          <GameBoard
            game={game}
            activeRound={activeRound}
            tableRef={tableRef}
            onWeightChange={upsertMeasurement}
            onEnter={focusNextInput}
            onReview={reviewRound}
            onCurrentRound={scrollToCurrentRound}
            onCorrect={() => setScreen("play")}
            readonly={screen === "review"}
            theme={settings.theme}
            bigTapMode={settings.bigTapMode}
            onOpenNumpad={(playerId) => openNumpadFor(playerId, "weight")}
            hideValuesUntilReveal={settings.hideValuesUntilReveal && screen === "play"}
            revealStage={revealStage}
          />
        )}
        {screen === "review" && activeRound && (
          <ReviewPanel
            game={game}
            round={activeRound}
            specials={specials}
            addSpecial={addSpecialToPlayer}
            removeSpecial={removeSpecialFromPlayer}
            onApply={applyRoundPoints}
            onCorrect={() => setScreen("play")}
            theme={settings.theme}
            revealStage={revealStage}
          />
        )}
        {screen === "endgame" && (
          <EndGameScreen
            game={game}
            emptyWeights={emptyWeights}
            onWeightChange={upsertEmptyBottleMeasurement}
            coinSpinning={coinSpinning}
            round={activeRound}
            onFlip={flipCoin}
            onEvaluate={evaluateEmptyFinishRound}
            theme={settings.theme}
            bigTapMode={settings.bigTapMode}
            onOpenNumpad={(playerId) => openNumpadFor(playerId, "empty")}
          />
        )}
        {screen === "final" && (
          <FinalScreen game={game} onNewGame={startNewGame} theme={settings.theme} />
        )}
        </div>

        {screen !== "home" && (
          <footer
            className={clsx(
              "z-30 mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur",
              settings.theme === "dark"
                ? "border-nightBorder bg-nightSurface/90"
                : "border-white/80 bg-white/80 ring-1 ring-white/60"
            )}
          >
            <ScoreStrip players={rankings} theme={settings.theme} />
            <div className="flex gap-2">
              {screen === "play" && allMeasurementsIn && (
                <button
                  onClick={reviewRound}
                  className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-black text-white shadow-lg active:scale-95"
                >
                  <Sparkles className="size-4" />
                  Auswerten
                </button>
              )}
              {screen === "play" && !allMeasurementsIn && (
                <IconButton
                  label="Zur aktuellen Runde"
                  onClick={scrollToCurrentRound}
                  icon={<ArrowRight />}
                  theme={settings.theme}
                />
              )}
              {game.status === "playing" && screen === "roundSetup" && (
                <button
                  onClick={startEmptyFinishRound}
                  className="rounded-full bg-malt px-4 py-3 text-sm font-black text-white shadow-lg transition active:scale-95"
                >
                  Leer trinken
                </button>
              )}
            </div>
          </footer>
        )}
      </div>

      {/* Numpad Overlay (Großer Tipp-Modus) */}
      {numpadPlayerId && numpadContext && (
        <Numpad
          theme={settings.theme}
          context={numpadContext}
          playerName={
            numpadContext === "target"
              ? "Zielgewicht setzen"
              : numpadContext === "startWeight"
              ? game.players.find((player) => player.id === numpadPlayerId)?.name ?? "Startgewicht"
              : numpadPlayer?.name ?? ""
          }
          subtitle={
            numpadContext === "weight"
              ? `Runde ${activeRound?.roundNumber ?? "-"} · Ziel ${grams(activeRound?.targetWeight)}`
              : numpadContext === "empty"
              ? `Leere Flasche wiegen · ${grams(roundPreviousWeight(game, numpadPlayerId, activeRound?.roundNumber ?? game.rounds.length + 1))} vorher`
              : numpadContext === "target"
              ? `Runde ${game.rounds.length + 1} · Ansager: ${playerName(game.players, roundCaller)}`
              : "Startgewicht"
          }
          initialValue={
            numpadContext === "weight"
              ? String(
                  activeRound?.measurements.find((measurement) => measurement.playerId === numpadPlayerId)
                    ?.weight ?? ""
                )
              : numpadContext === "empty"
              ? emptyWeights[numpadPlayerId] ?? ""
              : numpadContext === "target"
              ? roundTarget
              : ""
          }
          previousValue={
            numpadContext === "weight" || numpadContext === "empty"
              ? roundPreviousWeight(game, numpadPlayerId, activeRound?.roundNumber ?? game.rounds.length + 1)
              : undefined
          }
          targetValue={numpadContext === "weight" ? activeRound?.targetWeight : undefined}
          progressIndex={
            numpadContext === "weight" || numpadContext === "empty"
              ? game.players.findIndex((player) => player.id === numpadPlayerId)
              : undefined
          }
          progressTotal={
            numpadContext === "weight" || numpadContext === "empty" ? game.players.length : undefined
          }
          onClose={closeNumpad}
          onTap={() => {
            sound("tap");
            buzz(8);
          }}
          onSubmit={(value) => {
            if (numpadContext === "target") {
              setRoundTarget(value);
              closeNumpad();
              sound("next");
              return;
            }
            if (numpadContext === "startWeight") {
              editPlayerWeight(numpadPlayerId, value);
              closeNumpad();
              sound("next");
              return;
            }
            submitNumpadValue(numpadPlayerId, value);
          }}
        />
      )}

      {/* Übergabe-Splash zwischen Spielern */}
      {handoffMessage && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
          <div className="handoff-splash rounded-3xl bg-malt/95 px-10 py-8 text-center shadow-2xl">
            <div className="text-sm font-black uppercase tracking-widest text-orange">Übergabe an</div>
            <div className="mt-2 text-5xl font-black text-white">{handoffMessage}</div>
          </div>
        </div>
      )}

      {/* Konfetti */}
      <Confetti key={confettiKey} active={confettiKey > 0} />

      {/* Settings */}
      {showSettings && (
        <SettingsSheet
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

function TopBar({
  game,
  activeRound,
  pendingCallerId,
  progress,
  onUndo,
  undoLabel,
  onReset,
  onOpenSettings,
  theme
}: {
  game: Game;
  activeRound?: Round;
  pendingCallerId?: string;
  progress: string;
  onUndo: () => void;
  undoLabel?: string;
  onReset: () => void;
  onOpenSettings: () => void;
  theme: "light" | "dark";
}) {
  return (
    <header
      className={clsx(
        "z-40 mb-2 shrink-0 rounded-xl border p-2 shadow-board backdrop-blur-xl",
        theme === "dark"
          ? "border-nightBorder bg-nightSurface/90"
          : "border-white/80 bg-white/80 ring-1 ring-white/60"
      )}
    >
      <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          <StatusTile icon={<ClipboardList />} label="Runde" value={activeRound ? `${activeRound.roundNumber}` : `${game.rounds.length + 1}`} theme={theme} />
          <StatusTile
            icon={<Scale />}
            label={activeRound?.type === "empty_finish" ? "Finale" : "Zielgewicht"}
            value={activeRound?.type === "empty_finish" ? "Leer trinken" : activeRound ? grams(activeRound.targetWeight) : "bereit"}
            theme={theme}
          />
          <StatusTile
            icon={<Beer />}
            label={activeRound?.type === "empty_finish" ? "Phase" : "Ansager"}
            value={activeRound?.type === "empty_finish" ? "Alle trinken leer" : activeRound ? playerName(game.players, activeRound.callerId) : (pendingCallerId ? playerName(game.players, pendingCallerId) : "—")}
            accent
            theme={theme}
          />
          <StatusTile
            icon={<BarChart3 />}
            label="Fortschritt"
            value={activeRound ? `${progress} ${activeRound.type === "empty_finish" ? "leer" : "Gewichte"}` : `${game.players.length} Spieler`}
            theme={theme}
          />
        </div>
        <div className="flex justify-end gap-2">
          <IconButton label="Einstellungen" onClick={onOpenSettings} icon={<Settings />} theme={theme} />
          <IconButton label={undoLabel ? `Undo: ${undoLabel}` : "Undo"} onClick={onUndo} disabled={!undoLabel} icon={<Undo2 />} theme={theme} />
          <IconButton label="Reset" onClick={onReset} icon={<RotateCcw />} danger theme={theme} />
        </div>
      </div>
    </header>
  );
}

function StatusTile({
  icon,
  label,
  value,
  accent,
  theme = "light"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  theme?: "light" | "dark";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]",
        accent
          ? theme === "dark"
            ? "border-amberBeer bg-amberBeer/15"
            : "border-amberBeer bg-[#fff1bd]"
          : theme === "dark"
          ? "border-nightBorder bg-nightSurface2"
          : "border-[#ead9b9] bg-foam/85"
      )}
    >
      <div
        className={clsx(
          "flex items-center gap-1.5 text-[0.6rem] font-black uppercase tracking-wide",
          theme === "dark" ? "text-nightMuted" : "text-malt/65"
        )}
      >
        <span className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <div className={clsx("truncate text-base font-black md:text-lg", theme === "dark" && "text-nightText")}>
        {value}
      </div>
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  danger,
  disabled,
  theme = "light"
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  theme?: "light" | "dark";
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "grid size-10 place-items-center rounded-xl border shadow-sm transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
        danger
          ? "border-red-200 bg-dangerSoft text-red-700"
          : theme === "dark"
          ? "border-nightBorder bg-nightSurface text-nightText"
          : "border-[#ead9b9] bg-white text-ink"
      )}
    >
      <span className="size-4">{icon}</span>
    </button>
  );
}

function HomeScreen({
  hasSavedGame,
  onNew,
  onContinue,
  onOpenSettings,
  theme
}: {
  hasSavedGame: boolean;
  onNew: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  theme: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <section className="relative grid h-full items-center gap-8 overflow-y-auto pb-4 pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(430px,0.82fr)]">
      {/* Brass-Linie ganz oben */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--bar-rim)] opacity-90" />
      {/* Spotlight overhead */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(246,183,60,0.22),transparent_75%)]"
      />
      <div className="absolute right-2 top-3 z-30 flex gap-2">
        <NextLink
          href="/login"
          title="Account"
          aria-label="Account"
          className="brass-pill inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow active:scale-95"
        >
          Account
        </NextLink>
        <button
          onClick={onOpenSettings}
          title="Einstellungen"
          aria-label="Einstellungen"
          className={clsx(
            "grid size-11 place-items-center rounded-full border-2 shadow-sm backdrop-blur transition hover:-translate-y-0.5 active:scale-95",
            dark ? "border-nightBorder bg-nightSurface2/80 dark:text-nightMuted" : "border-malt/15 bg-white/80 text-malt"
          )}
        >
          <Settings className="size-5" />
        </button>
      </div>

      <div className="relative max-w-3xl px-1">
        <div
          className={clsx(
            "mb-4 inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.2em] shadow-sm",
            dark ? "border-nightBorder bg-nightSurface/80 dark:text-nightMuted" : "border-malt/15 bg-white/80 text-malt"
          )}
        >
          <Sparkles className="size-3 text-orange" />
          Premium Trinkspiel · 100 % offline
        </div>
        <h1 className="text-6xl font-semibold leading-[0.95] tracking-tight text-malt dark:text-nightText sm:text-7xl lg:text-[6.5rem]">
          Bierwiegen
        </h1>
        <p
          className={clsx(
            "mt-4 max-w-2xl text-lg font-extrabold leading-snug sm:text-xl",
            dark ? "text-nightMuted" : "text-malt/75"
          )}
        >
          Waage. Zielgewicht. Schaumkrone. Schlechte Entscheidungen. — Das Trinkspiel für die ehrliche Theke.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onNew}
            className="brass-pill inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-medium active:scale-95"
          >
            <Plus className="size-5" />
            Neues Spiel anstoßen
          </button>
          <button
            onClick={onContinue}
            disabled={!hasSavedGame}
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-2xl border-2 px-6 py-4 text-lg font-black shadow-sm transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-45 disabled:hover:translate-y-0",
              dark
                ? "border-nightBorder bg-nightSurface dark:text-nightText"
                : "border-malt/15 bg-white/85 text-malt"
            )}
          >
            <ArrowRight className="size-5" />
            Letztes Spiel fortsetzen
          </button>
        </div>
        <div className="mt-4 grid max-w-xl gap-2 sm:grid-cols-3">
          <NextLink
            href="/games/new"
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
              dark ? "border-nightBorder bg-nightSurface2 dark:text-nightText" : "border-malt/15 bg-white/85 text-malt"
            )}
          >
            <Globe2 className="size-4 text-hop" />
            Online-Spiel
          </NextLink>
          <NextLink
            href="/games"
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
              dark ? "border-nightBorder bg-nightSurface2 dark:text-nightText" : "border-malt/15 bg-white/85 text-malt"
            )}
          >
            <History className="size-4 text-orangeBeer" />
            Spiele
          </NextLink>
          <NextLink
            href="/profile"
            className={clsx(
              "inline-flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
              dark ? "border-nightBorder bg-nightSurface2 dark:text-nightText" : "border-malt/15 bg-white/85 text-malt"
            )}
          >
            <BarChart3 className="size-4 text-hop" />
            Statistiken
          </NextLink>
        </div>

        {/* Trust-row */}
        <div className="mt-6 flex flex-wrap items-center gap-3 text-[0.7rem] font-black uppercase tracking-wider opacity-70">
          <span className="inline-flex items-center gap-1.5">
            <Save className="size-3.5 text-orange" />
            Lokal gespeichert
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Volume2 className="size-3.5 text-orange" />
            Sound &amp; Haptik
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="size-3.5 text-orange" />
            Statistiken
          </span>
        </div>
      </div>

      {/* Premium Hero-Board */}
      <div
        className={clsx(
          "spotlight relative hidden min-h-[460px] overflow-hidden rounded-3xl border-2 p-5 shadow-board lg:block",
          dark
            ? "border-nightBorder bg-nightSurface/85 ring-1 ring-orange/10"
            : "border-white/80 bg-white/80 ring-1 ring-white/70"
        )}
      >
        {/* Brass-Linie */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--bar-rim)]" />
        {/* Subtile Holzmaserung im Hintergrund */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(95deg,rgba(0,0,0,0.4)_0px,transparent_2px,rgba(255,255,255,0.4)_5px,transparent_8px)]"
        />

        <div className="relative flex items-center justify-between">
          <div className="rounded-full bg-orange px-3 py-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-white">
            Live-Theke
          </div>
          <div
            className={clsx(
              "rounded-full px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wider",
              dark ? "bg-nightBg dark:text-nightMuted" : "bg-cream text-malt/60"
            )}
          >
            Runde 3
          </div>
        </div>

        {/* Hero: Zielgewicht + zentraler Krug */}
        <div className="relative mt-6 flex items-end justify-between gap-3">
          <div>
            <div
              className={clsx(
                "text-[0.65rem] font-black uppercase tracking-[0.25em]",
                dark ? "dark:text-nightMuted" : "text-malt/55"
              )}
            >
              Zielgewicht
            </div>
            <div className="mt-1 text-7xl font-bold leading-none text-orange tabular-nums">289 g</div>
            <div
              className={clsx(
                "mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold",
                dark ? "dark:text-nightMuted" : "text-malt/65"
              )}
            >
              <Medal className="size-3.5 text-orange" />
              Ansager: Spieler 2
            </div>
          </div>
          {/* Großer Krug */}
          <svg viewBox="0 0 120 130" width="130" height="140" className="mug-glow shrink-0">
            <defs>
              <linearGradient id="hero-pilsner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5c958" />
                <stop offset="60%" stopColor="#e8a92b" />
                <stop offset="100%" stopColor="#c8801b" />
              </linearGradient>
              <linearGradient id="hero-glass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
              </linearGradient>
              <linearGradient id="hero-foam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f0e0b8" />
              </linearGradient>
              <clipPath id="hero-clip">
                <rect x="14" y="26" width="74" height="92" rx="8" />
              </clipPath>
            </defs>
            <path
              d="M 88 44 q 22 0 22 22 t -22 22"
              fill="none"
              stroke={dark ? "rgba(245,210,122,0.45)" : "rgba(67,43,29,0.4)"}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect
              x="12"
              y="24"
              width="78"
              height="96"
              rx="9"
              fill="rgba(255,250,241,0.35)"
              stroke={dark ? "rgba(245,210,122,0.35)" : "rgba(67,43,29,0.4)"}
              strokeWidth="2"
            />
            <g clipPath="url(#hero-clip)">
              <rect x="14" y="46" width="74" height="72" fill="url(#hero-pilsner)" />
              <circle cx="30" cy="106" r="2" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from="110" to="50" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="50" cy="100" r="1.6" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from="110" to="50" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="68" cy="112" r="1.4" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from="110" to="50" dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="3.6s" repeatCount="indefinite" />
              </circle>
              <rect x="14" y="26" width="74" height="92" fill="url(#hero-glass)" opacity="0.6" />
            </g>
            {/* Schaumkrone */}
            <ellipse cx="50" cy="44" rx="40" ry="9" fill="url(#hero-foam)" />
            <circle cx="24" cy="38" r="6" fill="#fff" opacity="0.95" />
            <circle cx="40" cy="34" r="8" fill="#fff" opacity="0.95" />
            <circle cx="58" cy="35" r="7" fill="#fff" opacity="0.95" />
            <circle cx="74" cy="40" r="5" fill="#fff" opacity="0.95" />
            <ellipse cx="50" cy="124" rx="34" ry="3" fill="rgba(67,43,29,0.18)" />
          </svg>
        </div>

        {/* Spieler-Reihen */}
        <div className="relative mt-6 grid gap-2.5">
          {[
            { name: "Spieler 1", value: 340, status: "+2 SP", fill: 0.55, tone: "bg-orangeBeer" },
            { name: "Spieler 2", value: 310, status: "Ansager", fill: 0.75, tone: "bg-amberBeer" },
            { name: "Spieler 3", value: 289, status: "Treffer", fill: 0.95, tone: "bg-hop" }
          ].map((row) => (
            <div
              key={row.name}
              className={clsx(
                "rounded-2xl border-2 p-3 transition",
                row.status === "Treffer"
                  ? "border-hop/50 bg-hop/10"
                  : dark
                  ? "border-nightBorder bg-nightSurface2/80"
                  : "border-malt/10 bg-foam/85"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={clsx(
                      "text-[0.65rem] font-black uppercase tracking-wider",
                      dark ? "dark:text-nightMuted" : "text-malt/55"
                    )}
                  >
                    {row.name}
                  </div>
                  <div
                    className={clsx(
                      "mt-1 text-2xl font-black leading-none",
                      dark ? "dark:text-nightText" : "text-malt"
                    )}
                  >
                    {row.value} g
                  </div>
                </div>
                <div
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider shadow-sm",
                    row.status === "Treffer"
                      ? "bg-hop text-white"
                      : row.status === "Ansager"
                      ? "bg-orange text-white"
                      : dark
                      ? "bg-red-900/40 text-red-300"
                      : "bg-dangerSoft text-red-700"
                  )}
                >
                  {row.status}
                </div>
              </div>
              <div
                className={clsx(
                  "mt-3 h-2 overflow-hidden rounded-full",
                  dark ? "bg-nightBg" : "bg-[#ead9b9]"
                )}
              >
                <div
                  className={clsx("h-full rounded-full transition-all", row.tone)}
                  style={{ width: `${Math.round(row.fill * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className={clsx(
            "relative mt-5 grid grid-cols-3 gap-2 text-center",
            dark ? "dark:text-nightText" : "text-malt"
          )}
        >
          {[
            ["Spieler", "3"],
            ["Fortschritt", "100%"],
            ["Treffer", "1"]
          ].map(([label, value]) => (
            <div
              key={label}
              className={clsx(
                "rounded-xl border-2 px-3 py-2",
                dark ? "border-nightBorder bg-nightBg" : "border-malt/10 bg-white/80"
              )}
            >
              <div
                className={clsx(
                  "text-[0.62rem] font-black uppercase tracking-wider",
                  dark ? "dark:text-nightMuted" : "text-malt/50"
                )}
              >
                {label}
              </div>
              <div className="mt-1 text-xl font-black">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SetupScreen(props: {
  players: Player[];
  name: string;
  weight: string;
  brand: string;
  bottleSize: string;
  sameBrandForAll: boolean;
  sameBottleSizeForAll: boolean;
  knownBrands: string[];
  error: string;
  setName: (value: string) => void;
  setWeight: (value: string) => void;
  setBrand: (value: string) => void;
  setBottleSize: (value: string) => void;
  setSameBrandForAll: (value: boolean) => void;
  setSameBottleSizeForAll: (value: boolean) => void;
  addPlayer: () => void;
  removePlayer: (playerId: string) => void;
  editPlayerWeight: (playerId: string, value: string) => void;
  editPlayerBeer: (playerId: string, beer: Partial<BeerInfo>) => void;
  startGame: () => void;
  theme: "light" | "dark";
  bigTapMode: boolean;
  onOpenWeightNumpad: (playerId: string) => void;
}) {
  const dark = props.theme === "dark";
  return (
    <section className="grid h-full gap-3 overflow-hidden lg:grid-cols-[380px_1fr]">
      <div
        className={clsx(
          "flex h-full flex-col overflow-y-auto rounded-xl border p-3 shadow-board backdrop-blur-xl",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <h2 className={clsx("text-xl font-black", dark ? "text-orange" : "text-malt")}>Spieler-Setup</h2>
        <p className={clsx("text-xs font-bold", dark ? "text-nightMuted" : "text-malt/65")}>
          Startgewicht bleibt die Hauptsache, Bier-Defaults schnell.
        </p>
        <div className="mt-3 grid gap-2">
          <input
            value={props.name}
            onChange={(event) => props.setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && document.getElementById("setup-weight")?.focus()}
            placeholder="Spielername"
            className="h-12 rounded-xl border-2 border-[#ead9b9] bg-foam px-3 text-lg font-black outline-none focus:border-amberBeer focus:shadow-glow"
          />
          <div className="rounded-2xl border border-[#ead9b9] bg-foam p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black uppercase text-malt/60">Biermarke</span>
              <label className="flex items-center gap-2 text-sm font-black text-malt/70">
                <input
                  type="checkbox"
                  checked={props.sameBrandForAll}
                  onChange={(event) => props.setSameBrandForAll(event.target.checked)}
                  className="size-5 accent-amberBeer"
                />
                Alle gleiche Marke
              </label>
            </div>
            <input
              value={props.brand}
              list="beer-brand-options"
              onChange={(event) => props.setBrand(event.target.value)}
              placeholder="Biermarke"
              className="h-14 w-full rounded-xl border-2 border-[#ead9b9] bg-white px-3 text-xl font-black outline-none focus:border-amberBeer"
            />
            <datalist id="beer-brand-options">
              {props.knownBrands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {props.knownBrands.slice(0, 6).map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => props.setBrand(brand)}
                  className={clsx(
                    "rounded-full px-3 py-2 text-sm font-black shadow-sm",
                    props.brand.toLowerCase() === brand.toLowerCase() ? "bg-goldBeer text-malt" : "bg-white text-malt/75"
                  )}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#ead9b9] bg-foam p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black uppercase text-malt/60">Flaschengröße</span>
              <label className="flex items-center gap-2 text-sm font-black text-malt/70">
                <input
                  type="checkbox"
                  checked={props.sameBottleSizeForAll}
                  onChange={(event) => props.setSameBottleSizeForAll(event.target.checked)}
                  className="size-5 accent-amberBeer"
                />
                Alle gleiche Größe
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BOTTLE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => props.setBottleSize(String(size))}
                  className={clsx(
                    "rounded-full px-2 py-3 text-sm font-black shadow-sm",
                    Number(props.bottleSize) === size ? "bg-goldBeer text-malt" : "bg-white text-malt/75"
                  )}
                >
                  {bottleSizeLabel(size)}
                </button>
              ))}
              <input
                value={BOTTLE_SIZE_OPTIONS.includes(Number(props.bottleSize)) ? "" : props.bottleSize}
                onChange={(event) => props.setBottleSize(event.target.value)}
                inputMode="decimal"
                placeholder="eigene"
                className="min-w-0 rounded-full border-2 border-[#ead9b9] bg-white px-3 text-center text-sm font-black outline-none focus:border-amberBeer"
              />
            </div>
          </div>
          <input
            id="setup-weight"
            value={props.weight}
            onChange={(event) => props.setWeight(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && props.addPlayer()}
            inputMode="decimal"
            placeholder="Startgewicht in g"
            className="h-12 rounded-xl border-2 border-[#ead9b9] bg-foam px-3 text-lg font-black outline-none focus:border-amberBeer focus:shadow-glow"
          />
          {props.error && <div className="rounded-xl bg-dangerSoft px-3 py-2 text-sm font-bold text-red-700">{props.error}</div>}
          <button
            onClick={props.addPlayer}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange px-4 text-base font-black text-white shadow-lg active:scale-95"
          >
            <Plus className="size-5" />
            Spieler hinzufügen
          </button>
        </div>
      </div>
      <div className={clsx("flex h-full flex-col rounded-xl border p-3 shadow-board backdrop-blur-xl", dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60")}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={clsx("text-lg font-black", dark && "text-nightText")}>Spielerliste ({props.players.length})</h3>
          <button
            onClick={props.startGame}
            disabled={props.players.length < 2}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white shadow-lg active:scale-95 disabled:opacity-40",
              props.players.length >= 2 ? "bg-orange" : dark ? "bg-nightSurface2" : "bg-malt/40"
            )}
          >
            Spiel starten
            <ArrowRight className="size-4" />
          </button>
        </div>
        <div className="mt-2 grid flex-1 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          {props.players.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Beer className={clsx("size-10", dark ? "text-nightMuted" : "text-malt/30")} />
              <div>
                <div className={clsx("text-sm font-black", dark ? "text-nightText/60" : "text-malt/60")}>Noch keine Spieler</div>
                <div className={clsx("mt-0.5 text-xs", dark ? "text-nightMuted" : "text-malt/45")}>Mindestens 2 hinzufügen, um zu starten</div>
              </div>
            </div>
          )}
          {props.players.map((player) => (
            <div
              key={player.id}
              className={clsx(
                "rounded-xl border p-2 shadow-sm",
                dark ? "border-nightBorder bg-nightSurface2" : "border-[#ead9b9] bg-foam"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={clsx("truncate text-base font-black", dark && "text-nightText")}>{player.name}</div>
                  <div className={clsx("truncate text-[0.6rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/55")}>
                    {normalizeBeer(player.beer).brand} · {bottleSizeLabel(normalizeBeer(player.beer).bottleSizeLiters)}
                  </div>
                </div>
                <button
                  title="Spieler löschen"
                  onClick={() => props.removePlayer(player.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-dangerSoft text-red-700"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {props.bigTapMode ? (
                <button
                  type="button"
                  onClick={() => props.onOpenWeightNumpad(player.id)}
                  className={clsx(
                    "mt-1.5 h-10 w-full rounded-lg border-2 px-2 text-left text-base font-black outline-none transition active:scale-95",
                    dark
                      ? "border-nightBorder bg-nightBg text-nightText hover:border-amberBeer"
                      : "border-[#ead9b9] bg-white hover:border-amberBeer"
                  )}
                >
                  {grams(player.startWeight)}
                </button>
              ) : (
                <input
                  defaultValue={player.startWeight}
                  onBlur={(event) => props.editPlayerWeight(player.id, event.target.value)}
                  inputMode="decimal"
                  className={clsx(
                    "mt-1.5 h-10 w-full rounded-lg border-2 px-2 text-base font-black outline-none focus:border-amberBeer",
                    dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#ead9b9] bg-white"
                  )}
                />
              )}
              <div className="mt-1.5 grid grid-cols-[1fr_72px] gap-1.5">
                <input
                  defaultValue={normalizeBeer(player.beer).brand}
                  list="beer-brand-options"
                  onBlur={(event) => props.editPlayerBeer(player.id, { brand: event.target.value })}
                  className={clsx(
                    "h-9 min-w-0 rounded-lg border-2 px-2 text-sm font-black outline-none focus:border-amberBeer",
                    dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#ead9b9] bg-white"
                  )}
                />
                <input
                  defaultValue={normalizeBeer(player.beer).bottleSizeLiters}
                  onBlur={(event) =>
                    props.editPlayerBeer(player.id, {
                      bottleSizeLiters: toNumber(event.target.value) ?? DEFAULT_BEER.bottleSizeLiters
                    })
                  }
                  inputMode="decimal"
                  className={clsx(
                    "h-9 min-w-0 rounded-lg border-2 px-2 text-center text-sm font-black outline-none focus:border-amberBeer",
                    dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#ead9b9] bg-white"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundSetupScreen({
  game,
  callerId,
  targetWeight,
  setCallerId,
  setTargetWeight,
  onStart,
  onEmptyFinish,
  theme,
  bigTapMode,
  onOpenTargetNumpad
}: {
  game: Game;
  callerId: string;
  targetWeight: string;
  setCallerId: (value: string) => void;
  setTargetWeight: (value: string) => void;
  onStart: () => void;
  onEmptyFinish: () => void;
  theme: "light" | "dark";
  bigTapMode: boolean;
  onOpenTargetNumpad: () => void;
}) {
  const dark = theme === "dark";
  const ready = Boolean(callerId && targetWeight);
  return (
    <section className="grid h-full gap-3 overflow-hidden lg:grid-cols-[1fr_320px]">
      <div
        className={clsx(
          "flex h-full flex-col overflow-y-auto rounded-xl border p-3 shadow-board backdrop-blur-xl",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <h2 className={clsx("text-xl font-black", dark ? "text-orange" : "text-malt")}>Runde {game.rounds.length + 1} vorbereiten</h2>
        <div className="mt-2">
          <div className={clsx("mb-1.5 text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/60")}>Ansager auswählen</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {game.players.map((player) => (
              <button
                key={player.id}
                onClick={() => setCallerId(player.id)}
                className={clsx(
                  "rounded-xl border-2 p-2 text-left shadow-sm transition active:scale-95",
                  callerId === player.id
                    ? dark
                      ? "border-orangeBeer bg-amberBeer/20 shadow-glow"
                      : "border-orangeBeer bg-[#fff1bd] shadow-glow"
                    : dark
                    ? "border-nightBorder bg-nightSurface2"
                    : "border-[#ead9b9] bg-foam"
                )}
              >
                <div className={clsx("truncate text-base font-black", dark && "text-nightText")}>{player.name}</div>
                <div className={clsx("text-[0.65rem] font-bold", dark ? "text-nightMuted" : "text-malt/65")}>
                  {player.penaltyPoints} SP
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 max-w-xl">
          <label className={clsx("text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/60")}>Zielgewicht</label>
          {bigTapMode ? (
            <button
              type="button"
              onClick={onOpenTargetNumpad}
              className={clsx(
                "mt-1 flex h-16 w-full items-center justify-between rounded-2xl border-2 px-4 text-left text-3xl font-black shadow-lg transition active:scale-[0.98]",
                dark
                  ? "border-amberBeer bg-nightBg text-nightText"
                  : "border-[#ead9b9] bg-foam"
              )}
            >
              <span>{targetWeight ? `${targetWeight} g` : "Antippen"}</span>
              <Zap className="size-6 text-orangeBeer" />
            </button>
          ) : (
            <input
              autoFocus
              value={targetWeight}
              onChange={(event) => setTargetWeight(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onStart()}
              inputMode="decimal"
              placeholder="z. B. 287"
              className={clsx(
                "mt-1 h-14 w-full rounded-2xl border-2 px-4 text-2xl font-black outline-none focus:border-amberBeer focus:shadow-glow",
                dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#ead9b9] bg-foam"
              )}
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onStart}
            disabled={!ready}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-base font-black text-white shadow-lg active:scale-95 disabled:opacity-45"
            )}
          >
            Runde starten
            <ArrowRight className="size-4" />
          </button>
          <button
            onClick={onEmptyFinish}
            className="inline-flex items-center gap-2 rounded-full bg-malt px-5 py-3 text-base font-black text-white shadow-lg active:scale-95"
          >
            Leer trinken
            <Coins className="size-4" />
          </button>
        </div>
        {(() => {
          const lastRound = [...game.rounds].filter((r) => r.status === "completed").at(-1);
          if (!lastRound) return null;
          return (
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <div className={clsx("mb-2 text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/60")}>
                Runde {lastRound.roundNumber} · Ergebnis
              </div>
              <div className="grid gap-1.5">
                {game.players.map((player) => {
                  const m = lastRound.measurements.find((item) => item.playerId === player.id);
                  const pts = [...lastRound.penalties, ...lastRound.specialPenaltyDistributions]
                    .filter((p) => p.playerId === player.id)
                    .reduce((sum, p) => sum + p.points, 0);
                  return (
                    <div
                      key={player.id}
                      className={clsx(
                        "flex items-center justify-between rounded-xl px-3 py-2",
                        m?.exactHit ? (dark ? "bg-orangeBeer/20" : "bg-[#fff1e0]") : dark ? "bg-nightSurface2" : "bg-foam"
                      )}
                    >
                      <div>
                        <span className={clsx("text-sm font-bold", dark && "text-nightText")}>{player.name}</span>
                        {m?.isCaller && (
                          <span className={clsx("ml-1.5 text-[0.6rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/60")}>Ansager</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className={clsx("text-sm font-bold tabular-nums", dark ? "text-nightMuted" : "text-malt/70")}>
                          {m ? grams(m.deviation) : "—"}
                        </span>
                        {pts > 0 && (
                          <span className={clsx("text-sm font-black tabular-nums", dark ? "text-red-400" : "text-red-700")}>+{pts} SP</span>
                        )}
                        {m?.exactHit && <Target className="size-3.5 text-orangeBeer" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
      <Scoreboard game={game} theme={theme} />
    </section>
  );
}

function GameBoard({
  game,
  activeRound,
  tableRef,
  onWeightChange,
  onEnter,
  onReview,
  onCurrentRound,
  readonly,
  theme,
  bigTapMode,
  onOpenNumpad,
  hideValuesUntilReveal,
  revealStage
}: {
  game: Game;
  activeRound: Round;
  tableRef: React.RefObject<HTMLDivElement | null>;
  onWeightChange: (playerId: string, rawValue: string) => void;
  onEnter: (playerId: string) => void;
  onReview: () => void;
  onCurrentRound: () => void;
  onCorrect: () => void;
  readonly: boolean;
  theme: "light" | "dark";
  bigTapMode: boolean;
  onOpenNumpad: (playerId: string) => void;
  hideValuesUntilReveal: boolean;
  revealStage: "idle" | "drumroll" | "revealed";
}) {
  const dark = theme === "dark";
  const complete = activeRound.measurements.length === game.players.length;
  const enteredCount = activeRound.measurements.length;
  const totalCount = game.players.length;
  const progressPct = totalCount > 0 ? Math.round((enteredCount / totalCount) * 100) : 0;
  const nextOpenPlayer = game.players.find(
    (player) => !activeRound.measurements.some((measurement) => measurement.playerId === player.id)
  );

  return (
    <section className="grid h-full gap-3 overflow-hidden xl:grid-cols-[1fr_300px]">
      <div
        className={clsx(
          "flex h-full flex-col overflow-hidden rounded-xl border p-2 shadow-board backdrop-blur-xl",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-black",
                dark ? "bg-orange/20 text-orange" : "bg-[#fff1bd] text-malt"
              )}
            >
              Ziel {grams(activeRound.targetWeight)}
            </span>
            <span
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-black shadow-sm",
                dark ? "bg-nightSurface2 text-nightText" : "bg-white text-malt"
              )}
            >
              Ansager: {playerName(game.players, activeRound.callerId)}
            </span>
            {!readonly && (
              <span
                className={clsx(
                  "rounded-full px-3 py-2 text-sm font-black",
                  dark ? "bg-nightSurface2 text-nightText" : "bg-cream text-malt"
                )}
              >
                {enteredCount}/{totalCount} eingegeben
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {bigTapMode && nextOpenPlayer && !readonly && (
              <button
                onClick={() => onOpenNumpad(nextOpenPlayer.id)}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-black text-white shadow-lg active:scale-95"
              >
                <Zap className="size-4" />
                {nextOpenPlayer.name} eingeben
              </button>
            )}
            <button
              onClick={onCurrentRound}
              className={clsx(
                "rounded-full px-4 py-3 font-black shadow-sm",
                dark ? "bg-nightSurface2 text-nightText" : "bg-white"
              )}
            >
              Zur aktuellen Runde
            </button>
            <button
              id="review-round-button"
              onClick={onReview}
              disabled={!complete || readonly}
              className={clsx(
                "rounded-full px-5 py-3 font-black shadow-lg disabled:opacity-45",
                complete && !readonly ? "bg-orange text-white" : "bg-malt text-white"
              )}
            >
              Runde auswerten
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {!readonly && (
          <div className={clsx("mx-2 mb-2 h-3 overflow-hidden rounded-full", dark ? "bg-nightBg" : "bg-[#ead9b9]")}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-amberBeer to-hop transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <div
          ref={tableRef}
          className={clsx(
            "scrollbar-soft hidden flex-1 overflow-auto rounded-xl border md:block",
            dark ? "border-nightBorder bg-nightBg" : "border-[#ead9b9] bg-cream"
          )}
        >
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 min-w-[180px] bg-malt p-3 text-white">Spieler</th>
                <th className="min-w-[140px] bg-malt p-3 text-white">Start</th>
                {game.rounds.map((round) => (
                  <th
                    key={round.id}
                    data-current-round={round.id === activeRound.id}
                    className={clsx(
                      "min-w-[240px] p-3 text-white",
                      round.id === activeRound.id ? "bg-orangeBeer text-malt" : "bg-malt"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>Runde {round.roundNumber}</span>
                      <span className="rounded-full bg-white/25 px-2 py-1 text-xs">
                        {round.type === "empty_finish" ? "Leer" : grams(round.targetWeight)}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 z-20 min-w-[130px] bg-malt p-3 text-white">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {game.players.map((player) => (
                <tr key={player.id}>
                  <th
                    className={clsx(
                      "sticky left-0 z-10 border-b p-3 align-top",
                      dark ? "border-nightBorder bg-nightSurface2" : "border-[#ead9b9] bg-foam"
                    )}
                  >
                    <div className={clsx("text-xl font-black", dark && "text-nightText")}>{player.name}</div>
                    <div className={clsx("mt-1 text-sm font-bold", dark ? "text-nightMuted" : "text-malt/60")}>{grams(player.currentWeight)}</div>
                    <div className={clsx("mt-1 text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/45")}>
                      {normalizeBeer(player.beer).brand} · {bottleSizeLabel(normalizeBeer(player.beer).bottleSizeLiters)}
                    </div>
                  </th>
                  <td
                    className={clsx(
                      "border-b p-3 text-2xl font-black",
                      dark ? "border-nightBorder bg-nightSurface2 text-nightText" : "border-[#ead9b9] bg-foam"
                    )}
                  >
                    {grams(player.startWeight)}
                  </td>
                  {game.rounds.map((round) => (
                    <RoundCell
                      key={round.id}
                      game={game}
                      player={player}
                      round={round}
                      active={round.id === activeRound.id}
                      readonly={readonly || round.id !== activeRound.id || round.status !== "input"}
                      onWeightChange={onWeightChange}
                      onEnter={onEnter}
                      theme={theme}
                      bigTapMode={bigTapMode}
                      onOpenNumpad={onOpenNumpad}
                      hideValuesUntilReveal={hideValuesUntilReveal && round.id === activeRound.id}
                      revealStage={revealStage}
                    />
                  ))}
                  <td
                    className={clsx(
                      "sticky right-0 border-b p-3 text-center text-3xl font-black text-red-700",
                      dark ? "border-nightBorder bg-nightSurface" : "border-[#ead9b9] bg-white"
                    )}
                  >
                    {player.penaltyPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex-1 overflow-y-auto md:hidden">
          <MobileRoundCards
            game={game}
            round={activeRound}
            onWeightChange={onWeightChange}
            onEnter={onEnter}
            readonly={readonly}
            theme={theme}
            bigTapMode={bigTapMode}
            onOpenNumpad={onOpenNumpad}
            hideValuesUntilReveal={hideValuesUntilReveal}
            revealStage={revealStage}
          />
        </div>
      </div>
      <Scoreboard game={game} theme={theme} />
    </section>
  );
}

function RoundCell({
  game,
  player,
  round,
  active,
  readonly,
  onWeightChange,
  onEnter,
  asCard = false,
  theme = "light",
  bigTapMode = false,
  onOpenNumpad,
  hideValuesUntilReveal = false,
  revealStage = "idle"
}: {
  game: Game;
  player: Player;
  round: Round;
  active: boolean;
  readonly: boolean;
  onWeightChange: (playerId: string, rawValue: string) => void;
  onEnter: (playerId: string) => void;
  asCard?: boolean;
  theme?: "light" | "dark";
  bigTapMode?: boolean;
  onOpenNumpad?: (playerId: string) => void;
  hideValuesUntilReveal?: boolean;
  revealStage?: "idle" | "drumroll" | "revealed";
}) {
  const dark = theme === "dark";
  if (round.type === "empty_finish") {
    const emptyMeasurement = round.emptyBottleMeasurements?.find((item) => item.playerId === player.id);
    const previousWeight = emptyMeasurement?.previousWeight ?? roundPreviousWeight(game, player.id, round.roundNumber);
    const roundPoints = totalsForRound(round).get(player.id) ?? 0;
    const CellTag = asCard ? "div" : "td";

    return (
      <CellTag
        className={clsx(
          "border-b p-3 align-top",
          dark ? "border-nightBorder" : "border-[#ead9b9]",
          active
            ? dark
              ? "bg-amberBeer/15 shadow-[inset_0_0_0_2px_rgba(242,139,53,0.55)]"
              : "bg-[#fff1bd] shadow-[inset_0_0_0_2px_rgba(242,139,53,0.55)]"
            : dark
            ? "bg-nightSurface"
            : "bg-white",
          emptyMeasurement?.coinFlipLoser && (dark ? "bg-red-900/50" : "bg-dangerSoft"),
          asCard && "rounded-2xl border"
        )}
      >
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge tone="empty">Leer</Badge>
            {emptyMeasurement?.coinFlipLoser && <Badge tone="coin">Münzwurf verloren</Badge>}
            {!emptyMeasurement && active && <Badge tone="open">offen</Badge>}
          </div>
          <div className={clsx("text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/50")}>vorher {grams(previousWeight)}</div>
          <div className={clsx("text-3xl font-black", dark && "text-nightText")}>
            {emptyMeasurement ? grams(emptyMeasurement.emptyBottleWeight) : "-"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="getrunken" value={emptyMeasurement ? grams(emptyMeasurement.consumedInFinalRound) : "-"} theme={theme} />
            <Metric label="Strafe" value={roundPoints ? `+${roundPoints}` : "0"} danger={roundPoints > 0} theme={theme} />
          </div>
        </div>
      </CellTag>
    );
  }

  const measurement = round.measurements.find((item) => item.playerId === player.id);
  const previousWeight = measurement?.previousWeight ?? roundPreviousWeight(game, player.id, round.roundNumber);
  const warning = measurement && measurement.weight > previousWeight;
  const bigJump = measurement && previousWeight - measurement.weight > 180;
  const roundPoints = totalsForRound(round).get(player.id) ?? 0;
  const CellTag = asCard ? "div" : "td";
  const showReveal = active && (revealStage === "revealed" || revealStage === "idle" || !hideValuesUntilReveal);
  const showValue = !hideValuesUntilReveal || revealStage === "revealed" || !active;

  return (
    <CellTag
      className={clsx(
        "border-b p-3 align-top",
        dark ? "border-nightBorder" : "border-[#ead9b9]",
        active
          ? dark
            ? "bg-amberBeer/15 shadow-[inset_0_0_0_2px_rgba(242,139,53,0.55)]"
            : "bg-[#fff1bd] shadow-[inset_0_0_0_2px_rgba(242,139,53,0.55)]"
          : dark
          ? "bg-nightSurface"
          : "bg-white",
        measurement?.exactHit && showReveal && (dark ? "hit-pop bg-hop/25" : "hit-pop bg-[#e4f8df]"),
        measurement?.isWorst && showReveal && (dark ? "animate-wobble bg-red-900/40" : "animate-wobble bg-dangerSoft"),
        active && revealStage === "drumroll" && "drum-shake",
        asCard && "rounded-2xl border"
      )}
    >
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-1">
          {round.callerId === player.id && <Badge tone="caller">Ansager</Badge>}
          {measurement?.exactHit && showReveal && <Badge tone="hit">Treffer</Badge>}
          {measurement?.isWorst && showReveal && <Badge tone="bad">Daneben</Badge>}
          {!measurement && active && <Badge tone="open">offen</Badge>}
        </div>
        <div className={clsx("text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/50")}>vorher {grams(previousWeight)}</div>
        {readonly ? (
          <div className={clsx("text-3xl font-black", dark && "text-nightText")}>
            {measurement ? (showValue ? grams(measurement.weight) : "···") : "-"}
          </div>
        ) : bigTapMode && onOpenNumpad ? (
          <button
            type="button"
            onClick={() => onOpenNumpad(player.id)}
            className={clsx(
              "h-14 w-full rounded-xl border-2 px-3 text-left text-2xl font-black outline-none transition active:scale-95",
              dark
                ? "border-nightBorder bg-nightBg text-nightText hover:border-orangeBeer"
                : "border-[#e8c58c] bg-white hover:border-orangeBeer"
            )}
          >
            {measurement ? grams(measurement.weight) : "Antippen"}
          </button>
        ) : (
          <input
            id={`weight-${player.id}`}
            defaultValue={measurement?.weight ?? ""}
            onBlur={(event) => onWeightChange(player.id, event.target.value)}
            onChange={(event) => onWeightChange(player.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "ArrowDown") onEnter(player.id);
            }}
            inputMode="decimal"
            placeholder="Ist g"
            className={clsx(
              "h-14 w-full rounded-xl border-2 px-3 text-2xl font-black outline-none focus:border-orangeBeer focus:shadow-glow",
              dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#e8c58c] bg-white"
            )}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Abw." value={measurement ? grams(measurement.deviation) : "-"} theme={theme} />
          <Metric label="Strafe" value={roundPoints ? `+${roundPoints}` : "0"} danger={roundPoints > 0} theme={theme} />
        </div>
        {(warning || bigJump) && (
          <div
            className={clsx(
              "rounded-xl px-2 py-1 text-xs font-black",
              dark ? "bg-orange/20 text-orange" : "bg-[#fff4d4] text-malt"
            )}
          >
            {warning ? "Warnung: höher als vorher" : "Warnung: großer Sprung"}
          </div>
        )}
      </div>
    </CellTag>
  );
}

function Badge({ tone, children }: { tone: "caller" | "hit" | "bad" | "open" | "empty" | "coin"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-1 text-[0.68rem] font-black uppercase",
        tone === "caller" && "bg-goldBeer text-malt",
        tone === "hit" && "bg-hop text-white",
        tone === "bad" && "bg-red-600 text-white",
        tone === "open" && "bg-white text-malt/65",
        tone === "empty" && "bg-malt text-white",
        tone === "coin" && "bg-red-700 text-white"
      )}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  danger,
  theme = "light"
}: {
  label: string;
  value: string;
  danger?: boolean;
  theme?: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <div className={clsx("rounded-xl p-2", dark ? "bg-nightBg/70" : "bg-white/75")}>
      <div className={clsx("text-[0.65rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/45")}>{label}</div>
      <div className={clsx("text-lg font-black", danger ? "text-red-500" : dark && "text-nightText")}>{value}</div>
    </div>
  );
}

function MobileRoundCards({
  game,
  round,
  onWeightChange,
  onEnter,
  readonly,
  theme = "light",
  bigTapMode = false,
  onOpenNumpad,
  hideValuesUntilReveal = false,
  revealStage = "idle"
}: {
  game: Game;
  round: Round;
  onWeightChange: (playerId: string, rawValue: string) => void;
  onEnter: (playerId: string) => void;
  readonly: boolean;
  theme?: "light" | "dark";
  bigTapMode?: boolean;
  onOpenNumpad?: (playerId: string) => void;
  hideValuesUntilReveal?: boolean;
  revealStage?: "idle" | "drumroll" | "revealed";
}) {
  const dark = theme === "dark";
  return (
    <div className="grid gap-2 pt-1">
      {game.players.map((player) => (
        <div
          key={player.id}
          className={clsx(
            "rounded-xl border p-2 shadow-sm",
            dark ? "border-nightBorder bg-nightSurface2" : "border-[#ead9b9] bg-foam"
          )}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className={clsx("text-lg font-black", dark && "text-nightText")}>{player.name}</div>
              <div className={clsx("text-[0.6rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/50")}>
                {normalizeBeer(player.beer).brand} · {bottleSizeLabel(normalizeBeer(player.beer).bottleSizeLiters)}
              </div>
            </div>
            <div className={clsx("rounded-full px-2 py-0.5 text-sm font-black text-red-500", dark ? "bg-nightBg" : "bg-white text-red-700")}>
              {player.penaltyPoints} SP
            </div>
          </div>
          <RoundCell
            game={game}
            player={player}
            round={round}
            active
            readonly={readonly}
            onWeightChange={onWeightChange}
            onEnter={onEnter}
            asCard
            theme={theme}
            bigTapMode={bigTapMode}
            onOpenNumpad={onOpenNumpad}
            hideValuesUntilReveal={hideValuesUntilReveal}
            revealStage={revealStage}
          />
        </div>
      ))}
    </div>
  );
}

function ReviewPanel({
  game,
  round,
  specials,
  addSpecial,
  removeSpecial,
  onApply,
  onCorrect,
  theme = "light",
  revealStage = "idle"
}: {
  game: Game;
  round: Round;
  specials: Record<string, number>;
  addSpecial: (giverId: string, targetId: string) => void;
  removeSpecial: (giverId: string, targetId: string) => void;
  onApply: () => void;
  onCorrect: () => void;
  theme?: "light" | "dark";
  revealStage?: "idle" | "drumroll" | "revealed";
}) {
  const dark = theme === "dark";
  const hasOpenSpecials = Object.values(specials).some((value) => value > 0);
  const worstNames = round.worstPlayerIds.map((id) => playerName(game.players, id));
  const exactNames = round.exactHitPlayerIds.map((id) => playerName(game.players, id));
  const showOutcome = revealStage === "revealed";

  return (
    <section
      className={clsx(
        "mt-2 flex max-h-[40vh] flex-col overflow-y-auto rounded-xl border p-3 shadow-board backdrop-blur-xl",
        dark ? "border-nightBorder bg-nightSurface/95" : "border-white/80 bg-white/80 ring-1 ring-white/60"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={clsx("text-lg font-black", dark && "text-nightText")}>Rundenauswertung</h2>
          <p className={clsx("text-xs font-bold", dark ? "text-nightMuted" : "text-malt/65")}>
            Ziel {grams(round.targetWeight)} · Ansager {playerName(game.players, round.callerId)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onCorrect}
            className={clsx(
              "rounded-xl px-3 py-2 text-sm font-black shadow-sm",
              dark ? "bg-nightSurface2 text-nightText" : "bg-white"
            )}
          >
            Korrigieren
          </button>
          <button
            onClick={onApply}
            disabled={hasOpenSpecials}
            className={clsx(
              "rounded-xl bg-orange px-4 py-2 text-sm font-black text-white shadow-lg disabled:opacity-45"
            )}
          >
            Übernehmen
          </button>
        </div>
      </div>

      {/* Drumroll / Reveal-Banner */}
      {revealStage === "drumroll" && (
        <div className="mt-5 rounded-2xl bg-malt/95 p-8 text-center text-white shadow-2xl drum-shake">
          <div className="text-sm font-black uppercase tracking-widest text-orange">Trommelwirbel...</div>
          <div className="mx-auto mt-4 grid size-16 place-items-center rounded-2xl bg-orange text-white">
            <PartyPopper className="size-9" />
          </div>
        </div>
      )}
      {showOutcome && (worstNames.length > 0 || exactNames.length > 0) && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {exactNames.length > 0 && (
            <div className="animate-reveal-pop rounded-2xl bg-hop p-6 text-center text-white shadow-lg">
              <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-white/20">
                <Target className="size-6" />
              </div>
              <div className="text-sm font-black uppercase tracking-widest text-white/80">Volltreffer</div>
              <div className="mt-2 text-3xl font-black">{exactNames.join(", ")}</div>
            </div>
          )}
          {worstNames.length > 0 && (
            <div className="animate-reveal-pop rounded-2xl bg-red-600 p-6 text-center text-white shadow-lg">
              <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-white/20">
                <Zap className="size-6" />
              </div>
              <div className="text-sm font-black uppercase tracking-widest text-white/80">Daneben</div>
              <div className="mt-2 text-3xl font-black">{worstNames.join(", ")}</div>
            </div>
          )}
        </div>
      )}
      {round.exactHitPlayerIds.length > 0 && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {round.exactHitPlayerIds.map((giverId) => (
            <div
              key={giverId}
              className={clsx(
                "rounded-xl border p-4",
                dark ? "border-hop/50 bg-hop/10" : "border-[#c8e3cd] bg-[#effbea]"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="font-black">
                  {playerName(game.players, giverId)} verteilt {giverId === round.callerId ? 2 : 1} Sonderpunkt(e)
                </div>
                <span className="rounded-full bg-hop px-3 py-1 text-sm font-black text-white">
                  {specials[giverId] ?? 0} übrig
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {game.players.map((player) => {
                  const received = round.specialPenaltyDistributions.filter((penalty) => penalty.playerId === player.id).length;
                  return (
                    <div key={player.id} className={clsx("flex items-center justify-between gap-2 rounded-xl p-2", dark ? "bg-nightSurface2" : "bg-white")}>
                      <span className="font-black">{player.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          title="Punkt entfernen"
                          onClick={() => removeSpecial(giverId, player.id)}
                          className="grid size-9 place-items-center rounded-full bg-cream font-black"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-black">{received}</span>
                        <button
                          title="Punkt geben"
                          onClick={() => addSpecial(giverId, player.id)}
                          className="grid size-9 place-items-center rounded-full bg-goldBeer font-black"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Scoreboard({ game, theme = "light" }: { game: Game; theme?: "light" | "dark" }) {
  const dark = theme === "dark";
  const rows = [...game.players].sort((a, b) => b.penaltyPoints - a.penaltyPoints);
  return (
    <aside
      className={clsx(
        "flex h-full flex-col rounded-xl border p-3 shadow-board backdrop-blur-xl",
        dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
      )}
    >
      <div className={clsx("mb-2 flex items-center gap-2 text-base font-black", dark && "text-nightText")}>
        <Trophy className="size-4 text-orangeBeer" />
        Scoreboard
      </div>
      <div className="grid flex-1 gap-1.5 overflow-y-auto">
        {rows.map((player, index) => {
          const stats = statsForPlayer(game, player.id);
          return (
            <div
              key={player.id}
              className={clsx(
                "rounded-xl px-2.5 py-1.5",
                index === 0
                  ? dark
                    ? "bg-red-900/40"
                    : "bg-dangerSoft"
                  : dark
                  ? "bg-nightSurface2"
                  : "bg-foam"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={clsx("truncate text-sm font-black", dark && "text-nightText")}>{player.name}</div>
                  <div className={clsx("text-[0.6rem] font-bold", dark ? "text-nightMuted" : "text-malt/60")}>
                    Abw. {grams(stats.lastDeviation)} · Treffer {stats.exactHits}
                  </div>
                </div>
                <div className={clsx("text-xl font-black", dark ? "text-red-400" : "text-red-700")}>{player.penaltyPoints}</div>
              </div>
              <div className={clsx("mt-1 h-1.5 rounded-full", dark ? "bg-nightBg" : "bg-white")}>
                <div
                  className="h-full rounded-full bg-orangeBeer"
                  style={{ width: `${Math.min(100, player.penaltyPoints * 16)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ScoreStrip({ players, theme = "light" }: { players: Player[]; theme?: "light" | "dark" }) {
  const dark = theme === "dark";
  return (
    <div className="scrollbar-soft flex min-w-0 flex-1 gap-2 overflow-x-auto">
      {players.map((player) => (
        <div
          key={player.id}
          className={clsx(
            "shrink-0 rounded-full px-3 py-2 text-sm font-black",
            dark ? "bg-nightSurface2 text-nightText" : "bg-cream"
          )}
        >
          {player.name}: <span className={clsx(dark ? "text-red-400" : "text-red-700")}>{player.penaltyPoints}</span>
        </div>
      ))}
    </div>
  );
}

function EndGameScreen({
  game,
  emptyWeights,
  coinSpinning,
  round,
  onWeightChange,
  onFlip,
  onEvaluate,
  theme = "light",
  bigTapMode = false,
  onOpenNumpad
}: {
  game: Game;
  emptyWeights: Record<string, string>;
  coinSpinning: boolean;
  round?: Round;
  onWeightChange: (playerId: string, rawValue: string) => void;
  onFlip: () => void;
  onEvaluate: () => void;
  theme?: "light" | "dark";
  bigTapMode?: boolean;
  onOpenNumpad?: (playerId: string) => void;
}) {
  const dark = theme === "dark";
  const complete = game.players.every((player) => toNumber(emptyWeights[player.id]) !== undefined);
  const weighedCount = game.players.filter((player) => toNumber(emptyWeights[player.id]) !== undefined).length;
  const resolved = (round?.penalties.length ?? 0) > 0;
  const loserIds = round?.emptyBottleMeasurements?.filter((measurement) => measurement.coinFlipLoser).map((measurement) => measurement.playerId) ?? [];
  return (
    <section className="grid h-full gap-3 overflow-hidden lg:grid-cols-[1fr_320px]">
      <div
        className={clsx(
          "flex h-full flex-col rounded-xl border p-3 shadow-board backdrop-blur-xl",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <div className="flex items-baseline justify-between">
          <h2 className={clsx("text-xl font-black", dark && "text-nightText")}>Alle trinken leer.</h2>
          <span className={clsx("text-sm font-bold", dark ? "text-nightMuted" : "text-malt/65")}>
            {weighedCount}/{game.players.length} gewogen
          </span>
        </div>
        <div className="mt-2 grid flex-1 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          {game.players.map((player) => (
            <div
              key={player.id}
              className={clsx(
                "rounded-xl border p-2",
                loserIds.includes(player.id)
                  ? dark
                    ? "border-red-700 bg-red-900/40"
                    : "border-red-200 bg-dangerSoft"
                  : dark
                  ? "border-nightBorder bg-nightSurface2"
                  : "border-[#ead9b9] bg-foam"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={clsx("truncate text-base font-black", dark && "text-nightText")}>{player.name}</span>
                <span className={clsx("shrink-0 text-[0.6rem] font-bold", dark ? "text-nightMuted" : "text-malt/60")}>
                  vorher {grams(roundPreviousWeight(game, player.id, round?.roundNumber ?? game.rounds.length + 1))}
                </span>
              </div>
              <span className={clsx("block truncate text-[0.6rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/50")}>
                {normalizeBeer(player.beer).brand} · {bottleSizeLabel(normalizeBeer(player.beer).bottleSizeLiters)}
              </span>
              {bigTapMode && onOpenNumpad ? (
                <button
                  type="button"
                  onClick={() => onOpenNumpad(player.id)}
                  disabled={resolved}
                  className={clsx(
                    "mt-1.5 h-12 w-full rounded-lg border-2 px-2 text-left text-lg font-black outline-none transition active:scale-95 disabled:opacity-50",
                    dark
                      ? "border-nightBorder bg-nightBg text-nightText hover:border-amberBeer"
                      : "border-[#ead9b9] bg-white hover:border-amberBeer"
                  )}
                >
                  {emptyWeights[player.id] ? `${emptyWeights[player.id]} g` : "Antippen"}
                </button>
              ) : (
                <input
                  value={emptyWeights[player.id] ?? ""}
                  onChange={(event) => onWeightChange(player.id, event.target.value)}
                  disabled={resolved}
                  inputMode="decimal"
                  placeholder="Leere Flasche g"
                  className={clsx(
                    "mt-1.5 h-12 w-full rounded-lg border-2 px-2 text-lg font-black outline-none focus:border-amberBeer",
                    dark ? "border-nightBorder bg-nightBg text-nightText" : "border-[#ead9b9] bg-white"
                  )}
                />
              )}
              {loserIds.includes(player.id) && (
                <div className="mt-1.5 inline-flex rounded-full bg-red-700 px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                  Münzwurf · +1
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className={clsx(
          "flex h-full flex-col rounded-2xl border p-3 text-center shadow-sm",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <div className={clsx("mx-auto grid size-24 place-items-center rounded-full bg-goldBeer text-malt shadow-lg", coinSpinning && "coin-flip")}>
          <Coins className="size-12" />
        </div>
        {resolved && (
          <div className={clsx("mt-3 rounded-xl p-2.5", dark ? "bg-nightSurface2" : "bg-foam")}>
            <div className={clsx("text-[0.65rem] font-black uppercase", dark ? "text-nightMuted" : "text-malt/55")}>Münzwurf</div>
            <div className={clsx("text-lg font-black", dark && "text-nightText")}>
              {game.coinFlipResult === "heaviest" ? "Schwerste verliert" : "Leichteste verliert"}
            </div>
            <div className={clsx("text-sm font-bold", dark ? "text-red-400" : "text-red-700")}>
              {loserIds.map((id) => playerName(game.players, id)).join(", ")}
            </div>
          </div>
        )}
        {resolved ? (
          <button
            onClick={onEvaluate}
            className="mt-3 w-full rounded-full bg-orange px-4 py-3 text-base font-black text-white shadow-lg"
          >
            Spiel auswerten
          </button>
        ) : (
          <button
            onClick={onFlip}
            disabled={!complete || coinSpinning}
            className={clsx(
              "mt-3 w-full rounded-full bg-orange px-4 py-3 text-base font-black text-white shadow-lg disabled:opacity-45"
            )}
          >
            Münzwurf starten
          </button>
        )}
        <p className={clsx("mt-auto pt-2 text-[0.65rem] font-bold", dark ? "text-nightMuted" : "text-malt/60")}>
          Bei Gleichstand: alle Betroffenen +1.
        </p>
      </div>
    </section>
  );
}

function FinalScreen({
  game,
  onNewGame,
  theme = "light"
}: {
  game: Game;
  onNewGame: () => void;
  theme?: "light" | "dark";
}) {
  const dark = theme === "dark";
  const rows = [...game.players]
    .map((player) => ({ player, stats: statsForPlayer(game, player.id) }))
    .sort((a, b) => b.player.penaltyPoints - a.player.penaltyPoints);
  const beer = beerAnalytics(game);
  const awards = awardWinners(game);
  const loser = rows[0]?.player;
  const bestCaller = rows
    .filter((row) => row.stats.callerCount > 0)
    .sort((a, b) => a.stats.avgCallerDeviation - b.stats.avgCallerDeviation)[0];
  const worstCaller = rows
    .filter((row) => row.stats.callerCount > 0)
    .sort((a, b) => b.stats.avgCallerDeviation - a.stats.avgCallerDeviation)[0];

  return (
    <section className="grid h-full gap-3 overflow-hidden xl:grid-cols-[1fr_360px]">
      <div
        className={clsx(
          "flex h-full flex-col overflow-hidden rounded-xl border p-3 shadow-board backdrop-blur-xl",
          dark ? "border-nightBorder bg-nightSurface/90" : "border-white/80 bg-white/80 ring-1 ring-white/60"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className={clsx("flex items-center gap-2 text-2xl font-black", dark ? "text-orange" : "text-malt")}>
              <Trophy className="size-6 text-orangeBeer" />
              Endranking
            </h2>
            <p className={clsx("text-xs font-bold", dark ? "text-nightMuted" : "text-malt/65")}>
              {game.coinFlipResult === "heaviest" ? "Schwerste verliert" : "Leichteste verliert"}
            </p>
          </div>
          <button onClick={onNewGame} className="rounded-full bg-orange px-4 py-2 text-sm font-black text-white shadow-lg">
            Neues Spiel
          </button>
        </div>
        <div className="mt-2 grid flex-1 gap-1.5 overflow-y-auto">
          {rows.map(({ player, stats }, index) => (
            <div
              key={player.id}
              className={clsx(
                "rounded-xl border px-3 py-2",
                index === 0
                  ? dark
                    ? "border-red-700 bg-red-900/40"
                    : "border-red-200 bg-dangerSoft"
                  : dark
                  ? "border-nightBorder bg-nightSurface2"
                  : "border-[#ead9b9] bg-foam"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className={clsx("truncate text-base font-black", dark && "text-nightText")}>
                    {index + 1}. {player.name}
                  </div>
                  <div className={clsx("truncate text-[0.65rem] font-bold", dark ? "text-nightMuted" : "text-malt/60")}>
                    Ø Abw. {grams(stats.avgDeviation)} · Treffer {stats.exactHits} · Ansager {stats.callerCount}× · getrunken {grams(stats.totalConsumedGrams)}
                  </div>
                </div>
                <div className={clsx("shrink-0 text-2xl font-black", dark ? "text-red-400" : "text-red-700")}>{player.penaltyPoints}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-full flex-col gap-2 overflow-y-auto">
        <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
          <h3 className="mb-2 flex items-center gap-2 text-base font-black">
            <Medal className="size-4 text-orangeBeer" />
            Statistiken
          </h3>
          <StatLine label="Verlierer" value={loser?.name ?? "-"} />
          <StatLine label="Präzisester Spieler" value={awards.waagenmeister?.name ?? "-"} />
          <StatLine label="Beste Ansager-Performance" value={bestCaller ? `${bestCaller.player.name} (${grams(bestCaller.stats.avgCallerDeviation)})` : "-"} />
          <StatLine label="Schlechteste Ansager-Performance" value={worstCaller ? `${worstCaller.player.name} (${grams(worstCaller.stats.avgCallerDeviation)})` : "-"} />
          <StatLine label="Meistgetrunkene Marke" value={beer.mostConsumedBrand ? `${beer.mostConsumedBrand.brand} (${beer.mostConsumedBrand.playerCount}x)` : "-"} />
          <StatLine label="Beste Zielgenauigkeit nach Marke" value={beer.bestBrand ? `${beer.bestBrand.brand} (${grams(beer.bestBrand.avgDeviation)})` : "-"} />
          <StatLine label="Höchste Marken-Abweichung" value={beer.worstBrand ? `${beer.worstBrand.brand} (${grams(beer.worstBrand.avgDeviation)})` : "-"} />
          <StatLine label="Beste Flaschengröße" value={beer.bestSize ? `${beer.bestSize.label} (${grams(beer.bestSize.avgDeviation)})` : "-"} />
          <StatLine label="Größte Gesamttrinkmenge" value={beer.biggestTotalDrinker ? `${beer.biggestTotalDrinker.player.name} (${grams(beer.biggestTotalDrinker.stats.totalConsumedGrams)})` : "-"} />
          <StatLine label="Größter Schluck" value={beer.biggestSip ? `${beer.biggestSip.player.name} (${grams(beer.biggestSip.stats.maxConsumedInRound)})` : "-"} />
          <StatLine label="Konstanteste Trinkmenge" value={beer.mostConsistentDrinker ? `${beer.mostConsistentDrinker.player.name} (${grams(beer.mostConsistentDrinker.stats.consumptionVariance)})` : "-"} />
        </div>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
          <h3 className="mb-2 flex items-center gap-2 text-base font-black">
            <Sparkles className="size-4 text-hop" />
            Awards
          </h3>
          <StatLine label="Waagenmeister" value={awards.waagenmeister?.name ?? "-"} />
          <StatLine label="Zielwasser gehabt" value={awards.zielwasser?.name ?? "-"} />
          <StatLine label="Komplett daneben" value={awards.daneben?.name ?? "-"} />
          <StatLine label="Strafpunkt-König" value={awards.strafpunktKoenig?.name ?? "-"} />
          <StatLine label="Mutiger Ansager" value={awards.mutigerAnsager?.name ?? "-"} />
          <StatLine label="Markentreu" value={awards.markentreu ? `${awards.markentreu.brand} (${awards.markentreu.playerCount}x)` : "-"} />
          <StatLine label="Halbe-Liter-Held" value={awards.halbeLiterHeld?.name ?? "-"} />
          <StatLine label="Drittel-Profi" value={awards.drittelProfi?.name ?? "-"} />
          <StatLine label="Größter Schluck" value={awards.groessterSchluck?.name ?? "-"} />
          <StatLine label="Konstanter Trinker" value={awards.konstanterTrinker?.name ?? "-"} />
          <StatLine label="Bier-Sommelier" value={awards.bierSommelier?.brand ?? "-"} />
        </div>
        <BeerStatsPanel game={game} />
        <BottleStatsPanel game={game} />
        <HistoryPanel game={game} />
      </div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#ead9b9] py-1 text-xs last:border-0 dark:border-nightBorder">
      <span className="truncate font-bold text-malt/65 dark:text-nightMuted">{label}</span>
      <span className="shrink-0 text-right font-black dark:text-nightText">{value}</span>
    </div>
  );
}

function BeerStatsPanel({ game }: { game: Game }) {
  const beer = beerAnalytics(game);
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
      <h3 className="mb-2 flex items-center gap-2 text-base font-black">
        <Beer className="size-4 text-orangeBeer" />
        Bier-Ranking
      </h3>
      <div className="grid gap-1.5">
        {beer.brandStats.map((brand) => (
          <div key={brand.brand} className="rounded-xl bg-foam px-2.5 py-1.5 dark:bg-nightSurface2">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-black dark:text-nightText">{brand.brand}</div>
              <div className="shrink-0 rounded-full bg-goldBeer px-2 py-0.5 text-[0.6rem] font-black">{brand.playerCount}×</div>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[0.6rem] font-bold text-malt/65 dark:text-nightMuted">
              <span>Ø Abw. {grams(brand.avgDeviation)}</span>
              <span>Ø Strafe {brand.avgPenaltyPoints.toFixed(1)}</span>
              <span>Treffer {brand.exactHits}</span>
              <span>Ø Schluck {grams(brand.avgConsumedPerRound)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottleStatsPanel({ game }: { game: Game }) {
  const beer = beerAnalytics(game);
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
      <h3 className="mb-2 flex items-center gap-2 text-base font-black">
        <Scale className="size-4 text-hop" />
        Flaschen & Trinkmenge
      </h3>
      <div className="grid gap-1.5">
        {beer.playerRows.map(({ player, stats }) => (
          <div key={player.id} className="rounded-xl bg-foam px-2.5 py-1.5 dark:bg-nightSurface2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="truncate text-sm font-black dark:text-nightText">{player.name}</div>
                <div className="truncate text-[0.6rem] font-bold text-malt/60 dark:text-nightMuted">
                  {normalizeBeer(player.beer).brand} · {bottleSizeLabel(normalizeBeer(player.beer).bottleSizeLiters)}
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-black dark:bg-nightBg dark:text-nightText">
                {milliliters(stats.estimatedMl)}
              </div>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[0.6rem] font-bold text-malt/65 dark:text-nightMuted">
              <span>Start {grams(player.startWeight)}</span>
              <span>Leer {grams(player.emptyBottleWeight)}</span>
              <span>Gesamt {grams(stats.totalConsumedGrams)}</span>
              <span>Ø {grams(stats.avgConsumedPerRound)}</span>
              <span>Max {grams(stats.maxConsumedInRound)}</span>
              <span>Min {grams(stats.minConsumedInRound)}</span>
            </div>
          </div>
        ))}
        {beer.sizeStats.map((size) => (
          <div key={size.label} className="rounded-xl border border-[#ead9b9] bg-white px-2.5 py-1.5 dark:border-nightBorder dark:bg-nightBg">
            <div className="text-sm font-black dark:text-nightText">{size.label}</div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[0.6rem] font-bold text-malt/65 dark:text-nightMuted">
              <span>Ø Abw. {grams(size.avgDeviation)}</span>
              <span>Ø Strafe {size.avgPenaltyPoints.toFixed(1)}</span>
              <span>Ø Runden {size.avgRoundsUntilEmpty.toFixed(1)}</span>
              <span>Ø Schluck {grams(size.avgConsumedPerRound)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel({ game }: { game: Game }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
      <h3 className="mb-2 flex items-center gap-2 text-base font-black">
        <History className="size-4 text-orangeBeer" />
        Rundenhistorie
      </h3>
      <div className="grid gap-3">
        {game.rounds
          .filter((round) => round.status === "completed")
          .map((round) => (
            <div key={round.id} className="rounded-2xl bg-foam p-3">
              <div className="flex justify-between gap-3 font-black">
                <span>Runde {round.roundNumber}</span>
                <span>{round.type === "empty_finish" ? "Leer trinken" : grams(round.targetWeight)}</span>
              </div>
              <div className="text-sm font-bold text-malt/60">
                {round.type === "empty_finish"
                  ? `Münzwurf · ${game.coinFlipResult === "heaviest" ? "Schwerste verliert" : "Leichteste verliert"}`
                  : `Ansager ${playerName(game.players, round.callerId)}`} · {new Date(round.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="mt-2 grid gap-1">
                {round.type === "empty_finish"
                  ? round.emptyBottleMeasurements?.map((measurement) => (
                      <div key={measurement.playerId} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-black">{playerName(game.players, measurement.playerId)}</span>
                        <span>leer {grams(measurement.emptyBottleWeight)}</span>
                        <span>getrunken {grams(measurement.consumedInFinalRound)}</span>
                        <Badge tone="empty">Leer</Badge>
                        {measurement.coinFlipLoser && <Badge tone="coin">Münzwurf verloren</Badge>}
                      </div>
                    ))
                  : round.measurements.map((measurement) => (
                      <div key={measurement.playerId} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-black">{playerName(game.players, measurement.playerId)}</span>
                        <span>{grams(measurement.weight)}</span>
                        <span>Abw. {grams(measurement.deviation)}</span>
                        {measurement.isCaller && <Badge tone="caller">Ansager</Badge>}
                        {measurement.exactHit && <Badge tone="hit">Treffer</Badge>}
                        {measurement.isWorst && <Badge tone="bad">Daneben</Badge>}
                      </div>
                    ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Numpad – Großer Tipp-Modus (Pass-the-Phone)
// ──────────────────────────────────────────────────────────
function Numpad({
  theme,
  context,
  playerName: name,
  subtitle,
  initialValue,
  previousValue,
  targetValue,
  progressIndex,
  progressTotal,
  onClose,
  onSubmit,
  onTap
}: {
  theme: "light" | "dark";
  context: "weight" | "empty" | "target" | "startWeight";
  playerName: string;
  subtitle: string;
  initialValue: string;
  previousValue?: number;
  targetValue?: number;
  progressIndex?: number;
  progressTotal?: number;
  onClose: () => void;
  onSubmit: (value: string) => void;
  onTap?: () => void;
}) {
  const dark = theme === "dark";
  const [value, setValue] = useState(initialValue || "");

  // Wenn der Spieler wechselt: Wert reset
  useEffect(() => {
    setValue(initialValue || "");
  }, [name, initialValue]);

  const append = (chr: string) => {
    onTap?.();
    setValue((current) => {
      if (chr === "," && current.includes(",")) return current;
      if (current.length >= 8) return current;
      // Verbiete führende Nullen wie "00"
      if (chr !== "," && current === "0") return chr;
      return current + chr;
    });
  };

  const backspace = () => {
    onTap?.();
    setValue((current) => current.slice(0, -1));
  };

  const submit = () => {
    if (!value || value === ",") return;
    onSubmit(value);
  };

  const numericValue = Number.parseFloat(value.replace(",", "."));
  const showDeviation =
    context === "weight" &&
    Number.isFinite(numericValue) &&
    Number.isFinite(targetValue);
  const deviation = showDeviation ? Math.abs(numericValue - (targetValue ?? 0)) : 0;
  const consumed =
    (context === "weight" || context === "empty") &&
    Number.isFinite(numericValue) &&
    Number.isFinite(previousValue)
      ? Math.max(0, (previousValue ?? 0) - numericValue)
      : 0;

  const keys: Array<{ label: string; action: () => void; variant?: "key" | "ctrl" | "primary" }> = [
    { label: "7", action: () => append("7") },
    { label: "8", action: () => append("8") },
    { label: "9", action: () => append("9") },
    { label: "4", action: () => append("4") },
    { label: "5", action: () => append("5") },
    { label: "6", action: () => append("6") },
    { label: "1", action: () => append("1") },
    { label: "2", action: () => append("2") },
    { label: "3", action: () => append("3") },
    { label: ",", action: () => append(",") },
    { label: "0", action: () => append("0") },
    { label: "⌫", action: backspace, variant: "ctrl" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center">
      <div className={clsx("absolute inset-0", dark ? "bg-black/85" : "bg-malt/65 backdrop-blur-sm")} onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 flex h-full w-full max-w-xl flex-col p-4 shadow-2xl sm:my-4 sm:h-auto sm:rounded-[2rem]",
          dark ? "bg-nightSurface text-nightText" : "bg-foam text-ink"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={clsx("text-xs font-black uppercase tracking-wide", dark ? "text-nightMuted" : "text-malt/55")}>
              {context === "target"
                ? "Zielgewicht"
                : context === "startWeight"
                ? "Startgewicht"
                : context === "empty"
                ? "Leere Flasche"
                : "Gewicht eingeben"}
            </div>
            <div className="truncate text-3xl font-black sm:text-4xl">{name}</div>
            <div className={clsx("mt-1 text-sm font-bold", dark ? "text-nightMuted" : "text-malt/65")}>{subtitle}</div>
            {progressIndex !== undefined && progressTotal !== undefined && (
              <div className={clsx("mt-2 text-xs font-black uppercase tracking-wide", dark ? "text-nightMuted" : "text-malt/50")}>
                Spieler {progressIndex + 1} / {progressTotal}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className={clsx(
              "grid size-12 place-items-center rounded-full border shadow-sm transition active:scale-95",
              dark ? "border-nightBorder bg-nightSurface2 text-nightText" : "border-[#ead9b9] bg-white text-ink"
            )}
            aria-label="Schließen"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Anzeige */}
        <div
          className={clsx(
            "mt-4 grid h-32 place-items-center rounded-3xl border-2 px-6 text-7xl font-black tracking-tight sm:h-40 sm:text-8xl",
            dark ? "border-amberBeer bg-nightBg" : "border-amberBeer bg-white"
          )}
        >
          <span className={clsx(value ? "" : (dark ? "text-nightMuted/50" : "text-malt/25"))}>
            {value ? `${value}` : "0"}
          </span>
        </div>

        {/* Hinweise */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase">
          {previousValue !== undefined && (
            <div className={clsx("rounded-xl py-2", dark ? "bg-nightSurface2 text-nightMuted" : "bg-cream text-malt/65")}>
              <div>vorher</div>
              <div className={clsx("mt-1 text-sm", dark && "text-nightText")}>{grams(previousValue)}</div>
            </div>
          )}
          {targetValue !== undefined && (
            <div className={clsx("rounded-xl py-2", dark ? "bg-orange/20 text-orange" : "bg-[#fff1bd] text-malt")}>
              <div>Ziel</div>
              <div className="mt-1 text-sm">{grams(targetValue)}</div>
            </div>
          )}
          {showDeviation && value && (
            <div
              className={clsx(
                "rounded-xl py-2",
                deviation === 0
                  ? "bg-hop text-white"
                  : dark
                  ? "bg-red-900/40 text-red-400"
                  : "bg-dangerSoft text-red-700"
              )}
            >
              <div>Abw.</div>
              <div className="mt-1 text-sm">{grams(deviation)}</div>
            </div>
          )}
          {(context === "weight" || context === "empty") && value && previousValue !== undefined && !showDeviation && (
            <div className={clsx("rounded-xl py-2", dark ? "bg-nightSurface2 text-nightMuted" : "bg-cream text-malt/65")}>
              <div>getrunken</div>
              <div className={clsx("mt-1 text-sm", dark && "text-nightText")}>{grams(consumed)}</div>
            </div>
          )}
        </div>

        {/* Tasten */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {keys.map((key) => (
            <button
              key={key.label}
              onClick={key.action}
              className={clsx(
                "numpad-key h-16 rounded-2xl text-3xl font-black shadow-sm transition sm:h-20 sm:text-4xl",
                key.variant === "ctrl"
                  ? dark
                    ? "bg-nightSurface2 text-orange"
                    : "bg-malt text-white"
                  : dark
                  ? "bg-nightBg text-nightText"
                  : "bg-white text-ink"
              )}
            >
              {key.label === "⌫" ? <Delete className="mx-auto size-7" /> : key.label}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!value || value === ","}
          className={clsx(
            "mt-3 flex h-20 w-full items-center justify-center gap-3 rounded-full bg-orange px-6 text-2xl font-black text-white shadow-lg transition active:scale-95 disabled:opacity-40 sm:mt-4"
          )}
        >
          <Check className="size-7" />
          {context === "target"
            ? "Ziel setzen"
            : context === "startWeight"
            ? "Startgewicht speichern"
            : progressIndex !== undefined && progressTotal !== undefined && progressIndex + 1 < progressTotal
            ? "Weiter"
            : "Fertig"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Konfetti
// ──────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.2 + Math.random() * 1.2,
        rotation: Math.random() * 360,
        color: ["#f6b73c", "#ffd86b", "#f28b35", "#3f9b63", "#52321f", "#ffffff"][index % 6]
      })),
    []
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            background: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confettiFall ${piece.duration}s ease-out ${piece.delay}s forwards`
          }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Settings Sheet
// ──────────────────────────────────────────────────────────
function SettingsSheet({
  settings,
  setSettings,
  onClose
}: {
  settings: GameSettings;
  setSettings: (updater: (previous: GameSettings) => GameSettings) => void;
  onClose: () => void;
}) {
  const dark = settings.theme === "dark";
  const toggle = (key: keyof Omit<GameSettings, "penalties" | "theme">) => () =>
    setSettings((previous) => ({ ...previous, [key]: !previous[key] }));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto p-5 shadow-2xl sm:rounded-3xl",
          dark ? "bg-nightSurface text-nightText" : "bg-foam text-ink",
          "rounded-t-3xl"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Einstellungen</h2>
          <button
            onClick={onClose}
            className={clsx(
              "grid size-11 place-items-center rounded-full border",
              dark ? "border-nightBorder bg-nightSurface2 text-nightText" : "border-[#ead9b9] bg-white text-ink"
            )}
            aria-label="Schließen"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Theme */}
        <div className={clsx("mt-5 rounded-2xl p-4", dark ? "bg-nightSurface2" : "bg-cream")}>
          <div className="text-sm font-black uppercase tracking-wide opacity-70">Darstellung</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => setSettings((previous) => ({ ...previous, theme: "light" }))}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition active:scale-95",
                settings.theme === "light"
                  ? "bg-orange text-white shadow-lg"
                  : dark
                  ? "bg-nightBg text-nightText"
                  : "bg-white text-ink"
              )}
            >
              <Sun className="size-5" />
              Hell
            </button>
            <button
              onClick={() => setSettings((previous) => ({ ...previous, theme: "dark" }))}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black transition active:scale-95",
                settings.theme === "dark"
                  ? "bg-orange text-white shadow-lg"
                  : dark
                  ? "bg-nightBg text-nightText"
                  : "bg-white text-ink"
              )}
            >
              <Moon className="size-5" />
              Dunkel
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-4 grid gap-2">
          <SettingToggle
            label="Großer Tipp-Modus"
            description="XL-Numpad statt Tastatur. Optimiert fürs Handy-Rumreichen."
            icon={<Zap className="size-5" />}
            active={settings.bigTapMode}
            onToggle={toggle("bigTapMode")}
            theme={settings.theme}
          />
          <SettingToggle
            label="Auto-Weiter"
            description="Nach jeder Eingabe automatisch zum nächsten Spieler."
            icon={<ArrowRight className="size-5" />}
            active={settings.autoAdvance}
            onToggle={toggle("autoAdvance")}
            theme={settings.theme}
          />
          <SettingToggle
            label="Übergabe-Splash"
            description="Kurzer Hinweis 'Übergabe an X' zwischen Spielern."
            icon={<Sparkles className="size-5" />}
            active={settings.passPhoneSplash}
            onToggle={toggle("passPhoneSplash")}
            theme={settings.theme}
          />
          <SettingToggle
            label="Werte verstecken bis zur Auswertung"
            description="Spannungs-Modus: Eingaben verdeckt zeigen, alle gleichzeitig aufdecken."
            icon={<PartyPopper className="size-5" />}
            active={settings.hideValuesUntilReveal}
            onToggle={toggle("hideValuesUntilReveal")}
            theme={settings.theme}
          />
          <SettingToggle
            label="Sound"
            description="Effekte für Eingabe, Treffer, Daneben und Sieg."
            icon={settings.sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            active={settings.sound}
            onToggle={toggle("sound")}
            theme={settings.theme}
          />
          <SettingToggle
            label="Vibration"
            description="Haptisches Feedback (sofern Gerät unterstützt)."
            icon={<Zap className="size-5" />}
            active={settings.vibration}
            onToggle={toggle("vibration")}
            theme={settings.theme}
          />
        </div>

        {/* Strafpunkte */}
        <div className={clsx("mt-4 rounded-2xl p-4", dark ? "bg-nightSurface2" : "bg-cream")}>
          <div className="text-sm font-black uppercase tracking-wide opacity-70">Strafpunkte (für nächste Runde)</div>
          <p className="mt-1 text-xs font-bold opacity-65">
            Werte werden bei der nächsten gestarteten Runde verwendet. Bereits gespielte Runden bleiben unverändert.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PenaltyStepper
              label="Daneben"
              value={settings.penalties.worst}
              onChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  penalties: { ...previous.penalties, worst: value }
                }))
              }
              theme={settings.theme}
            />
            <PenaltyStepper
              label="Ansager daneben"
              value={settings.penalties.callerWorst}
              onChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  penalties: { ...previous.penalties, callerWorst: value }
                }))
              }
              theme={settings.theme}
            />
            <PenaltyStepper
              label="Treffer (verteilt)"
              value={settings.penalties.exactHit}
              onChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  penalties: { ...previous.penalties, exactHit: value }
                }))
              }
              theme={settings.theme}
            />
            <PenaltyStepper
              label="Ansager-Treffer"
              value={settings.penalties.callerExactHit}
              onChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  penalties: { ...previous.penalties, callerExactHit: value }
                }))
              }
              theme={settings.theme}
            />
          </div>
          <button
            onClick={() => setSettings((previous) => ({ ...previous, penalties: DEFAULT_SETTINGS.penalties }))}
            className={clsx(
              "mt-3 w-full rounded-full px-4 py-2 text-sm font-black",
              dark ? "bg-nightBg text-nightText" : "bg-white text-ink"
            )}
          >
            Strafpunkte zurücksetzen
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-orange px-6 py-4 text-lg font-black text-white shadow-lg active:scale-95"
        >
          Fertig
        </button>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  icon,
  active,
  onToggle,
  theme
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  theme: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "flex items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.98]",
        active
          ? "border-amberBeer bg-amberBeer/15"
          : dark
          ? "border-nightBorder bg-nightSurface2"
          : "border-[#ead9b9] bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "grid size-10 shrink-0 place-items-center rounded-full",
            active ? "bg-orange text-white" : dark ? "bg-nightBg text-nightMuted" : "bg-cream text-malt"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className={clsx("font-black", dark && "text-nightText")}>{label}</div>
          <div className={clsx("text-xs font-bold", dark ? "text-nightMuted" : "text-malt/60")}>{description}</div>
        </div>
      </div>
      <div
        className={clsx(
          "grid h-7 w-12 shrink-0 items-center rounded-full p-1 transition",
          active ? "bg-hop" : dark ? "bg-nightBorder" : "bg-malt/30"
        )}
      >
        <div
          className={clsx(
            "size-5 rounded-full bg-white shadow transition-transform",
            active ? "translate-x-5" : "translate-x-0"
          )}
        />
      </div>
    </button>
  );
}

function PenaltyStepper({
  label,
  value,
  onChange,
  theme
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  theme: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <div className={clsx("rounded-2xl p-3", dark ? "bg-nightBg" : "bg-white")}>
      <div className={clsx("text-xs font-black uppercase", dark ? "text-nightMuted" : "text-malt/55")}>{label}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className={clsx(
            "grid size-10 place-items-center rounded-full font-black",
            dark ? "bg-nightSurface2 text-nightText" : "bg-cream text-ink"
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className={clsx("text-3xl font-black", dark && "text-nightText")}>{value}</div>
        <button
          onClick={() => onChange(Math.min(10, value + 1))}
          className={clsx(
            "grid size-10 place-items-center rounded-full font-black",
            dark ? "bg-nightSurface2 text-nightText" : "bg-cream text-ink"
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
