"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function updateMyProfile(
  userId: string,
  patch: { display_name?: string; avatar_url?: string | null }
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
  if (error) throw error;
}

export async function ensureProfile(userId: string, defaults: { display_name: string }) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as ProfileRow;
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, display_name: defaults.display_name })
    .select()
    .single();
  if (error) throw error;
  return created as ProfileRow;
}
