"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/use-user";
import { safeNextPath } from "@/lib/auth/safe-next";
import { authErrorMessage } from "@/lib/auth/errors";
import type { OAuthProvider } from "@/lib/auth/providers";
import { AuthCard, AuthField, AuthNotice, PasswordField, SubmitButton, authLinkClass } from "@/components/auth/ui";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

const MIN_PASSWORD_LENGTH = 8;

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { user, loading: userLoading } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"none" | "form" | OAuthProvider>("none");
  const [error, setError] = useState<string | null>(null);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && user) router.replace(next);
  }, [userLoading, user, next, router]);

  const fail = (cause: Parameters<typeof authErrorMessage>[0]) => {
    setError(authErrorMessage(cause));
    vibrate("fail");
    play("warn");
  };

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy !== "none") return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
      return;
    }
    setBusy("form");
    setError(null);
    play("tap");
    try {
      const { data, error: authError } = await getSupabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: callbackUrl()
        }
      });
      if (authError) {
        fail(authError);
        return;
      }
      // Supabase verschleiert bestehende Accounts: User ohne Identitäten = E-Mail schon vergeben.
      if (data.user && !data.session && data.user.identities?.length === 0) {
        fail("user_already_exists");
        return;
      }
      if (data.user && !data.session) {
        setConfirmSentTo(email.trim());
        play("bell");
        return;
      }
      play("win");
      vibrate("success");
      router.replace(next);
      router.refresh();
    } catch (cause) {
      fail(cause as Error);
    } finally {
      setBusy("none");
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    setBusy(provider);
    setError(null);
    play("click");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() }
      });
      if (authError) {
        setBusy("none");
        fail(authError);
      }
    } catch (cause) {
      setBusy("none");
      fail(cause as Error);
    }
  };

  if (confirmSentTo) {
    return (
      <AuthCard title="Fast geschafft" subtitle="Nur noch kurz die E-Mail bestätigen.">
        <div className="mt-5 grid gap-4">
          <AuthNotice tone="success" title="Bestätigungs-Mail verschickt">
            Wir haben einen Link an <strong className="break-all">{confirmSentTo}</strong> geschickt. Nach dem Klick bist
            du eingeloggt. Nichts angekommen? Schau auch im Spam-Ordner nach.
          </AuthNotice>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className={`${authLinkClass} justify-self-center text-sm`}>
            Zum Login
          </Link>
        </div>
      </AuthCard>
    );
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <>
      <AuthCard title="Account erstellen" subtitle="Behalte deine Bierwiegen-Statistiken über alle Spiele.">
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <AuthField
            label="Anzeigename"
            name="nickname"
            autoComplete="nickname"
            required
            maxLength={30}
            placeholder="So sehen dich deine Mitspieler"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
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
          <PasswordField
            label="Passwort"
            name="new-password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={
              tooShort
                ? `Noch ${MIN_PASSWORD_LENGTH - password.length} Zeichen bis zum Minimum.`
                : `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen – je länger, desto besser.`
            }
          />

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          <SubmitButton loading={busy === "form"} disabled={busy !== "none"} icon={<ArrowRight className="size-5" />}>
            {busy === "form" ? "Erstelle Account…" : "Account erstellen"}
          </SubmitButton>
        </form>

        <OAuthButtons
          onSelect={oauth}
          busyProvider={busy === "google" || busy === "apple" ? busy : null}
          disabled={busy !== "none"}
        />
      </AuthCard>

      <p className="mt-5 text-center text-sm font-medium text-malt/70 dark:text-nightMuted">
        Schon einen Account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={authLinkClass}>
          Einloggen
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}
