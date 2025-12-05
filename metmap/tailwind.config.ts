import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MetMap brand colors
        metmap: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Section colors for practice maps
        section: {
          front: "#22c55e",   // green for beginning
          mid: "#eab308",     // yellow for middle
          back: "#ef4444",    // red for end/climax
          bridge: "#8b5cf6",  // purple for transitions
          outro: "#06b6d4",   // cyan for endings
        },
      },
    },
  },
  plugins: [],
};

export default config;
