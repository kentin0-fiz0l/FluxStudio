import { describe, it, expect, vi } from 'vitest';
import type { Performer, Position, FieldConfig } from '../formationTypes';
import type { ParsedCommand } from '../promptParser';

// Mock dependencies before importing
vi.mock('../../utils/drillGeometry', () => ({
  generateLinePositions: vi.fn((start, end, count) => {
    return Array.from({ length: count }, (_, i) => ({
      x: start.x + ((end.x - start.x) * i) / Math.max(count - 1, 1),
      y: start.y + ((end.y - start.y) * i) / Math.max(count - 1, 1),
    }));
  }),
  generateArcPositions: vi.fn((_center, _radius, _startAngle, _endAngle, count) => {
    return Array.from({ length: count }, (_, i) => ({
      x: 50 + i * 5,
      y: 50,
    }));
  }),
  generateBlockPositions: vi.fn((_topLeft, _bottomRight, count) => {
    return Array.from({ length: count }, (_, i) => ({
      x: 20 + i * 10,
      y: 30 + i * 5,
    }));
  }),
}));

vi.mock('../drillAiService', () => ({
  generateFormationFromDescription: vi.fn(({ description, performers }) => {
    const positions = new Map<string, Position>();
    performers.forEach((p: Performer, i: number) => {
      positions.set(p.id, { x: 10 + i * 5, y: 50 });
    });
    return {
      sets: [{ positions }],
      description: `Generated: ${description}`,
    };
  }),
}));

import { executePromptCommand } from '../promptExecutor';

// ============================================================================
// Helpers
// ============================================================================

function makePerformers(count: number): Performer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Performer ${i + 1}`,
    label: `${i + 1}`,
    color: '#000',
  }));
}

function makeCurrentPositions(count: number): Map<string, Position> {
  const map = new Map<string, Position>();
  for (let i = 0; i < count; i++) {
    map.set(`p${i + 1}`, { x: 50, y: 50 });
  }
  return map;
}

// ============================================================================
// executePromptCommand - distribute
// ============================================================================

describe('executePromptCommand', () => {
  describe('distribute commands', () => {
    it('distributes performers in a line', () => {
      const performers = makePerformers(3);
      const positions = makeCurrentPositions(3);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'all' },
        params: { start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toEqual(['p1', 'p2', 'p3']);
      expect(result.proposedPositions.size).toBe(3);
      expect(result.description).toContain('line');
    });

    it('distributes performers in an arc', () => {
      const performers = makePerformers(4);
      const positions = makeCurrentPositions(4);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'arc',
        performerFilter: { type: 'all' },
        params: { center: { x: 50, y: 50 }, radius: 30 },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(4);
      expect(result.proposedPositions.size).toBe(4);
      expect(result.description).toContain('arc');
    });

    it('distributes performers in a circle', () => {
      const performers = makePerformers(5);
      const positions = makeCurrentPositions(5);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'circle',
        performerFilter: { type: 'all' },
        params: { center: { x: 50, y: 50 }, radius: 30 },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(5);
      expect(result.description).toContain('circle');
    });

    it('distributes performers in a grid', () => {
      const performers = makePerformers(6);
      const positions = makeCurrentPositions(6);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'grid',
        performerFilter: { type: 'all' },
        params: { start: { x: 15, y: 20 }, end: { x: 85, y: 80 } },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(6);
      expect(result.description).toContain('grid');
    });

    it('returns empty result when no performers match filter', () => {
      const performers = makePerformers(3);
      const positions = makeCurrentPositions(3);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'section', section: 'nonexistent' },
        params: {},
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toEqual([]);
      expect(result.proposedPositions.size).toBe(0);
      expect(result.description).toContain('No performers');
    });

    it('only affects filtered performers while keeping others', () => {
      const performers: Performer[] = [
        { id: 'p1', name: 'P1', label: '1', color: '#000', section: 'brass' },
        { id: 'p2', name: 'P2', label: '2', color: '#000', section: 'woodwinds' },
        { id: 'p3', name: 'P3', label: '3', color: '#000', section: 'brass' },
      ];
      const positions = new Map<string, Position>([
        ['p1', { x: 10, y: 10 }],
        ['p2', { x: 20, y: 20 }],
        ['p3', { x: 30, y: 30 }],
      ]);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'section', section: 'brass' },
        params: { start: { x: 0, y: 50 }, end: { x: 100, y: 50 } },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toEqual(['p1', 'p3']);
      // p2 should keep original position
      expect(result.proposedPositions.get('p2')).toEqual({ x: 20, y: 20 });
    });

    it('uses default params when not provided', () => {
      const performers = makePerformers(3);
      const positions = makeCurrentPositions(3);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'all' },
        params: {},
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(3);
    });
  });

  // ==========================================================================
  // template commands
  // ==========================================================================

  describe('template commands', () => {
    it('routes template through basic_formation', () => {
      const performers = makePerformers(3);
      const positions = makeCurrentPositions(3);
      const command: ParsedCommand = {
        type: 'template',
        templateName: 'company front',
        performerFilter: { type: 'all' },
        params: { templateName: 'company front' },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(3);
      expect(result.proposedPositions.size).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // morph commands
  // ==========================================================================

  describe('morph commands', () => {
    it('morphs performers toward a target shape', () => {
      const performers = makePerformers(3);
      const positions = new Map<string, Position>([
        ['p1', { x: 0, y: 0 }],
        ['p2', { x: 50, y: 50 }],
        ['p3', { x: 100, y: 100 }],
      ]);
      const command: ParsedCommand = {
        type: 'morph',
        targetShape: 'circle',
        morphFactor: 0.5,
        performerFilter: { type: 'all' },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(3);
      expect(result.description).toContain('50%');
      expect(result.description).toContain('circle');
    });

    it('returns empty result when no performers match', () => {
      const performers = makePerformers(3);
      const positions = makeCurrentPositions(3);
      const command: ParsedCommand = {
        type: 'morph',
        targetShape: 'circle',
        morphFactor: 0.5,
        performerFilter: { type: 'section', section: 'nonexistent' },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toEqual([]);
      expect(result.proposedPositions.size).toBe(0);
    });
  });

  // ==========================================================================
  // basic_formation commands
  // ==========================================================================

  describe('basic_formation commands', () => {
    it('generates formation from description', () => {
      const performers = makePerformers(4);
      const positions = makeCurrentPositions(4);
      const command: ParsedCommand = {
        type: 'basic_formation',
        description: 'company front',
        performerFilter: { type: 'all' },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(4);
      expect(result.description).toContain('Generated');
    });

    it('passes fieldConfig to generation', () => {
      const performers = makePerformers(2);
      const positions = makeCurrentPositions(2);
      const fieldConfig: FieldConfig = {
        type: 'ncaa_football',
        name: 'NCAA Football',
        width: 120,
        height: 53.33,
        yardLineInterval: 5,
        hashMarks: { front: 20, back: 20 },
        endZoneDepth: 10,
        unit: 'yards',
      };
      const command: ParsedCommand = {
        type: 'basic_formation',
        description: 'wedge',
        performerFilter: { type: 'all' },
      };

      const result = executePromptCommand(command, performers, positions, fieldConfig);
      expect(result.proposedPositions.size).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles empty performers array', () => {
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'all' },
        params: {},
      };

      const result = executePromptCommand(command, [], new Map());
      expect(result.affectedPerformerIds).toEqual([]);
      expect(result.proposedPositions.size).toBe(0);
    });

    it('handles single performer distribute', () => {
      const performers = makePerformers(1);
      const positions = makeCurrentPositions(1);
      const command: ParsedCommand = {
        type: 'distribute',
        shape: 'line',
        performerFilter: { type: 'all' },
        params: { start: { x: 10, y: 50 }, end: { x: 90, y: 50 } },
      };

      const result = executePromptCommand(command, performers, positions);
      expect(result.affectedPerformerIds).toHaveLength(1);
      expect(result.proposedPositions.get('p1')).toBeDefined();
    });
  });
});
