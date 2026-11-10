import type { ReactNode } from "react";
import Link from "next/link";
import { Beer } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      {/* Akzentlinie ganz oben */}
      <div className="h-[3px] w-full bg-[var(--bar-rim)]" />
      {/* Weiches Licht von oben */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(240,78,27,0.14),transparent_75%)]"
      />
      <div className="relative mx-auto flex min-h-[calc(100dvh-3px)] w-full max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-full pr-2" aria-label="Bierwiegen – zur Startseite">
            <span className="grid size-10 place-items-center rounded-full bg-orange text-white shadow-md">
              <Beer className="size-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.55rem] font-black uppercase tracking-[0.25em] text-malt/60 dark:text-nightMuted">
                Premium Trinkspiel
              </span>
              <span className="mt-0.5 text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col justify-center py-6">{children}</div>
      </div>
    </main>
  );
}
