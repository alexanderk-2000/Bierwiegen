"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
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
  };

  return (
    <div className="w-full">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-2 text-sm font-black text-malt/65 hover:text-malt dark:text-nightMuted"
      >
        <ArrowLeft className="size-4" />
        Zurück zum Login
      </Link>
      <div className="rounded-2xl border border-white/80 bg-white/80 p-6 shadow-board backdrop-blur-xl ring-1 ring-white/60 dark:border-nightBorder dark:bg-nightSurface/90 dark:ring-0">
        <h1 className="text-3xl font-black text-malt dark:text-nightText">Passwort zurücksetzen</h1>
        <p className="mt-1 text-sm font-bold text-malt/65 dark:text-nightMuted">
          Wir schicken dir einen Reset-Link per E-Mail.
        </p>
        {sent ? (
          <div className="mt-6 rounded-2xl border-2 border-hop bg-hop/10 p-4 text-malt dark:text-nightText">
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
              className="h-14 rounded-2xl border-2 border-[#efdcb9] bg-foam px-4 text-lg font-black outline-none focus:border-amberBeer dark:border-nightBorder dark:bg-nightBg dark:text-nightText"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-amberBeer px-6 text-lg font-black text-malt shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? "Sende..." : "Reset-Link senden"}
              <ArrowRight className="size-5" />
            </button>
          </form>
        )}
        {error && (
          <div className="mt-4 rounded-2xl bg-dangerSoft px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
}
