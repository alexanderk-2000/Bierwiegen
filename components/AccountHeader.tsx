"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Beer,
  History,
  Home,
  LogIn,
  LogOut,
  Mail,
  User as UserIcon,
  Volume2,
  VolumeX
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth/use-user";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSoundEnabled, setSoundEnabled, play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";
import { applyTheme, readTheme } from "@/lib/theme";
import ThemeToggle, { iconButtonClass } from "@/components/ThemeToggle";

export default function AccountHeader() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [pendingInvites, setPendingInvites] = useState(0);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    // Theme wird bereits vom Inline-Script im <head> gesetzt — hier nur absichern.
    applyTheme(readTheme());
    setSound(getSoundEnabled());
  }, []);

  useEffect(() => {
    if (!user) {
      setPendingInvites(0);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .then(
        ({ count }) => setPendingInvites(count ?? 0),
        () => setPendingInvites(0)
      );
  }, [user]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) play("bell");
    vibrate("tap");
  };

  const logout = async () => {
    play("click");
    try {
      // scope "local": nur dieses Gerät abmelden, funktioniert auch offline.
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
    } finally {
      window.location.href = "/";
    }
  };

  const NavLink = ({
    href,
    icon,
    label,
    badge
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => play("tap")}
        aria-label={badge ? `${label} (${badge} offen)` : label}
        aria-current={active ? "page" : undefined}
        title={label}
        className={clsx(
          "relative inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold active:scale-95",
          active
            ? "bg-orange text-white"
            : "bg-white/55 text-malt hover:bg-white/85 dark:bg-nightSurface2/70 dark:text-nightText dark:hover:bg-nightSurface2"
        )}
      >
        <span className="size-4 [&>svg]:size-4">{icon}</span>
        <span className="hidden sm:inline">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-wine text-[0.65rem] font-black text-white shadow ring-2 ring-foam dark:ring-nightBg sm:static sm:ring-0">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 isolate">
      {/* Brass-Linie ganz oben */}
      <div className="h-[3px] w-full bg-[var(--bar-rim)]" />
      <div
        className={clsx(
          "border-b border-black/5 bg-foam/85 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl",
          "dark:border-nightBorder dark:bg-nightBg/85"
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <Link
            href="/"
            onClick={() => play("tap")}
            aria-label="Bierwiegen – Startseite"
            className="group inline-flex shrink-0 items-center gap-2.5 text-lg font-black text-malt dark:text-white"
          >
            <span className="grid size-10 place-items-center rounded-full bg-orange text-white shadow-md">
              <Beer className="size-5" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[0.55rem] font-black uppercase tracking-[0.25em] text-malt/55 dark:text-nightMuted">
                Premium Trinkspiel
              </span>
              <span className="text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
            </span>
            {!user && <span className="text-xl font-semibold text-malt dark:text-nightText sm:hidden">Bierwiegen</span>}
          </Link>

          <nav aria-label="Hauptnavigation" className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            <NavLink href="/" icon={<Home />} label="Start" />
            {user && <NavLink href="/games" icon={<History />} label="Spiele" />}
            {user && <NavLink href="/invitations" icon={<Mail />} label="Einladungen" badge={pendingInvites} />}
            {user && <NavLink href="/profile" icon={<UserIcon />} label="Profil" />}

            <button
              onClick={toggleSound}
              title={sound ? "Sound aus" : "Sound an"}
              aria-label={sound ? "Sound stummschalten" : "Sound aktivieren"}
              className={iconButtonClass}
            >
              {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4 opacity-60" />}
            </button>
            <ThemeToggle />

            {!loading && !user && (
              <Link
                href="/login"
                onClick={() => play("tap")}
                className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium active:scale-95"
              >
                <LogIn className="size-4" />
                Login
              </Link>
            )}
            {user && (
              <button
                onClick={logout}
                title="Logout"
                aria-label="Abmelden"
                className={iconButtonClass}
              >
                <LogOut className="size-4" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
