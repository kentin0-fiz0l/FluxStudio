/**
 * useResponsiveLayout — Responsive panel mode detection
 *
 * Provides screen-size-based booleans and a derived panel mode
 * for adaptive panel rendering (sidebar, bottom sheet, or modal).
 *
 * Uses window.matchMedia for efficiency (event-driven, no resize polling).
 * SSR-safe with desktop defaults.
 */

import { useState, useEffect, useCallback } from 'react';

// Tailwind CSS breakpoints (must stay in sync with tailwind.config)
const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 768;

export type PanelMode = 'sidebar' | 'sheet' | 'modal';

export interface ResponsiveLayoutState {
  /** Viewport < 640px (Tailwind sm) */
  isMobile: boolean;
  /** Viewport >= 640px and < 768px (Tailwind sm to md) */
  isTablet: boolean;
  /** Viewport >= 768px (Tailwind md+) */
  isDesktop: boolean;
  /** Derived panel rendering mode based on current viewport */
  panelMode: PanelMode;
}

/**
 * Derive the panel mode from the viewport booleans.
 *
 * - Desktop (md+): right sidebar (current behavior)
 * - Tablet (sm-md): bottom sheet that slides up
 * - Mobile (<sm): full-screen modal with close button
 */
function derivePanelMode(isMobile: boolean, isTablet: boolean): PanelMode {
  if (isMobile) return 'modal';
  if (isTablet) return 'sheet';
  return 'sidebar';
}

export function useResponsiveLayout(): ResponsiveLayoutState {
  const [state, setState] = useState<ResponsiveLayoutState>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    panelMode: 'sidebar',
  }));

  const updateState = useCallback((mobileMatches: boolean, tabletMatches: boolean) => {
    const isMobile = mobileMatches;
    const isTablet = tabletMatches && !mobileMatches;
    const isDesktop = !mobileMatches && !tabletMatches;

    setState({
      isMobile,
      isTablet,
      isDesktop,
      panelMode: derivePanelMode(isMobile, isTablet),
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileQuery = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`);
    const tabletQuery = window.matchMedia(
      `(min-width: ${SM_BREAKPOINT}px) and (max-width: ${MD_BREAKPOINT - 1}px)`,
    );

    // Set initial values from actual viewport
    updateState(mobileQuery.matches, tabletQuery.matches);

    const handleChange = () => {
      updateState(mobileQuery.matches, tabletQuery.matches);
    };

    mobileQuery.addEventListener('change', handleChange);
    tabletQuery.addEventListener('change', handleChange);

    return () => {
      mobileQuery.removeEventListener('change', handleChange);
      tabletQuery.removeEventListener('change', handleChange);
    };
  }, [updateState]);

  return state;
}

export default useResponsiveLayout;
