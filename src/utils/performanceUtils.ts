/**
 * Performance Utilities - FluxStudio Formation Canvas
 *
 * Provides viewport culling, RAF throttling, and batched position
 * updates to maintain 60fps with 200+ performers on the canvas.
 */

import type { Position } from '../services/formationTypes';

// ============================================================================
// Viewport Culling
// ============================================================================

/**
 * Determine whether a performer at `position` (in 0-100 normalized
 * coordinates) falls within the currently visible viewport.
 *
 * The visible area depends on the canvas zoom level, pan offset,
 * and the size of the scroll container. Performers outside the
 * viewport can be skipped during Canvas2D rendering.
 *
 * @param position  - Performer position in normalized 0-100 coords
 * @param zoom      - Current zoom level (1 = 100%)
 * @param pan       - Current canvas pan offset in pixels { x, y }
 * @param canvasSize - Full canvas dimensions in pixels { width, height }
 * @param viewportSize - Visible container dimensions in pixels { width, height }
 * @param margin    - Extra margin in normalized units (default: 2)
 *                    to avoid popping at edges
 * @returns true if the performer should be rendered
 */
export function isInViewport(
  position: Position,
  zoom: number,
  pan: { x: number; y: number },
  canvasSize: { width: number; height: number },
  viewportSize: { width: number; height: number },
  margin: number = 2,
): boolean {
  // Convert performer's normalized position to pixel coordinates on the canvas
  const pixelX = (position.x / 100) * canvasSize.width;
  const pixelY = (position.y / 100) * canvasSize.height;

  // The canvas element is scaled by zoom and translated by pan.x, pan.y.
  // The visible window starts at -pan.x/zoom and extends viewportSize/zoom.
  const visibleLeft = -pan.x / zoom;
  const visibleTop = -pan.y / zoom;
  const visibleRight = visibleLeft + viewportSize.width / zoom;
  const visibleBottom = visibleTop + viewportSize.height / zoom;

  // Margin in pixels so performers don't pop in/out at the exact edge
  const marginPx = (margin / 100) * Math.max(canvasSize.width, canvasSize.height);

  return (
    pixelX >= visibleLeft - marginPx &&
    pixelX <= visibleRight + marginPx &&
    pixelY >= visibleTop - marginPx &&
    pixelY <= visibleBottom + marginPx
  );
}

// ============================================================================
// RAF Throttle
// ============================================================================

/**
 * Wrap a function so it only runs once per animation frame.
 * Subsequent calls within the same frame are dropped, and only
 * the latest arguments are used when the callback fires.
 *
 * Returns a throttled function with a `.cancel()` method to clean up.
 *
 * @example
 *   const throttledMove = throttleRAF((pos: Position) => updateCanvas(pos));
 *   element.addEventListener('pointermove', (e) => throttledMove(getPos(e)));
 *   // cleanup:
 *   throttledMove.cancel();
 */
export function throttleRAF<Args extends unknown[]>(
  fn: (...args: Args) => void,
): ((...args: Args) => void) & { cancel: () => void } {
  let rafId: number | null = null;
  let latestArgs: Args | null = null;

  const throttled = (...args: Args): void => {
    latestArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (latestArgs !== null) {
          fn(...latestArgs);
          latestArgs = null;
        }
      });
    }
  };

  throttled.cancel = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestArgs = null;
  };

  return throttled;
}

// ============================================================================
// Batched Position Updates
// ============================================================================

/**
 * Merge a list of individual position updates into a single new Map.
 *
 * Instead of calling setState N times (one per performer being dragged
 * or animated), collect all changes and apply them in one pass to
 * produce a new Map reference. This triggers a single React re-render.
 *
 * @param current - The current positions Map (not mutated)
 * @param updates - Array of [performerId, newPosition] tuples
 * @returns A new Map with all updates applied, or the same reference
 *          if nothing changed
 */
export function batchPositionUpdates(
  current: Map<string, Position>,
  updates: [string, Position][],
): Map<string, Position> {
  if (updates.length === 0) return current;

  // Fast path: check if any value actually changed
  let hasChange = false;
  for (const [id, pos] of updates) {
    const existing = current.get(id);
    if (
      !existing ||
      existing.x !== pos.x ||
      existing.y !== pos.y ||
      existing.rotation !== pos.rotation
    ) {
      hasChange = true;
      break;
    }
  }

  if (!hasChange) return current;

  // Create new Map with updates applied
  const next = new Map(current);
  for (const [id, pos] of updates) {
    next.set(id, pos);
  }
  return next;
}

// ============================================================================
// Debounce
// ============================================================================

/**
 * Debounce a function. During rapid calls (e.g., drag), the function
 * is delayed by `delayMs`. An optional `immediate` mode fires the
 * function on the leading edge and suppresses subsequent calls.
 *
 * Returns a debounced function with `.cancel()` and `.flush()`.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Args | null = null;

  const debounced = (...args: Args): void => {
    latestArgs = args;

    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (latestArgs !== null) {
        fn(...latestArgs);
        latestArgs = null;
      }
    }, delayMs);
  };

  debounced.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    latestArgs = null;
  };

  debounced.flush = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
      if (latestArgs !== null) {
        fn(...latestArgs);
        latestArgs = null;
      }
    }
  };

  return debounced;
}
