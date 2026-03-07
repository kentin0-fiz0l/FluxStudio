/**
 * useCanvasHandlers Tests
 *
 * Tests for all event handlers in the FormationCanvas hook:
 * selection, movement, drag, undo/redo, performer CRUD,
 * canvas pointer events, shape tools, zoom, nudge, and more.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasHandlers } from '../useCanvasHandlers';
import type { Position, Formation, PlaybackState } from '../../../../services/formationTypes';
import type { UseFormationHistoryResult } from '../../../../hooks/useFormationHistory';
import type { Marquee, Tool } from '../types';

// ---- Mocks ----

vi.mock('../../../../services/formationService', () => ({
  formationService: {
    updatePosition: vi.fn(),
    addPerformer: vi.fn(),
    removePerformer: vi.fn(),
    getFormation: vi.fn(),
    registerFormation: vi.fn((f: unknown) => f),
    addKeyframe: vi.fn(),
    removeKeyframe: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setSpeed: vi.fn(),
    toggleLoop: vi.fn(() => true),
    getPositionsAtTime: vi.fn(() => new Map()),
    exportFormation: vi.fn(),
    getAllPerformerPaths: vi.fn(() => new Map()),
    applyTemplate: vi.fn(() => ({ success: true, keyframesCreated: 0 })),
  },
}));

vi.mock('../../../../lib/toast', () => ({
  toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../services/formationsApi', () => ({
  createFormation: vi.fn(),
  saveFormation: vi.fn(),
}));

vi.mock('../../../../utils/drillGeometry', () => ({
  snapToGrid: vi.fn((pos: Position) => pos),
  snapToCount: vi.fn((t: number) => t),
  alignPositions: vi.fn((positions: Position[]) => positions),
  distributePositions: vi.fn((positions: Position[]) => positions),
  generateLinePositions: vi.fn((_s: unknown, _e: unknown, count: number) =>
    Array.from({ length: count }, (_, i) => ({ x: i * 10, y: 50, rotation: 0 })),
  ),
  generateArcPositions: vi.fn((_c: unknown, _r: number, _sa: number, _ea: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({ x: 50 + i * 5, y: 50 + i * 5, rotation: 0 })),
  ),
  generateBlockPositions: vi.fn((_tl: unknown, _br: unknown, count: number) =>
    Array.from({ length: count }, (_, i) => ({ x: 10 + i * 5, y: 10 + i * 5, rotation: 0 })),
  ),
  findSnapTargets: vi.fn(() => []),
  applySnapGuides: vi.fn((pos: Position) => pos),
}));

// Import mocked modules at the top level (vi.mock is hoisted)
import { formationService } from '../../../../services/formationService';
import * as drillGeometry from '../../../../utils/drillGeometry';

// ---- Helpers ----

function makePerformer(id: string, label?: string) {
  return { id, name: `Performer ${id}`, label: label || id, color: '#ef4444' };
}

function makePosition(x: number, y: number, rotation = 0): Position {
  return { x, y, rotation };
}

function makeFormation(overrides: Partial<Formation> = {}): Formation {
  const performers = overrides.performers || [makePerformer('p1', 'P1'), makePerformer('p2', 'P2')];
  const positions = new Map<string, Position>();
  performers.forEach((p, i) => positions.set(p.id, makePosition(20 + i * 20, 30 + i * 10)));

  return {
    id: 'formation-1',
    name: 'Test Formation',
    projectId: 'project-1',
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 5,
    performers,
    keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeHistory(overrides: Partial<UseFormationHistoryResult> = {}): UseFormationHistoryResult {
  return {
    pushState: vi.fn(),
    undo: vi.fn(() => null),
    redo: vi.fn(() => null),
    canUndo: false,
    canRedo: false,
    historyIndex: 0,
    historyLength: 1,
    reset: vi.fn(),
    ...overrides,
  };
}

function makeCollab() {
  return {
    isConnected: false,
    isSyncing: false,
    collaborators: [],
    updatePosition: vi.fn(),
    addPerformer: vi.fn(),
    removePerformer: vi.fn(),
    setDraggingPerformer: vi.fn(),
    isPerformerBeingDragged: vi.fn(() => ({ dragging: false, by: null })),
    setSelectedPerformers: vi.fn(),
    updateCursor: vi.fn(),
    clearCursor: vi.fn(),
    yUndo: vi.fn(),
    yRedo: vi.fn(),
    addKeyframe: vi.fn(() => ({ id: 'collab-kf', timestamp: 0, positions: new Map() })),
    removeKeyframe: vi.fn(),
    setAudioTrack: vi.fn(),
    updateMeta: vi.fn(),
  };
}

/**
 * Build the full `state` object needed by useCanvasHandlers.
 * Returns real React state setters backed by vi.fn() spies so we
 * can inspect calls without needing the full useCanvasState hook.
 */
function makeState(overrides: Record<string, unknown> = {}) {
  const formation = (overrides.formation !== undefined ? overrides.formation : makeFormation()) as Formation | null;
  const performers = formation?.performers || [];
  const positions = formation?.keyframes[0]?.positions || new Map<string, Position>();

  // Use a mutable ref-like objects for testing
  const canvasRef = { current: null as HTMLDivElement | null };
  const clipboardRef = { current: null as { performers: Formation['performers']; positions: Map<string, Position> } | null };
  const marqueeRef = { current: false };

  return {
    formation,
    setFormation: vi.fn((updater: unknown) => {
      if (typeof updater === 'function') return (updater as (prev: Formation | null) => Formation | null)(formation);
      return updater;
    }),
    selectedPerformerIds: (overrides.selectedPerformerIds as Set<string>) || new Set<string>(),
    setSelectedPerformerIds: vi.fn(),
    selectedKeyframeId: (overrides.selectedKeyframeId as string) || 'kf-1',
    setSelectedKeyframeId: vi.fn(),
    currentPositions: (overrides.currentPositions as Map<string, Position>) || new Map(positions),
    setCurrentPositions: vi.fn((updater: unknown) => {
      if (typeof updater === 'function') {
        return (updater as (prev: Map<string, Position>) => Map<string, Position>)(new Map(positions));
      }
      return updater;
    }),
    setSaveStatus: vi.fn(),
    setHasUnsavedChanges: vi.fn(),
    activeTool: (overrides.activeTool as Tool) || 'select',
    snapEnabled: (overrides.snapEnabled as boolean) ?? false,
    timeDisplayMode: 'time' as const,
    drillSettings: { bpm: 120, countsPerPhrase: 8, startOffset: 0, fieldOverlay: false, snapToGrid: false },
    playbackState: (overrides.playbackState as PlaybackState) || { isPlaying: false, currentTime: 0, duration: 5000, loop: false, speed: 1 },
    setPlaybackState: vi.fn(),
    setGhostTrail: vi.fn(),
    isCollaborativeEnabled: (overrides.isCollaborativeEnabled as boolean) ?? false,
    collab: (overrides.collab as ReturnType<typeof makeCollab>) || makeCollab(),
    apiSave: vi.fn(),
    history: (overrides.history as UseFormationHistoryResult) || makeHistory(),
    canvasRef: (overrides.canvasRef as React.RefObject<HTMLDivElement>) || canvasRef,
    clipboardRef,
    setDraggingPerformerId: vi.fn(),
    shapeToolStart: (overrides.shapeToolStart as Position | null) ?? null,
    setShapeToolStart: vi.fn(),
    shapeToolCurrent: null as Position | null,
    setShapeToolCurrent: vi.fn(),
    marquee: (overrides.marquee as Marquee | null) ?? null,
    setMarquee: vi.fn(),
    marqueeRef,
    fingerMode: 'select' as const,
    showPaths: false,
    hasUnsavedChanges: false,
    setShowAudioPanel: vi.fn(),
    setShowTemplatePicker: vi.fn(),
    setSnapGuides: vi.fn(),
    setZoom: vi.fn(),
  };
}

function renderHandlers(stateOverrides: Record<string, unknown> = {}) {
  const state = makeState(stateOverrides);
  const { result } = renderHook(() =>
    useCanvasHandlers({
      state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
      formationId: 'formation-1',
      projectId: 'project-1',
      onSave: vi.fn(),
      sandboxMode: false,
    }),
  );
  return { handlers: result, state };
}

// ---- Tests ----

describe('useCanvasHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Selection
  // ============================================================

  describe('handleSelectPerformer', () => {
    it('selects a single performer when multiSelect is false', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleSelectPerformer('p1', false); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalled();
      // Call the updater to verify its behavior
      const updater = (state.setSelectedPerformerIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(new Set(['p2']));
      expect(result.has('p1')).toBe(true);
      expect(result.has('p2')).toBe(false);
    });

    it('adds to selection when multiSelect is true', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleSelectPerformer('p1', true); });
      const updater = (state.setSelectedPerformerIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(new Set(['p2']));
      expect(result.has('p1')).toBe(true);
      expect(result.has('p2')).toBe(true);
    });

    it('toggles off a performer that is already selected in multi-select mode', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleSelectPerformer('p2', true); });
      const updater = (state.setSelectedPerformerIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(new Set(['p2', 'p1']));
      expect(result.has('p2')).toBe(false);
      expect(result.has('p1')).toBe(true);
    });
  });

  describe('handleSelectAll', () => {
    it('selects all performers', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleSelectAll(); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p1', 'p2']));
    });

    it('does nothing when formation is null', () => {
      const { handlers, state } = renderHandlers({ formation: null });
      act(() => { handlers.current.handleSelectAll(); });
      expect(state.setSelectedPerformerIds).not.toHaveBeenCalled();
    });
  });

  describe('handleDeselectAll', () => {
    it('clears the selection', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set(['p1']) });
      act(() => { handlers.current.handleDeselectAll(); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set());
    });
  });

  describe('handleInvertSelection', () => {
    it('inverts the current selection', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set(['p1']) });
      act(() => { handlers.current.handleInvertSelection(); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p2']));
    });

    it('selects all when none are selected', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set() });
      act(() => { handlers.current.handleInvertSelection(); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p1', 'p2']));
    });
  });

  describe('handleSelectBySection', () => {
    it('selects performers matching the given section', () => {
      const formation = makeFormation({
        performers: [
          { ...makePerformer('p1'), section: 'Brass' },
          { ...makePerformer('p2'), section: 'Woodwinds' },
          { ...makePerformer('p3'), section: 'Brass' },
        ],
      });
      const { handlers, state } = renderHandlers({ formation });
      act(() => { handlers.current.handleSelectBySection('Brass'); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p1', 'p3']));
    });

    it('selects performers with no section under "Unassigned"', () => {
      const formation = makeFormation({
        performers: [makePerformer('p1'), makePerformer('p2')],
      });
      const { handlers, state } = renderHandlers({ formation });
      act(() => { handlers.current.handleSelectBySection('Unassigned'); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p1', 'p2']));
    });
  });

  describe('handleSelectByProximity', () => {
    it('selects performers within the given radius', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(50, 50));
      positions.set('p2', makePosition(52, 50)); // distance = 2
      positions.set('p3', makePosition(80, 80)); // distance >> 5
      const formation = makeFormation({
        performers: [makePerformer('p1'), makePerformer('p2'), makePerformer('p3')],
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({ formation, currentPositions: positions });
      act(() => { handlers.current.handleSelectByProximity('p1', 5); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalled();
      const selected = (state.setSelectedPerformerIds as ReturnType<typeof vi.fn>).mock.calls[0][0] as Set<string>;
      expect(selected.has('p1')).toBe(true);
      expect(selected.has('p2')).toBe(true);
      expect(selected.has('p3')).toBe(false);
    });
  });

  // ============================================================
  // Movement / Nudge
  // ============================================================

  describe('handleNudge', () => {
    it('moves selected performers by the given delta', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(50, 50));
      positions.set('p2', makePosition(60, 60));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1']),
      });
      act(() => { handlers.current.handleNudge(2, -3); });
      expect(state.setCurrentPositions).toHaveBeenCalled();
      // Verify the updater computes the right new position
      const updater = (state.setCurrentPositions as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(positions) as Map<string, Position>;
      expect(result.get('p1')).toEqual({ x: 52, y: 47, rotation: 0 });
      // p2 should be unchanged
      expect(result.get('p2')).toEqual({ x: 60, y: 60, rotation: 0 });
    });

    it('clamps positions to 0-100 range', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(1, 99));
      const formation = makeFormation({
        performers: [makePerformer('p1')],
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1']),
      });
      act(() => { handlers.current.handleNudge(-5, 5); });
      const updater = (state.setCurrentPositions as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(positions) as Map<string, Position>;
      expect(result.get('p1')!.x).toBe(0);
      expect(result.get('p1')!.y).toBe(100);
    });

    it('does nothing when no performers are selected', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set() });
      act(() => { handlers.current.handleNudge(1, 1); });
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });
  });

  describe('handleMovePerformer', () => {
    it('updates single performer position via formationService', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(),
      });
      const newPos = makePosition(40, 50);
      act(() => { handlers.current.handleMovePerformer('p1', newPos); });
      expect(formationService.updatePosition).toHaveBeenCalledWith('formation-1', 'kf-1', 'p1', newPos);
      expect(state.setCurrentPositions).toHaveBeenCalled();
    });

    it('moves entire selection when performer is part of multi-selection', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30));
      positions.set('p2', makePosition(40, 50));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1', 'p2']),
      });
      // Move p1 by +10, +5
      act(() => { handlers.current.handleMovePerformer('p1', makePosition(30, 35)); });
      expect(state.setCurrentPositions).toHaveBeenCalled();
      const updater = (state.setCurrentPositions as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const result = updater(positions) as Map<string, Position>;
      // p1: 20+10=30, 30+5=35; p2: 40+10=50, 50+5=55
      expect(result.get('p1')).toEqual({ x: 30, y: 35, rotation: 0 });
      expect(result.get('p2')).toEqual({ x: 50, y: 55, rotation: 0 });
    });

    it('does nothing during playback', () => {
      const { handlers, state } = renderHandlers({
        playbackState: { isPlaying: true, currentTime: 1000, duration: 5000, loop: false, speed: 1 },
      });
      act(() => { handlers.current.handleMovePerformer('p1', makePosition(50, 50)); });
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });
  });

  describe('handleRotatePerformer', () => {
    it('updates performer rotation', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30, 0));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers } = renderHandlers({ formation, currentPositions: positions });
      act(() => { handlers.current.handleRotatePerformer('p1', 90); });
      expect(formationService.updatePosition).toHaveBeenCalledWith(
        'formation-1', 'kf-1', 'p1', { x: 20, y: 30, rotation: 90 },
      );
    });
  });

  // ============================================================
  // Drag start/end
  // ============================================================

  describe('handleDragStart', () => {
    it('sets dragging performer id in non-collaborative mode', () => {
      const { handlers, state } = renderHandlers();
      let result: boolean;
      act(() => { result = handlers.current.handleDragStart('p1'); });
      expect(result!).toBe(true);
      expect(state.setDraggingPerformerId).toHaveBeenCalledWith('p1');
    });
  });

  describe('handleDragEnd', () => {
    it('clears dragging state and pushes history', () => {
      const history = makeHistory();
      const { handlers, state } = renderHandlers({ history });
      act(() => { handlers.current.handleDragEnd(); });
      expect(state.setDraggingPerformerId).toHaveBeenCalledWith(null);
      expect(state.setSnapGuides).toHaveBeenCalledWith([]);
      expect(history.pushState).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Performer CRUD
  // ============================================================

  describe('handleDeleteSelected', () => {
    it('removes selected performers and clears selection', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set(['p1']) });
      act(() => { handlers.current.handleDeleteSelected(); });
      expect(formationService.removePerformer).toHaveBeenCalledWith('formation-1', 'p1');
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set());
    });

    it('does nothing when no performers are selected', () => {
      const { handlers } = renderHandlers({ selectedPerformerIds: new Set() });
      act(() => { handlers.current.handleDeleteSelected(); });
      expect(formationService.removePerformer).not.toHaveBeenCalled();
    });
  });

  describe('handleDuplicateSelected', () => {
    it('creates duplicated performers offset by 3,3', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1']),
      });
      act(() => { handlers.current.handleDuplicateSelected(); });
      expect(state.setFormation).toHaveBeenCalled();
      expect(state.setCurrentPositions).toHaveBeenCalled();
    });

    it('does nothing when no performers are selected', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set() });
      act(() => { handlers.current.handleDuplicateSelected(); });
      expect(state.setFormation).not.toHaveBeenCalled();
    });
  });

  describe('handleRemovePerformer', () => {
    it('removes specific performer and updates selection and positions', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleRemovePerformer('p1'); });
      expect(formationService.removePerformer).toHaveBeenCalledWith('formation-1', 'p1');
      expect(state.setSelectedPerformerIds).toHaveBeenCalled();
      expect(state.setCurrentPositions).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Copy / Paste
  // ============================================================

  describe('handleCopy and handlePaste', () => {
    it('copies selected performers to clipboard and pastes them offset', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30));
      positions.set('p2', makePosition(40, 50));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers, state } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1']),
      });
      // Copy
      act(() => { handlers.current.handleCopy(); });
      expect(state.clipboardRef.current).not.toBeNull();
      expect(state.clipboardRef.current!.performers).toHaveLength(1);
      expect(state.clipboardRef.current!.performers[0].id).toBe('p1');

      // Paste
      act(() => { handlers.current.handlePaste(); });
      expect(state.setFormation).toHaveBeenCalled();
      expect(state.setSelectedPerformerIds).toHaveBeenCalled();
    });

    it('paste does nothing when clipboard is empty', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handlePaste(); });
      expect(state.setFormation).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Undo / Redo
  // ============================================================

  describe('handleUndo', () => {
    it('restores previous snapshot from history', () => {
      const prevPositions = new Map<string, Position>([['p1', makePosition(10, 10)]]);
      const history = makeHistory({
        undo: vi.fn(() => ({ positions: prevPositions, performerIds: ['p1'], label: 'prev' })),
      });
      const { handlers, state } = renderHandlers({ history });
      act(() => { handlers.current.handleUndo(); });
      expect(history.undo).toHaveBeenCalled();
      expect(state.setCurrentPositions).toHaveBeenCalled();
      expect(formationService.updatePosition).toHaveBeenCalledWith(
        'formation-1', 'kf-1', 'p1', makePosition(10, 10),
      );
    });

    it('does nothing when history is empty', () => {
      const history = makeHistory({ undo: vi.fn(() => null) });
      const { handlers, state } = renderHandlers({ history });
      act(() => { handlers.current.handleUndo(); });
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });

    it('delegates to collab.yUndo in collaborative mode', () => {
      const collab = makeCollab();
      collab.isConnected = true;
      const { handlers } = renderHandlers({ isCollaborativeEnabled: true, collab });
      act(() => { handlers.current.handleUndo(); });
      expect(collab.yUndo).toHaveBeenCalled();
    });
  });

  describe('handleRedo', () => {
    it('restores next snapshot from history', () => {
      const nextPositions = new Map<string, Position>([['p1', makePosition(60, 60)]]);
      const history = makeHistory({
        redo: vi.fn(() => ({ positions: nextPositions, performerIds: ['p1'], label: 'next' })),
      });
      const { handlers, state } = renderHandlers({ history });
      act(() => { handlers.current.handleRedo(); });
      expect(history.redo).toHaveBeenCalled();
      expect(state.setCurrentPositions).toHaveBeenCalled();
      expect(formationService.updatePosition).toHaveBeenCalledWith(
        'formation-1', 'kf-1', 'p1', makePosition(60, 60),
      );
    });
  });

  // ============================================================
  // Keyframe management
  // ============================================================

  describe('handleKeyframeSelect', () => {
    it('switches to selected keyframe and loads its positions', () => {
      const kf2Positions = new Map<string, Position>([['p1', makePosition(80, 80)]]);
      const formation = makeFormation({
        keyframes: [
          { id: 'kf-1', timestamp: 0, positions: new Map([['p1', makePosition(20, 20)]]) },
          { id: 'kf-2', timestamp: 1000, positions: kf2Positions },
        ],
      });
      const { handlers, state } = renderHandlers({ formation });
      act(() => { handlers.current.handleKeyframeSelect('kf-2'); });
      expect(state.setSelectedKeyframeId).toHaveBeenCalledWith('kf-2');
      expect(state.setCurrentPositions).toHaveBeenCalled();
    });
  });

  describe('handleKeyframeAdd', () => {
    it('adds a keyframe and selects it', () => {
      const newKf = { id: 'kf-new', timestamp: 2000, positions: new Map() };
      (formationService.addKeyframe as ReturnType<typeof vi.fn>).mockReturnValueOnce(newKf);
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleKeyframeAdd(2000); });
      expect(formationService.addKeyframe).toHaveBeenCalled();
      expect(state.setSelectedKeyframeId).toHaveBeenCalledWith('kf-new');
    });
  });

  describe('handleKeyframeRemove', () => {
    it('removes a keyframe and selects another if the removed one was active', () => {
      const formation = makeFormation({
        keyframes: [
          { id: 'kf-1', timestamp: 0, positions: new Map() },
          { id: 'kf-2', timestamp: 1000, positions: new Map() },
        ],
      });
      const { handlers, state } = renderHandlers({ formation, selectedKeyframeId: 'kf-2' });
      act(() => { handlers.current.handleKeyframeRemove('kf-2'); });
      expect(formationService.removeKeyframe).toHaveBeenCalledWith('formation-1', 'kf-2');
      expect(state.setSelectedKeyframeId).toHaveBeenCalledWith('kf-1');
    });
  });

  describe('handleKeyframeMove', () => {
    it('updates keyframe timestamp and re-sorts', () => {
      const formation = makeFormation({
        keyframes: [
          { id: 'kf-1', timestamp: 0, positions: new Map() },
          { id: 'kf-2', timestamp: 1000, positions: new Map() },
        ],
      });
      const { handlers, state } = renderHandlers({ formation });
      act(() => { handlers.current.handleKeyframeMove('kf-1', 1500); });
      expect(state.setFormation).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Zoom
  // ============================================================

  describe('handleZoomIn / handleZoomOut', () => {
    it('increases zoom via setZoom', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleZoomIn(); });
      expect(state.setZoom).toHaveBeenCalled();
      // Verify the updater clamps at max 3
      const updater = (state.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updater(2.9)).toBeCloseTo(3);
      expect(updater(3)).toBe(3);
    });

    it('decreases zoom via setZoom', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleZoomOut(); });
      expect(state.setZoom).toHaveBeenCalled();
      const updater = (state.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updater(0.6)).toBeCloseTo(0.5);
      expect(updater(0.5)).toBe(0.5);
    });
  });

  // ============================================================
  // Canvas pointer events (marquee / box selection)
  // ============================================================

  describe('handleCanvasPointerDown', () => {
    it('starts marquee selection on canvas background click', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({ canvasRef, activeTool: 'select' });

      const event = {
        pointerType: 'mouse',
        button: 0,
        clientX: 500,
        clientY: 300,
        target: canvasEl,
      } as unknown as React.PointerEvent;

      act(() => { handlers.current.handleCanvasPointerDown(event); });
      expect(state.marqueeRef.current).toBe(true);
      expect(state.setMarquee).toHaveBeenCalledWith({ startX: 50, startY: 30, currentX: 50, currentY: 30 });
    });

    it('ignores pointer down on performer elements', () => {
      const canvasEl = document.createElement('div');
      const performerEl = document.createElement('div');
      performerEl.setAttribute('data-performer', 'true');
      canvasEl.appendChild(performerEl);
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({ canvasRef, activeTool: 'select' });

      const event = {
        pointerType: 'mouse',
        button: 0,
        clientX: 500,
        clientY: 300,
        target: performerEl,
      } as unknown as React.PointerEvent;

      act(() => { handlers.current.handleCanvasPointerDown(event); });
      expect(state.setMarquee).not.toHaveBeenCalled();
    });

    it('ignores pointer down when tool is not select', () => {
      const canvasEl = document.createElement('div');
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({ canvasRef, activeTool: 'pan' });

      const event = {
        pointerType: 'mouse',
        button: 0,
        clientX: 500,
        clientY: 300,
        target: canvasEl,
      } as unknown as React.PointerEvent;

      act(() => { handlers.current.handleCanvasPointerDown(event); });
      expect(state.setMarquee).not.toHaveBeenCalled();
    });

    it('ignores touch events in pan finger mode', () => {
      const canvasEl = document.createElement('div');
      const canvasRef = { current: canvasEl };
      const state = makeState({ canvasRef, activeTool: 'select' });
      (state as Record<string, unknown>).fingerMode = 'pan';
      const { result } = renderHook(() =>
        useCanvasHandlers({
          state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
          formationId: 'formation-1',
          projectId: 'project-1',
          onSave: vi.fn(),
          sandboxMode: false,
        }),
      );

      const event = {
        pointerType: 'touch',
        button: 0,
        clientX: 500,
        clientY: 300,
        target: canvasEl,
      } as unknown as React.PointerEvent;

      act(() => { result.current.handleCanvasPointerDown(event); });
      expect(state.setMarquee).not.toHaveBeenCalled();
    });
  });

  describe('handleCanvasPointerUp (marquee selection)', () => {
    it('selects performers within the marquee rectangle', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(25, 25));
      positions.set('p2', makePosition(75, 75));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });

      const marquee: Marquee = { startX: 10, startY: 10, currentX: 50, currentY: 50 };
      const state = makeState({ formation, currentPositions: positions, marquee });
      state.marqueeRef.current = true;

      const { result } = renderHook(() =>
        useCanvasHandlers({
          state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
          formationId: 'formation-1',
          projectId: 'project-1',
          onSave: vi.fn(),
          sandboxMode: false,
        }),
      );

      act(() => { result.current.handleCanvasPointerUp({} as React.PointerEvent); });
      expect(state.setSelectedPerformerIds).toHaveBeenCalledWith(new Set(['p1']));
      expect(state.setMarquee).toHaveBeenCalledWith(null);
    });

    it('ignores tiny marquees (< 2px threshold)', () => {
      const marquee: Marquee = { startX: 50, startY: 50, currentX: 51, currentY: 51 };
      const state = makeState({ marquee });
      state.marqueeRef.current = true;

      const { result } = renderHook(() =>
        useCanvasHandlers({
          state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
          formationId: 'formation-1',
          projectId: 'project-1',
          onSave: vi.fn(),
          sandboxMode: false,
        }),
      );

      act(() => { result.current.handleCanvasPointerUp({} as React.PointerEvent); });
      expect(state.setSelectedPerformerIds).not.toHaveBeenCalled();
      expect(state.setMarquee).toHaveBeenCalledWith(null);
    });
  });

  describe('handleCanvasPointerMoveMarquee', () => {
    it('updates marquee coordinates during drag', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const state = makeState({ canvasRef });
      state.marqueeRef.current = true;

      const { result } = renderHook(() =>
        useCanvasHandlers({
          state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
          formationId: 'formation-1',
          projectId: 'project-1',
          onSave: vi.fn(),
          sandboxMode: false,
        }),
      );

      const event = {
        clientX: 700,
        clientY: 400,
      } as unknown as React.PointerEvent;

      act(() => { result.current.handleCanvasPointerMoveMarquee(event); });
      expect(state.setMarquee).toHaveBeenCalled();
    });

    it('does nothing when marqueeRef is false', () => {
      const canvasEl = document.createElement('div');
      const canvasRef = { current: canvasEl };
      const state = makeState({ canvasRef });
      state.marqueeRef.current = false;

      const { result } = renderHook(() =>
        useCanvasHandlers({
          state: state as unknown as ReturnType<typeof import('../useCanvasState').useCanvasState>,
          formationId: 'formation-1',
          projectId: 'project-1',
          onSave: vi.fn(),
          sandboxMode: false,
        }),
      );

      act(() => {
        result.current.handleCanvasPointerMoveMarquee({ clientX: 500, clientY: 500 } as unknown as React.PointerEvent);
      });
      expect(state.setMarquee).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Canvas click (add tool, shape tools)
  // ============================================================

  describe('handleCanvasClick', () => {
    it('adds a performer at click position when add tool is active', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const formation = makeFormation();
      (formationService.addPerformer as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        id: 'p-new', name: 'P3', label: 'P3', color: '#ef4444',
      });
      (formationService.getFormation as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        ...formation,
        keyframes: formation.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })),
      });

      const { handlers } = renderHandlers({ canvasRef, activeTool: 'add', formation });

      const event = {
        clientX: 500,
        clientY: 500,
      } as unknown as React.MouseEvent;

      act(() => { handlers.current.handleCanvasClick(event); });
      expect(formationService.addPerformer).toHaveBeenCalled();
    });

    it('does nothing on click when select tool is active and not a shape tool', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({ canvasRef, activeTool: 'select' });

      const event = { clientX: 500, clientY: 500 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasClick(event); });
      // Should not call setFormation or setCurrentPositions for performer add
      expect(state.setShapeToolStart).not.toHaveBeenCalled();
    });
  });

  describe('shape tool (line, arc, block)', () => {
    it('sets start point on first click for line tool', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 }),
      });
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({ canvasRef, activeTool: 'line' });

      const event = { clientX: 200, clientY: 100 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasClick(event); });
      expect(state.setShapeToolStart).toHaveBeenCalledWith({ x: 20, y: 20 });
      expect(state.setShapeToolCurrent).toHaveBeenCalledWith({ x: 20, y: 20 });
    });

    it('generates line positions on second click and updates performers', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const formation = makeFormation();

      const { handlers, state } = renderHandlers({
        canvasRef,
        activeTool: 'line',
        formation,
        shapeToolStart: makePosition(10, 10),
      });

      const event = { clientX: 800, clientY: 800 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasClick(event); });

      expect(drillGeometry.generateLinePositions).toHaveBeenCalledWith(
        makePosition(10, 10),
        { x: 80, y: 80 },
        2, // formation has 2 performers
      );
      expect(state.setCurrentPositions).toHaveBeenCalled();
      expect(state.setShapeToolStart).toHaveBeenCalledWith(null);
      expect(state.setShapeToolCurrent).toHaveBeenCalledWith(null);
    });

    it('generates arc positions on second click for arc tool', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const formation = makeFormation();

      const { handlers } = renderHandlers({
        canvasRef,
        activeTool: 'arc',
        formation,
        shapeToolStart: makePosition(50, 50),
      });

      const event = { clientX: 700, clientY: 500 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasClick(event); });
      expect(drillGeometry.generateArcPositions).toHaveBeenCalled();
    });

    it('generates block positions on second click for block tool', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const formation = makeFormation();

      const { handlers } = renderHandlers({
        canvasRef,
        activeTool: 'block',
        formation,
        shapeToolStart: makePosition(10, 10),
      });

      const event = { clientX: 900, clientY: 900 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasClick(event); });
      expect(drillGeometry.generateBlockPositions).toHaveBeenCalled();
    });
  });

  describe('isShapeTool', () => {
    it('returns true for line, arc, block tools', () => {
      for (const tool of ['line', 'arc', 'block'] as Tool[]) {
        const { handlers } = renderHandlers({ activeTool: tool });
        expect(handlers.current.isShapeTool).toBe(true);
      }
    });

    it('returns false for select, pan, add, comment tools', () => {
      for (const tool of ['select', 'pan', 'add', 'comment'] as Tool[]) {
        const { handlers } = renderHandlers({ activeTool: tool });
        expect(handlers.current.isShapeTool).toBe(false);
      }
    });
  });

  // ============================================================
  // Canvas mouse move / leave
  // ============================================================

  describe('handleCanvasMouseMove', () => {
    it('updates shape tool current position during shape draw', () => {
      const canvasEl = document.createElement('div');
      Object.defineProperty(canvasEl, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }),
      });
      const canvasRef = { current: canvasEl };
      const { handlers, state } = renderHandlers({
        canvasRef,
        activeTool: 'line',
        shapeToolStart: makePosition(10, 10),
      });

      const event = { clientX: 600, clientY: 400 } as unknown as React.MouseEvent;
      act(() => { handlers.current.handleCanvasMouseMove(event); });
      expect(state.setShapeToolCurrent).toHaveBeenCalledWith({ x: 60, y: 40 });
    });
  });

  describe('handleCanvasMouseLeave', () => {
    it('clears shape tool current position', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleCanvasMouseLeave(); });
      expect(state.setShapeToolCurrent).toHaveBeenCalledWith(null);
    });
  });

  // ============================================================
  // Playback controls
  // ============================================================

  describe('playback handlers', () => {
    it('handlePlay calls formationService.play', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handlePlay(); });
      expect(formationService.play).toHaveBeenCalledWith('formation-1', expect.any(Function));
      expect(state.setPlaybackState).toHaveBeenCalled();
    });

    it('handlePause calls formationService.pause', () => {
      const { handlers } = renderHandlers();
      act(() => { handlers.current.handlePause(); });
      expect(formationService.pause).toHaveBeenCalled();
    });

    it('handleStop resets to initial keyframe positions', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleStop(); });
      expect(formationService.stop).toHaveBeenCalled();
      expect(state.setGhostTrail).toHaveBeenCalledWith([]);
      expect(state.setCurrentPositions).toHaveBeenCalled();
    });

    it('handleSeek updates time and positions', () => {
      const { handlers } = renderHandlers();
      act(() => { handlers.current.handleSeek(2500); });
      expect(formationService.seek).toHaveBeenCalledWith(2500);
      expect(formationService.getPositionsAtTime).toHaveBeenCalledWith('formation-1', 2500);
    });

    it('handleSpeedChange sets playback speed', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleSpeedChange(2); });
      expect(formationService.setSpeed).toHaveBeenCalledWith(2);
      expect(state.setPlaybackState).toHaveBeenCalled();
    });

    it('handleToggleLoop toggles loop state', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleToggleLoop(); });
      expect(formationService.toggleLoop).toHaveBeenCalled();
      expect(state.setPlaybackState).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Name change
  // ============================================================

  describe('handleNameChange', () => {
    it('updates formation name', () => {
      const { handlers, state } = renderHandlers();
      act(() => { handlers.current.handleNameChange('New Name'); });
      expect(state.setFormation).toHaveBeenCalled();
    });

    it('does nothing when formation is null', () => {
      const { handlers, state } = renderHandlers({ formation: null });
      act(() => { handlers.current.handleNameChange('New Name'); });
      expect(state.setFormation).not.toHaveBeenCalled();
    });

    it('delegates to collab in collaborative mode', () => {
      const collab = makeCollab();
      collab.isConnected = true;
      const { handlers } = renderHandlers({ isCollaborativeEnabled: true, collab });
      act(() => { handlers.current.handleNameChange('Collab Name'); });
      expect(collab.updateMeta).toHaveBeenCalledWith({ name: 'Collab Name' });
    });
  });

  // ============================================================
  // Alignment / Distribution
  // ============================================================

  describe('handleAlign', () => {
    it('calls alignPositions for selected performers', () => {
      const positions = new Map<string, Position>();
      positions.set('p1', makePosition(20, 30));
      positions.set('p2', makePosition(40, 50));
      const formation = makeFormation({
        keyframes: [{ id: 'kf-1', timestamp: 0, positions }],
      });
      const { handlers } = renderHandlers({
        formation,
        currentPositions: positions,
        selectedPerformerIds: new Set(['p1', 'p2']),
      });
      act(() => { handlers.current.handleAlign('horizontal-center' as import('../../../../utils/drillGeometry').AlignmentType); });
      expect(drillGeometry.alignPositions).toHaveBeenCalled();
    });

    it('requires at least 2 selected performers', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set(['p1']) });
      act(() => { handlers.current.handleAlign('horizontal-center' as import('../../../../utils/drillGeometry').AlignmentType); });
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });
  });

  describe('handleDistribute', () => {
    it('requires at least 3 selected performers', () => {
      const { handlers, state } = renderHandlers({ selectedPerformerIds: new Set(['p1', 'p2']) });
      act(() => { handlers.current.handleDistribute('horizontal' as import('../../../../utils/drillGeometry').DistributionType); });
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Audio
  // ============================================================

  describe('handleAudioUpload', () => {
    it('sets audio track on formation', async () => {
      const track = { id: 'audio-1', url: 'http://test.mp3', filename: 'test.mp3', duration: 10000 };
      const { handlers, state } = renderHandlers();
      await act(async () => { await handlers.current.handleAudioUpload(track); });
      expect(state.setFormation).toHaveBeenCalled();
      expect(state.setShowAudioPanel).toHaveBeenCalledWith(false);
    });

    it('extends playback duration if audio is longer', async () => {
      const track = { id: 'audio-1', url: 'http://test.mp3', filename: 'test.mp3', duration: 10000 };
      const { handlers, state } = renderHandlers({
        playbackState: { isPlaying: false, currentTime: 0, duration: 5000, loop: false, speed: 1 },
      });
      await act(async () => { await handlers.current.handleAudioUpload(track); });
      expect(state.setPlaybackState).toHaveBeenCalled();
    });
  });

  describe('handleAudioRemove', () => {
    it('removes audio track from formation', async () => {
      const { handlers, state } = renderHandlers();
      await act(async () => { await handlers.current.handleAudioRemove(); });
      expect(state.setFormation).toHaveBeenCalled();
      expect(state.setShowAudioPanel).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================

  describe('edge cases', () => {
    it('all handlers are no-ops when formation is null', () => {
      const { handlers, state } = renderHandlers({ formation: null });

      act(() => {
        handlers.current.handleDeleteSelected();
        handlers.current.handleDuplicateSelected();
        handlers.current.handleSelectAll();
        handlers.current.handleInvertSelection();
        handlers.current.handleNudge(1, 1);
        handlers.current.handleAddPerformer();
        handlers.current.handleRemovePerformer('p1');
        handlers.current.handleMovePerformer('p1', makePosition(50, 50));
        handlers.current.handleRotatePerformer('p1', 45);
        handlers.current.handleNameChange('name');
      });

      // No state updates should have happened
      expect(state.setFormation).not.toHaveBeenCalled();
      expect(state.setCurrentPositions).not.toHaveBeenCalled();
    });

    it('handleAddPerformer creates performer at center (50,50)', () => {
      (formationService.addPerformer as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        id: 'new-p', name: 'Performer 3', label: 'P3', color: '#ef4444',
      });
      (formationService.getFormation as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        makeFormation(),
      );
      const { handlers } = renderHandlers();
      act(() => { handlers.current.handleAddPerformer(); });
      expect(formationService.addPerformer).toHaveBeenCalledWith(
        'formation-1',
        expect.objectContaining({ label: 'P3' }),
        { x: 50, y: 50, rotation: 0 },
      );
    });

    it('performerPaths returns empty map when showPaths is false', () => {
      const { handlers } = renderHandlers();
      expect(handlers.current.performerPaths.size).toBe(0);
    });
  });
});
