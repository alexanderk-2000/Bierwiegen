"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Beer, History, Home, LogIn, LogOut, Mail, User as UserIcon } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/auth/use-user";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AccountHeader() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [pendingInvites, setPendingInvites] = useState(0);

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

  const logout = async () => {
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
  }) => (
    <Link
      href={href}
      className={clsx(
        "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition hover:-translate-y-0.5 active:scale-95",
        pathname === href
          ? "bg-amberBeer text-malt"
          : "bg-white/70 text-malt hover:bg-white dark:bg-nightSurface2 dark:text-nightText"
      )}
    >
      <span className="size-4">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-red-600 text-[0.65rem] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-foam/80 shadow-sm backdrop-blur-xl dark:border-nightBorder dark:bg-nightSurface/90">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-black text-malt dark:text-amberBeer">
          <span className="grid size-9 place-items-center rounded-xl bg-amberBeer text-malt shadow-sm">
            <Beer className="size-5" />
          </span>
          Bierwiegen
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink href="/" icon={<Home />} label="Start" />
          {user && <NavLink href="/games" icon={<History />} label="Spiele" />}
          {user && <NavLink href="/invitations" icon={<Mail />} label="Einladungen" badge={pendingInvites} />}
          {user && <NavLink href="/profile" icon={<UserIcon />} label="Profil" />}
          {!loading && !user && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-amberBeer px-4 py-2 text-sm font-black text-malt shadow active:scale-95"
            >
              <LogIn className="size-4" />
              Login
            </Link>
          )}
          {user && (
            <button
              onClick={logout}
              title="Logout"
              className="grid size-10 place-items-center rounded-xl border border-[#ead9b9] bg-white text-malt active:scale-95 dark:border-nightBorder dark:bg-nightSurface2 dark:text-nightText"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
