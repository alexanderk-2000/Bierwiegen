"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Mail, X } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { listMyInvitations, respondToInvitation } from "@/lib/db/invitations";
import { ensureProfile } from "@/lib/db/profile";

type Invite = {
  id: string;
  game_id: string;
  status: string;
  created_at: string;
  games: { name: string; host_user_id: string } | null;
};

export default function InvitationsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const list = await listMyInvitations(user.id);
    setInvites((list as unknown as Invite[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/invitations");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;

  const respond = async (inviteId: string, accept: boolean, gameId: string) => {
    setBusy(inviteId);
    const profile = await ensureProfile(user.id, {
      display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Spieler"
    });
    await respondToInvitation({
      invitationId: inviteId,
      accept,
      userId: user.id,
      displayName: profile.display_name
    });
    setBusy(null);
    if (accept) {
      router.push(`/games/${gameId}`);
    } else {
      refresh();
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-5">
        <h1 className="flex items-center gap-2 text-2xl font-black text-malt dark:text-nightText">
          <Mail className="size-6 text-orangeBeer" />
          Einladungen
          <span className="ml-2 rounded-full bg-amberBeer px-2 py-0.5 text-xs font-black text-malt">{invites.length}</span>
        </h1>

        {invites.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-malt/20 bg-white/60 p-6 text-center dark:border-nightBorder dark:bg-nightSurface/60">
            <div>
              <p className="font-bold text-malt/65 dark:text-nightMuted">Keine offenen Einladungen.</p>
              <Link
                href="/games/new"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow active:scale-95"
              >
                Eigenes Spiel erstellen
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-2 overflow-y-auto">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/games/${invite.game_id}`}
                    className="block truncate text-base font-black text-malt underline-offset-4 hover:underline dark:text-nightText"
                  >
                    {invite.games?.name ?? "Spiel"}
                  </Link>
                  <div className="text-[0.65rem] font-bold text-malt/55 dark:text-nightMuted">
                    {new Date(invite.created_at).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => respond(invite.id, false, invite.game_id)}
                    disabled={busy === invite.id}
                    className="grid size-10 place-items-center rounded-full bg-dangerSoft text-red-700 active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    onClick={() => respond(invite.id, true, invite.game_id)}
                    disabled={busy === invite.id}
                    className="grid size-10 place-items-center rounded-full bg-hop text-white shadow active:scale-95"
                  >
                    <Check className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
