import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16211f",
        mint: "#3fb984",
        coral: "#ff6b5f",
        gold: "#f8b84e"
      },
      boxShadow: {
        glow: "0 18px 60px rgba(63, 185, 132, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
