/**
 * Flux Design Language - Typography Tokens
 *
 * Defines font families, sizes, weights, line heights, and letter spacing.
 * Based on a modular scale for consistent visual hierarchy.
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    display: "'Orbitron', 'Lexend', sans-serif",
    mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace",
    handwriting: "'Swanky and Moo Moo', cursive",
  },

  // Font Sizes (rem-based for accessibility)
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
    '8xl': '6rem',      // 96px
    '9xl': '8rem',      // 128px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '7': '1.75rem',
    '8': '2rem',
    '9': '2.25rem',
    '10': '2.5rem',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Text Styles (Semantic combinations for common use cases)
  textStyles: {
    // Display Text
    displayLarge: {
      fontSize: '4.5rem',     // 72px
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.025em',
      fontFamily: 'display',
    },
    displayMedium: {
      fontSize: '3.75rem',    // 60px
      fontWeight: '700',
      lineHeight: '1.15',
      letterSpacing: '-0.025em',
      fontFamily: 'display',
    },
    displaySmall: {
      fontSize: '3rem',       // 48px
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
      fontFamily: 'display',
    },

    // Headings
    h1: {
      fontSize: '2.25rem',    // 36px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.875rem',   // 30px
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',     // 24px
      fontWeight: '600',
      lineHeight: '1.35',
      letterSpacing: 'normal',
    },
    h4: {
      fontSize: '1.25rem',    // 20px
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: 'normal',
    },
    h5: {
      fontSize: '1.125rem',   // 18px
      fontWeight: '600',
      lineHeight: '1.45',
      letterSpacing: 'normal',
    },
    h6: {
      fontSize: '1rem',       // 16px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },

    // Body Text
    bodyLarge: {
      fontSize: '1.125rem',   // 18px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: 'normal',
    },
    bodyMedium: {
      fontSize: '1rem',       // 16px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },
    bodySmall: {
      fontSize: '0.875rem',   // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },

    // Labels & UI Elements
    labelLarge: {
      fontSize: '0.875rem',   // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },
    labelMedium: {
      fontSize: '0.8125rem',  // 13px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },
    labelSmall: {
      fontSize: '0.75rem',    // 12px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },

    // Buttons
    buttonLarge: {
      fontSize: '1rem',       // 16px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },
    buttonMedium: {
      fontSize: '0.875rem',   // 14px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },
    buttonSmall: {
      fontSize: '0.8125rem',  // 13px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
    },

    // Code & Monospace
    codeLarge: {
      fontSize: '0.875rem',   // 14px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: 'normal',
      fontFamily: 'mono',
    },
    codeMedium: {
      fontSize: '0.8125rem',  // 13px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
      fontFamily: 'mono',
    },
    codeSmall: {
      fontSize: '0.75rem',    // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
      fontFamily: 'mono',
    },

    // Caption & Helper Text
    caption: {
      fontSize: '0.75rem',    // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: 'normal',
    },
    overline: {
      fontSize: '0.75rem',    // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    },
  },
} as const;

// Export type for TypeScript autocomplete
export type TypographyToken = typeof typography;
