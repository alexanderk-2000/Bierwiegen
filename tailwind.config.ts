import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Basis
        cream: "#fbf0dc",
        foam: "#fffaf1",
        malt: "#432b1d",
        ink: "#24201b",
        hop: "#2f8f68",
        dangerSoft: "#fae1dc",
        // Dark mode
        nightBg: "#14100a",
        nightSurface: "#252015",
        nightSurface2: "#2e2318",
        nightBorder: "#3a2f25",
        nightText: "#f0ead8",
        nightMuted: "#a89880",
        // Orange Akzent
        orange: "#f04e1b",
        orangeHover: "#f26040",
        orangePress: "#c73a0f",
        // Legacy (kept for backward compat in app/page.tsx)
        amberBeer: "#f3b63f",
        orangeBeer: "#e87932",
        // Grün/Wein
        emerald: "#2e8a64",
        wine: "#7a1e2e",
        glassEdge: "rgba(255,255,255,0.55)"
      },
      boxShadow: {
        board: "0 22px 60px rgba(67, 43, 29, 0.13), 0 2px 10px rgba(67, 43, 29, 0.08)",
        surface: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
        surfaceDark: "0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)",
        glow: "0 0 0 4px rgba(240,78,27,0.22)",
        glowDanger: "0 0 0 4px rgba(220, 38, 38, 0.35)",
        glowHit: "0 0 0 4px rgba(63, 155, 99, 0.35)",
        orangeRing: "0 0 0 3px rgba(240,78,27,0.35)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans, ui-sans-serif)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display, Georgia)", "Georgia", "serif"]
      },
      backgroundImage: {
        "pilsner-fill": "linear-gradient(180deg, #f5c958 0%, #e8a92b 70%, #c8801b 100%)",
        "stout-fill":   "linear-gradient(180deg, #5b3019 0%, #3d2412 60%, #1d100a 100%)",
      },
      animation: {
        wobble:              "wobble 0.7s ease-in-out",
        "drum-roll":         "drumRoll 1.4s ease-in-out",
        "reveal-pop":        "revealPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-up":           "fadeUp 0.4s ease-out",
        "fade-in":           "fadeIn 0.35s ease-out",
        press:               "press 0.15s ease-out",
        confetti:            "confettiFall 1.6s ease-out forwards",
        shake:               "shake 0.5s ease-in-out",
        "pulse-grow":        "pulseGrow 1.5s ease-in-out infinite",
        "score-tick":        "scoreTick 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        "num-flip-out":      "numFlipOut 0.15s ease-in forwards",
        "num-flip-in":       "numFlipIn 0.2s ease-out forwards",
        "orange-pulse-once": "orangePulseOnce 0.6s ease-out forwards",
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
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(240, 78, 27, 0.4)" },
          "50%": { transform: "scale(1.03)", boxShadow: "0 0 0 14px rgba(240, 78, 27, 0)" }
        },
        scoreTick: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "60%": { transform: "translateY(-3px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        numFlipOut: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-8px)", opacity: "0" }
        },
        numFlipIn: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        orangePulseOnce: {
          "0%": { boxShadow: "0 0 0 0 rgba(240,78,27,0.5)" },
          "100%": { boxShadow: "0 0 0 14px rgba(240,78,27,0)" }
        },
      }
    }
  },
  plugins: []
};

export default config;
