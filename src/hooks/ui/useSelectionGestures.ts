/**
 * useSelectionGestures - Pinch-to-scale and two-finger rotate for selections
 *
 * Enhances the existing touch gesture system with selection-aware transforms.
 * When a group of performers is selected, two-finger pinch gestures scale
 * their positions outward/inward relative to the selection centroid, and
 * two-finger rotation gestures rotate them around the centroid.
 *
 * Works alongside useTouchGestures (which handles canvas-level pinch-to-zoom
 * and two-finger pan). This hook is specifically for transforming the
 * selected performer positions.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { Position } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SelectionGestureCallbacks {
  /** Called when a pinch gesture scales the selection */
  onPinchScale: (scale: number) => void;
  /** Called when a two-finger rotation gesture rotates the selection (degrees) */
  onRotateGesture: (angleDeg: number) => void;
}

export interface UseSelectionGesturesOptions {
  /** Ref to the element that receives touch events */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Currently selected performer positions */
  selectedPositions: Position[];
  /** Callbacks for scale and rotation gestures */
  callbacks: SelectionGestureCallbacks;
  /** Whether gesture detection is enabled (typically: has selection) */
  enabled?: boolean;
}

interface FingerState {
  id: number;
  x: number;
  y: number;
}

// ============================================================================
// Utility
// ============================================================================

/** Calculate angle in degrees between two points relative to origin */
function angleBetween(p1: FingerState, p2: FingerState): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

/** Calculate distance between two points */
function distBetween(p1: FingerState, p2: FingerState): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Compute the centroid of a set of positions.
 * Useful externally for applying the scale/rotation transforms.
 */
export function computeCentroid(positions: Position[]): Position {
  if (positions.length === 0) return { x: 0, y: 0 };
  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return {
    x: sum.x / positions.length,
    y: sum.y / positions.length,
  };
}

/**
 * Apply a uniform scale to positions around a centroid.
 * Returns new positions; does not mutate the input.
 */
export function scalePositionsAroundCentroid(
  positions: Position[],
  centroid: Position,
  scale: number,
): Position[] {
  return positions.map((p) => ({
    x: centroid.x + (p.x - centroid.x) * scale,
    y: centroid.y + (p.y - centroid.y) * scale,
    rotation: p.rotation,
  }));
}

/**
 * Rotate positions around a centroid by the given angle in degrees.
 * Returns new positions; does not mutate the input.
 */
export function rotatePositionsAroundCentroid(
  positions: Position[],
  centroid: Position,
  angleDeg: number,
): Position[] {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return positions.map((p) => {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    return {
      x: centroid.x + dx * cos - dy * sin,
      y: centroid.y + dx * sin + dy * cos,
      rotation: p.rotation !== undefined ? p.rotation + angleDeg : undefined,
    };
  });
}

// ============================================================================
// Hook
// ============================================================================

/** Minimum pinch distance change to trigger a scale callback */
const SCALE_DEAD_ZONE = 2; // px
/** Minimum rotation angle change to trigger a rotate callback */
const ROTATE_DEAD_ZONE = 1.5; // degrees

export function useSelectionGestures({
  targetRef,
  selectedPositions,
  callbacks,
  enabled = true,
}: UseSelectionGesturesOptions) {
  const fingersRef = useRef<Map<number, FingerState>>(new Map());
  const prevDistRef = useRef<number | null>(null);
  const prevAngleRef = useRef<number | null>(null);

  const { onPinchScale, onRotateGesture } = callbacks;

  // Only activate when there is an actual selection
  const isActive = enabled && selectedPositions.length >= 2;

  const resetGesture = useCallback(() => {
    prevDistRef.current = null;
    prevAngleRef.current = null;
  }, []);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !isActive) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;

      fingersRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      // When a second finger lands, capture initial distance and angle
      if (fingersRef.current.size === 2) {
        const [f1, f2] = Array.from(fingersRef.current.values());
        prevDistRef.current = distBetween(f1, f2);
        prevAngleRef.current = angleBetween(f1, f2);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!fingersRef.current.has(e.pointerId)) return;

      fingersRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });

      if (fingersRef.current.size !== 2) return;

      const [f1, f2] = Array.from(fingersRef.current.values());
      const currentDist = distBetween(f1, f2);
      const currentAngle = angleBetween(f1, f2);

      // --- Pinch scale ---
      if (prevDistRef.current !== null) {
        const distDelta = currentDist - prevDistRef.current;
        if (Math.abs(distDelta) > SCALE_DEAD_ZONE) {
          // Convert pixel distance change to a scale factor.
          // Positive delta = fingers moving apart = scale up.
          const scaleFactor = currentDist / prevDistRef.current;
          onPinchScale(scaleFactor);
          prevDistRef.current = currentDist;
        }
      }

      // --- Two-finger rotation ---
      if (prevAngleRef.current !== null) {
        let angleDelta = currentAngle - prevAngleRef.current;

        // Normalize to [-180, 180]
        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;

        if (Math.abs(angleDelta) > ROTATE_DEAD_ZONE) {
          onRotateGesture(angleDelta);
          prevAngleRef.current = currentAngle;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingersRef.current.delete(e.pointerId);
      if (fingersRef.current.size < 2) {
        resetGesture();
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      fingersRef.current.delete(e.pointerId);
      resetGesture();
    };

    // Prevent default to avoid browser zooming while doing selection gestures
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
      fingersRef.current.clear();
      resetGesture();
    };
  }, [targetRef, isActive, onPinchScale, onRotateGesture, resetGesture]);
}

export default useSelectionGestures;
