/**
 * Unit Tests for AI Collaboration Service
 * @file src/services/__tests__/aiCollaborationService.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  detectEditingConflicts,
  suggestImprovements,
  toDrillSuggestions,
} from '../aiCollaborationService';
import type { FormationAwarenessState } from '../formation/yjs/formationYjsTypes';

// ============================================================================
// Helpers
// ============================================================================

function makeAwarenessState(overrides: Partial<FormationAwarenessState> & { user: FormationAwarenessState['user'] }): FormationAwarenessState {
  return {
    isActive: true,
    cursor: null,
    selectedPerformerIds: null,
    draggingPerformerId: null,
    activeKeyframeId: null,
    ...overrides,
  } as FormationAwarenessState;
}

// ============================================================================
// Tests
// ============================================================================

describe('aiCollaborationService', () => {
  describe('detectEditingConflicts', () => {
    it('should return no conflicts with fewer than 2 active users', () => {
      const states = [
        makeAwarenessState({ user: { id: '1', name: 'Alice', color: '#f00' } }),
      ];
      expect(detectEditingConflicts(states)).toEqual([]);
    });

    it('should detect same-performer drag conflict', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          draggingPerformerId: 'p1',
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          draggingPerformerId: 'p1',
        }),
      ];
      const conflicts = detectEditingConflicts(states);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('same-performer');
      expect(conflicts[0].severity).toBe('warning');
      expect(conflicts[0].performerIds).toEqual(['p1']);
    });

    it('should detect overlapping selection conflict', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          selectedPerformerIds: ['p1', 'p2', 'p3'],
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          selectedPerformerIds: ['p2', 'p4'],
        }),
      ];
      const conflicts = detectEditingConflicts(states);
      const samePerformerConflict = conflicts.find(c => c.type === 'same-performer');
      expect(samePerformerConflict).toBeDefined();
      expect(samePerformerConflict!.performerIds).toEqual(['p2']);
    });

    it('should detect overlapping cursor area conflict', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          cursor: { x: 50, y: 50, timestamp: Date.now() },
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          cursor: { x: 52, y: 52, timestamp: Date.now() },
        }),
      ];
      const conflicts = detectEditingConflicts(states);
      const areaConflict = conflicts.find(c => c.type === 'overlapping-area');
      expect(areaConflict).toBeDefined();
      expect(areaConflict!.severity).toBe('info');
    });

    it('should not detect overlapping area when cursors are far apart', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          cursor: { x: 10, y: 10, timestamp: Date.now() },
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          cursor: { x: 90, y: 90, timestamp: Date.now() },
        }),
      ];
      const conflicts = detectEditingConflicts(states);
      const areaConflict = conflicts.find(c => c.type === 'overlapping-area');
      expect(areaConflict).toBeUndefined();
    });

    it('should detect same-set conflict', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          activeKeyframeId: 'kf-1',
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          activeKeyframeId: 'kf-1',
        }),
      ];
      const conflicts = detectEditingConflicts(states);
      const sameSetConflict = conflicts.find(c => c.type === 'same-set');
      expect(sameSetConflict).toBeDefined();
    });

    it('should skip inactive users', () => {
      const states = [
        makeAwarenessState({
          user: { id: '1', name: 'Alice', color: '#f00' },
          draggingPerformerId: 'p1',
        }),
        makeAwarenessState({
          user: { id: '2', name: 'Bob', color: '#0f0' },
          isActive: false,
          draggingPerformerId: 'p1',
        }),
      ];
      expect(detectEditingConflicts(states)).toEqual([]);
    });
  });

  describe('suggestImprovements', () => {
    it('should return empty for formations with no keyframes', () => {
      const formation = { performers: [], keyframes: [], sets: [] } as any;
      expect(suggestImprovements(formation)).toEqual([]);
    });

    it('should detect spacing issues when performers are too close', () => {
      const positions = new Map([
        ['p1', { x: 50, y: 50 }],
        ['p2', { x: 51, y: 51 }],
      ]);
      const formation = {
        performers: [
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
        ],
        keyframes: [{ id: 'kf1', positions }],
        sets: [{ name: 'Set 1' }],
      } as any;

      const suggestions = suggestImprovements(formation);
      const spacing = suggestions.find(s => s.type === 'spacing');
      expect(spacing).toBeDefined();
      expect(spacing!.priority).toBe('high');
    });

    it('should detect long transitions between sets', () => {
      const positions1 = new Map([['p1', { x: 0, y: 0 }]]);
      const positions2 = new Map([['p1', { x: 90, y: 90 }]]);
      const formation = {
        performers: [{ id: 'p1', name: 'Alice' }],
        keyframes: [
          { id: 'kf1', positions: positions1 },
          { id: 'kf2', positions: positions2 },
        ],
        sets: [{ name: 'Set 1', counts: 4 }, { name: 'Set 2', counts: 8 }],
      } as any;

      const suggestions = suggestImprovements(formation);
      const transition = suggestions.find(s => s.type === 'transition');
      expect(transition).toBeDefined();
    });

    it('should detect spread section grouping', () => {
      const positions = new Map([
        ['p1', { x: 0, y: 0 }],
        ['p2', { x: 50, y: 50 }],
      ]);
      const formation = {
        performers: [
          { id: 'p1', name: 'Alice', section: 'Trumpets' },
          { id: 'p2', name: 'Bob', section: 'Trumpets' },
        ],
        keyframes: [{ id: 'kf1', positions }],
        sets: [{ name: 'Set 1' }],
      } as any;

      const suggestions = suggestImprovements(formation);
      const grouping = suggestions.find(s => s.type === 'section-grouping');
      expect(grouping).toBeDefined();
      expect(grouping!.message).toContain('Trumpets');
    });
  });

  describe('toDrillSuggestions', () => {
    it('should convert high priority to warning type', () => {
      const suggestions = toDrillSuggestions([
        { type: 'spacing', priority: 'high', message: 'Too close', setName: 'Set 1' },
      ]);
      expect(suggestions[0].type).toBe('warning');
    });

    it('should convert non-high priority to improvement type', () => {
      const suggestions = toDrillSuggestions([
        { type: 'transition', priority: 'medium', message: 'Long run', setName: 'Set 2' },
      ]);
      expect(suggestions[0].type).toBe('improvement');
    });
  });
});
