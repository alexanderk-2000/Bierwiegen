"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type PlayerInsert = Database["public"]["Tables"]["game_players"]["Insert"];

export async function addGuestPlayer(params: {
  gameId: string;
  displayName: string;
  beerBrand?: string;
  bottleSize?: number;
  startWeight?: number;
}) {
  const supabase = getSupabaseBrowserClient();
  const insert: PlayerInsert = {
    game_id: params.gameId,
    display_name: params.displayName,
    is_guest: true,
    role: "player",
    beer_brand: params.beerBrand ?? null,
    bottle_size_liters: params.bottleSize ?? null,
    start_weight: params.startWeight ?? null,
    current_weight: params.startWeight ?? null
  };
  const { data, error } = await supabase.from("game_players").insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(
  playerId: string,
  patch: Partial<Database["public"]["Tables"]["game_players"]["Update"]>
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("game_players").update(patch).eq("id", playerId);
  if (error) throw error;
}

export async function removePlayer(playerId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("game_players").delete().eq("id", playerId);
  if (error) throw error;
}

export async function searchProfiles(query: string) {
  if (!query.trim()) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .ilike("display_name", `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
