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
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

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

const SUGGESTED_BRANDS = [
  "Augustiner",
  "Tegernseer",
  "Paulaner",
  "Erdinger",
  "Franziskaner",
  "Hofbräu",
  "Spaten",
  "Andechs"
];

const BOTTLE_SIZES = ["0.33", "0.5", "0.25"];

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
      vibrate("fail");
      return;
    }
    setSubmitting(true);
    setError(null);
    play("tap");
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

      play("bell");
      vibrate("success");
      router.push(`/games/${game.id}`);
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Fehler beim Erstellen.";
      setError(message);
      vibrate("fail");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <AccountHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-5">
        <section className="coaster px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-malt/55 dark:text-nightMuted">
                Neue Runde an der Theke
              </div>
              <h1 className="text-2xl font-semibold text-malt dark:text-nightText sm:text-3xl">Neues Online-Spiel</h1>
              <p className="text-xs font-bold text-malt/65 dark:text-nightMuted">
                Setze die Theke. Spieler kannst du jederzeit in der Lobby nachladen.
              </p>
            </div>
            <Link
              href="/"
              onClick={() => play("tap")}
              className="text-xs font-bold text-malt/55 underline decoration-amberBeer/60 underline-offset-4 dark:text-nightMuted"
            >
              Lieber lokal spielen?
            </Link>
          </div>
        </section>

        <div className="grid flex-1 gap-3 overflow-hidden md:grid-cols-2">
          {/* Linke Spalte: Spielname + Host-Bier */}
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="coaster p-4">
              <label className="text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                Spielname
              </label>
              <input
                value={gameName}
                onChange={(event) => setGameName(event.target.value)}
                placeholder="z. B. Donnerstag-Runde"
                className="tap-input mt-1.5 h-12 w-full px-3 text-lg font-black"
              />
            </div>
            <div className="coaster p-4">
              <h3 className="mb-2 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                <Beer className="size-3.5 text-orangeBeer" />
                Dein Bier
              </h3>
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_BRANDS.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => {
                        setHostBeer(brand);
                        play("tap");
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                        hostBeer === brand
                          ? "bg-orange text-white"
                          : "bg-cream/70 text-malt hover:bg-cream dark:bg-nightSurface2/70 dark:text-nightText"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                <input
                  value={hostBeer}
                  onChange={(event) => setHostBeer(event.target.value)}
                  placeholder="Eigene Marke"
                  className="tap-input h-10 w-full px-3 text-sm font-black"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-[0.6rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                      Flasche
                    </div>
                    <div className="flex gap-1">
                      {BOTTLE_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setHostBottle(size);
                            play("tap");
                          }}
                          className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium transition active:scale-95 ${
                            hostBottle === size
                              ? "bg-orange text-white"
                              : "bg-cream/70 text-malt dark:bg-nightSurface2/70 dark:text-nightText"
                          }`}
                        >
                          {size.replace(".", ",")} l
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[0.6rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                      Startgewicht
                    </div>
                    <input
                      value={hostStartWeight}
                      onChange={(event) => setHostStartWeight(event.target.value)}
                      inputMode="decimal"
                      placeholder="z. B. 542"
                      className="tap-input h-10 w-full px-3 text-center text-sm font-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border-2 border-wine/40 bg-dangerSoft px-3 py-2 text-sm font-bold text-wine">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="brass-pill mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-medium active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Erstelle…" : "Spiel erstellen"}
              <ArrowRight className="size-4" />
            </button>
          </div>

          {/* Rechte Spalte: Gäste */}
          <div className="coaster flex h-full flex-col overflow-hidden p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[0.65rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                Gastspieler
              </h3>
              <button
                onClick={() => {
                  setGuests((current) => [...current, newDraft()]);
                  play("click");
                }}
                className="brass-pill inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium active:scale-95"
              >
                <Plus className="size-3" />
                Gast
              </button>
            </div>
            {guests.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-malt/15 bg-foam/40 p-3 text-center text-xs font-bold text-malt/55 dark:border-nightBorder dark:bg-nightBg/40">
                Account-Spieler kannst du in der Lobby einladen, Gäste hier hinzufügen.
              </div>
            ) : (
              <div className="scroll-vintage grid flex-1 gap-1.5 overflow-y-auto pr-1">
                {guests.map((guest, index) => (
                  <div
                    key={guest.tempId}
                    className="rounded-xl border border-malt/10 bg-foam/80 p-2.5 dark:border-nightBorder dark:bg-nightBg/70"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[0.6rem] font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
                        Gast #{index + 1}
                      </div>
                      <button
                        onClick={() => {
                          setGuests((current) => current.filter((g) => g.tempId !== guest.tempId));
                          play("click");
                        }}
                        className="grid size-7 place-items-center rounded-full bg-dangerSoft text-wine active:scale-95"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <input
                      value={guest.displayName}
                      onChange={(event) => updateGuest(setGuests, guest.tempId, { displayName: event.target.value })}
                      placeholder="Name"
                      className="tap-input mt-1.5 h-9 w-full px-2 text-sm font-black"
                    />
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      <input
                        value={guest.beerBrand}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { beerBrand: event.target.value })}
                        placeholder="Marke"
                        className="tap-input h-9 w-full px-2 text-xs font-black"
                      />
                      <input
                        value={guest.bottleSize}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { bottleSize: event.target.value })}
                        inputMode="decimal"
                        placeholder="0.33"
                        className="tap-input h-9 w-full px-2 text-center text-xs font-black"
                      />
                      <input
                        value={guest.startWeight}
                        onChange={(event) => updateGuest(setGuests, guest.tempId, { startWeight: event.target.value })}
                        inputMode="decimal"
                        placeholder="g"
                        className="tap-input h-9 w-full px-2 text-center text-xs font-black"
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
