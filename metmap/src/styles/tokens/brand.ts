/**
 * MetMap Brand Tokens
 * Unified design system for the Pulse Prism identity
 */

export const brand = {
  colors: {
    // Core palette
    midnight: "#0E1020",
    mint: "#3EF2C8",
    violet: "#8B5CF6",
    coral: "#FF5A70",
    white: "#F3F5FA",

    // Chord type colors
    chordMajor: "#FFC857",
    chordMinor: "#4CC9F0",
    chordDominant: "#FF4DA6",
    chordDim: "#C3B8FF",

    // Legacy support (mapped to new palette)
    charcoal: "#0E1020",
    surface: "#1A1D2E",
    surfaceElevated: "#252840",
  },

  gradients: {
    prism: "linear-gradient(90deg, #3EF2C8 0%, #8B5CF6 50%, #FF5A70 100%)",
    prismVertical: "linear-gradient(180deg, #3EF2C8 0%, #8B5CF6 50%, #FF5A70 100%)",
    mintToViolet: "linear-gradient(90deg, #3EF2C8 0%, #8B5CF6 100%)",
    violetToCoral: "linear-gradient(90deg, #8B5CF6 0%, #FF5A70 100%)",
    surface: "linear-gradient(180deg, #1A1D2E 0%, #0E1020 100%)",
  },

  shadows: {
    glowMint: "0 0 12px rgba(62, 242, 200, 0.35)",
    glowViolet: "0 0 14px rgba(139, 92, 246, 0.35)",
    glowCoral: "0 0 14px rgba(255, 90, 112, 0.35)",
    glowPrism: "0 0 20px rgba(139, 92, 246, 0.25), 0 0 40px rgba(62, 242, 200, 0.15)",
    card: "0 4px 20px rgba(0, 0, 0, 0.4)",
    cardHover: "0 8px 30px rgba(0, 0, 0, 0.5)",
    button: "0 2px 8px rgba(0, 0, 0, 0.3)",
    buttonHover: "0 4px 16px rgba(139, 92, 246, 0.4)",
  },

  radii: {
    card: "20px",
    button: "14px",
    input: "12px",
    pill: "9999px",
  },

  font: {
    family: "'Inter', 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif",
    weightRegular: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  transition: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "400ms ease",
  },
} as const;

// CSS custom properties generator
export function getBrandCSSVariables(): string {
  return `
    --brand-midnight: ${brand.colors.midnight};
    --brand-mint: ${brand.colors.mint};
    --brand-violet: ${brand.colors.violet};
    --brand-coral: ${brand.colors.coral};
    --brand-white: ${brand.colors.white};
    --brand-surface: ${brand.colors.surface};
    --brand-surface-elevated: ${brand.colors.surfaceElevated};

    --gradient-prism: ${brand.gradients.prism};
    --gradient-prism-vertical: ${brand.gradients.prismVertical};

    --shadow-glow-mint: ${brand.shadows.glowMint};
    --shadow-glow-violet: ${brand.shadows.glowViolet};
    --shadow-glow-coral: ${brand.shadows.glowCoral};
    --shadow-glow-prism: ${brand.shadows.glowPrism};

    --radius-card: ${brand.radii.card};
    --radius-button: ${brand.radii.button};
    --radius-input: ${brand.radii.input};
  `;
}

export type BrandColors = typeof brand.colors;
export type BrandGradients = typeof brand.gradients;
