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
        // MetMap brand colors - Orchid-inspired palette
        metmap: {
          50: "#fef9f3",
          100: "#fdf2e3",
          200: "#fbe4c4",
          300: "#f8d19b",
          400: "#f4b96f",
          500: "#d4a056", // warm brass/gold
          600: "#b8863d",
          700: "#96692e",
          800: "#735122",
          900: "#503918",
          950: "#2d200d",
        },
        // Hardware accent colors (Orchid-inspired)
        hw: {
          orange: "#f5a855", // warm orange knobs
          peach: "#f8c894",  // peach highlights
          red: "#e85d4c",    // recording/active
          charcoal: "#2a2a2f", // dark surface
          surface: "#3d3d42", // elevated surface
          brass: "#c9a962",   // brass accent
          ivory: "#f5f0e6",   // ivory keys
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
      boxShadow: {
        'knob': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'knob-pressed': '0 2px 3px -1px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.2)',
        'pad': '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'pad-active': 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'knob': '50%',
      },
    },
  },
  plugins: [],
};

export default config;
