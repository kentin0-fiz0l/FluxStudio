/**
 * Feature Flag Registry
 *
 * Central registry of all feature flags used in the application.
 * Use these constants instead of string literals with useFeatureFlag().
 *
 * Flags are registered via database migrations in database/migrations/.
 */

export const FEATURE_FLAGS = {
  /** Disable the V2 onboarding flow (Phase 1) */
  ONBOARDING_V2_DISABLED: 'onboarding_v2_disabled',
  /** Enable real AI design feedback (Phase 1) */
  AI_DESIGN_REAL: 'ai_design_real',
  /** Enable Yjs-backed messaging (Phase 2) */
  YJS_MESSAGING: 'yjs-messaging',
  /** Enable Yjs-backed collaborative documents (Phase 2) */
  YJS_DOCUMENTS: 'yjs-documents',
  /** Enable AI-powered semantic search (Phase 2) */
  AI_SEARCH: 'ai_search',
  /** Enable AI collaborative features — conflict detection, generate from music (Phase 3) */
  AI_COLLABORATIVE: 'ai-collaborative',
  /** Enable client presentation mode (Phase 3) */
  PRESENTATION_MODE: 'presentation-mode',
  /** Enable WCAG AA form enhancements (Phase 3) */
  WCAG_AA_FORMS: 'wcag_aa_forms',
  /** Try editor CTA variant */
  TRY_CTA_VARIANT: 'try-cta-variant',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
