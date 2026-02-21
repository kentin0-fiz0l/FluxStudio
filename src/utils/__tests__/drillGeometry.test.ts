import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  timeToCount,
  countToTime,
  snapToCount,
  generateCountMarkers,
  generateLinePositions,
  generateArcPositions,
  generateBlockPositions,
  alignPositions,
  distributePositions,
  STANDARD_FOOTBALL_FIELD,
} from '../drillGeometry';

describe('drillGeometry', () => {
  // ======================================================================
  // snapToGrid
  // ======================================================================
  describe('snapToGrid', () => {
    it('snaps to nearest grid intersection', () => {
      // stageWidth=40, stageHeight=30, gridSize=2
      // position x=52 (normalized) => stageX = 0.52*40 = 20.8 => snap to 20 => 20/40*100 = 50
      const result = snapToGrid({ x: 52, y: 48 }, 2, 40, 30);
      expect(result.x).toBeCloseTo(50);
      expect(result.y).toBeCloseTo(46.67, 1);
    });

    it('preserves rotation', () => {
      const result = snapToGrid({ x: 50, y: 50, rotation: 90 }, 2, 40, 30);
      expect(result.rotation).toBe(90);
    });

    it('clamps to stage bounds', () => {
      const result = snapToGrid({ x: 100, y: 100 }, 2, 40, 30);
      expect(result.x).toBeLessThanOrEqual(100);
      expect(result.y).toBeLessThanOrEqual(100);
    });

    it('handles position at origin', () => {
      const result = snapToGrid({ x: 0, y: 0 }, 2, 40, 30);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  // ======================================================================
  // timeToCount / countToTime
  // ======================================================================
  describe('timeToCount', () => {
    const settings = { bpm: 120, countsPerPhrase: 8, startOffset: 0 };

    it('converts time to count at 120 BPM', () => {
      // 120 BPM = 500ms per beat
      expect(timeToCount(0, settings)).toBe(1);
      expect(timeToCount(500, settings)).toBe(2);
      expect(timeToCount(1000, settings)).toBe(3);
      expect(timeToCount(3500, settings)).toBe(8);
    });

    it('handles start offset', () => {
      const offsetSettings = { ...settings, startOffset: 200 };
      expect(timeToCount(200, offsetSettings)).toBe(1);
      expect(timeToCount(700, offsetSettings)).toBe(2);
    });
  });

  describe('countToTime', () => {
    const settings = { bpm: 120, countsPerPhrase: 8, startOffset: 0 };

    it('converts count to time at 120 BPM', () => {
      expect(countToTime(1, settings)).toBe(0);
      expect(countToTime(2, settings)).toBe(500);
      expect(countToTime(9, settings)).toBe(4000);
    });

    it('round-trips with timeToCount', () => {
      for (let count = 1; count <= 16; count++) {
        const time = countToTime(count, settings);
        expect(timeToCount(time, settings)).toBe(count);
      }
    });
  });

  describe('snapToCount', () => {
    const settings = { bpm: 120, countsPerPhrase: 8, startOffset: 0 };

    it('snaps to nearest beat', () => {
      // At 120 BPM: msPerBeat = 500ms
      // 240/500 = 0.48, rounds to 0 => 0ms
      expect(snapToCount(240, settings)).toBe(0);
      // 260/500 = 0.52, rounds to 1 => 500ms
      expect(snapToCount(260, settings)).toBe(500);
    });

    it('exact beat time stays unchanged', () => {
      expect(snapToCount(1000, settings)).toBe(1000);
    });
  });

  // ======================================================================
  // generateCountMarkers
  // ======================================================================
  describe('generateCountMarkers', () => {
    const settings = { bpm: 120, countsPerPhrase: 8, startOffset: 0 };

    it('generates correct number of markers', () => {
      const markers = generateCountMarkers(4000, settings); // 8 beats at 120 BPM
      expect(markers.length).toBe(9); // beats at 0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000
    });

    it('marks phrase boundaries', () => {
      const markers = generateCountMarkers(4000, settings);
      expect(markers[0].isPhraseBoundary).toBe(true); // count 1
      expect(markers[1].isPhraseBoundary).toBe(false); // count 2
      expect(markers[7].isPhraseBoundary).toBe(false); // count 8
      expect(markers[8].isPhraseBoundary).toBe(true); // count 9 = phrase 2, beat 1
    });

    it('calculates phrase and beat correctly', () => {
      const markers = generateCountMarkers(8000, settings);
      // Count 1: phrase 1, beat 1
      expect(markers[0].phrase).toBe(1);
      expect(markers[0].beatInPhrase).toBe(1);
      // Count 8: phrase 1, beat 8
      expect(markers[7].phrase).toBe(1);
      expect(markers[7].beatInPhrase).toBe(8);
      // Count 9: phrase 2, beat 1
      expect(markers[8].phrase).toBe(2);
      expect(markers[8].beatInPhrase).toBe(1);
    });
  });

  // ======================================================================
  // generateLinePositions
  // ======================================================================
  describe('generateLinePositions', () => {
    it('distributes evenly along a line', () => {
      const positions = generateLinePositions({ x: 10, y: 50 }, { x: 90, y: 50 }, 5);
      expect(positions.length).toBe(5);
      expect(positions[0].x).toBeCloseTo(10);
      expect(positions[2].x).toBeCloseTo(50);
      expect(positions[4].x).toBeCloseTo(90);
      positions.forEach((p) => expect(p.y).toBeCloseTo(50));
    });

    it('handles single performer', () => {
      const positions = generateLinePositions({ x: 10, y: 50 }, { x: 90, y: 50 }, 1);
      expect(positions.length).toBe(1);
      expect(positions[0].x).toBeCloseTo(50);
    });

    it('handles diagonal line', () => {
      const positions = generateLinePositions({ x: 0, y: 0 }, { x: 100, y: 100 }, 3);
      expect(positions[1].x).toBeCloseTo(50);
      expect(positions[1].y).toBeCloseTo(50);
    });

    it('returns empty for count 0', () => {
      expect(generateLinePositions({ x: 0, y: 0 }, { x: 100, y: 100 }, 0)).toEqual([]);
    });
  });

  // ======================================================================
  // generateArcPositions
  // ======================================================================
  describe('generateArcPositions', () => {
    it('distributes along a semicircle', () => {
      const positions = generateArcPositions(
        { x: 50, y: 50 }, 30, 0, Math.PI, 5
      );
      expect(positions.length).toBe(5);
      // First point should be to the right of center
      expect(positions[0].x).toBeCloseTo(80);
      expect(positions[0].y).toBeCloseTo(50);
      // Last should be to the left
      expect(positions[4].x).toBeCloseTo(20);
      expect(positions[4].y).toBeCloseTo(50);
    });

    it('clamps to stage bounds', () => {
      const positions = generateArcPositions({ x: 95, y: 50 }, 30, 0, Math.PI, 3);
      positions.forEach((p) => {
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.x).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ======================================================================
  // generateBlockPositions
  // ======================================================================
  describe('generateBlockPositions', () => {
    it('creates a grid of positions', () => {
      const positions = generateBlockPositions(
        { x: 20, y: 20 }, { x: 80, y: 80 }, 9
      );
      expect(positions.length).toBe(9);
      // Top-left should be at (20, 20)
      expect(positions[0].x).toBeCloseTo(20);
      expect(positions[0].y).toBeCloseTo(20);
    });

    it('handles single performer', () => {
      const positions = generateBlockPositions(
        { x: 20, y: 20 }, { x: 80, y: 80 }, 1
      );
      expect(positions.length).toBe(1);
      expect(positions[0].x).toBeCloseTo(50);
      expect(positions[0].y).toBeCloseTo(50);
    });
  });

  // ======================================================================
  // alignPositions
  // ======================================================================
  describe('alignPositions', () => {
    const positions = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ];

    it('aligns left', () => {
      const aligned = alignPositions(positions, 'left');
      aligned.forEach((p) => expect(p.x).toBe(10));
    });

    it('aligns center', () => {
      const aligned = alignPositions(positions, 'center');
      aligned.forEach((p) => expect(p.x).toBe(30));
    });

    it('aligns right', () => {
      const aligned = alignPositions(positions, 'right');
      aligned.forEach((p) => expect(p.x).toBe(50));
    });

    it('aligns top', () => {
      const aligned = alignPositions(positions, 'top');
      aligned.forEach((p) => expect(p.y).toBe(20));
    });

    it('aligns middle', () => {
      const aligned = alignPositions(positions, 'middle');
      aligned.forEach((p) => expect(p.y).toBe(40));
    });

    it('aligns bottom', () => {
      const aligned = alignPositions(positions, 'bottom');
      aligned.forEach((p) => expect(p.y).toBe(60));
    });

    it('preserves non-aligned coordinate', () => {
      const aligned = alignPositions(positions, 'left');
      expect(aligned[0].y).toBe(20);
      expect(aligned[1].y).toBe(40);
      expect(aligned[2].y).toBe(60);
    });

    it('handles empty array', () => {
      expect(alignPositions([], 'left')).toEqual([]);
    });
  });

  // ======================================================================
  // distributePositions
  // ======================================================================
  describe('distributePositions', () => {
    it('distributes horizontally with equal spacing', () => {
      const positions = [
        { x: 10, y: 50 },
        { x: 20, y: 30 },
        { x: 80, y: 70 },
      ];
      const distributed = distributePositions(positions, 'horizontal');
      // Sorted by x: 10, 20, 80. Min=10, Max=80, step=35
      // Results sorted by x should be: 10, 45, 80
      const sortedByX = [...distributed].sort((a, b) => a.x - b.x);
      expect(sortedByX[0].x).toBeCloseTo(10);
      expect(sortedByX[1].x).toBeCloseTo(45);
      expect(sortedByX[2].x).toBeCloseTo(80);
    });

    it('distributes vertically', () => {
      const positions = [
        { x: 50, y: 10 },
        { x: 30, y: 50 },
        { x: 70, y: 90 },
      ];
      const distributed = distributePositions(positions, 'vertical');
      const sortedByY = [...distributed].sort((a, b) => a.y - b.y);
      expect(sortedByY[0].y).toBeCloseTo(10);
      expect(sortedByY[1].y).toBeCloseTo(50);
      expect(sortedByY[2].y).toBeCloseTo(90);
    });

    it('returns unchanged for < 3 positions', () => {
      const positions = [{ x: 10, y: 10 }, { x: 90, y: 90 }];
      expect(distributePositions(positions, 'horizontal')).toEqual(positions);
    });
  });

  // ======================================================================
  // Constants
  // ======================================================================
  describe('STANDARD_FOOTBALL_FIELD', () => {
    it('has correct dimensions', () => {
      expect(STANDARD_FOOTBALL_FIELD.width).toBe(120);
      expect(STANDARD_FOOTBALL_FIELD.height).toBeCloseTo(53.33, 1);
      expect(STANDARD_FOOTBALL_FIELD.endZoneDepth).toBe(10);
      expect(STANDARD_FOOTBALL_FIELD.yardLineInterval).toBe(5);
    });
  });
});
