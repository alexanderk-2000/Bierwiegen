import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[var(--bg-page)]">
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">{children}</div>
    </main>
  );
}
