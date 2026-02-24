/* eslint-disable react-refresh/only-export-components */
/**
 * ThemeContext - Backward compatibility wrapper
 *
 * Theme settings have been migrated to Zustand (store/slices/uiSlice.ts).
 * This file re-exports from the Zustand store so existing imports continue to work.
 */

import { useEffect, type ReactNode } from 'react';
import { useStore } from '../store';
import type { ThemeVariant, LayoutDensity, ThemeSettings } from '../store/slices/uiSlice';

// Re-export types
export type { ThemeVariant, LayoutDensity, ThemeSettings };

/**
 * useTheme - backward compatible hook that maps to Zustand UI slice.
 */
export function useTheme() {
  const themeSettings = useStore((state) => state.ui.themeSettings);
  const sidebarCollapsed = useStore((state) => state.ui.sidebarCollapsed);
  const updateThemeSettings = useStore((state) => state.ui.updateThemeSettings);
  const resetThemeSettings = useStore((state) => state.ui.resetThemeSettings);
  const setSidebarCollapsed = useStore((state) => state.ui.setSidebarCollapsed);

  return {
    settings: {
      ...themeSettings,
      sidebarCollapsed,
    },
    updateSettings: (updates: Partial<ThemeSettings & { sidebarCollapsed?: boolean }>) => {
      const { sidebarCollapsed: sc, ...rest } = updates;
      if (sc !== undefined) setSidebarCollapsed(sc);
      if (Object.keys(rest).length > 0) updateThemeSettings(rest);
    },
    resetToDefaults: resetThemeSettings,
  };
}

// Theme variant configurations (kept for consumers)
export const THEME_VARIANTS = {
  default: { name: 'Default', description: 'Classic dark theme with blue accents', colors: { primary: '#3b82f6', background: '#0f172a', surface: '#1e293b' } },
  cosmic: { name: 'Cosmic', description: 'Deep space theme with purple gradients', colors: { primary: '#8b5cf6', background: '#0c0a1a', surface: '#1a1625' } },
  minimal: { name: 'Minimal', description: 'Clean and focused with neutral tones', colors: { primary: '#6b7280', background: '#111827', surface: '#1f2937' } },
  vibrant: { name: 'Vibrant', description: 'Energetic theme with bright accents', colors: { primary: '#f59e0b', background: '#1a1a1a', surface: '#2d2d2d' } },
} as const;

export const LAYOUT_DENSITIES = {
  compact: { name: 'Compact', description: 'Maximum information density', spacing: '0.5rem' },
  comfortable: { name: 'Comfortable', description: 'Balanced spacing and readability', spacing: '1rem' },
  spacious: { name: 'Spacious', description: 'Generous spacing for relaxed experience', spacing: '1.5rem' },
} as const;

/**
 * ThemeProvider - applies theme settings on mount.
 * Kept for backward compatibility but state lives in Zustand.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeSettings = useStore((state) => state.ui.themeSettings);
  const sidebarCollapsed = useStore((state) => state.ui.sidebarCollapsed);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-default', 'theme-cosmic', 'theme-minimal', 'theme-vibrant');
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.remove('sidebar-collapsed', 'no-animations');

    root.classList.add(`theme-${themeSettings.variant}`);
    root.classList.add(`density-${themeSettings.layoutDensity}`);
    if (sidebarCollapsed) root.classList.add('sidebar-collapsed');
    if (!themeSettings.showAnimations) root.classList.add('no-animations');
    if (themeSettings.customAccentColor) {
      root.style.setProperty('--accent-color', themeSettings.customAccentColor);
    } else {
      root.style.removeProperty('--accent-color');
    }
  }, [themeSettings, sidebarCollapsed]);

  return <>{children}</>;
}
