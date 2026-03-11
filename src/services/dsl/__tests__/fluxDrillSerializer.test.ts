/**
 * FluxDrill Serializer Tests
 */

import { describe, it, expect } from 'vitest';
import { serializeFormation, buildDslShow } from '../fluxDrillSerializer';
import { normalizedToFieldNotation, fieldPosToString, stepsToYards, yardsToSteps } from '../fieldNotation';
import { detectShape } from '../shapeDetector';
import { NCAA_FOOTBALL_FIELD } from '../../fieldConfigService';
import type { Formation, Performer, Keyframe, Position } from '../../formationTypes';

// ============================================================================
// Helpers
// ============================================================================

function makeFormation(overrides: Partial<Formation> = {}): Formation {
  return {
    id: 'test-formation',
    name: 'Test Show',
    projectId: 'proj-1',
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 1,
    performers: [],
    keyframes: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    createdBy: 'test',
    ...overrides,
  };
}

function makePerformer(id: string, section: string, drillNumber: string, overrides: Partial<Performer> = {}): Performer {
  return {
    id,
    name: `Performer ${id}`,
    label: drillNumber,
    color: '#3b82f6',
    section,
    drillNumber,
    ...overrides,
  };
}

function makeKeyframe(id: string, positions: Map<string, Position>, overrides: Partial<Keyframe> = {}): Keyframe {
  return {
    id,
    timestamp: 0,
    positions,
    ...overrides,
  };
}

// ============================================================================
// serializeFormation
// ============================================================================

describe('serializeFormation', () => {
  it('produces minimal valid DSL for empty formation', () => {
    const formation = makeFormation({ name: 'Empty Show' });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('show "Empty Show"');
    expect(dsl).toContain('field: ncaa_football');
    expect(dsl).toContain('}');
  });

  it('includes BPM when drillSettings are set', () => {
    const formation = makeFormation({
      drillSettings: { bpm: 140, countsPerPhrase: 8, startOffset: 0, fieldOverlay: true, snapToGrid: true },
    });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('bpm: 140');
  });

  it('generates section declarations from performers', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1'),
      makePerformer('p2', 'Trumpets', 'T2'),
      makePerformer('p3', 'Trumpets', 'T12'),
      makePerformer('p4', 'Drumline', 'S1'),
      makePerformer('p5', 'Drumline', 'S6'),
    ];

    const formation = makeFormation({ performers });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('section Trumpets [T1..T12]');
    expect(dsl).toContain('section Drumline [S1..S6]');
  });

  it('includes symbol and color in section declarations', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1', { symbolShape: 'square', color: '#3b82f6' }),
    ];

    const formation = makeFormation({ performers });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('symbol: square');
    expect(dsl).toContain('color: #3b82f6');
  });

  it('generates sets from drill sets', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1'),
    ];

    const positions = new Map<string, Position>([['p1', { x: 50, y: 50 }]]);
    const keyframes = [makeKeyframe('kf1', positions, { duration: 8 })];
    const sets = [{
      id: 'set1',
      name: 'Set 1',
      counts: 8,
      keyframeId: 'kf1',
      sortOrder: 0,
    }];

    const formation = makeFormation({ performers, keyframes, sets });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('set "Set 1" (8 counts)');
  });

  it('uses keyframes as fallback when no drill sets defined', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1'),
    ];

    const positions = new Map<string, Position>([['p1', { x: 50, y: 50 }]]);
    const keyframes = [makeKeyframe('kf1', positions, { duration: 16 })];

    const formation = makeFormation({ performers, keyframes });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('set "Set 1" (16 counts)');
  });

  it('round-trip consistency: same formation always produces same DSL', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1'),
      makePerformer('p2', 'Trumpets', 'T2'),
      makePerformer('p3', 'Drumline', 'S1'),
    ];

    const positions = new Map<string, Position>([
      ['p1', { x: 30, y: 40 }],
      ['p2', { x: 35, y: 40 }],
      ['p3', { x: 50, y: 60 }],
    ]);
    const keyframes = [makeKeyframe('kf1', positions)];

    const formation = makeFormation({ performers, keyframes });

    const dsl1 = serializeFormation(formation);
    const dsl2 = serializeFormation(formation);

    expect(dsl1).toBe(dsl2);
  });

  it('includes transition when not linear', () => {
    const performers = [makePerformer('p1', 'Trumpets', 'T1')];
    const positions = new Map<string, Position>([['p1', { x: 50, y: 50 }]]);
    const keyframes = [makeKeyframe('kf1', positions, { transition: 'ease-in-out' })];
    const sets = [{
      id: 'set1',
      name: 'Set 1',
      counts: 16,
      keyframeId: 'kf1',
      sortOrder: 0,
    }];

    const formation = makeFormation({ performers, keyframes, sets });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('transition: ease-in-out');
  });

  it('omits transition when linear', () => {
    const performers = [makePerformer('p1', 'Trumpets', 'T1')];
    const positions = new Map<string, Position>([['p1', { x: 50, y: 50 }]]);
    const keyframes = [makeKeyframe('kf1', positions, { transition: 'linear' })];
    const sets = [{
      id: 'set1',
      name: 'Set 1',
      counts: 16,
      keyframeId: 'kf1',
      sortOrder: 0,
    }];

    const formation = makeFormation({ performers, keyframes, sets });
    const dsl = serializeFormation(formation);

    expect(dsl).not.toContain('transition:');
  });

  it('includes rehearsal mark', () => {
    const performers = [makePerformer('p1', 'Trumpets', 'T1')];
    const positions = new Map<string, Position>([['p1', { x: 50, y: 50 }]]);
    const keyframes = [makeKeyframe('kf1', positions)];
    const sets = [{
      id: 'set1',
      name: 'Set 1',
      counts: 8,
      keyframeId: 'kf1',
      sortOrder: 0,
      rehearsalMark: 'A',
    }];

    const formation = makeFormation({ performers, keyframes, sets });
    const dsl = serializeFormation(formation);

    expect(dsl).toContain('@A');
  });
});

// ============================================================================
// Field notation conversion
// ============================================================================

describe('normalizedToFieldNotation', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('maps x=50 to the 50 yard line', () => {
    const pos = normalizedToFieldNotation(50, 50, field);
    expect(pos.sideToSide).toBe('50');
  });

  it('maps left side correctly', () => {
    // x = (10 + 25) / 120 * 100 = 29.17 → L25 area
    const x = (10 + 25) / 120 * 100;
    const pos = normalizedToFieldNotation(x, 50, field);
    expect(pos.sideToSide).toContain('L25');
  });

  it('maps right side correctly', () => {
    // x = (10 + 75) / 120 * 100 = 70.83 → R25 area
    const x = (10 + 75) / 120 * 100;
    const pos = normalizedToFieldNotation(x, 50, field);
    expect(pos.sideToSide).toContain('R25');
  });

  it('maps y=0 to front-sideline', () => {
    const pos = normalizedToFieldNotation(50, 0, field);
    expect(pos.frontToBack).toBe('front-sideline');
  });

  it('maps y=100 to back-sideline', () => {
    const pos = normalizedToFieldNotation(50, 100, field);
    expect(pos.frontToBack).toBe('back-sideline');
  });

  it('maps front hash correctly', () => {
    // Front hash is at 20 yards from front sideline
    // y = (20 / 53.33) * 100 = 37.50
    const y = (20 / 53.33) * 100;
    const pos = normalizedToFieldNotation(50, y, field);
    expect(pos.frontToBack).toBe('front-hash');
  });

  it('maps back hash correctly', () => {
    // Back hash is at 53.33 - 20 = 33.33 yards from front
    // y = (33.33 / 53.33) * 100 = 62.50
    const y = (33.33 / 53.33) * 100;
    const pos = normalizedToFieldNotation(50, y, field);
    expect(pos.frontToBack).toBe('back-hash');
  });
});

describe('fieldPosToString', () => {
  it('formats position as readable string', () => {
    const result = fieldPosToString({ sideToSide: 'on R35', frontToBack: 'front-hash' });
    expect(result).toBe('on R35, front-hash');
  });
});

describe('step/yard conversion', () => {
  it('converts steps to yards (8-to-5)', () => {
    expect(stepsToYards(8)).toBe(5);
    expect(stepsToYards(1)).toBeCloseTo(0.625);
  });

  it('converts yards to steps', () => {
    expect(yardsToSteps(5)).toBe(8);
    expect(yardsToSteps(0.625)).toBeCloseTo(1);
  });
});

// ============================================================================
// Shape detection
// ============================================================================

describe('detectShape', () => {
  const field = NCAA_FOOTBALL_FIELD;

  it('detects a line from collinear points', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const positions = new Map<string, Position>([
      ['p1', { x: 30, y: 40 }],
      ['p2', { x: 35, y: 40 }],
      ['p3', { x: 40, y: 40 }],
      ['p4', { x: 45, y: 40 }],
      ['p5', { x: 50, y: 40 }],
    ]);

    const shape = detectShape(ids, positions, field);
    // Horizontal line should be detected as company_front
    expect(shape.type === 'company_front' || shape.type === 'line').toBe(true);
  });

  it('detects company front from horizontal line', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const positions = new Map<string, Position>();

    // All at same y, evenly spaced x
    for (let i = 0; i < 6; i++) {
      positions.set(ids[i], { x: 30 + i * 4, y: 37.5 });
    }

    const shape = detectShape(ids, positions, field);
    expect(shape.type).toBe('company_front');
  });

  it('detects a circle', () => {
    const ids: string[] = [];
    const positions = new Map<string, Position>();

    // Place 12 points in a circle
    const cx = 50, cy = 50, r = 10;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * 2 * Math.PI;
      const id = `p${i}`;
      ids.push(id);
      positions.set(id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }

    const shape = detectShape(ids, positions, field);
    expect(shape.type).toBe('circle');
  });

  it('detects an arc from partial circle', () => {
    const ids: string[] = [];
    const positions = new Map<string, Position>();

    // Place 8 points in a 180-degree arc
    const cx = 50, cy = 50, r = 10;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI; // 0 to 180 degrees
      const id = `p${i}`;
      ids.push(id);
      positions.set(id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }

    const shape = detectShape(ids, positions, field);
    expect(shape.type).toBe('arc');
  });

  it('falls back to explicit for single performer', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 50, y: 50 }],
    ]);

    const shape = detectShape(['p1'], positions, field);
    expect(shape.type).toBe('explicit');
  });

  it('falls back to scatter/explicit/wedge for non-geometric positions', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const positions = new Map<string, Position>([
      ['p1', { x: 10, y: 80 }],
      ['p2', { x: 70, y: 15 }],
      ['p3', { x: 45, y: 55 }],
      ['p4', { x: 85, y: 40 }],
      ['p5', { x: 20, y: 90 }],
    ]);

    const shape = detectShape(ids, positions, field);
    // Should not be a clean geometric shape like line, circle, block, or company_front
    expect(['scatter', 'explicit', 'wedge']).toContain(shape.type);
  });

  it('returns empty explicit for no performers', () => {
    const shape = detectShape([], new Map(), field);
    expect(shape.type).toBe('explicit');
    if (shape.type === 'explicit') {
      expect(shape.positions).toHaveLength(0);
    }
  });
});

// ============================================================================
// buildDslShow (AST structure)
// ============================================================================

describe('buildDslShow', () => {
  it('builds correct AST structure', () => {
    const performers = [
      makePerformer('p1', 'Trumpets', 'T1'),
      makePerformer('p2', 'Trumpets', 'T4'),
    ];
    const positions = new Map<string, Position>([
      ['p1', { x: 40, y: 50 }],
      ['p2', { x: 60, y: 50 }],
    ]);
    const keyframes = [makeKeyframe('kf1', positions, { duration: 8 })];

    const formation = makeFormation({
      name: 'Opener',
      performers,
      keyframes,
      fieldConfig: NCAA_FOOTBALL_FIELD,
      drillSettings: { bpm: 120, countsPerPhrase: 8, startOffset: 0, fieldOverlay: true, snapToGrid: true },
    });

    const show = buildDslShow(formation, NCAA_FOOTBALL_FIELD);

    expect(show.name).toBe('Opener');
    expect(show.field).toBe('ncaa_football');
    expect(show.bpm).toBe(120);
    expect(show.sections).toHaveLength(1);
    expect(show.sections[0].name).toBe('Trumpets');
    expect(show.sections[0].rangePrefix).toBe('T');
    expect(show.sections[0].rangeStart).toBe(1);
    expect(show.sections[0].rangeEnd).toBe(4);
    expect(show.sets).toHaveLength(1);
  });
});
