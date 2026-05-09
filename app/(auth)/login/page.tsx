"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState<"none" | "password" | "magic" | "google" | "apple">("none");
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  const loginWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading("password");
    setError(null);
    play("tap");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading("none");
    if (error) {
      setError(error.message);
      vibrate("fail");
      play("warn");
      return;
    }
    play("bell");
    vibrate("success");
    router.push(next);
    router.refresh();
  };

  const sendMagicLink = async () => {
    if (!email) {
      setError("Bitte E-Mail eingeben.");
      return;
    }
    setLoading("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    setLoading("none");
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
    play("bell");
  };

  const oauth = async (provider: "google" | "apple") => {
    setLoading(provider);
    setError(null);
    play("click");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
    });
    if (error) {
      setLoading("none");
      setError(error.message);
    }
  };

  return (
    <div className="w-full">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-malt/65 hover:text-malt dark:text-nightMuted"
      >
        <ArrowLeft className="size-4" />
        Zurück
      </Link>
      <div className="coaster p-6 phase-enter">
        <h1 className="text-3xl font-semibold text-malt dark:text-nightText">Willkommen zurück</h1>
        <p className="mt-1 text-sm font-bold text-malt/65 dark:text-nightMuted">
          Online-Spiele, persönliche Statistiken und Einladungen.
        </p>

        {magicSent ? (
          <div className="mt-6 rounded-2xl border-2 border-emerald bg-emerald/10 p-4 text-malt dark:text-nightText">
            <div className="text-base font-black">Magic-Link unterwegs!</div>
            <p className="mt-1 text-sm font-bold opacity-80">
              Wir haben dir einen Login-Link an <strong>{email}</strong> geschickt. Klick einfach drauf.
            </p>
          </div>
        ) : (
          <form onSubmit={loginWithPassword} className="mt-5 grid gap-3">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="E-Mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passwort"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <button
              type="submit"
              disabled={loading !== "none" || !email || !password}
              className="brass-pill mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-medium disabled:opacity-50"
            >
              {loading === "password" ? "Anmelden..." : "Anmelden"}
              <ArrowRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={sendMagicLink}
              disabled={loading !== "none" || !email}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-malt/15 bg-white/70 px-4 font-black text-malt active:scale-95 disabled:opacity-50 dark:border-brassLight/15 dark:bg-nightSurface2/70 dark:text-nightText"
            >
              <Mail className="size-4" />
              {loading === "magic" ? "Sende Link..." : "Magic-Link an E-Mail"}
            </button>
          </form>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-malt/15 dark:bg-nightBorder" />
          <span className="text-xs font-black uppercase tracking-wider text-malt/55 dark:text-nightMuted">
            oder
          </span>
          <div className="h-px flex-1 bg-malt/15 dark:bg-nightBorder" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => oauth("google")}
            disabled={loading !== "none"}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-malt/15 bg-white font-black text-malt active:scale-95 disabled:opacity-50 dark:border-brassLight/15 dark:bg-nightSurface2 dark:text-nightText"
          >
            Google
          </button>
          <button
            onClick={() => oauth("apple")}
            disabled={loading !== "none"}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-malt/15 bg-white font-black text-malt active:scale-95 disabled:opacity-50 dark:border-brassLight/15 dark:bg-nightSurface2 dark:text-nightText"
          >
            Apple
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border-2 border-wine/40 bg-dangerSoft px-4 py-3 text-sm font-bold text-wine">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm font-bold text-malt/65 dark:text-nightMuted">
          <Link href="/reset-password" className="underline decoration-amberBeer/60 underline-offset-4">
            Passwort vergessen?
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="underline decoration-amberBeer/60 underline-offset-4"
          >
            Account erstellen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
