/**
 * usePullToRefresh — Pull-down gesture to trigger a refresh callback
 *
 * Sprint 39: Mobile-First UX
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from './useBreakpoint';

const PULL_THRESHOLD = 80; // px to trigger refresh
const MAX_PULL = 120; // max visual pull distance

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Ref to the scrollable container (defaults to window) */
  containerRef?: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, containerRef, enabled = true }: UsePullToRefreshOptions) {
  const isMobile = useIsMobile();
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    const container = containerRef?.current;

    const isAtTop = () => {
      if (container) return container.scrollTop <= 0;
      return window.scrollY <= 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isAtTop() && !refreshing) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0 && isAtTop()) {
        setPullDistance(Math.min(dy * 0.5, MAX_PULL));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistance >= PULL_THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    const target = container || document;
    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as EventListener);
      target.removeEventListener('touchmove', handleTouchMove as EventListener);
      target.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [enabled, isMobile, refreshing, pullDistance, handleRefresh, containerRef]);

  return { refreshing, pullDistance };
}
