"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { play } from "@/lib/fx/sound";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    play("tap");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
    play("bell");
  };

  return (
    <div className="w-full">
      <Link
        href="/login"
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-malt/65 hover:text-malt dark:text-nightMuted"
      >
        <ArrowLeft className="size-4" />
        Zurück zum Login
      </Link>
      <div className="coaster coaster-rim p-6 phase-enter">
        <h1 className="gold-text bg-clip-text text-3xl font-black">Passwort zurücksetzen</h1>
        <p className="mt-1 text-sm font-bold text-malt/65 dark:text-nightMuted">
          Wir schicken dir einen Reset-Link per E-Mail.
        </p>
        {sent ? (
          <div className="mt-6 rounded-2xl border-2 border-emerald bg-emerald/10 p-4 text-malt dark:text-nightText">
            <div className="text-base font-black">Link versendet!</div>
            <p className="mt-1 text-sm font-bold opacity-80">
              Schau in dein Postfach: <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <input
              type="email"
              required
              placeholder="E-Mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="tap-input h-14 px-4 text-lg font-black"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="brass-pill cta-pulse inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-lg font-black disabled:opacity-50"
            >
              {loading ? "Sende..." : "Reset-Link senden"}
              <ArrowRight className="size-5" />
            </button>
          </form>
        )}
        {error && (
          <div className="mt-4 rounded-2xl border-2 border-wine/40 bg-dangerSoft px-4 py-3 text-sm font-bold text-wine">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
