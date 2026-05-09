"use client";

import { useEffect, useRef } from "react";

type BurstVariant = "confetti" | "foam" | "sparkle";

type BurstProps = {
  /** Wenn sich dieser Wert ändert, startet ein neuer Burst. */
  trigger: number | string | null;
  variant?: BurstVariant;
  /** Anzahl der Partikel. */
  count?: number;
  /** Originpunkt (0..1). 0.5/0.4 ≈ Mittelpunkt leicht oberhalb. */
  origin?: { x: number; y: number };
  className?: string;
};

const PALETTES: Record<BurstVariant, string[]> = {
  confetti: ["#f3b63f", "#e87932", "#2f8f68", "#c8932b", "#fff2c2", "#7a1e2e"],
  foam: ["#ffffff", "#fff8e8", "#f6ecd2", "#ffe8a0", "#fff2c2"],
  sparkle: ["#fff2c2", "#f5d27a", "#e6b34a", "#ffffff"]
};

/**
 * Leichtgewichtiger Canvas-Burst – läuft komplett ohne Lib.
 * Zündet bei jedem Trigger-Wechsel einen Schwall Partikel ab und endet von selbst.
 */
export default function Burst({
  trigger,
  variant = "confetti",
  count = 80,
  origin = { x: 0.5, y: 0.4 },
  className
}: BurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      rot: number;
      vr: number;
      color: string;
      shape: "rect" | "circle";
    }>
  >([]);

  useEffect(() => {
    if (trigger === null || trigger === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = PALETTES[variant];
    const ox = canvas.width * origin.x;
    const oy = canvas.height * origin.y;

    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const power = (variant === "foam" ? 2 : 5) + Math.random() * (variant === "foam" ? 4 : 9);
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * power * dpr,
        vy: Math.sin(angle) * power * dpr - (variant === "foam" ? 3 : 6) * dpr,
        life: 0,
        maxLife: 60 + Math.random() * 50,
        size: (variant === "sparkle" ? 3 : 5) + Math.random() * (variant === "foam" ? 7 : 5),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
        shape: variant === "foam" ? "circle" : Math.random() > 0.4 ? "rect" : "circle"
      };
    });

    startedAtRef.current = performance.now();

    const tick = () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx2 = c.getContext("2d");
      if (!ctx2) return;
      ctx2.clearRect(0, 0, c.width, c.height);

      const gravity = variant === "foam" ? 0.05 * dpr : 0.18 * dpr;
      const drag = 0.985;
      let alive = 0;

      for (const p of particlesRef.current) {
        p.life += 1;
        if (p.life > p.maxLife) continue;
        alive += 1;
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const t = 1 - p.life / p.maxLife;
        ctx2.save();
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.rot);
        ctx2.globalAlpha = Math.max(0, t);
        ctx2.fillStyle = p.color;
        if (p.shape === "rect") {
          const w = p.size * dpr;
          const h = p.size * 1.6 * dpr;
          ctx2.fillRect(-w / 2, -h / 2, w, h);
        } else {
          ctx2.beginPath();
          ctx2.arc(0, 0, p.size * dpr * 0.5, 0, Math.PI * 2);
          ctx2.fill();
        }
        ctx2.restore();
      }

      if (alive > 0) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        ctx2.clearRect(0, 0, c.width, c.height);
        animRef.current = null;
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-30 size-full ${className ?? ""}`}
    />
  );
}
