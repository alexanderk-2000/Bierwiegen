"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  hint?: ReactNode;
  /** Element rechts neben dem Label, z. B. "Passwort vergessen?" */
  labelAction?: ReactNode;
  /** Element im Feld rechts, z. B. der Passwort-Umschalter */
  trailing?: ReactNode;
};

export function AuthField({ label, hint, labelAction, trailing, id, ...input }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-semibold text-malt dark:text-nightText">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative min-w-0">
        <input
          id={fieldId}
          aria-describedby={hintId}
          className={clsx(
            "tap-input h-13 w-full min-w-0 px-4 text-base font-semibold placeholder:font-medium placeholder:text-malt/35 dark:placeholder:text-nightMuted/55",
            trailing && "pr-13"
          )}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="text-xs font-medium text-malt/60 dark:text-nightMuted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          aria-pressed={visible}
          className="grid size-10 place-items-center rounded-xl text-malt/55 hover:bg-black/5 hover:text-malt active:scale-95 dark:text-nightMuted dark:hover:bg-white/5 dark:hover:text-nightText"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}

export function AuthNotice({
  tone,
  title,
  children
}: {
  tone: "error" | "success";
  title?: string;
  children: ReactNode;
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "flex gap-3 rounded-2xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-wine/25 bg-dangerSoft text-wine dark:border-[#ff8a7a]/25 dark:bg-[#3a1814] dark:text-[#ffb4a8]"
          : "border-emerald/30 bg-emerald/10 text-malt dark:border-emerald/40 dark:bg-emerald/15 dark:text-nightText"
      )}
    >
      <Icon className={clsx("mt-0.5 size-5 shrink-0", tone === "success" && "text-emerald")} />
      <div className="min-w-0">
        {title && <div className="font-bold">{title}</div>}
        <div className="font-medium">{children}</div>
      </div>
    </div>
  );
}

export function SubmitButton({
  loading,
  disabled,
  children,
  icon
}: {
  loading: boolean;
  disabled?: boolean;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      aria-busy={loading}
      className="brass-pill inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-base font-semibold shadow-[0_6px_18px_rgba(240,78,27,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : null}
      {children}
      {!loading && icon}
    </button>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="coaster phase-enter p-5 sm:p-7">
      <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-malt dark:text-nightText">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-sm font-medium text-malt/65 dark:text-nightMuted">{subtitle}</p>}
      {children}
    </div>
  );
}

export const authLinkClass =
  "font-semibold text-orangePress underline decoration-orange/40 underline-offset-4 hover:decoration-orange dark:text-[#ff8a5c]";
