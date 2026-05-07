"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Beer, Plus, Trash2 } from "lucide-react";
import AccountHeader from "@/components/AccountHeader";
import { useUser } from "@/lib/auth/use-user";
import { createOnlineGame } from "@/lib/db/games";
import { addGuestPlayer } from "@/lib/db/players";
import { ensureProfile } from "@/lib/db/profile";

type DraftPlayer = {
  tempId: string;
  displayName: string;
  beerBrand: string;
  bottleSize: string;
  startWeight: string;
};

const newDraft = (): DraftPlayer => ({
  tempId: Math.random().toString(36).slice(2),
  displayName: "",
  beerBrand: "Augustiner",
  bottleSize: "0.33",
  startWeight: ""
});

export default function NewGamePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [gameName, setGameName] = useState("");
  const [hostBeer, setHostBeer] = useState("Augustiner");
  const [hostBottle, setHostBottle] = useState("0.33");
  const [hostStartWeight, setHostStartWeight] = useState("");
  const [guests, setGuests] = useState<DraftPlayer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/games/new");
  }, [loading, user, router]);

  if (loading || !user) return <main className="h-dvh bg-[var(--bg-page)]" />;

  const submit = async () => {
    if (!gameName.trim()) {
      setError("Bitte einen Spielnamen vergeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const profile = await ensureProfile(user.id, {
        display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Host"
      });
      const game = await createOnlineGame({
        name: gameName.trim(),
        hostUserId: user.id,
        hostDisplayName: profile.display_name
      });

      const supabase = (await import("@/lib/supabase/client")).getSupabaseBrowserClient();
      await supabase
        .from("game_players")
        .update({
          beer_brand: hostBeer,
          bottle_size_liters: Number(hostBottle.replace(",", ".")) || null,
          start_weight: hostStartWeight ? Number(hostStartWeight.replace(",", ".")) : null,
          current_weight: hostStartWeight ? Number(hostStartWeight.replace(",", ".")) : null
        })
        .eq("game_id", game.id)
        .eq("user_id", user.id);

      for (const guest of guests) {
        if (!guest.displayName.trim()) continue;
        await addGuestPlayer({
          gameId: game.id,
          displayName: guest.displayName.trim(),
          beerBrand: guest.beerBrand,
          bottleSize: Number(guest.bottleSize.replace(",", ".")) || undefined,
          startWeight: guest.startWeight ? Number(guest.startWeight.replace(",", ".")) : undefined
        });
      }

      router.push(`/games/${game.id}`);
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Fehler beim Erstellen.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-page)]">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-2 overflow-hidden px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-malt dark:text-nightText">Neues Online-Spiel</h1>
          <Link href="/" className="text-xs font-bold text-malt/55 underline dark:text-nightMuted">
            Lokales Spiel?
          </Link>
        </div>

        <div className="grid flex-1 gap-3 overflow-hidden md:grid-cols-2">
          {/* Linke Spalte: Spielname + Host-Bier */}
          <div className="flex flex-col gap-2 overflow-hidden">
            <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
              <label className="text-xs font-black uppercase text-malt/55 dark:text-nightMuted">Spielname</label>
              <input
                value={gameName}
                onChange={(event) => setGameName(event.target.value)}
                placeholder="z. B. Donnerstag-Runde"
                className="mt-1 h-12 w-full rounded-xl border-2 border-[#ead9b9] bg-foam px-3 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
              />
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-malt/55 dark:text-nightMuted">
                <Beer className="size-4 text-orangeBeer" />
                Dein Bier
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={hostBeer}
                  onChange={(event) => setHostBeer(event.target.value)}
                  placeholder="Marke"
                  className="h-10 rounded-lg border-2 border-[#ead9b9] bg-foam px-2 font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                />
                <input
                  value={hostBottle}
                  onChange={(event) => setHostBottle(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.33"
                  className="h-10 rounded-lg border-2 border-[#ead9b9] bg-foam px-2 text-center font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                />
                <input
                  value={hostStartWeight}
                  onChange={(event) => setHostStartWeight(event.target.value)}
                  inputMode="decimal"
                  placeholder="Start g"
                  className="h-10 rounded-lg border-2 border-[#ead9b9] bg-foam px-2 text-center font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-dangerSoft px-3 py-2 text-sm font-bold text-red-700">{error}</div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="cta-pulse mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-amberBeer px-5 py-3 text-base font-black text-malt shadow-lg active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Erstelle..." : "Spiel erstellen"}
              <ArrowRight className="size-4" />
            </button>
          </div>

          {/* Rechte Spalte: Gäste */}
          <div className="flex h-full flex-col rounded-xl border border-white/80 bg-white/80 p-3 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:ring-0 dark:border-nightBorder dark:bg-nightSurface">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-malt/55 dark:text-nightMuted">Gastspieler</h3>
              <button
                onClick={() => setGuests((current) => [...current, newDraft()])}
                className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-black text-malt active:scale-95 dark:bg-nightSurface2 dark:text-nightText"
              >
                <Plus className="size-3" />
                Gast
              </button>
            </div>
            {guests.length === 0 ? (
              <p className="text-xs font-bold text-malt/55 dark:text-nightMuted">
                Account-Spieler kannst du in der Lobby einladen.
              </p>
            ) : (
              <div className="grid flex-1 gap-1.5 overflow-y-auto">
                {guests.map((guest, index) => (
                  <div
                    key={guest.tempId}
                    className="rounded-xl border border-[#ead9b9] bg-foam p-2 dark:border-nightBorder dark:bg-nightBg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[0.6rem] font-black uppercase text-malt/50 dark:text-nightMuted">
                        Gast #{index + 1}
                      </div>
                      <button
                        onClick={() => setGuests((current) => current.filter((g) => g.tempId !== guest.tempId))}
                        className="grid size-7 place-items-center rounded-full bg-dangerSoft text-red-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <input
                      value={guest.displayName}
                      onChange={(event) => updateGuest(setGuests, guest.tempId, { displayName: event.target.value })}
                      placeholder="Name"
                      className="mt-1.5 h-8 w-full rounded-md border border-[#ead9b9] bg-white px-2 text-sm font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightSurface dark:text-nightText"
                    />
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      <input
                        value={guest.beerBrand}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { beerBrand: event.target.value })}
                        placeholder="Marke"
                        className="h-8 rounded-md border border-[#ead9b9] bg-white px-1.5 text-xs font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightSurface dark:text-nightText"
                      />
                      <input
                        value={guest.bottleSize}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { bottleSize: event.target.value })}
                        inputMode="decimal"
                        placeholder="0.33"
                        className="h-8 rounded-md border border-[#ead9b9] bg-white px-1.5 text-center text-xs font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightSurface dark:text-nightText"
                      />
                      <input
                        value={guest.startWeight}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { startWeight: event.target.value })}
                        inputMode="decimal"
                        placeholder="g"
                        className="h-8 rounded-md border border-[#ead9b9] bg-white px-1.5 text-center text-xs font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightSurface dark:text-nightText"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function updateGuest(
  setter: React.Dispatch<React.SetStateAction<DraftPlayer[]>>,
  tempId: string,
  patch: Partial<DraftPlayer>
) {
  setter((current) => current.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)));
}
