"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Mail, X } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { listMyInvitations, respondToInvitation } from "@/lib/db/invitations";
import { ensureProfile } from "@/lib/db/profile";
import { play } from "@/lib/fx/sound";

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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listMyInvitations(user.id);
      setInvites((list as unknown as Invite[]) ?? []);
    } catch {
      setError("Einladungen konnten nicht geladen werden.");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/invitations");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  if (loading || !user) return <main className="h-dvh" aria-busy="true" />;

  const respond = async (inviteId: string, accept: boolean, gameId: string) => {
    setBusy(inviteId);
    setError(null);
    try {
      const profile = await ensureProfile(user.id, {
        display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Spieler"
      });
      await respondToInvitation({
        invitationId: inviteId,
        accept,
        userId: user.id,
        displayName: profile.display_name
      });
      play(accept ? "bell" : "click");
      if (accept) {
        router.push(`/games/${gameId}`);
      } else {
        await refresh();
      }
    } catch {
      setError("Das hat nicht geklappt. Bitte versuch es noch einmal.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 md:overflow-hidden px-3 py-3 sm:px-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-malt dark:text-nightText">
          <Mail className="size-6 text-orangeBeer" />
          Einladungen
          <span className="ml-2 rounded-full bg-orange px-2 py-0.5 text-xs font-medium text-white">{invites.length}</span>
        </h1>

        {error && (
          <div role="alert" className="rounded-xl border border-wine/30 bg-dangerSoft px-3 py-2 text-sm font-bold text-wine dark:border-[#ff8a7a]/25 dark:bg-[#4a221c] dark:text-[#ffb4a8]">
            {error}
          </div>
        )}

        {invites.length === 0 ? (
          <div className="flex min-h-48 flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-malt/15 bg-foam/40 p-6 text-center dark:border-nightBorder dark:bg-nightBg/40">
            <div>
              <p className="font-bold text-malt/65 dark:text-nightMuted">Keine offenen Einladungen.</p>
              <Link
                href="/games/new"
                className="brass-pill mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium active:scale-95"
              >
                Eigenes Spiel erstellen
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 content-start gap-2 md:overflow-y-auto">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="coaster flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/games/${invite.game_id}`}
                    className="block truncate text-base font-black text-malt underline-offset-4 hover:underline dark:text-nightText"
                  >
                    {invite.games?.name ?? "Spiel"}
                  </Link>
                  <div className="text-xs font-medium text-malt/60 dark:text-nightMuted">
                    Eingeladen am {new Date(invite.created_at).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => respond(invite.id, false, invite.game_id)}
                    disabled={busy !== null}
                    aria-label={`Einladung zu ${invite.games?.name ?? "Spiel"} ablehnen`}
                    title="Ablehnen"
                    className="grid size-11 place-items-center rounded-full bg-dangerSoft text-wine active:scale-95 disabled:opacity-50 dark:bg-[#4a221c] dark:text-[#ffb4a8]"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    onClick={() => respond(invite.id, true, invite.game_id)}
                    disabled={busy !== null}
                    aria-label={`Einladung zu ${invite.games?.name ?? "Spiel"} annehmen`}
                    title="Annehmen"
                    className="grid size-11 place-items-center rounded-full bg-hop text-white shadow active:scale-95 disabled:opacity-50"
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
