/**
 * Flux Design Language - Design Tokens
 *
 * Centralized export of all design tokens for consistent theming throughout the application.
 * Import from this file to access all design system tokens.
 *
 * @example
 * import { colors, typography, spacing, shadows, animations } from '@/tokens';
 */

export { colors, type ColorToken, type ColorScale } from './colors';
export { typography, type TypographyToken } from './typography';
export { spacing, type SpacingToken } from './spacing';
export { shadows, type ShadowToken } from './shadows';
export { animations, type AnimationToken } from './animations';

// Re-export as a unified theme object for convenience
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { animations } from './animations';

export const tokens = {
  colors,
  typography,
  spacing,
  shadows,
  animations,
} as const;

export type DesignTokens = typeof tokens;
