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
        // MetMap Pulse Prism brand palette
        brand: {
          midnight: "#0E1020",
          mint: "#3EF2C8",
          violet: "#8B5CF6",
          coral: "#FF5A70",
          white: "#F3F5FA",
          surface: "#1A1D2E",
          surfaceElevated: "#252840",
        },
        // Chord type colors
        chord: {
          major: "#FFC857",
          minor: "#4CC9F0",
          dominant: "#FF4DA6",
          dim: "#C3B8FF",
        },
        // Legacy hardware colors (mapped to new palette for compatibility)
        hw: {
          orange: "#FF5A70",      // coral
          peach: "#FF8A9A",       // light coral
          red: "#FF5A70",         // coral
          charcoal: "#0E1020",    // midnight
          surface: "#1A1D2E",     // surface
          brass: "#3EF2C8",       // mint (accent)
          ivory: "#F3F5FA",       // white
        },
        // Section colors for practice maps
        section: {
          front: "#3EF2C8",     // mint
          mid: "#FFC857",       // chord major yellow
          back: "#FF5A70",      // coral
          bridge: "#8B5CF6",    // violet
          outro: "#4CC9F0",     // chord minor cyan
        },
      },
      backgroundImage: {
        'gradient-prism': 'linear-gradient(90deg, #3EF2C8 0%, #8B5CF6 50%, #FF5A70 100%)',
        'gradient-prism-vertical': 'linear-gradient(180deg, #3EF2C8 0%, #8B5CF6 50%, #FF5A70 100%)',
        'gradient-mint-violet': 'linear-gradient(90deg, #3EF2C8 0%, #8B5CF6 100%)',
        'gradient-violet-coral': 'linear-gradient(90deg, #8B5CF6 0%, #FF5A70 100%)',
        'gradient-surface': 'linear-gradient(180deg, #1A1D2E 0%, #0E1020 100%)',
      },
      boxShadow: {
        'glow-mint': '0 0 12px rgba(62, 242, 200, 0.35)',
        'glow-violet': '0 0 14px rgba(139, 92, 246, 0.35)',
        'glow-coral': '0 0 14px rgba(255, 90, 112, 0.35)',
        'glow-prism': '0 0 20px rgba(139, 92, 246, 0.25), 0 0 40px rgba(62, 242, 200, 0.15)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.5)',
        // Legacy shadows (kept for compatibility)
        'knob': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'knob-pressed': '0 2px 3px -1px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.2)',
        'pad': '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'pad-active': 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'card': '20px',
        'button': '14px',
        'input': '12px',
        'knob': '50%',
      },
      fontFamily: {
        sans: ['Inter', 'Satoshi', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
