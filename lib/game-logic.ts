// Reine Spiellogik – keine Abhängigkeit zu Supabase oder LocalStorage.

export type RoundPenaltyConfig = {
  worst: number;
  callerWorst: number;
  exactHit: number;
  callerExactHit: number;
  coinFlipLoss?: number;
};

export const DEFAULT_PENALTY_CONFIG: RoundPenaltyConfig = {
  worst: 1,
  callerWorst: 2,
  exactHit: 1,
  callerExactHit: 2,
  coinFlipLoss: 1
};

export type EvalMeasurement = {
  playerId: string;
  weight: number;
  isCaller: boolean;
};

export type EvalResult = {
  measurements: Array<{
    playerId: string;
    weight: number;
    deviation: number;
    exactHit: boolean;
    isWorst: boolean;
    isCaller: boolean;
    penaltyPointsReceived: number;
  }>;
  worstPlayerIds: string[];
  exactHitPlayerIds: string[];
  penalties: Array<{ playerId: string; points: number; reason: "worst_deviation" | "caller_worst_deviation" }>;
};

export function evaluateRound(
  targetWeight: number,
  measurements: EvalMeasurement[],
  config: RoundPenaltyConfig = DEFAULT_PENALTY_CONFIG
): EvalResult {
  const enriched = measurements.map((m) => ({
    ...m,
    deviation: Math.abs(m.weight - targetWeight),
    exactHit: Math.abs(m.weight - targetWeight) === 0
  }));
  const maxDev = Math.max(...enriched.map((m) => m.deviation));
  const worstPlayerIds = enriched.filter((m) => m.deviation === maxDev).map((m) => m.playerId);
  const exactHitPlayerIds = enriched.filter((m) => m.exactHit).map((m) => m.playerId);
  const penalties = worstPlayerIds.map((playerId) => {
    const isCaller = enriched.find((m) => m.playerId === playerId)?.isCaller;
    return {
      playerId,
      points: isCaller ? config.callerWorst : config.worst,
      reason: isCaller ? ("caller_worst_deviation" as const) : ("worst_deviation" as const)
    };
  });
  const result: EvalResult["measurements"] = enriched.map((m) => ({
    playerId: m.playerId,
    weight: m.weight,
    deviation: m.deviation,
    exactHit: m.exactHit,
    isCaller: m.isCaller,
    isWorst: worstPlayerIds.includes(m.playerId),
    penaltyPointsReceived: penalties.find((p) => p.playerId === m.playerId)?.points ?? 0
  }));
  return { measurements: result, worstPlayerIds, exactHitPlayerIds, penalties };
}

export function exactHitTokensForCaller(isCaller: boolean, config: RoundPenaltyConfig = DEFAULT_PENALTY_CONFIG) {
  return isCaller ? config.callerExactHit : config.exactHit;
}
