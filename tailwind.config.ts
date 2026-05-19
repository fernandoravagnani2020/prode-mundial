import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        card: "#111111",
        "card-2": "#1a1a1a",
        border: "#242424",
        "border-2": "#2e2e2e",
        green: {
          DEFAULT: "#22c55e",
          dark: "#16a34a",
          muted: "#14532d",
        },
        orange: {
          DEFAULT: "#f97316",
          dark: "#ea580c",
          muted: "#7c2d12",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.8)",
        glow: "0 0 20px rgba(34,197,94,0.15)",
        "glow-orange": "0 0 20px rgba(249,115,22,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
