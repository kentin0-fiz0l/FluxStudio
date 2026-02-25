/**
 * Keyframe Engine Tests
 *
 * Tests for the MetMap keyframe interpolation engine: easing functions,
 * cubic bezier, interpolation, keyframe range finding, and evaluation.
 */

import { describe, it, expect } from 'vitest';
import {
  cubicBezier,
  applyEasing,
  interpolate,
  getKeyframeRange,
  evaluateAt,
  evaluateAnimations,
  sortKeyframes,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
} from '../keyframeEngine';
import type { Animation, Keyframe, EasingType } from '../../contexts/metmap/types';

// ============================================================================
// HELPERS
// ============================================================================

function makeKeyframe(id: string, time: number, value: number, easing: EasingType = 'linear'): Keyframe {
  return { id, time, value, easing };
}

function makeAnimation(
  keyframes: Keyframe[],
  property = 'tempo',
  enabled = true,
): Animation {
  return { id: `anim-${property}`, property: property as any, keyframes, enabled };
}

// ============================================================================
// CUBIC BEZIER
// ============================================================================

describe('cubicBezier', () => {
  it('should return 0 for x <= 0', () => {
    expect(cubicBezier(0, 0.42, 0, 0.58, 1)).toBe(0);
    expect(cubicBezier(-0.5, 0.42, 0, 0.58, 1)).toBe(0);
  });

  it('should return 1 for x >= 1', () => {
    expect(cubicBezier(1, 0.42, 0, 0.58, 1)).toBe(1);
    expect(cubicBezier(1.5, 0.42, 0, 0.58, 1)).toBe(1);
  });

  it('should return approximately 0.5 for x=0.5 with symmetric curve', () => {
    const result = cubicBezier(0.5, 0.42, 0, 0.58, 1);
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('should approximate linear for control points (0,0,1,1)', () => {
    const result = cubicBezier(0.5, 0, 0, 1, 1);
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('should handle ease-in curve (0.42, 0, 1, 1)', () => {
    const mid = cubicBezier(0.5, 0.42, 0, 1, 1);
    // ease-in should be below linear at midpoint
    expect(mid).toBeLessThan(0.5);
  });

  it('should handle ease-out curve (0, 0, 0.58, 1)', () => {
    const mid = cubicBezier(0.5, 0, 0, 0.58, 1);
    // ease-out should be above linear at midpoint
    expect(mid).toBeGreaterThan(0.5);
  });

  it('should be monotonically increasing for standard curves', () => {
    let prev = 0;
    for (let x = 0; x <= 1; x += 0.1) {
      const val = cubicBezier(x, 0.25, 0.1, 0.25, 1);
      expect(val).toBeGreaterThanOrEqual(prev - 0.001); // small tolerance
      prev = val;
    }
  });
});

// ============================================================================
// APPLY EASING
// ============================================================================

describe('applyEasing', () => {
  it('should return t for linear easing', () => {
    expect(applyEasing(0, 'linear')).toBe(0);
    expect(applyEasing(0.5, 'linear')).toBe(0.5);
    expect(applyEasing(1, 'linear')).toBe(1);
  });

  it('should return t*t for easeIn', () => {
    expect(applyEasing(0.5, 'easeIn')).toBeCloseTo(0.25, 5);
    expect(applyEasing(0, 'easeIn')).toBe(0);
    expect(applyEasing(1, 'easeIn')).toBe(1);
  });

  it('should return t*(2-t) for easeOut', () => {
    expect(applyEasing(0.5, 'easeOut')).toBeCloseTo(0.75, 5);
    expect(applyEasing(0, 'easeOut')).toBe(0);
    expect(applyEasing(1, 'easeOut')).toBe(1);
  });

  it('should handle easeInOut correctly', () => {
    expect(applyEasing(0, 'easeInOut')).toBe(0);
    expect(applyEasing(1, 'easeInOut')).toBe(1);
    // At t=0.25, in first half: 2*t*t = 2*0.0625 = 0.125
    expect(applyEasing(0.25, 'easeInOut')).toBeCloseTo(0.125, 5);
    // At t=0.75, in second half: -1 + (4 - 2*0.75)*0.75 = -1 + 1.875 = 0.875
    expect(applyEasing(0.75, 'easeInOut')).toBeCloseTo(0.875, 5);
  });

  it('should return 0 for step easing (holds previous value)', () => {
    expect(applyEasing(0, 'step')).toBe(0);
    expect(applyEasing(0.5, 'step')).toBe(0);
    expect(applyEasing(0.99, 'step')).toBe(0);
  });

  it('should use default bezier when no handles provided', () => {
    const result = applyEasing(0.5, 'bezier');
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('should use custom handles for bezier easing', () => {
    const result = applyEasing(0.5, 'bezier', { cp1x: 0.42, cp1y: 0, cp2x: 0.58, cp2y: 1 });
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('should fallback to linear for unknown easing type', () => {
    const result = applyEasing(0.5, 'unknown' as EasingType);
    expect(result).toBe(0.5);
  });
});

// ============================================================================
// INTERPOLATE
// ============================================================================

describe('interpolate', () => {
  it('should interpolate linearly between two values', () => {
    expect(interpolate(0, 100, 0.5, 'linear')).toBe(50);
    expect(interpolate(0, 100, 0, 'linear')).toBe(0);
    expect(interpolate(0, 100, 1, 'linear')).toBe(100);
  });

  it('should return "from" value for step easing', () => {
    expect(interpolate(10, 90, 0.5, 'step')).toBe(10);
    expect(interpolate(10, 90, 0.99, 'step')).toBe(10);
  });

  it('should apply easeIn to interpolation', () => {
    const result = interpolate(0, 100, 0.5, 'easeIn');
    expect(result).toBeCloseTo(25, 1);
  });

  it('should apply easeOut to interpolation', () => {
    const result = interpolate(0, 100, 0.5, 'easeOut');
    expect(result).toBeCloseTo(75, 1);
  });

  it('should clamp progress to [0,1]', () => {
    expect(interpolate(0, 100, -0.5, 'linear')).toBe(0);
    expect(interpolate(0, 100, 1.5, 'linear')).toBe(100);
  });

  it('should handle negative value ranges', () => {
    expect(interpolate(-50, 50, 0.5, 'linear')).toBe(0);
    expect(interpolate(100, -100, 0.5, 'linear')).toBe(0);
  });

  it('should handle equal from and to values', () => {
    expect(interpolate(42, 42, 0.5, 'linear')).toBe(42);
  });

  it('should interpolate with bezier easing and custom handles', () => {
    const result = interpolate(0, 100, 0.5, 'bezier', { cp1x: 0, cp1y: 0, cp2x: 1, cp2y: 1 });
    expect(result).toBeCloseTo(50, 0);
  });
});

// ============================================================================
// GET KEYFRAME RANGE
// ============================================================================

describe('getKeyframeRange', () => {
  it('should return null/null for empty keyframes', () => {
    const anim = makeAnimation([]);
    const { before, after } = getKeyframeRange(anim, 5);
    expect(before).toBeNull();
    expect(after).toBeNull();
  });

  it('should return null/first when time is before first keyframe', () => {
    const anim = makeAnimation([makeKeyframe('k1', 5, 100)]);
    const { before, after } = getKeyframeRange(anim, 2);
    expect(before).toBeNull();
    expect(after).toEqual(expect.objectContaining({ id: 'k1' }));
  });

  it('should return last/null when time is after last keyframe', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    const { before, after } = getKeyframeRange(anim, 15);
    expect(before).toEqual(expect.objectContaining({ id: 'k2' }));
    expect(after).toBeNull();
  });

  it('should find surrounding keyframes for time between them', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50), makeKeyframe('k3', 10, 100)];
    const anim = makeAnimation(kfs);
    const { before, after } = getKeyframeRange(anim, 7);
    expect(before!.id).toBe('k2');
    expect(after!.id).toBe('k3');
  });

  it('should return surrounding keyframes when time matches a middle keyframe', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50), makeKeyframe('k3', 10, 100)];
    const anim = makeAnimation(kfs);
    const { before, after } = getKeyframeRange(anim, 5);
    // time=5 falls in the range [kfs[1].time, kfs[2].time], so before=k2, after=k2
    // Actually it matches kfs[1].time exactly so it's inside [k1,k2] range: before=k1, after=k2
    expect(before!.id).toBe('k1');
    expect(after!.id).toBe('k2');
  });

  it('should handle single keyframe at time 0', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 42)]);
    const { before, after } = getKeyframeRange(anim, 0);
    expect(before).toBeNull();
    expect(after!.id).toBe('k1');
  });

  it('should handle time exactly at last keyframe', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    const { before, after } = getKeyframeRange(anim, 10);
    expect(before!.id).toBe('k2');
    expect(after).toBeNull();
  });
});

// ============================================================================
// EVALUATE AT
// ============================================================================

describe('evaluateAt', () => {
  it('should return undefined for disabled animation', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 100)], 'tempo', false);
    expect(evaluateAt(anim, 0)).toBeUndefined();
  });

  it('should return undefined for empty keyframes', () => {
    const anim = makeAnimation([], 'tempo', true);
    expect(evaluateAt(anim, 0)).toBeUndefined();
  });

  it('should clamp to first keyframe value before first keyframe', () => {
    const anim = makeAnimation([makeKeyframe('k1', 5, 100)]);
    expect(evaluateAt(anim, 0)).toBe(100);
  });

  it('should clamp to last keyframe value after last keyframe', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 20)).toBe(100);
  });

  it('should interpolate between two keyframes linearly', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 5)).toBeCloseTo(50, 1);
  });

  it('should handle step easing by holding previous value', () => {
    const kfs = [makeKeyframe('k1', 0, 0, 'step'), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 5)).toBe(0);
    expect(evaluateAt(anim, 9.99)).toBe(0);
  });

  it('should handle easeIn between keyframes', () => {
    const kfs = [makeKeyframe('k1', 0, 0, 'easeIn'), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    const val = evaluateAt(anim, 5)!;
    expect(val).toBeCloseTo(25, 0);
  });

  it('should handle easeOut between keyframes', () => {
    const kfs = [makeKeyframe('k1', 0, 0, 'easeOut'), makeKeyframe('k2', 10, 100)];
    const anim = makeAnimation(kfs);
    const val = evaluateAt(anim, 5)!;
    expect(val).toBeCloseTo(75, 0);
  });

  it('should handle zero-duration between keyframes', () => {
    const kfs = [makeKeyframe('k1', 5, 0), makeKeyframe('k2', 5, 100)];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 5)).toBe(0);
  });

  it('should evaluate at exact keyframe time', () => {
    const kfs = [makeKeyframe('k1', 0, 10), makeKeyframe('k2', 5, 50), makeKeyframe('k3', 10, 90)];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 0)).toBe(10);
  });

  it('should interpolate correctly across three keyframes', () => {
    const kfs = [
      makeKeyframe('k1', 0, 0),
      makeKeyframe('k2', 10, 100),
      makeKeyframe('k3', 20, 50),
    ];
    const anim = makeAnimation(kfs);
    expect(evaluateAt(anim, 5)).toBeCloseTo(50, 1);
    expect(evaluateAt(anim, 15)).toBeCloseTo(75, 1);
  });
});

// ============================================================================
// EVALUATE ANIMATIONS
// ============================================================================

describe('evaluateAnimations', () => {
  it('should return values for all enabled animations', () => {
    const anims = [
      makeAnimation([makeKeyframe('k1', 0, 120), makeKeyframe('k2', 10, 140)], 'tempo'),
      makeAnimation([makeKeyframe('k1', 0, 0.5), makeKeyframe('k2', 10, 1.0)], 'volume'),
    ];
    const values = evaluateAnimations(anims, 5);
    expect(values.tempo).toBeCloseTo(130, 1);
    expect(values.volume).toBeCloseTo(0.75, 2);
  });

  it('should skip disabled animations', () => {
    const anims = [
      makeAnimation([makeKeyframe('k1', 0, 120)], 'tempo', true),
      makeAnimation([makeKeyframe('k1', 0, 0.5)], 'volume', false),
    ];
    const values = evaluateAnimations(anims, 0);
    expect(values.tempo).toBe(120);
    expect(values.volume).toBeUndefined();
  });

  it('should return empty object for no animations', () => {
    const values = evaluateAnimations([], 0);
    expect(Object.keys(values).length).toBe(0);
  });

  it('should handle animations with empty keyframes', () => {
    const anims = [makeAnimation([], 'tempo')];
    const values = evaluateAnimations(anims, 0);
    expect(values.tempo).toBeUndefined();
  });
});

// ============================================================================
// SORT KEYFRAMES
// ============================================================================

describe('sortKeyframes', () => {
  it('should sort keyframes by time ascending', () => {
    const kfs = [makeKeyframe('k3', 10, 100), makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50)];
    const sorted = sortKeyframes(kfs);
    expect(sorted[0].time).toBe(0);
    expect(sorted[1].time).toBe(5);
    expect(sorted[2].time).toBe(10);
  });

  it('should handle already sorted keyframes', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50)];
    const sorted = sortKeyframes(kfs);
    expect(sorted[0].id).toBe('k1');
    expect(sorted[1].id).toBe('k2');
  });

  it('should handle single keyframe', () => {
    const kfs = [makeKeyframe('k1', 5, 42)];
    const sorted = sortKeyframes(kfs);
    expect(sorted.length).toBe(1);
    expect(sorted[0].id).toBe('k1');
  });

  it('should handle empty array', () => {
    const sorted = sortKeyframes([]);
    expect(sorted.length).toBe(0);
  });
});

// ============================================================================
// ADD KEYFRAME
// ============================================================================

describe('addKeyframe', () => {
  it('should add a keyframe and maintain sort order', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0), makeKeyframe('k3', 10, 100)]);
    const newKfs = addKeyframe(anim, makeKeyframe('k2', 5, 50));
    expect(newKfs.length).toBe(3);
    expect(newKfs[1].id).toBe('k2');
  });

  it('should add keyframe to empty animation', () => {
    const anim = makeAnimation([]);
    const newKfs = addKeyframe(anim, makeKeyframe('k1', 0, 42));
    expect(newKfs.length).toBe(1);
    expect(newKfs[0].id).toBe('k1');
  });

  it('should add keyframe at the end', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = addKeyframe(anim, makeKeyframe('k2', 10, 100));
    expect(newKfs.length).toBe(2);
    expect(newKfs[1].id).toBe('k2');
  });

  it('should add keyframe at the beginning', () => {
    const anim = makeAnimation([makeKeyframe('k2', 10, 100)]);
    const newKfs = addKeyframe(anim, makeKeyframe('k1', 0, 0));
    expect(newKfs.length).toBe(2);
    expect(newKfs[0].id).toBe('k1');
  });

  it('should not mutate original keyframes array', () => {
    const kfs = [makeKeyframe('k1', 0, 0)];
    const anim = makeAnimation(kfs);
    const newKfs = addKeyframe(anim, makeKeyframe('k2', 5, 50));
    expect(anim.keyframes.length).toBe(1);
    expect(newKfs.length).toBe(2);
  });
});

// ============================================================================
// REMOVE KEYFRAME
// ============================================================================

describe('removeKeyframe', () => {
  it('should remove a keyframe by ID', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50), makeKeyframe('k3', 10, 100)]);
    const newKfs = removeKeyframe(anim, 'k2');
    expect(newKfs.length).toBe(2);
    expect(newKfs.find(kf => kf.id === 'k2')).toBeUndefined();
  });

  it('should return same length array when ID not found', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = removeKeyframe(anim, 'nonexistent');
    expect(newKfs.length).toBe(1);
  });

  it('should return empty array when removing last keyframe', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = removeKeyframe(anim, 'k1');
    expect(newKfs.length).toBe(0);
  });

  it('should not mutate original keyframes array', () => {
    const kfs = [makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50)];
    const anim = makeAnimation(kfs);
    const newKfs = removeKeyframe(anim, 'k1');
    expect(anim.keyframes.length).toBe(2);
    expect(newKfs.length).toBe(1);
  });
});

// ============================================================================
// UPDATE KEYFRAME
// ============================================================================

describe('updateKeyframe', () => {
  it('should update a keyframe value', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)]);
    const newKfs = updateKeyframe(anim, 'k2', { value: 200 });
    expect(newKfs.find(kf => kf.id === 'k2')!.value).toBe(200);
  });

  it('should update a keyframe time and re-sort', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0), makeKeyframe('k2', 5, 50), makeKeyframe('k3', 10, 100)]);
    const newKfs = updateKeyframe(anim, 'k1', { time: 15 });
    expect(newKfs[newKfs.length - 1].id).toBe('k1');
    expect(newKfs[newKfs.length - 1].time).toBe(15);
  });

  it('should update easing type', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = updateKeyframe(anim, 'k1', { easing: 'easeIn' });
    expect(newKfs[0].easing).toBe('easeIn');
  });

  it('should update bezier handles', () => {
    const handles = { cp1x: 0.1, cp1y: 0.2, cp2x: 0.3, cp2y: 0.4 };
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = updateKeyframe(anim, 'k1', { bezierHandles: handles });
    expect(newKfs[0].bezierHandles).toEqual(handles);
  });

  it('should not mutate original keyframes', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0)]);
    const newKfs = updateKeyframe(anim, 'k1', { value: 999 });
    expect(anim.keyframes[0].value).toBe(0);
    expect(newKfs[0].value).toBe(999);
  });

  it('should leave non-matching keyframes unchanged', () => {
    const anim = makeAnimation([makeKeyframe('k1', 0, 0), makeKeyframe('k2', 10, 100)]);
    const newKfs = updateKeyframe(anim, 'k1', { value: 50 });
    expect(newKfs.find(kf => kf.id === 'k2')!.value).toBe(100);
  });
});
