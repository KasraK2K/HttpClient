import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0b1020",
        foreground: "#e5edf9",
        card: "#11182b",
        accent: "#61b0ff",
        border: "#24304d",
        muted: "#95a4c6",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(97,176,255,0.2), 0 20px 50px rgba(7,12,24,0.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
