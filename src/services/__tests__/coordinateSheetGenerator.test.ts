/**
 * Tests for Coordinate Sheet Generator
 *
 * Covers: generateCoordinateSheet, generateDrillBookPages,
 *         generateAllCoordinateSheets
 */

import { describe, it, expect } from 'vitest';
import {
  generateCoordinateSheet,
  generateDrillBookPages,
  generateAllCoordinateSheets,
} from '../coordinateSheetGenerator';
import type { Formation, DrillSet, Performer, Keyframe, Position } from '../formationTypes';

// ============================================================================
// HELPERS
// ============================================================================

function makePerformer(id: string, name: string, extras: Partial<Performer> = {}): Performer {
  return { id, name, label: name[0], color: '#fff', ...extras };
}

function makeKeyframe(
  id: string,
  timestamp: number,
  positionMap: Record<string, Position>,
): Keyframe {
  return {
    id,
    timestamp,
    positions: new Map(Object.entries(positionMap)),
  };
}

function makeSet(
  id: string,
  name: string,
  counts: number,
  keyframeId: string,
  sortOrder: number,
): DrillSet {
  return { id, name, counts, keyframeId, sortOrder };
}

function makeFormation(performers: Performer[], keyframes: Keyframe[]): Formation {
  return {
    id: 'formation-1',
    name: 'Test Show',
    projectId: 'project-1',
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 1,
    performers,
    keyframes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };
}

// ============================================================================
// generateCoordinateSheet
// ============================================================================

describe('generateCoordinateSheet', () => {
  it('returns one entry per set for a performer', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries).toHaveLength(3);
  });

  it('returns empty array for unknown performer', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const entries = generateCoordinateSheet(formation, 'p_unknown', sets);
    expect(entries).toHaveLength(0);
  });

  it('each entry contains a coordinate string', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[0].coordinate).toBeTruthy();
    expect(typeof entries[0].coordinate).toBe('string');
    expect(entries[0].coordinate).toContain(','); // "sideToSide, frontToBack"
  });

  it('each entry has coordinateDetails with sideToSide and frontToBack', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[0].coordinateDetails.sideToSide).toBeTruthy();
    expect(entries[0].coordinateDetails.frontToBack).toBeTruthy();
  });

  it('first entry has null stepFromPrev', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[0].stepFromPrev).toBeNull();
  });

  it('last entry has null stepToNext', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[entries.length - 1].stepToNext).toBeNull();
  });

  it('middle entries have both stepToNext and stepFromPrev', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 80, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[1].stepToNext).not.toBeNull();
    expect(entries[1].stepFromPrev).not.toBeNull();
  });

  it('stepToNext contains valid step info', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    const step = entries[0].stepToNext!;
    expect(step.distance).toBeGreaterThan(0);
    expect(step.distanceYards).toBeGreaterThan(0);
    expect(step.stepSize).toBeGreaterThan(0);
    expect(step.stepSizeLabel).toBeTruthy();
    expect(step.directionLabel).toBeTruthy();
    expect(step.counts).toBe(8);
    expect(['easy', 'moderate', 'hard']).toContain(step.difficulty);
  });

  it('handles stationary performer (mark time)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    const step = entries[0].stepToNext!;
    expect(step.stepSize).toBe(0);
    expect(step.stepSizeLabel).toBe('Mark Time');
    expect(step.difficulty).toBe('easy');
  });

  it('sorts entries by sortOrder', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 80, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    // Pass sets out of order
    const sets = [
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[0].set.name).toBe('Set 1');
    expect(entries[1].set.name).toBe('Set 2');
    expect(entries[2].set.name).toBe('Set 3');
  });

  it('each entry includes the set reference', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const entries = generateCoordinateSheet(formation, 'p1', sets);
    expect(entries[0].set).toEqual(sets[0]);
  });
});

// ============================================================================
// generateAllCoordinateSheets
// ============================================================================

describe('generateAllCoordinateSheets', () => {
  it('generates sheets for all performers', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
      makePerformer('p3', 'Carol'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 20, y: 50 },
      p2: { x: 50, y: 50 },
      p3: { x: 80, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const sheets = generateAllCoordinateSheets(formation, sets);
    expect(sheets.size).toBe(3);
    expect(sheets.has('p1')).toBe(true);
    expect(sheets.has('p2')).toBe(true);
    expect(sheets.has('p3')).toBe(true);
  });

  it('includes performer reference in each sheet', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const sheets = generateAllCoordinateSheets(formation, sets);
    const sheet = sheets.get('p1')!;
    expect(sheet.performer.id).toBe('p1');
    expect(sheet.performer.name).toBe('Alice');
  });

  it('each performer sheet has correct number of entries', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 70, y: 50 },
      p2: { x: 30, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const sheets = generateAllCoordinateSheets(formation, sets);
    expect(sheets.get('p1')!.entries).toHaveLength(2);
    expect(sheets.get('p2')!.entries).toHaveLength(2);
  });
});

// ============================================================================
// generateDrillBookPages
// ============================================================================

describe('generateDrillBookPages', () => {
  it('returns empty array for unknown performer', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const pages = generateDrillBookPages(formation, 'p_unknown', sets);
    expect(pages).toHaveLength(0);
  });

  it('generates cover, chart, coordinates, and summary pages', () => {
    const performers = [
      makePerformer('p1', 'Alice', {
        instrument: 'Trumpet',
        section: 'Brass',
        drillNumber: 'T1',
      }),
    ];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const types = pages.map((p) => p.type);
    expect(types).toContain('cover');
    expect(types).toContain('chart');
    expect(types).toContain('coordinates');
    expect(types).toContain('summary');
  });

  it('generates one chart page per set', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const chartPages = pages.filter((p) => p.type === 'chart');
    expect(chartPages).toHaveLength(3);
  });

  it('cover page contains performer and show info', () => {
    const performers = [
      makePerformer('p1', 'Alice', {
        instrument: 'Trumpet',
        section: 'Brass',
        drillNumber: 'T1',
      }),
    ];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const cover = pages.find((p) => p.type === 'cover')!;
    expect(cover.data.showName).toBe('Test Show');
    expect(cover.data.performerName).toBe('Alice');
    expect(cover.data.drillNumber).toBe('T1');
    expect(cover.data.instrument).toBe('Trumpet');
    expect(cover.data.section).toBe('Brass');
    expect(cover.data.totalSets).toBe(1);
  });

  it('summary page counts difficulty levels', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Set 1 to Set 2: long distance in 2 counts (hard)
    // Set 2 to Set 3: short distance in 16 counts (easy)
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 0, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 100, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 98, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 16, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const summary = pages.find((p) => p.type === 'summary')!;
    expect(summary.data.totalSets).toBe(3);
    expect(typeof summary.data.totalDistance).toBe('string');
    expect(typeof summary.data.hardSteps).toBe('number');
    expect(typeof summary.data.moderateSteps).toBe('number');
    expect(typeof summary.data.easySteps).toBe('number');
  });

  it('chart pages highlight the performer', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const chart = pages.find((p) => p.type === 'chart')!;
    expect(chart.data.highlightPerformerId).toBe('p1');
  });

  it('total page count = 1 cover + N charts + 1 coordinates + 1 summary', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 30, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 70, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    // 1 cover + 2 charts + 1 coordinates + 1 summary = 5
    expect(pages).toHaveLength(5);
  });

  it('all pages reference the correct performer', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    for (const page of pages) {
      expect(page.performerId).toBe('p1');
      expect(page.performerName).toBe('Alice');
    }
  });

  it('cover uses label when drillNumber is not set', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const pages = generateDrillBookPages(formation, 'p1', sets);
    const cover = pages.find((p) => p.type === 'cover')!;
    expect(cover.data.drillNumber).toBe('A'); // label from makePerformer
  });
});
