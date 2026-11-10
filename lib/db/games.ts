"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_players"]["Row"];

export async function createOnlineGame(params: {
  name: string;
  hostUserId: string;
  hostDisplayName: string;
  penaltyConfig?: Database["public"]["Tables"]["games"]["Insert"]["penalty_config"];
}): Promise<GameRow> {
  const supabase = getSupabaseBrowserClient();
  const { data: game, error } = await supabase
    .from("games")
    .insert({
      name: params.name,
      host_user_id: params.hostUserId,
      status: "setup",
      is_online: true,
      ...(params.penaltyConfig ? { penalty_config: params.penaltyConfig } : {})
    })
    .select()
    .single();
  if (error || !game) throw error ?? new Error("Spiel konnte nicht erstellt werden.");

  const { error: playerError } = await supabase.from("game_players").insert({
    game_id: game.id,
    user_id: params.hostUserId,
    display_name: params.hostDisplayName,
    role: "host"
  });
  if (playerError) throw playerError;
  return game;
}

export async function listMyGames(userId: string): Promise<GameRow[]> {
  const supabase = getSupabaseBrowserClient();
  // Spiele, bei denen ich Host bin ODER als Spieler beigetreten bin
  const { data: memberships, error: membershipError } = await supabase
    .from("game_players")
    .select("game_id")
    .eq("user_id", userId);
  if (membershipError) throw membershipError;
  const joinedIds = Array.from(new Set((memberships ?? []).map((row) => row.game_id)));
  const filter =
    joinedIds.length > 0
      ? `host_user_id.eq.${userId},id.in.(${joinedIds.join(",")})`
      : `host_user_id.eq.${userId}`;
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .or(filter)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getGame(gameId: string) {
  const supabase = getSupabaseBrowserClient();
  const [{ data: game }, { data: players }, { data: rounds }, { data: invitations }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("game_players").select("*").eq("game_id", gameId).order("joined_at", { ascending: true }),
    supabase.from("rounds").select("*").eq("game_id", gameId).order("round_number", { ascending: true }),
    supabase.from("invitations").select("*").eq("game_id", gameId)
  ]);
  return {
    game: game as GameRow | null,
    players: (players ?? []) as PlayerRow[],
    rounds: rounds ?? [],
    invitations: invitations ?? []
  };
}

export async function archiveGame(gameId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("games").update({ status: "archived" }).eq("id", gameId);
  if (error) throw error;
}

export async function deleteGame(gameId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw error;
}
