import type { ReactNode } from "react";
import Link from "next/link";
import { Beer } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* Top brass line */}
      <div className="h-[3px] w-full bg-[var(--bar-rim)] opacity-90" />
      {/* Soft spotlight overhead */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(246,183,60,0.28),transparent_75%)]"
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md items-center px-4 py-8">
        <div className="w-full">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-malt dark:text-brassLight"
          >
            <span className="grid size-10 place-items-center rounded-full bg-orange text-white">
              <Beer className="size-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.55rem] font-black uppercase tracking-[0.25em] text-malt/60 dark:text-brassLight/70">
                Premium Trinkspiel
              </span>
              <span className="text-xl font-semibold text-malt dark:text-nightText">Bierwiegen</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
