import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ritual: {
          // Backgrounds
          black: "#000000",
          elevated: "#111827",
          surface: "#1F2937",
          // Accents (semantic — see design skill)
          green: "#19D184", // trust / TEE verified / success / active
          lime: "#BFFF00", // data emphasis / highlighted metrics
          pink: "#FF1DCE", // AI / agent / generated content
          gold: "#FACC15", // pending / warnings / fees
          red: "#EF4444", // errors / failed
        },
      },
      fontFamily: {
        // Archivo substitutes the licensed Izoard display face (open-source).
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "fade-in": "fade-in 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
