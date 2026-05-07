"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, ArrowRight, Beer } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
      return;
    }
    if (data.user && !data.session) {
      setConfirmSent(true);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="w-full">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-black text-malt/65 hover:text-malt dark:text-nightMuted"
      >
        <ArrowLeft className="size-4" />
        Zurück
      </Link>
      <div className="rounded-2xl border border-white/80 bg-white/80 p-6 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amberBeer/15 px-3 py-1 text-xs font-black uppercase text-malt dark:text-amberBeer">
          <Beer className="size-4" />
          Bierwiegen
        </div>
        <h1 className="text-3xl font-black text-malt dark:text-nightText">Account erstellen</h1>
        <p className="mt-1 text-sm font-bold text-malt/65 dark:text-nightMuted">
          Behalte deine Bierwiegen-Statistiken über alle Spiele.
        </p>

        {confirmSent ? (
          <div className="mt-6 rounded-2xl border-2 border-hop bg-hop/10 p-4 text-malt dark:text-nightText">
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
              className="h-14 rounded-2xl border-2 border-[#ead9b9] bg-foam px-4 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
            />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="E-Mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 rounded-2xl border-2 border-[#ead9b9] bg-foam px-4 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Passwort (min. 6 Zeichen)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-14 rounded-2xl border-2 border-[#ead9b9] bg-foam px-4 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-amberBeer px-6 text-lg font-black text-malt shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? "Erstelle..." : "Account erstellen"}
              <ArrowRight className="size-5" />
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-dangerSoft px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}

        <div className="mt-6 text-center text-sm font-bold text-malt/65 dark:text-nightMuted">
          Schon einen Account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline">
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
