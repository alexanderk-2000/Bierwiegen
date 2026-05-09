"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    play("tap");
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      vibrate("fail");
      play("warn");
      return;
    }
    if (data.user && !data.session) {
      setConfirmSent(true);
      play("bell");
      return;
    }
    play("win");
    vibrate("success");
    router.push(next);
    router.refresh();
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
      <div className="coaster coaster-rim p-6 phase-enter">
        <h1 className="gold-text bg-clip-text text-3xl font-black">Account erstellen</h1>
        <p className="mt-1 text-sm font-bold text-malt/65 dark:text-nightMuted">
          Behalte deine Bierwiegen-Statistiken über alle Spiele.
        </p>

        {confirmSent ? (
          <div className="mt-6 rounded-2xl border-2 border-emerald bg-emerald/10 p-4 text-malt dark:text-nightText">
            <div className="text-base font-black">Bestätige deine E-Mail</div>
            <p className="mt-1 text-sm font-bold opacity-80">
              Wir haben dir einen Link an <strong>{email}</strong> geschickt. Nach dem Klick bist du eingeloggt.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <input
              required
              placeholder="Anzeigename"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="E-Mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Passwort (min. 6 Zeichen)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="brass-pill cta-pulse mt-1 inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-black disabled:opacity-50"
            >
              {loading ? "Erstelle..." : "Account erstellen"}
              <ArrowRight className="size-5" />
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border-2 border-wine/40 bg-dangerSoft px-4 py-3 text-sm font-bold text-wine">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm font-bold text-malt/65 dark:text-nightMuted">
          Schon einen Account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="underline decoration-amberBeer/60 underline-offset-4"
          >
            Einloggen
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}
