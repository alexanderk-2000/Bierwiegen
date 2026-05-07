"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { evaluateRound, type RoundPenaltyConfig } from "@/lib/game-logic";
import type { Database } from "@/lib/supabase/types";

type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];

export async function startRound(params: {
  gameId: string;
  callerGamePlayerId: string;
  targetWeight: number;
  penaltyConfig: RoundPenaltyConfig;
  roundNumber: number;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      game_id: params.gameId,
      round_number: params.roundNumber,
      type: "normal",
      caller_game_player_id: params.callerGamePlayerId,
      target_weight: params.targetWeight,
      status: "input",
      penalty_config: params.penaltyConfig as unknown as Database["public"]["Tables"]["rounds"]["Insert"]["penalty_config"]
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Runde konnte nicht erstellt werden.");
  await supabase.from("games").update({ active_round_id: data.id, status: "playing" }).eq("id", params.gameId);
  return data as RoundRow;
}

export async function startEmptyFinishRound(params: {
  gameId: string;
  roundNumber: number;
  penaltyConfig: RoundPenaltyConfig;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      game_id: params.gameId,
      round_number: params.roundNumber,
      type: "empty_finish",
      status: "input",
      penalty_config: params.penaltyConfig as unknown as Database["public"]["Tables"]["rounds"]["Insert"]["penalty_config"]
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Finale Runde konnte nicht gestartet werden.");
  await supabase.from("games").update({ active_round_id: data.id, status: "playing" }).eq("id", params.gameId);
  return data as RoundRow;
}

export async function upsertMeasurement(params: {
  roundId: string;
  gamePlayerId: string;
  previousWeight: number;
  weight: number;
  targetWeight: number;
  isCaller: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const deviation = Math.abs(params.weight - params.targetWeight);
  const consumed = Math.max(0, params.previousWeight - params.weight);
  const { error } = await supabase
    .from("measurements")
    .upsert(
      {
        round_id: params.roundId,
        game_player_id: params.gamePlayerId,
        previous_weight: params.previousWeight,
        weight: params.weight,
        deviation,
        exact_hit: deviation === 0,
        is_caller: params.isCaller,
        consumed_grams: consumed,
        source: "manual"
      },
      { onConflict: "round_id,game_player_id" }
    );
  if (error) throw error;
}

export async function evaluateAndCommitRound(params: {
  gameId: string;
  roundId: string;
  targetWeight: number;
  penaltyConfig: RoundPenaltyConfig;
  measurements: Array<{ playerId: string; weight: number; isCaller: boolean }>;
}) {
  const result = evaluateRound(params.targetWeight, params.measurements, params.penaltyConfig);
  const supabase = getSupabaseBrowserClient();

  // Update measurements with worst flag + penalty points received
  await Promise.all(
    result.measurements.map((m) =>
      supabase
        .from("measurements")
        .update({
          is_worst: m.isWorst,
          penalty_points_received: m.penaltyPointsReceived
        })
        .eq("round_id", params.roundId)
        .eq("game_player_id", m.playerId)
    )
  );

  // Insert penalties
  if (result.penalties.length > 0) {
    await supabase.from("penalties").insert(
      result.penalties.map((p) => ({
        game_id: params.gameId,
        round_id: params.roundId,
        game_player_id: p.playerId,
        points: p.points,
        reason: p.reason
      }))
    );
  }

  await supabase.from("rounds").update({ status: "review" }).eq("id", params.roundId);

  return result;
}

export async function applyExactHitDistribution(params: {
  gameId: string;
  roundId: string;
  giverGamePlayerId: string;
  recipients: Array<{ playerId: string; points: number }>;
}) {
  const supabase = getSupabaseBrowserClient();
  if (params.recipients.length === 0) return;
  await supabase.from("penalties").insert(
    params.recipients.map((r) => ({
      game_id: params.gameId,
      round_id: params.roundId,
      game_player_id: r.playerId,
      points: r.points,
      reason: "exact_hit_distribution" as const,
      awarded_by_game_player_id: params.giverGamePlayerId
    }))
  );
}

export async function completeRound(roundId: string, gameId: string) {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("rounds").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", roundId);
  // Recompute total penalty_points per player from penalties
  const { data: penalties } = await supabase
    .from("penalties")
    .select("game_player_id, points")
    .eq("game_id", gameId);
  if (penalties) {
    const totals = new Map<string, number>();
    for (const p of penalties) {
      totals.set(p.game_player_id, (totals.get(p.game_player_id) ?? 0) + p.points);
    }
    await Promise.all(
      Array.from(totals.entries()).map(([playerId, total]) =>
        supabase.from("game_players").update({ penalty_points: total }).eq("id", playerId)
      )
    );
  }
}

export async function endGame(gameId: string) {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("games").update({ status: "ended", active_round_id: null }).eq("id", gameId);
}
