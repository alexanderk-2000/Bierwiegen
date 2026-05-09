import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // --- Bestehende Tokens (Kompatibilität bewahren) ---
        cream: "#fbf0dc",
        foam: "#fffaf1",
        amberBeer: "#f3b63f",
        goldBeer: "#ffe08a",
        orangeBeer: "#e87932",
        malt: "#432b1d",
        ink: "#24201b",
        hop: "#2f8f68",
        dangerSoft: "#fae1dc",
        // Dark mode tokens
        nightBg: "#1a1410",
        nightSurface: "#2a221b",
        nightSurface2: "#3a2f25",
        nightBorder: "#4a3d31",
        nightText: "#f5e8d0",
        nightMuted: "#b8a890",

        // --- Premium Bier-Bar Tokens ---
        // Holz
        oak: "#8a5a3b",
        oakDark: "#5d3a22",
        mahogany: "#3a200f",
        ebony: "#1d100a",
        // Messing & Gold
        brass: "#c8932b",
        brassDark: "#8d671c",
        brassLight: "#f5d27a",
        gold: "#e6b34a",
        goldHigh: "#fff2c2",
        // Bier
        pilsner: "#f5c958",
        lager: "#e8a92b",
        ipa: "#e08a2a",
        stout: "#2a160c",
        porter: "#3d2412",
        head: "#fff8e8", // Schaumkrone
        headSoft: "#f6ecd2",
        // Akzente
        emerald: "#2e8a64",
        wine: "#7a1e2e",
        // UI helper
        embossed: "rgba(0,0,0,0.18)",
        glassEdge: "rgba(255,255,255,0.55)"
      },
      boxShadow: {
        board: "0 22px 60px rgba(67, 43, 29, 0.13), 0 2px 10px rgba(67, 43, 29, 0.08)",
        glow: "0 0 0 4px rgba(246, 183, 60, 0.22)",
        glowDanger: "0 0 0 4px rgba(220, 38, 38, 0.35)",
        glowHit: "0 0 0 4px rgba(63, 155, 99, 0.35)",
        // Premium
        coaster:
          "0 1px 0 rgba(255,255,255,0.55) inset, 0 -1px 0 rgba(0,0,0,0.08) inset, 0 12px 28px rgba(67,43,29,0.18), 0 2px 6px rgba(67,43,29,0.10)",
        coasterDark:
            "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.55) inset, 0 18px 38px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)",
        brass:
          "0 1px 0 rgba(255,255,255,0.65) inset, 0 -2px 6px rgba(141,103,28,0.55) inset, 0 12px 28px rgba(141,103,28,0.35)",
        brassPress:
          "0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 4px rgba(141,103,28,0.55) inset, 0 4px 10px rgba(141,103,28,0.35)",
        embossed:
          "0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.18) inset",
        deepWell:
          "inset 0 2px 6px rgba(29,16,10,0.45), inset 0 -1px 0 rgba(255,255,255,0.06)",
        tap: "0 18px 40px rgba(141,103,28,0.42), 0 0 0 1px rgba(245,210,122,0.45) inset",
        nightLamp:
          "0 0 0 1px rgba(245,210,122,0.18) inset, 0 24px 60px rgba(0,0,0,0.55), 0 0 50px rgba(246,183,60,0.18)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans, ui-sans-serif)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display, Georgia)", "Georgia", "serif"]
      },
      backgroundImage: {
        "wood-grain":
          "repeating-linear-gradient(95deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.04) 5px, rgba(0,0,0,0) 8px)",
        "wood-deep":
          "linear-gradient(135deg, #2a160c 0%, #3a200f 35%, #5d3a22 70%, #3a200f 100%)",
        "wood-light":
          "linear-gradient(135deg, #c79460 0%, #b97f4a 40%, #8a5a3b 100%)",
        "brass-bar":
          "linear-gradient(180deg, #f5d27a 0%, #e6b34a 35%, #c8932b 65%, #8d671c 100%)",
        "brass-pill":
          "linear-gradient(180deg, #fff2c2 0%, #f5d27a 30%, #e6b34a 60%, #c8932b 100%)",
        "foam-cap":
          "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.95), rgba(255,248,232,0.85) 60%, rgba(246,236,210,0.7) 100%)",
        "pilsner-fill":
          "linear-gradient(180deg, #f5c958 0%, #e8a92b 70%, #c8801b 100%)",
        "stout-fill":
          "linear-gradient(180deg, #5b3019 0%, #3d2412 60%, #1d100a 100%)",
        "spotlight":
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(246,183,60,0.55), transparent 75%)",
        "candle":
          "radial-gradient(circle at 50% 100%, rgba(246,183,60,0.4), transparent 70%)"
      },
      animation: {
        wobble: "wobble 0.7s ease-in-out",
        "drum-roll": "drumRoll 1.4s ease-in-out",
        "reveal-pop": "revealPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-up": "fadeUp 0.4s ease-out",
        press: "press 0.15s ease-out",
        confetti: "confettiFall 1.6s ease-out forwards",
        shake: "shake 0.5s ease-in-out",
        "pulse-grow": "pulseGrow 1.5s ease-in-out infinite",
        // Bier-Bar
        "bubble-rise": "bubbleRise 4s ease-in infinite",
        "foam-jiggle": "foamJiggle 1.6s ease-in-out infinite",
        "gold-shimmer": "goldShimmer 4.5s linear infinite",
        "tap-pull": "tapPull 0.7s cubic-bezier(0.5,1.5,0.5,1)",
        "candle-flicker": "candleFlicker 2.4s ease-in-out infinite",
        "neon-flicker": "neonFlicker 3s steps(8) infinite",
        "score-tick": "scoreTick 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        "spotlight-sweep": "spotlightSweep 8s linear infinite",
        "fade-in": "fadeIn 0.35s ease-out"
      },
      keyframes: {
        wobble: {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "15%": { transform: "translateX(-8px) rotate(-3deg)" },
          "30%": { transform: "translateX(7px) rotate(3deg)" },
          "45%": { transform: "translateX(-5px) rotate(-2deg)" },
          "60%": { transform: "translateX(4px) rotate(1deg)" },
          "75%": { transform: "translateX(-2px) rotate(-1deg)" }
        },
        drumRoll: {
          "0%": { transform: "scale(1) rotate(-3deg)", opacity: "1" },
          "20%": { transform: "scale(1.05) rotate(3deg)" },
          "40%": { transform: "scale(0.98) rotate(-2deg)" },
          "60%": { transform: "scale(1.02) rotate(2deg)" },
          "80%": { transform: "scale(1) rotate(-1deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" }
        },
        revealPop: {
          "0%": { transform: "scale(0) rotate(-180deg)", opacity: "0" },
          "60%": { transform: "scale(1.15) rotate(10deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" }
        },
        fadeUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        press: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.93)" },
          "100%": { transform: "scale(1)" }
        },
        confettiFall: {
          "0%": { transform: "translateY(-20vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" }
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" }
        },
        pulseGrow: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(246, 183, 60, 0.4)" },
          "50%": { transform: "scale(1.03)", boxShadow: "0 0 0 14px rgba(246, 183, 60, 0)" }
        },
        // Bier-Bar
        bubbleRise: {
          "0%": { transform: "translate3d(0,0,0) scale(0.6)", opacity: "0" },
          "10%": { opacity: "0.85" },
          "100%": { transform: "translate3d(0,-160%,0) scale(1.1)", opacity: "0" }
        },
        foamJiggle: {
          "0%, 100%": { transform: "translateY(0) skewX(0deg)" },
          "50%": { transform: "translateY(-1.5px) skewX(0.6deg)" }
        },
        goldShimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        tapPull: {
          "0%": { transform: "rotate(0deg)" },
          "55%": { transform: "rotate(28deg)" },
          "100%": { transform: "rotate(0deg)" }
        },
        candleFlicker: {
          "0%, 100%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "30%": { opacity: "0.92", transform: "translateY(-1px) scale(1.04)" },
          "60%": { opacity: "0.96", transform: "translateY(0.5px) scale(0.97)" }
        },
        neonFlicker: {
          "0%, 92%, 100%": { opacity: "1" },
          "94%": { opacity: "0.5" },
          "96%": { opacity: "0.92" },
          "98%": { opacity: "0.4" }
        },
        scoreTick: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "60%": { transform: "translateY(-3px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        spotlightSweep: {
          "0%, 100%": { transform: "translateX(-25%) rotate(-12deg)" },
          "50%": { transform: "translateX(25%) rotate(12deg)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
