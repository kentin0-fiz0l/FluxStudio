/**
 * useTouchGestures — Pinch-to-zoom and two-finger pan for canvas elements
 *
 * Attaches pointer event listeners to the target element.
 * Tracks multi-touch gestures and translates them to zoom and pan callbacks.
 */

import { useRef, useEffect, useCallback } from 'react';

interface TouchGestureOptions {
  /** Ref to the element that receives touch events */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Called when pinch gesture changes zoom level */
  onZoom: (delta: number, centerX: number, centerY: number) => void;
  /** Called when two-finger pan moves the canvas */
  onPan: (deltaX: number, deltaY: number) => void;
  /** Called on long press (500ms) — used for context menu on touch */
  onLongPress?: (x: number, y: number) => void;
  /** Whether gestures are enabled */
  enabled?: boolean;
}

interface ActivePointer {
  id: number;
  x: number;
  y: number;
}

export function useTouchGestures({
  targetRef,
  onZoom,
  onPan,
  onLongPress,
  enabled = true,
}: TouchGestureOptions) {
  const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Only track touch pointers for multi-touch gestures
      if (e.pointerType !== 'touch') return;

      pointersRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      // Start long press timer for single touch
      if (pointersRef.current.size === 1) {
        movedRef.current = false;
        clearLongPress();
        if (onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            if (!movedRef.current && pointersRef.current.size === 1) {
              const rect = el.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              onLongPress(x, y);
            }
          }, 500);
        }
      }

      // Two fingers down: initialize pinch
      if (pointersRef.current.size === 2) {
        clearLongPress();
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        initialPinchDistRef.current = dist;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;

      const prev = pointersRef.current.get(e.pointerId);
      if (!prev) return;

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;

      // Mark as moved if significant movement (prevents long press on drag)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        movedRef.current = true;
        clearLongPress();
      }

      pointersRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      // Two-finger gesture
      if (pointersRef.current.size === 2) {
        const [p1, p2] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        // Pinch-to-zoom
        if (initialPinchDistRef.current !== null) {
          const delta = (dist - initialPinchDistRef.current) * 0.005;
          if (Math.abs(delta) > 0.01) {
            const centerX = (p1.x + p2.x) / 2;
            const centerY = (p1.y + p2.y) / 2;
            onZoom(delta, centerX, centerY);
            initialPinchDistRef.current = dist;
          }
        }

        // Two-finger pan
        onPan(dx, dy);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pointersRef.current.delete(e.pointerId);
      clearLongPress();

      if (pointersRef.current.size < 2) {
        initialPinchDistRef.current = null;
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      clearLongPress();
      initialPinchDistRef.current = null;
    };

    // Prevent default touch behavior (scrolling) on the canvas
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerCancel);
    el.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerCancel);
      el.removeEventListener('touchstart', handleTouchStart);
      clearLongPress();
    };
  }, [targetRef, onZoom, onPan, onLongPress, enabled, clearLongPress]);
}
