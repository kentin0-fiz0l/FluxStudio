/**
 * Mobile Detection and Responsive Hooks
 * @file src/hooks/useMobile.ts
 *
 * Provides hooks for mobile detection, viewport handling, and responsive design
 */

import { useState, useEffect, useMemo } from 'react';

// Breakpoints matching Tailwind defaults
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Detect if device is mobile based on user agent and screen size
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < BREAKPOINTS.md;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Detect if device is a touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - legacy property
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

/**
 * Get current breakpoint
 */
export function useBreakpoint(): BreakpointKey | 'xs' {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey | 'xs'>('xs');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;

      if (width >= BREAKPOINTS['2xl']) {
        setBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Check if current viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Update state via callback to avoid sync setState in effect
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value via handler to ensure consistency
    handler({ matches: mediaQuery.matches } as MediaQueryListEvent);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Get real viewport height (accounting for mobile browser UI)
 * Fixes the 100vh issue on mobile browsers
 */
export function useViewportHeight(): {
  vh: number;
  dvh: number;
  svh: number;
  lvh: number;
} {
  const [heights, setHeights] = useState({
    vh: typeof window !== 'undefined' ? window.innerHeight : 0,
    dvh: typeof window !== 'undefined' ? window.innerHeight : 0,
    svh: typeof window !== 'undefined' ? window.innerHeight : 0,
    lvh: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const updateHeights = () => {
      // vh: standard viewport height
      const vh = window.innerHeight;

      // dvh: dynamic viewport height (changes with browser UI)
      // svh: small viewport height (with browser UI visible)
      // lvh: large viewport height (with browser UI hidden)
      // For browsers that don't support these, we estimate
      const visualViewport = window.visualViewport;
      const dvh = visualViewport?.height ?? vh;

      setHeights({
        vh,
        dvh,
        svh: Math.min(vh, dvh),
        lvh: Math.max(vh, dvh),
      });

      // Set CSS custom property for use in styles
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
      document.documentElement.style.setProperty('--dvh', `${dvh * 0.01}px`);
    };

    updateHeights();

    window.addEventListener('resize', updateHeights);
    window.visualViewport?.addEventListener('resize', updateHeights);

    return () => {
      window.removeEventListener('resize', updateHeights);
      window.visualViewport?.removeEventListener('resize', updateHeights);
    };
  }, []);

  return heights;
}

/**
 * Detect device orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      // Use screen.orientation if available, otherwise calculate
      if (screen.orientation) {
        setOrientation(
          screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
        );
      } else {
        setOrientation(
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        );
      }
    };

    handleOrientationChange();

    window.addEventListener('resize', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      screen.orientation?.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  return orientation;
}

/**
 * Detect if device has a notch or safe area
 */
export function useSafeArea(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) ||
             parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
                parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) ||
              parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) ||
               parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}

/**
 * Detect network connection status and type
 */
export function useNetworkStatus(): {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
} {
  const [status, setStatus] = useState(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: 'unknown' as const,
    downlink: 0,
    rtt: 0,
    saveData: false,
  }));

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as Navigator & {
        connection?: {
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
          saveData?: boolean;
        };
      }).connection;

      setStatus({
        online: navigator.onLine,
        effectiveType: (connection?.effectiveType as typeof status.effectiveType) || 'unknown',
        downlink: connection?.downlink ?? 0,
        rtt: connection?.rtt ?? 0,
        saveData: connection?.saveData ?? false,
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    connection?.addEventListener('change', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      connection?.removeEventListener('change', updateStatus);
    };
  }, []);

  return status;
}

/**
 * Handle pull-to-refresh gesture
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: {
    threshold?: number;
    disabled?: boolean;
  } = {}
): {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
} {
  const { threshold = 80, disabled = false } = options;
  const [state, setState] = useState({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    startY: 0,
  });

  useEffect(() => {
    if (disabled) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || state.isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);

      if (distance > 0 && window.scrollY === 0) {
        e.preventDefault();
        setState(prev => ({
          ...prev,
          isPulling: true,
          pullDistance: Math.min(distance, threshold * 2),
        }));
      }
    };

    const handleTouchEnd = async () => {
      if (state.pullDistance >= threshold && !state.isRefreshing) {
        setState(prev => ({ ...prev, isRefreshing: true }));
        await onRefresh();
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          isPulling: false,
          pullDistance: 0,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
        }));
      }
      isPulling = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, threshold, onRefresh, state.isRefreshing, state.pullDistance]);

  return {
    isPulling: state.isPulling,
    pullDistance: state.pullDistance,
    isRefreshing: state.isRefreshing,
  };
}

/**
 * Detect if running as installed PWA
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      // @ts-expect-error - iOS Safari specific
      const isIOSStandalone = window.navigator.standalone === true;

      setIsPWA(isStandalone || isFullscreen || isIOSStandalone);
    };

    checkPWA();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkPWA);

    return () => {
      mediaQuery.removeEventListener('change', checkPWA);
    };
  }, []);

  return isPWA;
}

/**
 * Combined mobile state hook
 */
export function useMobileState() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  const breakpoint = useBreakpoint();
  const orientation = useOrientation();
  const isPWA = useIsPWA();
  const { online, effectiveType, saveData } = useNetworkStatus();
  const { dvh } = useViewportHeight();

  return useMemo(() => ({
    isMobile,
    isTouch,
    breakpoint,
    orientation,
    isPWA,
    online,
    effectiveType,
    saveData,
    viewportHeight: dvh,
    isSmallScreen: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md' || breakpoint === 'lg',
    isDesktop: breakpoint === 'xl' || breakpoint === '2xl',
  }), [isMobile, isTouch, breakpoint, orientation, isPWA, online, effectiveType, saveData, dvh]);
}

export default {
  useIsMobile,
  useIsTouchDevice,
  useBreakpoint,
  useMediaQuery,
  useViewportHeight,
  useOrientation,
  useSafeArea,
  useNetworkStatus,
  usePullToRefresh,
  useIsPWA,
  useMobileState,
};
