/**
 * Flux Design Language - Animation & Transition Tokens
 *
 * Defines consistent timing, easing, and animation patterns.
 * Based on natural motion principles for smooth, purposeful animations.
 */

export const animations = {
  // Transition Durations
  duration: {
    instant: '0ms',
    fastest: '75ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    moderate: '300ms',
    slow: '400ms',
    slower: '500ms',
    slowest: '700ms',
  },

  // Easing Functions
  easing: {
    // Linear
    linear: 'linear',

    // Ease variants
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // Cubic bezier - standard curves
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',      // Material Design standard
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',    // Deceleration curve
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',      // Acceleration curve
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',         // Sharp curve

    // Cubic bezier - custom curves
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    snappy: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

    // Spring-like motion
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Common Transition Combinations
  transition: {
    // Fast transitions (user-initiated actions)
    fast: {
      all: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      transform: 'transform 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      opacity: 'opacity 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      color: 'color 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Normal transitions (default)
    normal: {
      all: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      transform: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      opacity: 'opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      color: 'color 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Moderate transitions (complex state changes)
    moderate: {
      all: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      transform: 'transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      opacity: 'opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      color: 'color 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Slow transitions (page/view changes)
    slow: {
      all: 'all 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      transform: 'transform 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      opacity: 'opacity 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      color: 'color 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
  },

  // Keyframe Animations
  keyframes: {
    // Fade animations
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },

    // Slide animations
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
    slideOutToTop: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(-100%)' },
    },
    slideOutToBottom: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(100%)' },
    },

    // Scale animations
    scaleIn: {
      from: { transform: 'scale(0.9)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.9)', opacity: 0 },
    },
    scaleBounce: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },

    // Spin animation
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },

    // Pulse animation
    pulse: {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.5 },
    },

    // Bounce animation
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-25%)' },
    },

    // Shake animation
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
    },

    // Ping animation (expanding circle)
    ping: {
      '0%': { transform: 'scale(1)', opacity: 1 },
      '75%, 100%': { transform: 'scale(2)', opacity: 0 },
    },

    // Shimmer animation (loading)
    shimmer: {
      '0%': { backgroundPosition: '-1000px 0' },
      '100%': { backgroundPosition: '1000px 0' },
    },

    // Progress bar animation
    progress: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },

    // Skeleton loading
    skeletonLoading: {
      '0%': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
      '50%': { backgroundColor: 'rgba(0, 0, 0, 0.1)' },
      '100%': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
    },
  },

  // Component-specific animations
  component: {
    // Modal/Dialog animations
    modal: {
      enter: {
        animation: 'fadeIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        backdropAnimation: 'fadeIn 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      exit: {
        animation: 'fadeOut 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        backdropAnimation: 'fadeOut 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    },

    // Dropdown animations
    dropdown: {
      enter: 'scaleIn 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      exit: 'scaleOut 100ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Tooltip animations
    tooltip: {
      enter: 'fadeIn 100ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      exit: 'fadeOut 75ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Toast/Notification animations
    toast: {
      enter: 'slideInFromRight 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      exit: 'slideOutToRight 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Drawer/Sidebar animations
    drawer: {
      enterFromLeft: 'slideInFromLeft 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      enterFromRight: 'slideInFromRight 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      exitToLeft: 'slideOutToLeft 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      exitToRight: 'slideOutToRight 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Button animations
    button: {
      hover: 'transform 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      active: 'transform 100ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      loading: 'spin 1s linear infinite',
    },

    // Card animations
    card: {
      hover: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      press: 'transform 100ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    },

    // Collapse/Expand animations
    collapse: {
      enter: {
        maxHeight: 'auto',
        transition: 'max-height 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      exit: {
        maxHeight: '0',
        transition: 'max-height 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    },

    // Loading spinner
    spinner: {
      animation: 'spin 1s linear infinite',
    },

    // Skeleton loader
    skeleton: {
      animation: 'skeletonLoading 1.5s ease-in-out infinite',
    },

    // Progress indicator
    progressBar: {
      animation: 'progress 1s ease-in-out infinite',
    },
  },
} as const;

// Export type for TypeScript autocomplete
export type AnimationToken = typeof animations;
