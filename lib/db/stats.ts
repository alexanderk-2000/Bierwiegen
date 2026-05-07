"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type OverallStats = Database["public"]["Views"]["user_overall_stats"]["Row"];
export type BeerStats = Database["public"]["Views"]["user_beer_stats"]["Row"];
export type BottleSizeStats = Database["public"]["Views"]["user_bottle_size_stats"]["Row"];
export type GameHistoryRow = Database["public"]["Views"]["user_game_history"]["Row"];

export async function getOverallStats(userId: string): Promise<OverallStats | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_overall_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBeerStats(userId: string): Promise<BeerStats[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_beer_stats")
    .select("*")
    .eq("user_id", userId)
    .order("avg_deviation", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBottleSizeStats(userId: string): Promise<BottleSizeStats[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_bottle_size_stats")
    .select("*")
    .eq("user_id", userId)
    .order("avg_deviation", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGameHistory(userId: string, limit = 20): Promise<GameHistoryRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_game_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
