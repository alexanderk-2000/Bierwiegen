"use client";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="coaster relative z-10 w-full max-w-sm px-6 py-5">
        <h2 className="text-lg font-semibold text-malt dark:text-nightText">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-malt/65 dark:text-nightMuted">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-malt/20 px-4 py-2 text-sm font-medium text-malt/75 transition hover:-translate-y-0.5 active:scale-95 dark:border-nightBorder dark:text-nightMuted"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? "rounded-full border border-wine/40 bg-dangerSoft px-4 py-2 text-sm font-medium text-wine transition active:scale-95"
                : "rounded-full bg-orange px-4 py-2 text-sm font-medium text-white shadow transition active:scale-95"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
