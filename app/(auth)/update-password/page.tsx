"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/use-user";
import { authErrorMessage } from "@/lib/auth/errors";
import { AuthCard, AuthNotice, PasswordField, SubmitButton, authLinkClass } from "@/components/auth/ui";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
      return;
    }
    setLoading(true);
    setError(null);
    play("tap");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (authError) {
        setError(authErrorMessage(authError));
        vibrate("fail");
        play("warn");
        return;
      }
      setDone(true);
      play("bell");
      vibrate("success");
      window.setTimeout(() => router.replace("/profile"), 1200);
    } catch (cause) {
      setError(authErrorMessage(cause as Error));
      vibrate("fail");
    } finally {
      setLoading(false);
    }
  };

  if (!userLoading && !user) {
    return (
      <AuthCard title="Link abgelaufen" subtitle="Zum Ändern des Passworts musst du eingeloggt sein.">
        <div className="mt-5 grid gap-4">
          <AuthNotice tone="error">
            Der Reset-Link ist nicht mehr gültig oder wurde in einem anderen Browser geöffnet.
          </AuthNotice>
          <Link href="/reset-password" className={`${authLinkClass} justify-self-center text-sm`}>
            Neuen Link anfordern
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Neues Passwort"
      subtitle={user?.email ? `Für ${user.email}` : "Vergib ein neues Passwort für deinen Account."}
    >
      {done ? (
        <div className="mt-5">
          <AuthNotice tone="success" title="Passwort gespeichert">
            Du wirst gleich zu deinem Profil weitergeleitet.
          </AuthNotice>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-4">
          {/* Hilft Passwort-Managern, den Eintrag dem richtigen Account zuzuordnen */}
          <input type="email" name="email" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
          <PasswordField
            label="Neues Passwort"
            name="new-password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen – je länger, desto besser.`}
          />
          {error && <AuthNotice tone="error">{error}</AuthNotice>}
          <SubmitButton loading={loading} disabled={userLoading} icon={<Check className="size-5" />}>
            {loading ? "Speichere…" : "Passwort speichern"}
          </SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
