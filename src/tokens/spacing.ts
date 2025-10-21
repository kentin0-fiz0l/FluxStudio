/**
 * Flux Design Language - Spacing Tokens
 *
 * Defines consistent spacing scale for margins, padding, gaps, and layout.
 * Based on 4px base unit for precise control and consistency.
 */

export const spacing = {
  // Base spacing scale (4px increments)
  0: '0',
  px: '1px',
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  11: '2.75rem',      // 44px
  12: '3rem',         // 48px
  14: '3.5rem',       // 56px
  16: '4rem',         // 64px
  20: '5rem',         // 80px
  24: '6rem',         // 96px
  28: '7rem',         // 112px
  32: '8rem',         // 128px
  36: '9rem',         // 144px
  40: '10rem',        // 160px
  44: '11rem',        // 176px
  48: '12rem',        // 192px
  52: '13rem',        // 208px
  56: '14rem',        // 224px
  60: '15rem',        // 240px
  64: '16rem',        // 256px
  72: '18rem',        // 288px
  80: '20rem',        // 320px
  96: '24rem',        // 384px

  // Semantic spacing for common use cases
  semantic: {
    // Component Internal Spacing
    componentXs: '0.25rem',     // 4px - Tight spacing within small components
    componentSm: '0.5rem',      // 8px - Default internal spacing
    componentMd: '0.75rem',     // 12px - Medium internal spacing
    componentLg: '1rem',        // 16px - Larger internal spacing
    componentXl: '1.5rem',      // 24px - Extra large internal spacing

    // Section Spacing
    sectionXs: '1rem',          // 16px - Minimal section spacing
    sectionSm: '1.5rem',        // 24px - Small section spacing
    sectionMd: '2rem',          // 32px - Default section spacing
    sectionLg: '3rem',          // 48px - Large section spacing
    sectionXl: '4rem',          // 64px - Extra large section spacing

    // Layout Spacing
    layoutXs: '2rem',           // 32px - Minimal layout spacing
    layoutSm: '3rem',           // 48px - Small layout spacing
    layoutMd: '4rem',           // 64px - Default layout spacing
    layoutLg: '6rem',           // 96px - Large layout spacing
    layoutXl: '8rem',           // 128px - Extra large layout spacing

    // Container Padding
    containerXs: '1rem',        // 16px - Mobile container padding
    containerSm: '1.5rem',      // 24px - Small container padding
    containerMd: '2rem',        // 32px - Default container padding
    containerLg: '3rem',        // 48px - Large container padding
    containerXl: '4rem',        // 64px - Extra large container padding

    // Card Spacing
    cardPaddingXs: '0.75rem',   // 12px - Minimal card padding
    cardPaddingSm: '1rem',      // 16px - Small card padding
    cardPaddingMd: '1.5rem',    // 24px - Default card padding
    cardPaddingLg: '2rem',      // 32px - Large card padding
    cardPaddingXl: '2.5rem',    // 40px - Extra large card padding

    // Stack Spacing (vertical spacing between elements)
    stackXs: '0.5rem',          // 8px - Tight stacking
    stackSm: '0.75rem',         // 12px - Small stacking
    stackMd: '1rem',            // 16px - Default stacking
    stackLg: '1.5rem',          // 24px - Large stacking
    stackXl: '2rem',            // 32px - Extra large stacking

    // Inline Spacing (horizontal spacing between inline elements)
    inlineXs: '0.25rem',        // 4px - Minimal inline spacing
    inlineSm: '0.5rem',         // 8px - Small inline spacing
    inlineMd: '0.75rem',        // 12px - Default inline spacing
    inlineLg: '1rem',           // 16px - Large inline spacing
    inlineXl: '1.5rem',         // 24px - Extra large inline spacing

    // Form Elements
    formFieldGap: '0.5rem',     // 8px - Gap between form field elements
    formLabelGap: '0.375rem',   // 6px - Gap between label and input
    formGroupGap: '1rem',       // 16px - Gap between form groups
    formSectionGap: '2rem',     // 32px - Gap between form sections

    // List Items
    listItemGapXs: '0.25rem',   // 4px - Minimal list item spacing
    listItemGapSm: '0.5rem',    // 8px - Small list item spacing
    listItemGapMd: '0.75rem',   // 12px - Default list item spacing
    listItemGapLg: '1rem',      // 16px - Large list item spacing
    listItemGapXl: '1.5rem',    // 24px - Extra large list item spacing

    // Grid Gap
    gridGapXs: '0.5rem',        // 8px - Minimal grid gap
    gridGapSm: '1rem',          // 16px - Small grid gap
    gridGapMd: '1.5rem',        // 24px - Default grid gap
    gridGapLg: '2rem',          // 32px - Large grid gap
    gridGapXl: '3rem',          // 48px - Extra large grid gap
  },

  // Max Width Constraints
  maxWidth: {
    xs: '20rem',      // 320px
    sm: '24rem',      // 384px
    md: '28rem',      // 448px
    lg: '32rem',      // 512px
    xl: '36rem',      // 576px
    '2xl': '42rem',   // 672px
    '3xl': '48rem',   // 768px
    '4xl': '56rem',   // 896px
    '5xl': '64rem',   // 1024px
    '6xl': '72rem',   // 1152px
    '7xl': '80rem',   // 1280px
    full: '100%',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
    prose: '65ch',
    screen: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
} as const;

// Export type for TypeScript autocomplete
export type SpacingToken = typeof spacing;
