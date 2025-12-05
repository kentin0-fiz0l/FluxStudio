/**
 * MetMap Feature Flags
 *
 * Environment-based feature flags for beta and production rollout.
 * Defaults are set for beta testing (all features ON).
 *
 * To disable features in production, set environment variables:
 * - NEXT_PUBLIC_FF_TEMPO_MAP_EDITOR=false
 * - NEXT_PUBLIC_FF_VISUAL_ONLY_MODE=false
 * - NEXT_PUBLIC_FF_LATENCY_CALIBRATION=false
 * - NEXT_PUBLIC_FF_DEMO_SONG=false
 * - NEXT_PUBLIC_FF_ONBOARDING=false
 */

export interface FeatureFlags {
  /** Enable tempo map editor UI */
  tempoMapEditor: boolean;
  /** Enable visual-only (silent) mode */
  visualOnlyMode: boolean;
  /** Enable latency calibration utility */
  latencyCalibration: boolean;
  /** Auto-load demo song for first-time users */
  demoSong: boolean;
  /** Show onboarding for new users */
  onboarding: boolean;
}

/**
 * Parse environment variable as boolean
 */
function envBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check process.env
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() !== 'false';
  }
  // Client-side: check window env (set by Next.js)
  const value = (process.env as Record<string, string | undefined>)[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'false';
}

/**
 * Current feature flags
 * All features default to ON for beta testing
 */
export const featureFlags: FeatureFlags = {
  tempoMapEditor: envBool('NEXT_PUBLIC_FF_TEMPO_MAP_EDITOR', true),
  visualOnlyMode: envBool('NEXT_PUBLIC_FF_VISUAL_ONLY_MODE', true),
  latencyCalibration: envBool('NEXT_PUBLIC_FF_LATENCY_CALIBRATION', true),
  demoSong: envBool('NEXT_PUBLIC_FF_DEMO_SONG', true),
  onboarding: envBool('NEXT_PUBLIC_FF_ONBOARDING', true),
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Hook-friendly feature flag checker
 * Can be used in components to conditionally render features
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  // In a real app, this could be a proper React hook with state
  // For now, just return the static value
  return featureFlags[feature];
}
