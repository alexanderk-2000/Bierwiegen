"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { AuthCard, AuthField, AuthNotice, SubmitButton, authLinkClass } from "@/components/auth/ui";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    play("tap");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/update-password")}`
      });
      if (authError) {
        setError(authErrorMessage(authError));
        vibrate("fail");
        return;
      }
      setSentTo(email.trim());
      play("bell");
    } catch (cause) {
      setError(authErrorMessage(cause as Error));
      vibrate("fail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthCard
        title="Passwort zurücksetzen"
        subtitle="Wir schicken dir einen Link, über den du ein neues Passwort vergibst."
      >
        {sentTo ? (
          <div className="mt-5">
            <AuthNotice tone="success" title="Link verschickt">
              Falls es einen Account zu <strong className="break-all">{sentTo}</strong> gibt, liegt der Link gleich in
              deinem Postfach. Öffne ihn in diesem Browser.
            </AuthNotice>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <AuthField
              label="E-Mail"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="du@beispiel.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error && <AuthNotice tone="error">{error}</AuthNotice>}
            <SubmitButton loading={loading} icon={<Mail className="size-5" />}>
              {loading ? "Sende…" : "Reset-Link senden"}
            </SubmitButton>
          </form>
        )}
      </AuthCard>
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className={`${authLinkClass} inline-flex items-center gap-1.5`}>
          <ArrowLeft className="size-4" />
          Zurück zum Login
        </Link>
      </p>
    </>
  );
}
