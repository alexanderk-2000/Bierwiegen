"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import clsx from "clsx";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/use-user";
import { safeNextPath } from "@/lib/auth/safe-next";
import { authErrorMessage } from "@/lib/auth/errors";
import type { OAuthProvider } from "@/lib/auth/providers";
import { AuthCard, AuthField, AuthNotice, PasswordField, SubmitButton, authLinkClass } from "@/components/auth/ui";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

type Mode = "password" | "magic";
type Busy = "none" | "password" | "magic" | OAuthProvider;

const MODE_KEY = "bw-login-mode";
const RESEND_SECONDS = 45;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const callbackError = searchParams.get("error");
  const justReset = searchParams.get("reset") === "1";
  const { user, loading: userLoading } = useUser();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState<Busy>("none");
  const [error, setError] = useState<string | null>(callbackError ? authErrorMessage(callbackError) : null);

  // Bereits eingeloggt? Direkt weiter.
  useEffect(() => {
    if (!userLoading && user) router.replace(next);
  }, [userLoading, user, next, router]);

  // Zuletzt genutzte Login-Art merken
  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "magic") setMode("magic");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    play("tap");
    try {
      window.localStorage.setItem(MODE_KEY, nextMode);
    } catch {
      // ignore
    }
  };

  const fail = (cause: Parameters<typeof authErrorMessage>[0]) => {
    setError(authErrorMessage(cause));
    vibrate("fail");
    play("warn");
  };

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const loginWithPassword = async () => {
    setBusy("password");
    setError(null);
    play("tap");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (authError) {
        fail(authError);
        return;
      }
      play("bell");
      vibrate("success");
      router.replace(next);
      router.refresh();
    } catch (cause) {
      fail(cause as Error);
    } finally {
      setBusy("none");
    }
  };

  const sendMagicLink = async () => {
    const address = email.trim();
    if (!address) {
      setError("Bitte gib zuerst deine E-Mail-Adresse ein.");
      return;
    }
    setBusy("magic");
    setError(null);
    play("tap");
    try {
      const { error: authError } = await getSupabaseBrowserClient().auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: callbackUrl() }
      });
      if (authError) {
        fail(authError);
        return;
      }
      setMagicSentTo(address);
      setCooldown(RESEND_SECONDS);
      play("bell");
      vibrate("success");
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
      // Erfolgsfall: Browser verlässt die Seite Richtung Anbieter — Ladezustand bleibt stehen.
    } catch (cause) {
      setBusy("none");
      fail(cause as Error);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy !== "none") return;
    if (mode === "password") void loginWithPassword();
    else void sendMagicLink();
  };

  const isBusy = busy !== "none";

  if (magicSentTo) {
    return (
      <AuthCard title="Schau in dein Postfach" subtitle="Dein Login-Link ist unterwegs.">
        <div className="mt-5 grid gap-4">
          <AuthNotice tone="success" title="Magic-Link verschickt">
            Wir haben einen Link an <strong className="break-all">{magicSentTo}</strong> geschickt. Öffne ihn in diesem
            Browser – dann bist du direkt drin.
          </AuthNotice>
          {error && <AuthNotice tone="error">{error}</AuthNotice>}
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={isBusy || cooldown > 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-malt/15 bg-white px-4 text-sm font-semibold text-malt hover:border-malt/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:border-nightBorder dark:bg-nightSurface2 dark:text-nightText"
          >
            <Mail className="size-4" />
            {busy === "magic" ? "Sende…" : cooldown > 0 ? `Erneut senden in ${cooldown}s` : "Link erneut senden"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMagicSentTo(null);
              setError(null);
            }}
            className={clsx(authLinkClass, "justify-self-center text-sm")}
          >
            Andere E-Mail oder Passwort verwenden
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <>
      <AuthCard title="Willkommen zurück" subtitle="Online-Spiele, persönliche Statistiken und Einladungen.">
        <div
          role="tablist"
          aria-label="Login-Art"
          className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-black/[0.05] p-1 dark:bg-white/[0.06]"
        >
          {(
            [
              { id: "password", label: "Passwort", icon: <KeyRound className="size-4" /> },
              { id: "magic", label: "Magic-Link", icon: <Sparkles className="size-4" /> }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => switchMode(tab.id)}
              className={clsx(
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
                mode === tab.id
                  ? "bg-white text-malt shadow-sm dark:bg-nightSurface2 dark:text-nightText"
                  : "text-malt/60 hover:text-malt dark:text-nightMuted dark:hover:text-nightText"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-4">
          {justReset && !error && (
            <AuthNotice tone="success">Passwort geändert. Du kannst dich jetzt damit einloggen.</AuthNotice>
          )}
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
          {mode === "password" ? (
            <PasswordField
              label="Passwort"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Dein Passwort"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              labelAction={
                <Link href="/reset-password" className={clsx(authLinkClass, "text-xs")}>
                  Vergessen?
                </Link>
              }
            />
          ) : (
            <p className="-mt-1 text-sm font-medium text-malt/65 dark:text-nightMuted">
              Kein Passwort nötig: Wir schicken dir einen Link, mit dem du sofort eingeloggt bist.
            </p>
          )}

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          <SubmitButton
            loading={busy === "password" || busy === "magic"}
            disabled={isBusy}
            icon={mode === "password" ? <ArrowRight className="size-5" /> : <Mail className="size-5" />}
          >
            {mode === "password"
              ? busy === "password"
                ? "Melde an…"
                : "Anmelden"
              : busy === "magic"
              ? "Sende Link…"
              : "Login-Link senden"}
          </SubmitButton>
        </form>

        <OAuthButtons
          onSelect={oauth}
          busyProvider={busy === "google" || busy === "apple" ? busy : null}
          disabled={isBusy}
        />
      </AuthCard>

      <div className="mt-5 grid gap-2 text-center text-sm font-medium text-malt/70 dark:text-nightMuted">
        <p>
          Noch kein Account?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className={authLinkClass}>
            Jetzt erstellen
          </Link>
        </p>
        <p>
          <Link href="/" className="font-semibold text-malt/70 hover:text-malt dark:text-nightMuted dark:hover:text-nightText">
            Ohne Account lokal spielen →
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
