/**
 * Tests for useCanvasAccessibility hook
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasAccessibility } from '../useCanvasAccessibility';
import type { Formation, Position } from '../../../../services/formationService';
import type { Tool } from '../types';

// Mock the coordinate sheet generator
vi.mock('../../../../services/coordinateSheetGenerator', () => ({
  positionToCoordinateDetails: vi.fn((_pos, _config) => ({
    sideToSide: 'On L40',
    frontToBack: '4 behind front hash',
  })),
}));

vi.mock('../../../../services/fieldConfigService', () => ({
  NCAA_FOOTBALL_FIELD: {
    type: 'ncaa',
    name: 'NCAA Football',
    width: 120,
    height: 53.33,
    endZoneDepth: 10,
    hashMarks: { front: 17.78, back: 17.78 },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFormation(overrides: Partial<Formation> = {}): Formation {
  return {
    id: 'f1',
    name: 'Test Formation',
    performers: [
      { id: 'p1', name: 'Alice', label: 'A1', color: '#ff0000' },
      { id: 'p2', name: 'Bob', label: 'B1', color: '#0000ff' },
      { id: 'p3', name: 'Charlie', label: 'C1', color: '#00ff00' },
    ],
    keyframes: [
      {
        id: 'kf1',
        time: 0,
        positions: new Map([
          ['p1', { x: 30, y: 50 }],
          ['p2', { x: 50, y: 50 }],
          ['p3', { x: 70, y: 50 }],
        ]),
      },
      {
        id: 'kf2',
        time: 4,
        positions: new Map([
          ['p1', { x: 35, y: 45 }],
          ['p2', { x: 55, y: 45 }],
          ['p3', { x: 75, y: 45 }],
        ]),
      },
    ],
    stageWidth: 60,
    stageHeight: 40,
    gridSize: 1,
    ...overrides,
  } as Formation;
}

function defaultProps() {
  return {
    formation: createFormation(),
    selectedPerformerIds: new Set<string>(),
    currentPositions: new Map<string, Position>([
      ['p1', { x: 30, y: 50 }],
      ['p2', { x: 50, y: 50 }],
      ['p3', { x: 70, y: 50 }],
    ]),
    activeTool: 'select' as Tool,
    zoom: 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasAccessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    test('starts with empty announcement', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      expect(result.current.announcement).toBe('');
    });

    test('provides liveRegionRef', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      expect(result.current.liveRegionRef).toBeDefined();
    });
  });

  describe('getPerformerDescription', () => {
    test('returns formatted position description for a performer', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      const desc = result.current.getPerformerDescription('p1');
      expect(desc).toBe('Alice: On L40, 4 behind front hash');
    });

    test('returns empty string for unknown performer', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      const desc = result.current.getPerformerDescription('unknown');
      expect(desc).toBe('');
    });

    test('returns empty string when no formation', () => {
      const { result } = renderHook(() =>
        useCanvasAccessibility({ ...defaultProps(), formation: null }),
      );
      const desc = result.current.getPerformerDescription('p1');
      expect(desc).toBe('');
    });

    test('returns name with position unknown when position is missing', () => {
      const props = defaultProps();
      props.currentPositions = new Map(); // no positions
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const desc = result.current.getPerformerDescription('p1');
      expect(desc).toBe('Alice, position unknown');
    });
  });

  describe('navigatePerformer', () => {
    test('navigates to first performer when none selected', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      const nextId = result.current.navigatePerformer('next');
      expect(nextId).toBe('p1');
    });

    test('navigates to next performer', () => {
      const props = defaultProps();
      props.selectedPerformerIds = new Set(['p1']);
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const nextId = result.current.navigatePerformer('next');
      expect(nextId).toBe('p2');
    });

    test('navigates to previous performer', () => {
      const props = defaultProps();
      props.selectedPerformerIds = new Set(['p2']);
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const prevId = result.current.navigatePerformer('prev');
      expect(prevId).toBe('p1');
    });

    test('wraps around to first when navigating past last', () => {
      const props = defaultProps();
      props.selectedPerformerIds = new Set(['p3']);
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const nextId = result.current.navigatePerformer('next');
      expect(nextId).toBe('p1');
    });

    test('wraps around to last when navigating before first', () => {
      const props = defaultProps();
      props.selectedPerformerIds = new Set(['p1']);
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const prevId = result.current.navigatePerformer('prev');
      expect(prevId).toBe('p3');
    });

    test('returns null when no formation', () => {
      const { result } = renderHook(() =>
        useCanvasAccessibility({ ...defaultProps(), formation: null }),
      );
      const nextId = result.current.navigatePerformer('next');
      expect(nextId).toBeNull();
    });

    test('returns null when no performers', () => {
      const props = defaultProps();
      props.formation = createFormation({ performers: [] });
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const nextId = result.current.navigatePerformer('next');
      expect(nextId).toBeNull();
    });
  });

  describe('getCanvasSummary', () => {
    test('returns summary with formation name, counts, and tool', () => {
      const { result } = renderHook(() => useCanvasAccessibility(defaultProps()));
      const summary = result.current.getCanvasSummary();
      expect(summary).toContain('Formation: Test Formation');
      expect(summary).toContain('3 performers');
      expect(summary).toContain('2 sets');
      expect(summary).toContain('Active tool: Select tool');
    });

    test('includes selected count when performers are selected', () => {
      const props = defaultProps();
      props.selectedPerformerIds = new Set(['p1', 'p2']);
      const { result } = renderHook(() => useCanvasAccessibility(props));
      const summary = result.current.getCanvasSummary();
      expect(summary).toContain('2 selected');
    });

    test('returns no formation message when null', () => {
      const { result } = renderHook(() =>
        useCanvasAccessibility({ ...defaultProps(), formation: null }),
      );
      expect(result.current.getCanvasSummary()).toBe('No formation loaded');
    });

    test('uses singular for 1 performer', () => {
      const props = defaultProps();
      props.formation = createFormation({
        performers: [{ id: 'p1', name: 'Alice', label: 'A1', color: '#ff0000' }],
      });
      const { result } = renderHook(() => useCanvasAccessibility(props));
      expect(result.current.getCanvasSummary()).toContain('1 performer.');
    });

    test('reflects current tool', () => {
      const props = defaultProps();
      props.activeTool = 'pan';
      const { result } = renderHook(() => useCanvasAccessibility(props));
      expect(result.current.getCanvasSummary()).toContain('Active tool: Pan tool');
    });
  });

  describe('announcements', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('announces when a performer is selected', () => {
      const props = defaultProps();
      const { result, rerender } = renderHook(
        (p) => useCanvasAccessibility(p),
        { initialProps: props },
      );

      // Select a performer
      const updatedProps = { ...props, selectedPerformerIds: new Set(['p1']) };

      act(() => {
        rerender(updatedProps);
      });

      // Flush the setTimeout(0) that sets the announcement
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.announcement).toContain('Selected: Alice');
    });

    test('announces selection cleared', () => {
      const props = { ...defaultProps(), selectedPerformerIds: new Set(['p1']) };
      const { result, rerender } = renderHook(
        (p) => useCanvasAccessibility(p),
        { initialProps: props },
      );

      // Flush initial selection announcement
      act(() => { vi.runAllTimers(); });

      // Clear selection
      const updatedProps = { ...props, selectedPerformerIds: new Set<string>() };

      act(() => {
        rerender(updatedProps);
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.announcement).toBe('Selection cleared');
    });

    test('announces multi-selection count', () => {
      const props = defaultProps();
      const { result, rerender } = renderHook(
        (p) => useCanvasAccessibility(p),
        { initialProps: props },
      );

      const updatedProps = { ...props, selectedPerformerIds: new Set(['p1', 'p2', 'p3']) };

      act(() => {
        rerender(updatedProps);
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.announcement).toBe('3 performers selected');
    });

    test('announces tool change', () => {
      const props = defaultProps();
      const { result, rerender } = renderHook(
        (p) => useCanvasAccessibility(p),
        { initialProps: props },
      );

      const updatedProps = { ...props, activeTool: 'add' as Tool };

      act(() => {
        rerender(updatedProps);
      });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.announcement).toBe('Add performer tool');
    });
  });
});
