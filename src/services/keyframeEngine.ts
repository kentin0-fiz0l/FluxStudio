/**
 * Keyframe interpolation engine for MetMap animations.
 *
 * Evaluates animated property values at any point in time by interpolating
 * between surrounding keyframes with configurable easing curves.
 */

import type { Animation, Keyframe, EasingType, BezierHandles } from '../contexts/metmap/types';

// ==================== Easing Functions ====================
// All take progress [0,1] and return eased value [0,1]

const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  step: (_t) => 0, // Holds previous value; handled specially in interpolate()
  bezier: (t) => cubicBezier(t, 0.42, 0, 0.58, 1), // Default ease-in-out; overridden by handles
};

// ==================== Cubic Bezier ====================

/**
 * Evaluate a cubic bezier curve at parameter t.
 * The curve is defined by P0=(0,0), P1=(cp1x,cp1y), P2=(cp2x,cp2y), P3=(1,1).
 */
function bezierComponent(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

function bezierComponentDerivative(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

/**
 * Solve for the parametric t where B_x(t) = x using Newton-Raphson.
 * Then evaluate B_y(t) to get the eased value.
 */
export function cubicBezier(
  x: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Newton-Raphson to find t where B_x(t) = x
  let t = x; // initial guess
  for (let i = 0; i < 8; i++) {
    const currentX = bezierComponent(t, cp1x, cp2x) - x;
    if (Math.abs(currentX) < 1e-6) break;
    const dx = bezierComponentDerivative(t, cp1x, cp2x);
    if (Math.abs(dx) < 1e-6) break;
    t -= currentX / dx;
    t = Math.max(0, Math.min(1, t));
  }

  return bezierComponent(t, cp1y, cp2y);
}

/**
 * Apply easing to a [0,1] progress value.
 * For bezier easing, pass handles to use custom control points.
 */
export function applyEasing(
  progress: number,
  easing: EasingType,
  handles?: BezierHandles,
): number {
  if (easing === 'bezier' && handles) {
    return cubicBezier(progress, handles.cp1x, handles.cp1y, handles.cp2x, handles.cp2y);
  }
  const fn = easingFunctions[easing];
  return fn ? fn(progress) : progress;
}

// ==================== Interpolation ====================

/**
 * Interpolate between two values given a progress [0,1] and easing type.
 */
export function interpolate(
  from: number,
  to: number,
  progress: number,
  easing: EasingType,
  handles?: BezierHandles,
): number {
  if (easing === 'step') return from; // Hold until next keyframe
  const easedProgress = applyEasing(Math.max(0, Math.min(1, progress)), easing, handles);
  return from + (to - from) * easedProgress;
}

/**
 * Find the two keyframes surrounding a given time.
 * Returns { before, after } where before.time <= time <= after.time.
 * Returns null for before/after if time is outside keyframe range.
 */
export function getKeyframeRange(
  animation: Animation,
  time: number,
): { before: Keyframe | null; after: Keyframe | null } {
  const kfs = animation.keyframes;
  if (kfs.length === 0) return { before: null, after: null };

  // Before first keyframe
  if (time <= kfs[0].time) return { before: null, after: kfs[0] };

  // After last keyframe
  if (time >= kfs[kfs.length - 1].time) return { before: kfs[kfs.length - 1], after: null };

  // Between two keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].time && time <= kfs[i + 1].time) {
      return { before: kfs[i], after: kfs[i + 1] };
    }
  }

  return { before: kfs[kfs.length - 1], after: null };
}

/**
 * Evaluate an animation's value at a specific time.
 *
 * - If no keyframes, returns undefined (property not animated).
 * - Before the first keyframe, clamps to first keyframe value.
 * - After the last keyframe, clamps to last keyframe value.
 * - Between keyframes, interpolates with the "before" keyframe's easing.
 */
export function evaluateAt(
  animation: Animation,
  time: number,
): number | undefined {
  if (!animation.enabled || animation.keyframes.length === 0) return undefined;

  const { before, after } = getKeyframeRange(animation, time);

  // Before first keyframe: clamp
  if (!before && after) return after.value;

  // After last keyframe: clamp
  if (before && !after) return before.value;

  // Between two keyframes: interpolate
  if (before && after) {
    const duration = after.time - before.time;
    if (duration <= 0) return before.value;
    const progress = (time - before.time) / duration;
    return interpolate(before.value, after.value, progress, before.easing, before.bezierHandles);
  }

  return undefined;
}

/**
 * Evaluate all animations on a section at a given time.
 * Returns a map of property → value for all animated properties.
 */
export function evaluateAnimations(
  animations: Animation[],
  time: number,
): Partial<Record<string, number>> {
  const values: Partial<Record<string, number>> = {};
  for (const anim of animations) {
    const val = evaluateAt(anim, time);
    if (val !== undefined) {
      values[anim.property] = val;
    }
  }
  return values;
}

/**
 * Sort keyframes by time (ascending). Mutates in place.
 */
export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.sort((a, b) => a.time - b.time);
}

/**
 * Add a keyframe to an animation, maintaining sort order.
 * Returns a new keyframes array (does not mutate).
 */
export function addKeyframe(
  animation: Animation,
  keyframe: Keyframe,
): Keyframe[] {
  const kfs = [...animation.keyframes, keyframe];
  return sortKeyframes(kfs);
}

/**
 * Remove a keyframe by ID from an animation.
 * Returns a new keyframes array (does not mutate).
 */
export function removeKeyframe(
  animation: Animation,
  keyframeId: string,
): Keyframe[] {
  return animation.keyframes.filter(kf => kf.id !== keyframeId);
}

/**
 * Update a keyframe's time and/or value, maintaining sort order.
 * Returns a new keyframes array (does not mutate).
 */
export function updateKeyframe(
  animation: Animation,
  keyframeId: string,
  changes: Partial<Pick<Keyframe, 'time' | 'value' | 'easing' | 'bezierHandles'>>,
): Keyframe[] {
  const kfs = animation.keyframes.map(kf =>
    kf.id === keyframeId ? { ...kf, ...changes } : kf,
  );
  return sortKeyframes(kfs);
}
