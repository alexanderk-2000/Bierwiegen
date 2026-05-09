"use client";

import clsx from "clsx";

type BeerMugProps = {
  /** Füllstand 0..1 (Bier-Pegel relativ zum Krug). */
  level: number;
  /** Schaumkrone an? */
  foam?: boolean;
  /** Optisches Highlight (z. B. wenn dieser Spieler aktuell dran ist). */
  highlight?: "none" | "caller" | "win" | "loss";
  size?: number; // px
  className?: string;
  /** Bei `true` werden Bubbles im Krug animiert. */
  bubbles?: boolean;
  /** Optionaler Schriftzug auf dem Krug. */
  label?: string;
};

/**
 * Stilisierter SVG-Bierkrug mit gefüllten Pilsner-Look und Schaumkrone.
 * Eingesetzt als Avatar/Status-Indikator pro Spieler.
 */
export default function BeerMug({
  level,
  foam = true,
  highlight = "none",
  size = 56,
  className,
  bubbles = false,
  label
}: BeerMugProps) {
  const safeLevel = Math.max(0, Math.min(1, level));
  // Sichtbare Bier-Höhe in Krug-Innenraum (ohne Schaumkrone)
  const fillHeight = 60 * safeLevel;
  const fillY = 78 - fillHeight;
  const id = label ? label.replace(/\s+/g, "-") : "mug";

  return (
    <div
      className={clsx(
        "relative inline-flex items-center justify-center",
        highlight === "caller" && "drop-shadow-[0_0_18px_rgba(242,96,64,0.55)]",
        highlight === "win" && "drop-shadow-[0_0_22px_rgba(63,155,99,0.55)]",
        highlight === "loss" && "drop-shadow-[0_0_18px_rgba(220,38,38,0.45)] animate-shake",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={label ? `Bierkrug ${label}` : "Bierkrug"}
    >
      <svg
        viewBox="0 0 80 90"
        width={size}
        height={size}
        className="mug-glow"
      >
        <defs>
          <linearGradient id={`pilsner-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c958" />
            <stop offset="60%" stopColor="#e8a92b" />
            <stop offset="100%" stopColor="#c8801b" />
          </linearGradient>
          <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
          </linearGradient>
          <linearGradient id={`foam-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fff8e8" />
            <stop offset="100%" stopColor="#f0e0b8" />
          </linearGradient>
          <clipPath id={`mugClip-${id}`}>
            <rect x="10" y="18" width="50" height="62" rx="6" />
          </clipPath>
        </defs>
        {/* Henkel */}
        <path
          d="M 60 30 q 14 0 14 14 t -14 14"
          fill="none"
          stroke="rgba(67,43,29,0.35)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Glas-Außenhülle */}
        <rect
          x="8"
          y="16"
          width="54"
          height="66"
          rx="7"
          fill="rgba(255,250,241,0.35)"
          stroke="rgba(67,43,29,0.4)"
          strokeWidth="1.5"
        />
        {/* Inneres Bier */}
        <g clipPath={`url(#mugClip-${id})`}>
          <rect
            x="10"
            y={fillY}
            width="50"
            height={fillHeight}
            fill={`url(#pilsner-${id})`}
          />
          {/* Bubbles innerhalb des Bieres */}
          {bubbles && safeLevel > 0.15 && (
            <>
              <circle cx="20" cy={fillY + fillHeight - 8} r="1.5" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from={fillY + fillHeight - 5} to={fillY + 6} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="32" cy={fillY + fillHeight - 14} r="1.2" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from={fillY + fillHeight - 5} to={fillY + 6} dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="46" cy={fillY + fillHeight - 4} r="1" fill="rgba(255,255,255,0.85)">
                <animate attributeName="cy" from={fillY + fillHeight - 5} to={fillY + 6} dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0" to="1" dur="3.6s" repeatCount="indefinite" />
              </circle>
            </>
          )}
          {/* Glas-Highlight */}
          <rect x="10" y="18" width="50" height="62" fill={`url(#glass-${id})`} opacity="0.55" />
        </g>
        {/* Schaumkrone */}
        {foam && safeLevel > 0.05 && (
          <g>
            <ellipse cx="35" cy={fillY} rx="26" ry="6" fill={`url(#foam-${id})`} />
            <circle cx="20" cy={fillY - 3} r="4" fill="#ffffff" opacity="0.95" />
            <circle cx="30" cy={fillY - 5} r="5" fill="#ffffff" opacity="0.95" />
            <circle cx="42" cy={fillY - 4} r="4.5" fill="#ffffff" opacity="0.95" />
            <circle cx="52" cy={fillY - 2.5} r="3.5" fill="#ffffff" opacity="0.95" />
          </g>
        )}
        {/* Boden-Schatten */}
        <ellipse cx="35" cy="83" rx="22" ry="2.5" fill="rgba(67,43,29,0.18)" />
      </svg>
    </div>
  );
}
