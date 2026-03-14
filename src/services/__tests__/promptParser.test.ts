import { describe, it, expect } from 'vitest';
import { parsePrompt, resolvePerformerFilter } from '../promptParser';
import type { Performer } from '../formationTypes';

// ============================================================================
// Helpers
// ============================================================================

function makePerformers(
  specs: { id: string; instrument?: string; section?: string }[],
): Performer[] {
  return specs.map(s => ({
    id: s.id,
    name: `Performer ${s.id}`,
    label: s.id,
    color: '#000',
    instrument: s.instrument,
    section: s.section,
  }));
}

// ============================================================================
// parsePrompt - distribute patterns
// ============================================================================

describe('parsePrompt', () => {
  describe('distribute commands', () => {
    it('parses "spread trumpets in arc"', () => {
      const result = parsePrompt('spread trumpets in arc', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('arc');
        expect(result.performerFilter).toEqual({ type: 'instrument', instrument: 'trumpet' });
        expect(result.params.center).toEqual({ x: 50, y: 50 });
        expect(result.params.radius).toBe(30);
      }
    });

    it('parses "arrange in a line"', () => {
      const result = parsePrompt('arrange performers in a line', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('line');
      }
    });

    it('parses "distribute in grid"', () => {
      const result = parsePrompt('distribute in grid', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('grid');
      }
    });

    it('parses "place in circle"', () => {
      const result = parsePrompt('place in circle', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('circle');
        expect(result.params.center).toEqual({ x: 50, y: 50 });
        expect(result.params.radius).toBe(30);
      }
    });

    it('maps "row" to line shape', () => {
      const result = parsePrompt('spread into a row', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('line');
      }
    });

    it('maps "block" to grid shape', () => {
      const result = parsePrompt('arrange into a block', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('grid');
      }
    });

    it('maps "column" to line shape', () => {
      const result = parsePrompt('spread in column', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('line');
      }
    });

    it('parses range "from R30 to R50"', () => {
      const result = parsePrompt('spread in line from R30 to R50', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('line');
        expect(result.params.start?.x).toBe(30);
        expect(result.params.end?.x).toBe(50);
      }
    });

    it('parses range "from 20 to 80"', () => {
      const result = parsePrompt('distribute in line from 20 to 80', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.params.start?.x).toBe(20);
        expect(result.params.end?.x).toBe(80);
      }
    });
  });

  // ==========================================================================
  // Simple shape patterns (without distribute verb)
  // ==========================================================================

  describe('simple shape patterns', () => {
    it('parses "trumpets in a circle"', () => {
      const result = parsePrompt('trumpets in a circle', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('circle');
      }
    });

    it('parses "in an arc"', () => {
      const result = parsePrompt('in an arc', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('arc');
      }
    });

    it('parses "into a line"', () => {
      const result = parsePrompt('into a line', []);
      expect(result.type).toBe('distribute');
      if (result.type === 'distribute') {
        expect(result.shape).toBe('line');
      }
    });
  });

  // ==========================================================================
  // template patterns
  // ==========================================================================

  describe('template commands', () => {
    it('parses "apply company front"', () => {
      const result = parsePrompt('apply company front', []);
      expect(result.type).toBe('template');
      if (result.type === 'template') {
        expect(result.templateName).toBe('company front');
        expect(result.params.templateName).toBe('company front');
      }
    });

    it('parses "use diamond to brass"', () => {
      const result = parsePrompt('use diamond to brass', []);
      expect(result.type).toBe('template');
      if (result.type === 'template') {
        expect(result.templateName).toBe('diamond');
      }
    });
  });

  // ==========================================================================
  // morph patterns
  // ==========================================================================

  describe('morph commands', () => {
    it('parses "morph toward circle 50%"', () => {
      const result = parsePrompt('morph toward circle 50%', []);
      expect(result.type).toBe('morph');
      if (result.type === 'morph') {
        expect(result.targetShape).toBe('circle');
        expect(result.morphFactor).toBe(0.5);
      }
    });

    it('parses "morph towards diamond 75%"', () => {
      const result = parsePrompt('morph towards diamond 75%', []);
      expect(result.type).toBe('morph');
      if (result.type === 'morph') {
        expect(result.targetShape).toBe('diamond');
        expect(result.morphFactor).toBe(0.75);
      }
    });

    it('parses "morph to line 100%"', () => {
      const result = parsePrompt('morph to line 100%', []);
      expect(result.type).toBe('morph');
      if (result.type === 'morph') {
        expect(result.targetShape).toBe('line');
        expect(result.morphFactor).toBe(1.0);
      }
    });
  });

  // ==========================================================================
  // Performer filter detection
  // ==========================================================================

  describe('performer filter detection', () => {
    it('detects "selected" keyword with selected IDs', () => {
      const result = parsePrompt('spread selected in arc', ['p1', 'p2']);
      expect(result.performerFilter).toEqual({ type: 'selected', ids: ['p1', 'p2'] });
    });

    it('falls back to all when "selected" but no IDs', () => {
      const result = parsePrompt('spread selected in arc', []);
      // "selected" keyword present but no selectedIds -> falls through to default
      expect(result.performerFilter.type).toBe('all');
    });

    it('detects section names', () => {
      const result = parsePrompt('spread brass in arc', []);
      expect(result.performerFilter).toEqual({ type: 'section', section: 'brass' });
    });

    it('detects instrument names', () => {
      const result = parsePrompt('flutes in a circle', []);
      expect(result.performerFilter).toEqual({ type: 'instrument', instrument: 'flute' });
    });

    it('detects "percussion" section', () => {
      const result = parsePrompt('move percussion in line', []);
      expect(result.performerFilter).toEqual({ type: 'section', section: 'percussion' });
    });

    it('detects "color guard" section', () => {
      const result = parsePrompt('color guard in a circle', []);
      expect(result.performerFilter).toEqual({ type: 'section', section: 'color guard' });
    });

    it('defaults to all for unrecognized filter', () => {
      const result = parsePrompt('spread everyone in line', []);
      expect(result.performerFilter.type).toBe('all');
    });
  });

  // ==========================================================================
  // Fallback to basic_formation
  // ==========================================================================

  describe('basic_formation fallback', () => {
    it('falls back for unrecognized patterns', () => {
      const result = parsePrompt('company front', []);
      expect(result.type).toBe('basic_formation');
      if (result.type === 'basic_formation') {
        expect(result.description).toBe('company front');
      }
    });

    it('falls back for empty string', () => {
      const result = parsePrompt('', []);
      expect(result.type).toBe('basic_formation');
    });

    it('falls back for "scatter selected"', () => {
      // "scatter" alone doesn't match distribute verb pattern
      const result = parsePrompt('scatter selected', ['p1']);
      expect(result.type).toBe('basic_formation');
    });

    it('preserves original input as description', () => {
      const result = parsePrompt('  diagonal line  ', []);
      expect(result.type).toBe('basic_formation');
      if (result.type === 'basic_formation') {
        expect(result.description).toBe('diagonal line');
      }
    });
  });
});

// ============================================================================
// resolvePerformerFilter
// ============================================================================

describe('resolvePerformerFilter', () => {
  const performers = makePerformers([
    { id: 'p1', instrument: 'trumpet', section: 'brass' },
    { id: 'p2', instrument: 'trumpet', section: 'brass' },
    { id: 'p3', instrument: 'flute', section: 'woodwinds' },
    { id: 'p4', instrument: 'snare', section: 'percussion' },
  ]);

  it('resolves "all" to all performer IDs', () => {
    const ids = resolvePerformerFilter({ type: 'all' }, performers);
    expect(ids).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('resolves "selected" to specified IDs', () => {
    const ids = resolvePerformerFilter({ type: 'selected', ids: ['p1', 'p3'] }, performers);
    expect(ids).toEqual(['p1', 'p3']);
  });

  it('resolves "section" to matching performers', () => {
    const ids = resolvePerformerFilter({ type: 'section', section: 'brass' }, performers);
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('resolves "instrument" to matching performers', () => {
    const ids = resolvePerformerFilter({ type: 'instrument', instrument: 'trumpet' }, performers);
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('returns empty for unmatched section', () => {
    const ids = resolvePerformerFilter({ type: 'section', section: 'strings' }, performers);
    expect(ids).toEqual([]);
  });

  it('returns empty for unmatched instrument', () => {
    const ids = resolvePerformerFilter({ type: 'instrument', instrument: 'violin' }, performers);
    expect(ids).toEqual([]);
  });

  it('handles empty performers list', () => {
    const ids = resolvePerformerFilter({ type: 'all' }, []);
    expect(ids).toEqual([]);
  });

  it('handles performers with no instrument/section', () => {
    const bare = makePerformers([{ id: 'x' }]);
    expect(resolvePerformerFilter({ type: 'section', section: 'brass' }, bare)).toEqual([]);
    expect(resolvePerformerFilter({ type: 'instrument', instrument: 'trumpet' }, bare)).toEqual([]);
  });
});
