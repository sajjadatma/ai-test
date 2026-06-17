import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090f",
        panel: "#111622",
        line: "#263044",
        gold: "#d6ad4b",
        "gold-soft": "#f4d485"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(214, 173, 75, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
