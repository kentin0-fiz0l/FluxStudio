/**
 * useSwipeBack — Navigate back on right-swipe from left edge
 *
 * Sprint 39: Mobile-First UX
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from './useBreakpoint';

const EDGE_THRESHOLD = 30; // px from left edge to start tracking
const SWIPE_MIN_DISTANCE = 80; // px to trigger navigation
const SWIPE_MAX_Y = 50; // max vertical movement allowed

export function useSwipeBack(enabled = true) {
  const navigate = useNavigate();
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
        navigate(-1);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isMobile, navigate]);
}
