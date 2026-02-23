/**
 * useSwipeSidebar — Swipe from left edge to reveal sidebar on mobile
 *
 * Sprint 53: Responsive breakpoint improvements
 */

import { useEffect, useRef } from 'react';
import { useIsMobile } from './useBreakpoint';

const EDGE_THRESHOLD = 20; // px from left edge to start tracking
const SWIPE_MIN_DISTANCE = 60; // px to trigger sidebar open
const SWIPE_MAX_Y = 60; // max vertical movement allowed

export function useSwipeSidebar(onOpen: () => void, enabled = true) {
  const isMobile = useIsMobile();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_THRESHOLD) {
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (dx >= SWIPE_MIN_DISTANCE && dy <= SWIPE_MAX_Y) {
        onOpen();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isMobile, onOpen]);
}
