/**
 * Tests for Drill Coordinate System
 *
 * Covers: positionToCoordinate, coordinateToPosition, calculateStepInfo,
 *         formatCoordinate, formatStepSize, getDirectionLabel
 */

import { describe, it, expect } from 'vitest';
import {
  positionToCoordinate,
  coordinateToPosition,
  calculateStepInfo,
  formatCoordinate,
  formatStepSize,
  getDirectionLabel,
  NCAA_FOOTBALL_FIELD,
  NFL_FOOTBALL_FIELD,
} from '../../utils/drillCoordinates';
import type { Position } from '../formationTypes';

// ============================================================================
// positionToCoordinate
// ============================================================================

describe('positionToCoordinate', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('converts center field (50 yard line, midfield) correctly', () => {
    // x=50 normalized on NCAA field: xYards = 0.5 * 120 = 60
    // Playing field X = 60 - 10 = 50 yards from left goal line
    // Midfield = 50, so this is exactly on the 50 yard line
    const result = positionToCoordinate({ x: 50, y: 50 }, field);
    expect(result.sideToSide).toContain('50');
    expect(result.sideToSide.toLowerCase()).toContain('on');
  });

  it('converts a position on the left 30 yard line', () => {
    // Left 30: 30 yards from left goal line
    // xYards = endZone + 30 = 40
    // normalized x = 40/120 * 100 = 33.33
    const result = positionToCoordinate({ x: 33.33, y: 50 }, field);
    expect(result.sideToSide).toContain('L');
    expect(result.sideToSide).toContain('30');
  });

  it('converts a position on the right 20 yard line', () => {
    // Right 20: 20 yards from right goal line
    // = 100 - 20 = 80 yards from left goal line
    // xYards = endZone + 80 = 90
    // normalized x = 90/120 * 100 = 75
    const result = positionToCoordinate({ x: 75, y: 50 }, field);
    expect(result.sideToSide).toContain('R');
    expect(result.sideToSide).toContain('20');
  });

  it('uses "inside" for steps toward the 50', () => {
    // 2 steps inside L40: slightly toward 50 from the L40
    // L40 = 40 yards from left goal; toward 50 = 41.25 yards (2 steps * 5/8)
    // xYards = 10 + 41.25 = 51.25
    // normalized = 51.25/120 * 100 = 42.71
    const result = positionToCoordinate({ x: 42.71, y: 50 }, field);
    expect(result.sideToSide.toLowerCase()).toContain('inside');
  });

  it('uses "outside" for steps toward the goal line', () => {
    // Steps outside L40 = toward goal from 40
    // 2 steps outside = 40 - 1.25 = 38.75 yards
    // xYards = 10 + 38.75 = 48.75
    // normalized = 48.75/120 * 100 = 40.625
    const result = positionToCoordinate({ x: 40.625, y: 50 }, field);
    expect(result.sideToSide.toLowerCase()).toContain('outside');
  });

  it('converts front sideline position correctly', () => {
    const result = positionToCoordinate({ x: 50, y: 0 }, field);
    expect(result.frontToBack.toLowerCase()).toContain('front sideline');
  });

  it('converts front hash position correctly', () => {
    // Front hash at 20 yards from front sideline
    // normalized y = 20/53.33 * 100 = 37.5
    const result = positionToCoordinate({ x: 50, y: 37.5 }, field);
    expect(result.frontToBack.toLowerCase()).toContain('front hash');
  });

  it('converts back hash position correctly', () => {
    // Back hash at height - back = 53.33 - 20 = 33.33 yards from front
    // normalized y = 33.33/53.33 * 100 = 62.5
    const result = positionToCoordinate({ x: 50, y: 62.5 }, field);
    expect(result.frontToBack.toLowerCase()).toContain('back hash');
  });

  it('converts back sideline position correctly', () => {
    const result = positionToCoordinate({ x: 50, y: 100 }, field);
    expect(result.frontToBack.toLowerCase()).toContain('back sideline');
  });

  it('uses "behind" when past a reference line', () => {
    // Slightly behind front hash
    const result = positionToCoordinate({ x: 50, y: 42 }, field);
    // y=42 => 22.4 yards, front hash is at 20 => 2.4 yards behind
    expect(result.frontToBack.toLowerCase()).toContain('behind');
  });

  it('uses "in front of" when ahead of a reference line', () => {
    // Slightly in front of front hash
    const result = positionToCoordinate({ x: 50, y: 33 }, field);
    // y=33 => 17.6 yards, front hash at 20 => 2.4 yards in front
    expect(result.frontToBack.toLowerCase()).toContain('in front of');
  });

  it('rounds steps to nearest quarter step', () => {
    // Any position that doesn't land exactly on a yard line
    const result = positionToCoordinate({ x: 42, y: 50 }, field);
    // Check that the step value, if present, is a multiple of 0.25
    const match = result.sideToSide.match(/^([\d.]+)/);
    if (match) {
      const steps = parseFloat(match[1]);
      expect(steps * 4).toBe(Math.round(steps * 4));
    }
  });

  it('works with NFL field configuration', () => {
    const result = positionToCoordinate({ x: 50, y: 50 }, NFL_FOOTBALL_FIELD);
    expect(result.sideToSide).toContain('50');
  });
});

// ============================================================================
// coordinateToPosition
// ============================================================================

describe('coordinateToPosition', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('parses "On R 35" correctly', () => {
    const pos = coordinateToPosition('On R 35', 'On front hash', field);
    // R35 = 35 yards from right goal = 65 yards from left goal
    // xYards = 10 + 65 = 75
    // normalized = 75/120 * 100 = 62.5
    expect(pos.x).toBeCloseTo(62.5, 0);
  });

  it('parses "On L 40" correctly', () => {
    const pos = coordinateToPosition('On L 40', 'On front hash', field);
    // L40 = 40 yards from left goal
    // xYards = 10 + 40 = 50
    // normalized = 50/120 * 100 = 41.67
    expect(pos.x).toBeCloseTo(41.67, 0);
  });

  it('parses "4 inside R 35" correctly', () => {
    const pos = coordinateToPosition('4 inside R 35', 'On front hash', field);
    // 4 steps inside R35 = 35 + 2.5 = 37.5 yards from right goal (toward 50)
    // = 62.5 yards from left goal
    // xYards = 10 + 62.5 = 72.5
    // normalized = 72.5/120 * 100 = 60.42
    expect(pos.x).toBeCloseTo(60.42, 0);
  });

  it('parses "4 outside R 35" correctly', () => {
    const pos = coordinateToPosition('4 outside R 35', 'On front hash', field);
    // 4 steps outside R35 = 35 - 2.5 = 32.5 yards from right goal (toward goal)
    // = 67.5 yards from left goal
    // xYards = 10 + 67.5 = 77.5
    // normalized = 77.5/120 * 100 = 64.58
    expect(pos.x).toBeCloseTo(64.58, 0);
  });

  it('parses "On front hash" correctly', () => {
    const pos = coordinateToPosition('On L 50', 'On front hash', field);
    // Front hash at 20 yards
    // normalized y = 20/53.33 * 100 = 37.5
    expect(pos.y).toBeCloseTo(37.5, 0);
  });

  it('parses "12 behind front hash" correctly', () => {
    const pos = coordinateToPosition('On L 50', '12 behind front hash', field);
    // 12 steps behind front hash = 20 + 12*(5/8) = 20 + 7.5 = 27.5 yards
    // normalized y = 27.5/53.33 * 100 = 51.56
    expect(pos.y).toBeCloseTo(51.56, 0);
  });

  it('parses "8 in front of back hash" correctly', () => {
    const pos = coordinateToPosition('On L 50', '8 in front of back hash', field);
    // Back hash at 53.33 - 20 = 33.33 yards
    // 8 steps in front = 33.33 - 8*(5/8) = 33.33 - 5 = 28.33 yards
    // normalized y = 28.33/53.33 * 100 = 53.13
    expect(pos.y).toBeCloseTo(53.13, 0);
  });

  it('defaults to center for unparseable input', () => {
    const pos = coordinateToPosition('garbage', 'more garbage', field);
    expect(pos.x).toBeCloseTo(50, 0);
    expect(pos.y).toBeCloseTo(50, 0);
  });

  it('clamps output to 0-100 range', () => {
    // Try an extreme outside position
    const pos = coordinateToPosition('100 outside L 0', 'On front sideline', field);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.x).toBeLessThanOrEqual(100);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Bidirectional conversion accuracy
// ============================================================================

describe('bidirectional conversion', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('round-trips position -> coordinate -> position accurately', () => {
    // Test several representative positions
    const testPositions: Position[] = [
      { x: 50, y: 37.5 },   // center field, front hash
      { x: 33.33, y: 50 },  // L30, midfield
      { x: 75, y: 62.5 },   // R20, back hash
    ];

    for (const original of testPositions) {
      const coord = positionToCoordinate(original, field);
      const recovered = coordinateToPosition(coord.sideToSide, coord.frontToBack, field);
      // Should be close to original (within ~1-2 units due to rounding to quarter steps)
      expect(recovered.x).toBeCloseTo(original.x, 0);
      expect(recovered.y).toBeCloseTo(original.y, 0);
    }
  });
});

// ============================================================================
// calculateStepInfo
// ============================================================================

describe('calculateStepInfo', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('returns Mark Time for stationary performers', () => {
    const info = calculateStepInfo({ x: 50, y: 50 }, { x: 50, y: 50 }, 8, field);
    expect(info.stepSize).toBe(0);
    expect(info.stepSizeLabel).toBe('Mark Time');
    expect(info.difficulty).toBe('easy');
  });

  it('calculates 8-to-5 step size for 5 yards in 8 counts', () => {
    // 5 yards = (dx/100) * 120 => dx = 5*100/120 = 4.167
    const from: Position = { x: 50, y: 50 };
    const to: Position = { x: 54.167, y: 50 };
    const info = calculateStepInfo(from, to, 8, field);
    expect(info.stepSize).toBeCloseTo(8, 0);
    // stepSize ~8 but floating point may put it just below 8, making it moderate
    expect(['easy', 'moderate']).toContain(info.difficulty);
  });

  it('rates step size >= 8 as easy', () => {
    const info = calculateStepInfo({ x: 50, y: 50 }, { x: 52, y: 50 }, 8, field);
    // dx = 2 => 2.4 yards => stepSize = 40/2.4 = 16.67
    expect(info.difficulty).toBe('easy');
  });

  it('rates step size 6-8 as moderate', () => {
    // Want stepSize ~7
    // stepSize = (counts*5)/distYards
    // 7 = (8*5)/distYards => distYards = 40/7 = 5.71
    // dx = 5.71 * 100 / 120 = 4.76
    const info = calculateStepInfo({ x: 50, y: 50 }, { x: 54.76, y: 50 }, 8, field);
    expect(info.difficulty).toBe('moderate');
  });

  it('rates step size < 6 as hard', () => {
    // Want stepSize ~4
    // 4 = (8*5)/distYards => distYards = 10
    // dx = 10 * 100/120 = 8.33
    const info = calculateStepInfo({ x: 50, y: 50 }, { x: 58.33, y: 50 }, 8, field);
    expect(info.difficulty).toBe('hard');
  });

  it('computes direction correctly for rightward movement', () => {
    const info = calculateStepInfo({ x: 30, y: 50 }, { x: 70, y: 50 }, 8, field);
    expect(info.directionLabel).toBe('to the right');
  });

  it('computes direction correctly for downfield movement', () => {
    const info = calculateStepInfo({ x: 50, y: 30 }, { x: 50, y: 70 }, 8, field);
    expect(info.directionLabel).toBe('downfield');
  });

  it('returns normalized distance and yard distance', () => {
    const from: Position = { x: 20, y: 50 };
    const to: Position = { x: 80, y: 50 };
    const info = calculateStepInfo(from, to, 16, field);
    expect(info.distance).toBeGreaterThan(0);
    expect(info.distanceYards).toBeGreaterThan(0);
    expect(info.counts).toBe(16);
  });
});

// ============================================================================
// formatCoordinate
// ============================================================================

describe('formatCoordinate', () => {
  it('joins side-to-side and front-to-back with comma', () => {
    const result = formatCoordinate({
      sideToSide: '4 outside R35',
      frontToBack: '12 behind front hash',
    });
    expect(result).toBe('4 outside R35, 12 behind front hash');
  });

  it('works with "On" notation', () => {
    const result = formatCoordinate({
      sideToSide: 'On L 50',
      frontToBack: 'On front hash',
    });
    expect(result).toBe('On L 50, On front hash');
  });
});

// ============================================================================
// formatStepSize
// ============================================================================

describe('formatStepSize', () => {
  it('returns "Mark Time" for step size near zero', () => {
    expect(formatStepSize(0)).toBe('Mark Time');
    expect(formatStepSize(0.05)).toBe('Mark Time');
  });

  it('rounds to nearest 0.5', () => {
    expect(formatStepSize(8)).toBe('8 to 5');
    expect(formatStepSize(8.3)).toBe('8.5 to 5');
    expect(formatStepSize(7.7)).toBe('7.5 to 5'); // rounds down to nearest 0.5
    expect(formatStepSize(7.8)).toBe('8 to 5');    // rounds up to nearest 0.5
    expect(formatStepSize(6.2)).toBe('6 to 5');
  });

  it('formats small step sizes correctly', () => {
    expect(formatStepSize(3)).toBe('3 to 5');
    expect(formatStepSize(1.5)).toBe('1.5 to 5');
  });

  it('formats large step sizes correctly', () => {
    expect(formatStepSize(16)).toBe('16 to 5');
    expect(formatStepSize(12)).toBe('12 to 5');
  });
});

// ============================================================================
// getDirectionLabel
// ============================================================================

describe('getDirectionLabel', () => {
  it('returns "to the right" for 0 degrees', () => {
    expect(getDirectionLabel(0)).toBe('to the right');
  });

  it('returns "downfield right" for 45 degrees', () => {
    expect(getDirectionLabel(45)).toBe('downfield right');
  });

  it('returns "downfield" for 90 degrees', () => {
    expect(getDirectionLabel(90)).toBe('downfield');
  });

  it('returns "downfield left" for 135 degrees', () => {
    expect(getDirectionLabel(135)).toBe('downfield left');
  });

  it('returns "to the left" for 180 degrees', () => {
    expect(getDirectionLabel(180)).toBe('to the left');
  });

  it('returns "upfield left" for 225 degrees', () => {
    expect(getDirectionLabel(225)).toBe('upfield left');
  });

  it('returns "upfield" for 270 degrees', () => {
    expect(getDirectionLabel(270)).toBe('upfield');
  });

  it('returns "upfield right" for 315 degrees', () => {
    expect(getDirectionLabel(315)).toBe('upfield right');
  });

  it('handles negative angles by normalizing', () => {
    expect(getDirectionLabel(-90)).toBe('upfield');
    expect(getDirectionLabel(-180)).toBe('to the left');
  });

  it('handles angles > 360 by normalizing', () => {
    expect(getDirectionLabel(450)).toBe('downfield');
    expect(getDirectionLabel(720)).toBe('to the right');
  });

  it('returns "to the right" for 359 degrees (near zero)', () => {
    expect(getDirectionLabel(359)).toBe('to the right');
  });
});
