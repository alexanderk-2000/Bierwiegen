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
  Moon,
  Sun,
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

const THEME_KEY = "bw-theme";

function applyThemeClass(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export default function AccountHeader() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [pendingInvites, setPendingInvites] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sound, setSound] = useState(true);

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyThemeClass(t);
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
      .then(({ count }) => setPendingInvites(count ?? 0));
  }, [user]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeClass(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    play("click");
    vibrate("tap");
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) play("bell");
    vibrate("tap");
  };

  const logout = async () => {
    play("click");
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
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
        className={clsx(
          "relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black transition active:scale-95",
          active
            ? "brass-pill text-malt"
            : "bg-white/55 text-malt hover:bg-white/85 dark:bg-nightSurface2/70 dark:text-nightText dark:hover:bg-nightSurface2"
        )}
      >
        <span className="size-4">{icon}</span>
        <span className="hidden sm:inline">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-wine text-[0.65rem] font-black text-white shadow">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 isolate">
      {/* Brass-Linie ganz oben */}
      <div className="h-[3px] w-full bg-[var(--bar-rim)] opacity-90" />
      <div
        className={clsx(
          "border-b border-white/40 bg-foam/85 shadow-sm backdrop-blur-xl",
          "dark:border-nightBorder dark:bg-stout/85"
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <Link
            href="/"
            onClick={() => play("tap")}
            className="group inline-flex items-center gap-2.5 text-lg font-black text-malt dark:text-goldHigh"
          >
            <span className="brass-pill grid size-10 place-items-center rounded-full text-malt shadow-md">
              <Beer className="size-5" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[0.55rem] font-black uppercase tracking-[0.25em] text-malt/55 dark:text-brassLight/70">
                Premium Trinkspiel
              </span>
              <span className="gold-text bg-clip-text text-xl font-black">Bierwiegen</span>
            </span>
            <span className="gold-text bg-clip-text text-xl font-black sm:hidden">Bierwiegen</span>
          </Link>

          <nav className="flex items-center gap-1.5">
            <NavLink href="/" icon={<Home />} label="Start" />
            {user && <NavLink href="/games" icon={<History />} label="Spiele" />}
            {user && <NavLink href="/invitations" icon={<Mail />} label="Einladungen" badge={pendingInvites} />}
            {user && <NavLink href="/profile" icon={<UserIcon />} label="Profil" />}

            <button
              onClick={toggleSound}
              title={sound ? "Sound aus" : "Sound an"}
              aria-label={sound ? "Sound stummschalten" : "Sound aktivieren"}
              className="grid size-10 place-items-center rounded-full border border-malt/15 bg-white/60 text-malt shadow-sm transition hover:bg-white active:scale-95 dark:border-brassLight/15 dark:bg-nightSurface2/60 dark:text-brassLight"
            >
              {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4 opacity-60" />}
            </button>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Hellmodus" : "Nachtmodus"}
              aria-label="Theme wechseln"
              className="grid size-10 place-items-center rounded-full border border-malt/15 bg-white/60 text-malt shadow-sm transition hover:bg-white active:scale-95 dark:border-brassLight/15 dark:bg-nightSurface2/60 dark:text-brassLight"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {!loading && !user && (
              <Link
                href="/login"
                onClick={() => play("tap")}
                className="brass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black active:scale-95"
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
                className="grid size-10 place-items-center rounded-full border border-malt/15 bg-white/60 text-malt shadow-sm transition hover:bg-white active:scale-95 dark:border-brassLight/15 dark:bg-nightSurface2/60 dark:text-nightText"
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
