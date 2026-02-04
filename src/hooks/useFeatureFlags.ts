/**
 * useFeatureFlags - React hook for feature flag access
 *
 * Provides reactive access to feature flags with automatic re-renders
 * when flags change.
 *
 * Usage:
 *   const { isEnabled, getVariant, setFlag } = useFeatureFlags();
 *   if (isEnabled('new_messaging_ui')) { ... }
 */

import * as React from 'react';
import { observability } from '@/services/observability';

export interface UseFeatureFlagsReturn {
  /** Check if a flag is enabled */
  isEnabled: (flagName: string, defaultValue?: boolean) => boolean;
  /** Get experiment variant */
  getVariant: (experimentName: string, defaultVariant?: string) => string;
  /** Set a flag (dev/admin use) */
  setFlag: (flagName: string, enabled: boolean) => void;
  /** Set experiment variant (dev/admin use) */
  setVariant: (experimentName: string, variant: string) => void;
  /** Override flag for testing (not persisted) */
  override: (flagName: string, enabled: boolean) => void;
  /** Clear all overrides */
  clearOverrides: () => void;
  /** Get all flags */
  getAllFlags: () => Record<string, boolean>;
}

export function useFeatureFlags(): UseFeatureFlagsReturn {
  // Force re-render when flags change
  const [, setVersion] = React.useState(0);

  const isEnabled = React.useCallback((flagName: string, defaultValue = false) => {
    return observability.flags.isEnabled(flagName, defaultValue);
  }, []);

  const getVariant = React.useCallback((experimentName: string, defaultVariant = 'control') => {
    return observability.flags.getVariant(experimentName, defaultVariant);
  }, []);

  const setFlag = React.useCallback((flagName: string, enabled: boolean) => {
    observability.flags.setFlag(flagName, enabled);
    setVersion(v => v + 1);
  }, [setVersion]);

  const setVariant = React.useCallback((experimentName: string, variant: string) => {
    observability.flags.setVariant(experimentName, variant);
    setVersion(v => v + 1);
  }, [setVersion]);

  const override = React.useCallback((flagName: string, enabled: boolean) => {
    observability.flags.override(flagName, enabled);
    setVersion(v => v + 1);
  }, [setVersion]);

  const clearOverrides = React.useCallback(() => {
    observability.flags.clearOverrides();
    setVersion(v => v + 1);
  }, [setVersion]);

  const getAllFlags = React.useCallback(() => {
    return observability.flags.getAllFlags();
  }, []);

  return {
    isEnabled,
    getVariant,
    setFlag,
    setVariant,
    override,
    clearOverrides,
    getAllFlags,
  };
}

// Convenience hook for a single flag
export function useFeatureFlag(flagName: string, defaultValue = false): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagName, defaultValue);
}

// Convenience hook for a single experiment
export function useExperimentVariant(experimentName: string, defaultVariant = 'control'): string {
  const { getVariant } = useFeatureFlags();
  return getVariant(experimentName, defaultVariant);
}

export default useFeatureFlags;
