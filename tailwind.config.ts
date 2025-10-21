/** @type {import('tailwindcss').Config} */

// ==========================================
// FLUX STUDIO - TAILWIND CONFIGURATION
// Integrated with Design Token System
// ==========================================

import type { Config } from 'tailwindcss'
import { colors } from './src/tokens/colors'
import { typography } from './src/tokens/typography'
import { spacing } from './src/tokens/spacing'
import { shadows } from './src/tokens/shadows'
import { animations } from './src/tokens/animations'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // ==========================================
      // COLORS - Imported from design tokens
      // Single source of truth: /src/tokens/colors.ts
      // NOTE: Selective import to avoid bloat - only import used color families
      // ==========================================
      colors: {
        // Import only neutral colors from tokens (most commonly used)
        neutral: colors.neutral,

        // Import primary brand colors from tokens
        primary: colors.primary,

        // Import semantic colors from tokens
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,

        // Legacy gradient colors (for backward compatibility)
        gradient: {
          yellow: '#FCD34D',
          pink: '#EC4899',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          green: '#10B981',
        },

        // Sidebar colors (CSS variable references for dynamic theming)
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },

      // ==========================================
      // TYPOGRAPHY - Imported from design tokens
      // Single source of truth: /src/tokens/typography.ts
      // ==========================================
      fontFamily: {
        ...typography.fontFamily,

        // Legacy font families (for backward compatibility)
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        title: ['Sora', 'sans-serif'],
        navigation: ['Outfit', 'sans-serif'],
      },

      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing,

      // ==========================================
      // SPACING - Imported from design tokens
      // Single source of truth: /src/tokens/spacing.ts
      // ==========================================
      spacing: {
        // Base spacing scale from tokens (excluding nested objects)
        0: spacing[0],
        px: spacing.px,
        0.5: spacing[0.5],
        1: spacing[1],
        1.5: spacing[1.5],
        2: spacing[2],
        2.5: spacing[2.5],
        3: spacing[3],
        3.5: spacing[3.5],
        4: spacing[4],
        5: spacing[5],
        6: spacing[6],
        7: spacing[7],
        8: spacing[8],
        9: spacing[9],
        10: spacing[10],
        11: spacing[11],
        12: spacing[12],
        14: spacing[14],
        16: spacing[16],
        20: spacing[20],
        24: spacing[24],
        28: spacing[28],
        32: spacing[32],
        36: spacing[36],
        40: spacing[40],
        44: spacing[44],
        48: spacing[48],
        52: spacing[52],
        56: spacing[56],
        60: spacing[60],
        64: spacing[64],
        72: spacing[72],
        80: spacing[80],
        96: spacing[96],

        // Legacy sidebar spacing (CSS variable references)
        'sidebar': 'var(--sidebar-width)',
        'sidebar-icon': 'var(--sidebar-width-icon)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },

      // Max Width from spacing tokens (excluding nested screen object)
      maxWidth: {
        xs: spacing.maxWidth.xs,
        sm: spacing.maxWidth.sm,
        md: spacing.maxWidth.md,
        lg: spacing.maxWidth.lg,
        xl: spacing.maxWidth.xl,
        '2xl': spacing.maxWidth['2xl'],
        '3xl': spacing.maxWidth['3xl'],
        '4xl': spacing.maxWidth['4xl'],
        '5xl': spacing.maxWidth['5xl'],
        '6xl': spacing.maxWidth['6xl'],
        '7xl': spacing.maxWidth['7xl'],
        full: spacing.maxWidth.full,
        min: spacing.maxWidth.min,
        max: spacing.maxWidth.max,
        fit: spacing.maxWidth.fit,
        prose: spacing.maxWidth.prose,
      },

      // Border Radius from spacing tokens
      borderRadius: spacing.borderRadius,

      // ==========================================
      // SHADOWS - Imported from design tokens
      // Single source of truth: /src/tokens/shadows.ts
      // ==========================================
      boxShadow: {
        // Elevation shadows
        ...Object.entries(shadows.elevation).reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {} as Record<string, string>),

        // Colored shadows
        ...Object.entries(shadows.colored).reduce((acc, [key, value]) => {
          acc[`${key}-glow`] = value
          return acc
        }, {} as Record<string, string>),

        // Focus shadows
        ...Object.entries(shadows.focus).reduce((acc, [key, value]) => {
          acc[`focus-${key}`] = value
          return acc
        }, {} as Record<string, string>),

        // Component-specific shadows
        'card': shadows.component.card.rest,
        'card-hover': shadows.component.card.hover,
        'button': shadows.component.button.rest,
        'button-hover': shadows.component.button.hover,
        'input': shadows.component.input.rest,
        'input-focus': shadows.component.input.focus,
        'modal': shadows.component.modal,
        'dropdown': shadows.component.dropdown,
        'tooltip': shadows.component.tooltip,
      },

      // ==========================================
      // ANIMATIONS - Imported from design tokens
      // Single source of truth: /src/tokens/animations.ts
      // ==========================================
      animation: {
        // Core animations from tokens
        'fadeIn': 'fadeIn 500ms ease-out',
        'fadeOut': 'fadeOut 500ms ease-out',
        'slideInFromRight': 'slideInFromRight 300ms ease-out',
        'slideInFromLeft': 'slideInFromLeft 300ms ease-out',
        'slideInFromTop': 'slideInFromTop 300ms ease-out',
        'slideInFromBottom': 'slideInFromBottom 300ms ease-out',
        'scaleIn': 'scaleIn 200ms ease-out',
        'scaleOut': 'scaleOut 200ms ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        'bounce': 'bounce 1s infinite',
        'shimmer': 'shimmer 2s infinite',

        // Legacy animations (for backward compatibility)
        'gradient-x': 'gradient-x 3s ease infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-left': 'slideInFromLeft 0.3s ease-out',
        'slide-out-left': 'slide-out-left 0.3s ease-out',
        'collapse': 'collapse 0.2s ease-out',
        'expand': 'expand 0.2s ease-out',
      },

      keyframes: {
        // Import keyframes from tokens (converted to strings for Tailwind compatibility)
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideInFromRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInFromLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInFromTop: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideInFromBottom: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideOutToRight: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        slideOutToLeft: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(0.9)', opacity: '0' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-25%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },

        // Legacy keyframes (for backward compatibility)
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-out-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'collapse': {
          '0%': { width: 'var(--sidebar-width)' },
          '100%': { width: 'var(--sidebar-width-icon)' },
        },
        'expand': {
          '0%': { width: 'var(--sidebar-width-icon)' },
          '100%': { width: 'var(--sidebar-width)' },
        },
      },

      // ==========================================
      // TRANSITION PROPERTIES
      // ==========================================
      transitionDuration: {
        instant: animations.duration.instant,
        fastest: animations.duration.fastest,
        faster: animations.duration.faster,
        fast: animations.duration.fast,
        normal: animations.duration.normal,
        moderate: animations.duration.moderate,
        slow: animations.duration.slow,
        slower: animations.duration.slower,
        slowest: animations.duration.slowest,
      },

      transitionTimingFunction: {
        standard: animations.easing.standard,
        decelerate: animations.easing.decelerate,
        accelerate: animations.easing.accelerate,
        sharp: animations.easing.sharp,
        smooth: animations.easing.smooth,
        snappy: animations.easing.snappy,
        bounce: animations.easing.bounce,
        elastic: animations.easing.elastic,
        spring: animations.easing.spring,
      },

      transitionProperty: {
        'sidebar': 'width, margin, padding, transform',
        'spacing': 'margin, padding',
        'content': 'width, margin-left, padding',
      },

      // ==========================================
      // BACKGROUND IMAGES
      // ==========================================
      backgroundImage: {
        'gradient-flux': 'linear-gradient(90deg, #FCD34D 0%, #EC4899 25%, #8B5CF6 50%, #06B6D4 75%)',
      },

      // ==========================================
      // SCREENS (BREAKPOINTS)
      // ==========================================
      screens: {
        'xs': '475px',
        'sidebar-breakpoint': '1024px',
      },

      // ==========================================
      // WIDTH
      // ==========================================
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-icon': 'var(--sidebar-width-icon)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
    },
  },

  // ==========================================
  // PLUGINS
  // ==========================================
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.sidebar-transition': {
          'transition-property': 'width, margin, padding, transform',
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '200ms',
        },
        '.reduced-motion:sidebar-transition': {
          'transition': 'none',
        },
        '.content-auto-spacing': {
          'margin-left': 'var(--content-margin-left, 0)',
          'transition': 'margin-left 200ms ease',
        },
        // WCAG AA Focus Indicators with High Contrast
        '.focus-visible-ring': {
          '&:focus-visible': {
            'outline': '3px solid hsl(var(--primary))',
            'outline-offset': '2px',
            'border-radius': '0.375rem',
            'box-shadow': '0 0 0 2px white, 0 0 0 5px hsl(var(--primary))',
          },
        },
        // Mobile Touch Targets (44x44px minimum)
        '.touch-target': {
          '@media (max-width: 767px)': {
            'min-height': '44px',
            'min-width': '44px',
            'padding': '0.75rem 1rem',
          },
        },
        '.touch-target-icon': {
          '@media (max-width: 767px)': {
            'min-height': '44px',
            'min-width': '44px',
            'padding': '0.625rem',
          },
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config
