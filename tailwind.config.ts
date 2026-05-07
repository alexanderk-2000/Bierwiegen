import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
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
        nightMuted: "#b8a890"
      },
      boxShadow: {
        board: "0 22px 60px rgba(67, 43, 29, 0.13), 0 2px 10px rgba(67, 43, 29, 0.08)",
        glow: "0 0 0 4px rgba(246, 183, 60, 0.22)",
        glowDanger: "0 0 0 4px rgba(220, 38, 38, 0.35)",
        glowHit: "0 0 0 4px rgba(63, 155, 99, 0.35)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans, ui-sans-serif)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      animation: {
        "wobble": "wobble 0.7s ease-in-out",
        "drum-roll": "drumRoll 1.4s ease-in-out",
        "reveal-pop": "revealPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-up": "fadeUp 0.4s ease-out",
        "press": "press 0.15s ease-out",
        "confetti": "confettiFall 1.6s ease-out forwards",
        "shake": "shake 0.5s ease-in-out",
        "pulse-grow": "pulseGrow 1.5s ease-in-out infinite"
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
        }
      }
    }
  },
  plugins: []
};

export default config;
