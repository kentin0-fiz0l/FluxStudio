/**
 * useTheme Hook - Unified Theme Management
 *
 * Sprint 50 T2: Single source of truth via Zustand uiSlice.
 * Supports light/dark/system with OS preference sync and localStorage persistence.
 */

import { useStore } from '@/store/store';
import type { Theme } from '@/store/slices/uiSlice';

export type { Theme };

export function useTheme() {
  const theme = useStore((s) => s.ui.theme);
  const setTheme = useStore((s) => s.ui.setTheme);
  const toggleTheme = useStore((s) => s.ui.toggleTheme);

  // Compute the resolved (actual) theme for consumers
  const resolvedTheme = (() => {
    if (theme === 'light' || theme === 'dark') return theme;
    // 'system' — check media query
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  })();

  return {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
