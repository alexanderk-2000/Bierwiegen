"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

const generateToken = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export async function inviteUser(params: {
  gameId: string;
  invitedByUserId: string;
  invitedUserId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      game_id: params.gameId,
      invited_by_user_id: params.invitedByUserId,
      invited_user_id: params.invitedUserId,
      status: "pending"
    })
    .select()
    .single();
  if (error) throw error;
  return data as InvitationRow;
}

export async function inviteByEmail(params: {
  gameId: string;
  invitedByUserId: string;
  email: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      game_id: params.gameId,
      invited_by_user_id: params.invitedByUserId,
      invited_email: params.email.trim().toLowerCase(),
      invite_token: generateToken(),
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data as InvitationRow;
}

export async function createInviteLink(params: { gameId: string; invitedByUserId: string }) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      game_id: params.gameId,
      invited_by_user_id: params.invitedByUserId,
      invite_token: generateToken(),
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data as InvitationRow;
}

export async function listMyInvitations(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*, games(name, host_user_id)")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function respondToInvitation(params: {
  invitationId: string;
  accept: boolean;
  userId: string;
  displayName: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const status = params.accept ? "accepted" : "declined";
  const { data: invitation, error } = await supabase
    .from("invitations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", params.invitationId)
    .select()
    .single();
  if (error || !invitation) throw error ?? new Error("Einladung nicht gefunden");
  if (params.accept) {
    await supabase.from("game_players").upsert(
      {
        game_id: invitation.game_id,
        user_id: params.userId,
        display_name: params.displayName,
        role: "player"
      },
      { onConflict: "game_id,user_id" }
    );
  }
  return invitation;
}

export async function lookupByToken(token: string): Promise<InvitationRow | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();
  if (error) return null;
  return data as InvitationRow | null;
}
