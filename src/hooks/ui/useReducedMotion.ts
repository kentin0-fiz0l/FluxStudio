/**
 * useReducedMotion - Detect and respect prefers-reduced-motion
 *
 * Phase 3.2 - WCAG 2.1 AA Completion
 *
 * Provides:
 * - Detection of prefers-reduced-motion media query
 * - MotionConfig wrapper that disables Framer Motion animations
 * - Reactive updates when the preference changes
 */

import { useState, useEffect, type ReactNode, createElement } from 'react';
import { MotionConfig as FramerMotionConfig } from 'framer-motion';

const QUERY = '(prefers-reduced-motion: reduce)';

function getInitialState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Returns whether the user prefers reduced motion.
 * Listens for changes in real-time.
 */
export function useReducedMotion(): { prefersReducedMotion: boolean } {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialState);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return { prefersReducedMotion };
}

/**
 * MotionConfig wrapper that disables Framer Motion animations
 * when the user prefers reduced motion.
 *
 * Wrap your app or animation-heavy subtree with this component:
 *
 * ```tsx
 * <ReducedMotionConfig>
 *   <App />
 * </ReducedMotionConfig>
 * ```
 */
export function ReducedMotionConfig({ children }: { children: ReactNode }) {
  const { prefersReducedMotion } = useReducedMotion();

  return createElement(
    FramerMotionConfig,
    { reducedMotion: prefersReducedMotion ? 'always' : 'never' },
    children,
  );
}
