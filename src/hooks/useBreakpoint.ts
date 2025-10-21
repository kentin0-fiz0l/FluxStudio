import * as React from "react";

// Tailwind CSS breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: Breakpoint | 'xs';
  width: number;
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = React.useState<BreakpointState>(() => {
    // Always return desktop defaults for SSR
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    };
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setState(getBreakpointState(width));
    };

    // Set initial state on client mount
    handleResize();

    // Simple resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return state;
}

function getBreakpointState(width: number): BreakpointState {
  let currentBreakpoint: Breakpoint | 'xs' = 'xs';

  if (width >= BREAKPOINTS['2xl']) {
    currentBreakpoint = '2xl';
  } else if (width >= BREAKPOINTS.xl) {
    currentBreakpoint = 'xl';
  } else if (width >= BREAKPOINTS.lg) {
    currentBreakpoint = 'lg';
  } else if (width >= BREAKPOINTS.md) {
    currentBreakpoint = 'md';
  } else if (width >= BREAKPOINTS.sm) {
    currentBreakpoint = 'sm';
  }

  return {
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isLargeDesktop: width >= BREAKPOINTS.xl,
    currentBreakpoint,
    width,
  };
}

// Hook for specific breakpoint checks
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(query);
    const updateMatches = () => setMatches(mq.matches);

    // Set initial state
    setMatches(mq.matches);

    mq.addEventListener('change', updateMatches);

    return () => mq.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

// Enhanced mobile detection that considers touch capability
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });

    return () => {
      window.removeEventListener('touchstart', checkTouch);
    };
  }, []);

  return isTouch;
}

export { BREAKPOINTS };