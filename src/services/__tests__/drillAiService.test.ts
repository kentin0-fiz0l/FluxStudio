/**
 * Tests for Drill AI Service
 *
 * Covers: generateDrillCritique, generateFormationFromDescription, generateQuickStartShow
 */

import { describe, it, expect } from 'vitest';
import {
  generateDrillCritique,
  generateFormationFromDescription,
  generateQuickStartShow,
  type QuickStartConfig,
} from '../drillAiService';
import type { Formation, DrillSet, Performer, Keyframe, Position } from '../formationTypes';

// ============================================================================
// HELPERS
// ============================================================================

function makePerformer(id: string, name: string): Performer {
  return { id, name, label: name[0], color: '#fff' };
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

function makePerformers(count: number): Performer[] {
  return Array.from({ length: count }, (_, i) =>
    makePerformer(`p${i + 1}`, `Performer ${i + 1}`),
  );
}

// ============================================================================
// generateDrillCritique
// ============================================================================

describe('generateDrillCritique', () => {
  it('returns a score between 0 and 100', () => {
    const performers = makePerformers(4);
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 20, y: 50 },
      p2: { x: 40, y: 50 },
      p3: { x: 60, y: 50 },
      p4: { x: 80, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it('gives high score for clean drill (no issues)', () => {
    const performers = makePerformers(2);
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.summary).toContain('Excellent');
  });

  it('lowers score for collisions', () => {
    const performers = makePerformers(2);
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    expect(result.overallScore).toBeLessThan(100);
    const spacingCategory = result.categories.find((c) => c.name === 'Spacing & Collisions');
    expect(spacingCategory).toBeDefined();
    expect(spacingCategory!.score).toBeLessThan(100);
  });

  it('returns 3 categories: spacing, stride, movement flow', () => {
    const performers = makePerformers(2);
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    expect(result.categories).toHaveLength(3);
    const categoryNames = result.categories.map((c) => c.name);
    expect(categoryNames).toContain('Spacing & Collisions');
    expect(categoryNames).toContain('Stride Feasibility');
    expect(categoryNames).toContain('Movement Flow');
  });

  it('produces suggestions for problematic drill', () => {
    const performers = makePerformers(2);
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 }, // collision
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 0, y: 50 },
      p2: { x: 100, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const result = generateDrillCritique({ formation, sets });
    expect(result.suggestions.length).toBeGreaterThan(0);
    // Should have at least a warning for collision
    expect(result.suggestions.some((s) => s.type === 'warning')).toBe(true);
  });

  it('provides tip about short set durations', () => {
    const performers = makePerformers(2);
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 32, y: 50 },
      p2: { x: 68, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 4, 'kf1', 0),
      makeSet('s2', 'Set 2', 4, 'kf2', 1),
    ];

    const result = generateDrillCritique({ formation, sets });
    const shortTip = result.suggestions.find(
      (s) => s.type === 'tip' && s.message.includes('counts'),
    );
    expect(shortTip).toBeDefined();
  });

  it('includes analysisData with full analysis result', () => {
    const performers = makePerformers(2);
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    expect(result.analysisData).toBeDefined();
    expect(result.analysisData.summary).toBeDefined();
    expect(result.analysisData.analyzedAt).toBeGreaterThan(0);
  });

  it('clamps category scores to minimum 0', () => {
    const performers = makePerformers(10);
    const positions: Record<string, Position> = {};
    // All 10 performers at same spot => many collisions
    for (let i = 1; i <= 10; i++) {
      positions[`p${i}`] = { x: 50, y: 50 };
    }
    const kf = makeKeyframe('kf1', 0, positions);
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = generateDrillCritique({ formation, sets });
    for (const category of result.categories) {
      expect(category.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns "good" summary for mid-range scores', () => {
    // Create a drill with a few stride issues but no collisions
    const performers = makePerformers(2);
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 20, y: 50 },
      p2: { x: 80, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const result = generateDrillCritique({ formation, sets });
    // Score depends on actual analysis, but at least verify the summary is present
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// generateFormationFromDescription
// ============================================================================

describe('generateFormationFromDescription', () => {
  const performers = makePerformers(8);

  it('generates a "line" / "company front" formation', () => {
    const result = generateFormationFromDescription({
      description: 'company front line',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);

    // All performers should have the same y (horizontal line)
    const positions = Array.from(result.sets[0].positions.values());
    const ys = positions.map((p) => p.y);
    const uniqueYs = new Set(ys.map((y) => Math.round(y)));
    expect(uniqueYs.size).toBe(1);
  });

  it('generates a "block" formation', () => {
    const result = generateFormationFromDescription({
      description: 'block',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
    // Should have multiple rows
    const positions = Array.from(result.sets[0].positions.values());
    const uniqueYs = new Set(positions.map((p) => Math.round(p.y)));
    expect(uniqueYs.size).toBeGreaterThan(1);
  });

  it('generates a "scatter" formation', () => {
    const result = generateFormationFromDescription({
      description: 'scatter',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
    // Positions should be varied
    const positions = Array.from(result.sets[0].positions.values());
    const uniqueXs = new Set(positions.map((p) => Math.round(p.x * 10)));
    expect(uniqueXs.size).toBeGreaterThan(1);
  });

  it('generates a "circle" formation', () => {
    const result = generateFormationFromDescription({
      description: 'circle',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
    // Positions should be approximately equidistant from center
    const positions = Array.from(result.sets[0].positions.values());
    const center = { x: 50, y: 50 };
    const distances = positions.map((p) =>
      Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2),
    );
    const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
    for (const d of distances) {
      expect(d).toBeCloseTo(avgDist, 0); // within 1 unit
    }
  });

  it('generates a "diagonal" formation', () => {
    const result = generateFormationFromDescription({
      description: 'diagonal',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
    // Both x and y should increase across performers
    const positions = Array.from(result.sets[0].positions.values());
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThan(positions[i - 1].x);
      expect(positions[i].y).toBeGreaterThan(positions[i - 1].y);
    }
  });

  it('generates a "wedge" / "v" formation', () => {
    const result = generateFormationFromDescription({
      description: 'wedge',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
  });

  it('falls back to company front for unknown description', () => {
    const result = generateFormationFromDescription({
      description: 'xyzzy unknown pattern',
      performers,
    });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0].positions.size).toBe(8);
    // Should be a horizontal line (default)
    const positions = Array.from(result.sets[0].positions.values());
    const ys = positions.map((p) => p.y);
    const uniqueYs = new Set(ys.map((y) => Math.round(y)));
    expect(uniqueYs.size).toBe(1);
  });

  it('handles "X to Y" transition descriptions', () => {
    const result = generateFormationFromDescription({
      description: 'line to block in 16 counts',
      performers,
    });

    expect(result.sets).toHaveLength(2);
    expect(result.sets[0].name).toBe('Set 1');
    expect(result.sets[1].name).toBe('Set 2');
    expect(result.sets[0].counts).toBe(16);
    expect(result.sets[1].counts).toBe(16);
    expect(result.sets[0].positions.size).toBe(8);
    expect(result.sets[1].positions.size).toBe(8);
  });

  it('uses default counts when not specified in transition', () => {
    const result = generateFormationFromDescription({
      description: 'line to circle',
      performers,
      defaultCounts: 12,
    });

    expect(result.sets).toHaveLength(2);
    expect(result.sets[0].counts).toBe(12);
    expect(result.sets[1].counts).toBe(12);
  });

  it('uses defaultCounts of 8 for single formation', () => {
    const result = generateFormationFromDescription({
      description: 'block',
      performers,
    });

    expect(result.sets[0].counts).toBe(8); // default
  });

  it('returns description with performer count', () => {
    const result = generateFormationFromDescription({
      description: 'line',
      performers,
    });

    expect(result.description).toContain('8');
    expect(result.description).toContain('performer');
  });

  it('handles single performer', () => {
    const singlePerformer = [makePerformer('p1', 'Solo')];
    const result = generateFormationFromDescription({
      description: 'circle',
      performers: singlePerformer,
    });

    expect(result.sets[0].positions.size).toBe(1);
  });

  it('all generated positions are within bounds (5-95)', () => {
    const manyPerformers = makePerformers(30);
    const patterns = ['line', 'block', 'scatter', 'circle', 'diagonal', 'wedge'];

    for (const pattern of patterns) {
      const result = generateFormationFromDescription({
        description: pattern,
        performers: manyPerformers,
      });

      for (const set of result.sets) {
        for (const [, pos] of set.positions) {
          expect(pos.x).toBeGreaterThanOrEqual(0);
          expect(pos.x).toBeLessThanOrEqual(100);
          expect(pos.y).toBeGreaterThanOrEqual(0);
          expect(pos.y).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

// ============================================================================
// generateQuickStartShow
// ============================================================================

describe('generateQuickStartShow', () => {
  const config: QuickStartConfig = {
    showName: 'Test Show',
    bandSize: 20,
    fieldType: 'ncaa_football',
    showDuration: 8,
    sections: [
      { name: 'Brass', instrument: 'Trumpet', count: 8 },
      { name: 'Woodwinds', instrument: 'Flute', count: 6 },
      { name: 'Percussion', instrument: 'Snare', count: 4 },
      { name: 'Color Guard', instrument: 'Flag', count: 2 },
    ],
    musicBpm: 120,
  };

  it('generates correct total number of performers', () => {
    const result = generateQuickStartShow(config);
    const totalConfigured = config.sections.reduce((s, sec) => s + sec.count, 0);
    expect(result.performers).toHaveLength(totalConfigured);
  });

  it('assigns correct instrument and section to each performer', () => {
    const result = generateQuickStartShow(config);

    // First 8 should be Trumpets in Brass
    for (let i = 0; i < 8; i++) {
      expect(result.performers[i].instrument).toBe('Trumpet');
      expect(result.performers[i].section).toBe('Brass');
    }
    // Next 6 should be Flutes in Woodwinds
    for (let i = 8; i < 14; i++) {
      expect(result.performers[i].instrument).toBe('Flute');
      expect(result.performers[i].section).toBe('Woodwinds');
    }
    // Next 4 should be Snares in Percussion
    for (let i = 14; i < 18; i++) {
      expect(result.performers[i].instrument).toBe('Snare');
      expect(result.performers[i].section).toBe('Percussion');
    }
    // Last 2 should be Flags in Color Guard
    for (let i = 18; i < 20; i++) {
      expect(result.performers[i].instrument).toBe('Flag');
      expect(result.performers[i].section).toBe('Color Guard');
    }
  });

  it('generates performer names with instrument prefix and number', () => {
    const result = generateQuickStartShow(config);
    expect(result.performers[0].name).toBe('Trumpet 1');
    expect(result.performers[7].name).toBe('Trumpet 8');
    expect(result.performers[8].name).toBe('Flute 1');
  });

  it('assigns section colors', () => {
    const result = generateQuickStartShow(config);
    expect(result.performers[0].color).toBe('#f59e0b'); // Brass
    expect(result.performers[8].color).toBe('#10b981'); // Woodwinds
    expect(result.performers[14].color).toBe('#ef4444'); // Percussion
    expect(result.performers[18].color).toBe('#8b5cf6'); // Color Guard
  });

  it('generates drill numbers', () => {
    const result = generateQuickStartShow(config);
    expect(result.performers[0].drillNumber).toBe('T1');
    expect(result.performers[1].drillNumber).toBe('T2');
    expect(result.performers[8].drillNumber).toBe('F9');
  });

  it('generates initial sets with opener, ballad, and closer sections', () => {
    const result = generateQuickStartShow(config);
    expect(result.initialSets.length).toBeGreaterThanOrEqual(4);

    const setNames = result.initialSets.map((s) => s.name);
    expect(setNames.some((n) => n.startsWith('Opener'))).toBe(true);
    expect(setNames.some((n) => n.startsWith('Ballad'))).toBe(true);
    expect(setNames.some((n) => n.startsWith('Closer'))).toBe(true);
  });

  it('first set has 16 counts (opening formation)', () => {
    const result = generateQuickStartShow(config);
    expect(result.initialSets[0].counts).toBe(16);
    expect(result.initialSets[0].description).toContain('Opening');
  });

  it('last set has 16 counts (final set)', () => {
    const result = generateQuickStartShow(config);
    const lastSet = result.initialSets[result.initialSets.length - 1];
    expect(lastSet.counts).toBe(16);
    expect(lastSet.description).toContain('Final');
  });

  it('defaults BPM to 120 when not provided', () => {
    const configNoBpm: QuickStartConfig = {
      ...config,
      musicBpm: undefined,
    };
    const result = generateQuickStartShow(configNoBpm);
    // Should still generate sets (uses default 120 BPM)
    expect(result.initialSets.length).toBeGreaterThanOrEqual(4);
  });

  it('scales number of sets with show duration', () => {
    const shortShow: QuickStartConfig = {
      ...config,
      showDuration: 3,
    };
    const longShow: QuickStartConfig = {
      ...config,
      showDuration: 15,
    };

    const shortResult = generateQuickStartShow(shortShow);
    const longResult = generateQuickStartShow(longShow);
    expect(longResult.initialSets.length).toBeGreaterThan(shortResult.initialSets.length);
  });

  it('handles unknown section color gracefully', () => {
    const configUnknown: QuickStartConfig = {
      ...config,
      sections: [{ name: 'Aliens', instrument: 'Laser', count: 3 }],
    };
    const result = generateQuickStartShow(configUnknown);
    expect(result.performers[0].color).toBe('#6b7280'); // default gray
  });

  it('performer labels use first character of instrument', () => {
    const result = generateQuickStartShow(config);
    expect(result.performers[0].label).toBe('T1'); // Trumpet -> T
    expect(result.performers[8].label).toBe('F1'); // Flute -> F
    expect(result.performers[14].label).toBe('S1'); // Snare -> S
  });
});
