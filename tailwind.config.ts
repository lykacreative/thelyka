import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fffdf7",
        ink: "#201f1b",
        moss: "#6e8f52",
        sage: "#dce7c9",
        blush: "#f3d9d3",
        figmaBlack: "#030303",
        figmaInk: "#2C1910",
        figmaBrown: "#6E3D23",
        figmaCream: "#F5EEDB"
      },
      boxShadow: {
        sketch: "0 18px 45px rgba(49, 61, 38, 0.12)"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
