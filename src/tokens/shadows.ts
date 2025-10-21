/**
 * Flux Design Language - Shadow & Elevation Tokens
 *
 * Defines consistent shadow system for depth and elevation.
 * Each level represents a different elevation in the UI hierarchy.
 */

export const shadows = {
  // Box Shadows - Elevation levels
  elevation: {
    // Level 0 - No elevation (flat, on surface)
    0: 'none',

    // Level 1 - Subtle elevation (hovering just above surface)
    // Used for: Raised buttons, cards at rest
    1: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

    // Level 2 - Small elevation (slightly raised)
    // Used for: Dropdowns, tooltips, small modals
    2: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

    // Level 3 - Medium elevation (clearly raised)
    // Used for: Cards on hover, popovers, date pickers
    3: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

    // Level 4 - High elevation (prominently raised)
    // Used for: Dropdown menus, command palettes
    4: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

    // Level 5 - Higher elevation (floating)
    // Used for: Modals, dialogs, drawers
    5: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

    // Level 6 - Highest elevation (prominent overlays)
    // Used for: Large modals, full-screen overlays
    6: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // Colored Shadows (for brand elements)
  colored: {
    primary: '0 10px 15px -3px rgba(99, 102, 241, 0.2), 0 4px 6px -4px rgba(99, 102, 241, 0.1)',
    secondary: '0 10px 15px -3px rgba(168, 85, 247, 0.2), 0 4px 6px -4px rgba(168, 85, 247, 0.1)',
    accent: '0 10px 15px -3px rgba(6, 182, 212, 0.2), 0 4px 6px -4px rgba(6, 182, 212, 0.1)',
    success: '0 10px 15px -3px rgba(34, 197, 94, 0.2), 0 4px 6px -4px rgba(34, 197, 94, 0.1)',
    warning: '0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -4px rgba(245, 158, 11, 0.1)',
    error: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -4px rgba(239, 68, 68, 0.1)',
  },

  // Inner Shadows (for inset effects)
  inner: {
    sm: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    md: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
    lg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.15)',
  },

  // Focus Shadows (for interactive elements)
  focus: {
    default: '0 0 0 3px rgba(99, 102, 241, 0.2)',
    primary: '0 0 0 3px rgba(99, 102, 241, 0.2)',
    secondary: '0 0 0 3px rgba(168, 85, 247, 0.2)',
    accent: '0 0 0 3px rgba(6, 182, 212, 0.2)',
    success: '0 0 0 3px rgba(34, 197, 94, 0.2)',
    warning: '0 0 0 3px rgba(245, 158, 11, 0.2)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.2)',
  },

  // Glow Effects (for highlights and emphasis)
  glow: {
    sm: '0 0 10px rgba(99, 102, 241, 0.3)',
    md: '0 0 20px rgba(99, 102, 241, 0.4)',
    lg: '0 0 30px rgba(99, 102, 241, 0.5)',
    primary: '0 0 20px rgba(99, 102, 241, 0.4)',
    secondary: '0 0 20px rgba(168, 85, 247, 0.4)',
    accent: '0 0 20px rgba(6, 182, 212, 0.4)',
  },

  // Border Shadows (subtle depth without elevation)
  border: {
    light: '0 0 0 1px rgba(0, 0, 0, 0.05)',
    default: '0 0 0 1px rgba(0, 0, 0, 0.1)',
    dark: '0 0 0 1px rgba(0, 0, 0, 0.15)',
  },

  // Semantic shadows for specific components
  component: {
    // Card shadows
    card: {
      rest: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      hover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      active: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    },

    // Button shadows
    button: {
      rest: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      hover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      active: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    },

    // Input shadows
    input: {
      rest: '0 0 0 1px rgba(0, 0, 0, 0.1)',
      focus: '0 0 0 3px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.5)',
      error: '0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.5)',
    },

    // Modal shadows
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

    // Dropdown shadows
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

    // Tooltip shadows
    tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

    // Sidebar/Drawer shadows
    drawer: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

    // Floating action button shadow
    fab: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
} as const;

// Export type for TypeScript autocomplete
export type ShadowToken = typeof shadows;
