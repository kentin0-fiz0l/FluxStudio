/**
 * Unit Tests for useCanvasState hook
 *
 * Tests initial state values, state setters, derived values,
 * and default props handling for the FormationCanvas state hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FormationCanvasProps } from '../types';
import type { Position } from '../../../../services/formationTypes';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFormation = {
  id: 'formation-1',
  name: 'Untitled Formation',
  projectId: 'proj-1',
  stageWidth: 40,
  stageHeight: 30,
  gridSize: 2,
  performers: [],
  keyframes: [
    {
      id: 'kf-1',
      timestamp: 0,
      positions: new Map<string, Position>(),
      transition: 'linear' as const,
    },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  createdBy: 'current-user',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
    i18n: { language: 'en' },
  }),
}));

const mockUseAuth = vi.fn(() => ({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null } as { id: string; name: string; email: string; avatar: null } | null }));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../../services/formationService', () => ({
  formationService: {
    getFormation: vi.fn(() => undefined),
    createFormation: vi.fn(() => ({ ...mockFormation })),
    registerFormation: vi.fn((f: any) => f),
  },
}));

vi.mock('../../../../hooks/formation/useFormations', () => ({
  useFormation: vi.fn(() => ({
    formation: null,
    loading: false,
    error: null,
    save: vi.fn(),
    saving: false,
  })),
}));

vi.mock('../../../../hooks/formation/useFormationYjs', () => ({
  useFormationYjs: vi.fn(() => ({
    formation: null,
    isConnected: false,
    isSyncing: false,
    error: null,
    collaborators: [],
    hasPendingChanges: false,
    lastSyncedAt: null,
    doc: null,
    provider: null,
    updateMeta: vi.fn(),
    addPerformer: vi.fn(),
    updatePerformer: vi.fn(),
    removePerformer: vi.fn(),
    addKeyframe: vi.fn(),
    updateKeyframe: vi.fn(),
    removeKeyframe: vi.fn(),
    updatePosition: vi.fn(),
    updatePositions: vi.fn(),
    setAudioTrack: vi.fn(),
    addSet: vi.fn(),
    updateSet: vi.fn(),
    removeSet: vi.fn(),
    reorderSets: vi.fn(),
    updateCursor: vi.fn(),
    clearCursor: vi.fn(),
    setSelectedPerformers: vi.fn(),
  })),
}));

vi.mock('../../../../hooks/formation/useFormationHistory', () => ({
  useFormationHistory: vi.fn(() => ({
    pushState: vi.fn(),
    undo: vi.fn(() => null),
    redo: vi.fn(() => null),
    canUndo: false,
    canRedo: false,
    historyIndex: -1,
    historyLength: 0,
    reset: vi.fn(),
  })),
}));

vi.mock('../../../../services/formation/yjs/formationYjsTypes', () => ({
  getUserColor: vi.fn(() => '#3b82f6'),
}));

// Import after mocks
import { useCanvasState } from '../useCanvasState';
import { DEFAULT_DRILL_SETTINGS } from '../../../../utils/drillGeometry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultProps(overrides: Partial<FormationCanvasProps> = {}): FormationCanvasProps {
  return {
    projectId: 'proj-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // Initial state values (sandbox / no formationId)
  // ========================================================================

  describe('initial state values (sandbox mode, no formationId)', () => {
    it('should initialize formation to a new formation object', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.formation).not.toBeNull();
      expect(result.current.formation?.projectId).toBe('proj-1');
    });

    it('should set selectedKeyframeId to first keyframe id', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.selectedKeyframeId).toBe('kf-1');
    });

    it('should initialize currentPositions as empty Map', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.currentPositions).toBeInstanceOf(Map);
      expect(result.current.currentPositions.size).toBe(0);
    });

    it('should set zoom to 1', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.zoom).toBe(1);
    });

    it('should set activeTool to select', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.activeTool).toBe('select');
    });

    it('should set showGrid to true', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showGrid).toBe(true);
    });

    it('should set showLabels to true', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showLabels).toBe(true);
    });

    it('should set showRotation to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showRotation).toBe(false);
    });

    it('should initialize selectedPerformerIds as empty Set', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.selectedPerformerIds).toBeInstanceOf(Set);
      expect(result.current.selectedPerformerIds.size).toBe(0);
    });

    it('should set saveStatus to idle', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.saveStatus).toBe('idle');
    });

    it('should set isExportDialogOpen to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.isExportDialogOpen).toBe(false);
    });

    it('should set showShortcutsDialog to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showShortcutsDialog).toBe(false);
    });

    it('should set showPerformerPanel to true', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showPerformerPanel).toBe(true);
    });

    it('should set showAudioPanel to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showAudioPanel).toBe(false);
    });

    it('should set showPaths to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showPaths).toBe(false);
    });

    it('should set snapEnabled to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.snapEnabled).toBe(false);
    });

    it('should set timeDisplayMode to time', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.timeDisplayMode).toBe('time');
    });

    it('should initialize drillSettings to DEFAULT_DRILL_SETTINGS', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.drillSettings).toEqual(DEFAULT_DRILL_SETTINGS);
    });

    it('should set showFieldOverlay to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showFieldOverlay).toBe(false);
    });

    it('should set showAnalysisPanel to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showAnalysisPanel).toBe(false);
    });

    it('should set showMovementTools to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showMovementTools).toBe(false);
    });

    it('should set showStepSizes to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showStepSizes).toBe(false);
    });

    it('should set showCoordinatePanel to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showCoordinatePanel).toBe(false);
    });

    it('should set showQuickStart to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showQuickStart).toBe(false);
    });

    it('should set shapeToolStart to null', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.shapeToolStart).toBeNull();
    });

    it('should set shapeToolCurrent to null', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.shapeToolCurrent).toBeNull();
    });

    it('should set fingerMode to select', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.fingerMode).toBe('select');
    });

    it('should set canvasPan to { x: 0, y: 0 }', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.canvasPan).toEqual({ x: 0, y: 0 });
    });

    it('should set marquee to null', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.marquee).toBeNull();
    });

    it('should set showTemplatePicker to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showTemplatePicker).toBe(false);
    });

    it('should set transformMode to none', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.transformMode).toBe('none');
    });

    it('should set curveEditMode to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.curveEditMode).toBe(false);
    });

    it('should set snapGuides to empty array', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.snapGuides).toEqual([]);
    });

    it('should set showMeasurements to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showMeasurements).toBe(false);
    });

    it('should set measurementStepSize to 8', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.measurementStepSize).toBe(8);
    });

    it('should set showGroupPanel to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.showGroupPanel).toBe(false);
    });

    it('should initialize playbackState with defaults', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.playbackState).toEqual({
        isPlaying: false,
        currentTime: 0,
        duration: 5000,
        loop: false,
        speed: 1,
      });
    });

    it('should set ghostTrail to empty array', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.ghostTrail).toEqual([]);
    });

    it('should set hasUnsavedChanges to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  // ========================================================================
  // Refs
  // ========================================================================

  describe('refs', () => {
    it('should provide a canvasRef', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.canvasRef).toBeDefined();
      expect(result.current.canvasRef.current).toBeNull();
    });

    it('should provide a marqueeRef initialized to false', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.marqueeRef.current).toBe(false);
    });

    it('should provide a clipboardRef initialized to null', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.clipboardRef.current).toBeNull();
    });
  });

  // ========================================================================
  // State changes through setters
  // ========================================================================

  describe('state setters', () => {
    it('should update zoom via setZoom', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setZoom(2.5); });
      expect(result.current.zoom).toBe(2.5);
    });

    it('should update activeTool via setActiveTool', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setActiveTool('pan'); });
      expect(result.current.activeTool).toBe('pan');
    });

    it('should update showGrid via setShowGrid', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowGrid(false); });
      expect(result.current.showGrid).toBe(false);
    });

    it('should update showLabels via setShowLabels', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowLabels(false); });
      expect(result.current.showLabels).toBe(false);
    });

    it('should update showRotation via setShowRotation', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowRotation(true); });
      expect(result.current.showRotation).toBe(true);
    });

    it('should update selectedPerformerIds via setSelectedPerformerIds', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const ids = new Set(['p1', 'p2']);
      act(() => { result.current.setSelectedPerformerIds(ids); });
      expect(result.current.selectedPerformerIds).toEqual(ids);
    });

    it('should update saveStatus via setSaveStatus', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setSaveStatus('saving'); });
      expect(result.current.saveStatus).toBe('saving');
    });

    it('should update isExportDialogOpen via setIsExportDialogOpen', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setIsExportDialogOpen(true); });
      expect(result.current.isExportDialogOpen).toBe(true);
    });

    it('should update showShortcutsDialog via setShowShortcutsDialog', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowShortcutsDialog(true); });
      expect(result.current.showShortcutsDialog).toBe(true);
    });

    it('should update showPerformerPanel via setShowPerformerPanel', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowPerformerPanel(false); });
      expect(result.current.showPerformerPanel).toBe(false);
    });

    it('should update showAudioPanel via setShowAudioPanel', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowAudioPanel(true); });
      expect(result.current.showAudioPanel).toBe(true);
    });

    it('should update showPaths via setShowPaths', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowPaths(true); });
      expect(result.current.showPaths).toBe(true);
    });

    it('should update snapEnabled via setSnapEnabled', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setSnapEnabled(true); });
      expect(result.current.snapEnabled).toBe(true);
    });

    it('should update timeDisplayMode via setTimeDisplayMode', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setTimeDisplayMode('counts'); });
      expect(result.current.timeDisplayMode).toBe('counts');
    });

    it('should update drillSettings via setDrillSettings', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const newSettings = { ...DEFAULT_DRILL_SETTINGS, bpm: 140 };
      act(() => { result.current.setDrillSettings(newSettings); });
      expect(result.current.drillSettings.bpm).toBe(140);
    });

    it('should update showFieldOverlay via setShowFieldOverlay', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowFieldOverlay(true); });
      expect(result.current.showFieldOverlay).toBe(true);
    });

    it('should update fingerMode via setFingerMode', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setFingerMode('pan'); });
      expect(result.current.fingerMode).toBe('pan');
    });

    it('should update canvasPan via setCanvasPan', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setCanvasPan({ x: 100, y: -50 }); });
      expect(result.current.canvasPan).toEqual({ x: 100, y: -50 });
    });

    it('should update marquee via setMarquee', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const m = { startX: 10, startY: 20, currentX: 100, currentY: 200 };
      act(() => { result.current.setMarquee(m); });
      expect(result.current.marquee).toEqual(m);
    });

    it('should update transformMode via setTransformMode', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setTransformMode('rotate'); });
      expect(result.current.transformMode).toBe('rotate');
    });

    it('should update curveEditMode via setCurveEditMode', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setCurveEditMode(true); });
      expect(result.current.curveEditMode).toBe(true);
    });

    it('should update showMeasurements via setShowMeasurements', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowMeasurements(true); });
      expect(result.current.showMeasurements).toBe(true);
    });

    it('should update measurementStepSize via setMeasurementStepSize', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setMeasurementStepSize(6); });
      expect(result.current.measurementStepSize).toBe(6);
    });

    it('should update showGroupPanel via setShowGroupPanel', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowGroupPanel(true); });
      expect(result.current.showGroupPanel).toBe(true);
    });

    it('should update playbackState via setPlaybackState', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setPlaybackState((prev) => ({ ...prev, isPlaying: true, speed: 2 })); });
      expect(result.current.playbackState.isPlaying).toBe(true);
      expect(result.current.playbackState.speed).toBe(2);
    });

    it('should update ghostTrail via setGhostTrail', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const trail = [{ time: 0, positions: new Map<string, Position>() }];
      act(() => { result.current.setGhostTrail(trail); });
      expect(result.current.ghostTrail).toHaveLength(1);
    });

    it('should update hasUnsavedChanges via setHasUnsavedChanges', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setHasUnsavedChanges(true); });
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should update showTemplatePicker via setShowTemplatePicker', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowTemplatePicker(true); });
      expect(result.current.showTemplatePicker).toBe(true);
    });

    it('should update shapeToolStart via setShapeToolStart', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShapeToolStart({ x: 10, y: 20 }); });
      expect(result.current.shapeToolStart).toEqual({ x: 10, y: 20 });
    });

    it('should update shapeToolCurrent via setShapeToolCurrent', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShapeToolCurrent({ x: 50, y: 60 }); });
      expect(result.current.shapeToolCurrent).toEqual({ x: 50, y: 60 });
    });

    it('should update snapGuides via setSnapGuides', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const guides = [{ type: 'x' as const, value: 50, source: 'performer' as const }];
      act(() => { result.current.setSnapGuides(guides); });
      expect(result.current.snapGuides).toHaveLength(1);
    });

    it('should update currentPositions via setCurrentPositions', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const positions = new Map<string, Position>([['p1', { x: 10, y: 20 }]]);
      act(() => { result.current.setCurrentPositions(positions); });
      expect(result.current.currentPositions.size).toBe(1);
      expect(result.current.currentPositions.get('p1')).toEqual({ x: 10, y: 20 });
    });

    it('should update selectedKeyframeId via setSelectedKeyframeId', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setSelectedKeyframeId('kf-new'); });
      expect(result.current.selectedKeyframeId).toBe('kf-new');
    });

    it('should update formation via setFormation', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setFormation(null); });
      expect(result.current.formation).toBeNull();
    });

    it('should update showAnalysisPanel via setShowAnalysisPanel', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowAnalysisPanel(true); });
      expect(result.current.showAnalysisPanel).toBe(true);
    });

    it('should update showMovementTools via setShowMovementTools', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowMovementTools(true); });
      expect(result.current.showMovementTools).toBe(true);
    });

    it('should update showStepSizes via setShowStepSizes', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowStepSizes(true); });
      expect(result.current.showStepSizes).toBe(true);
    });

    it('should update showCoordinatePanel via setShowCoordinatePanel', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowCoordinatePanel(true); });
      expect(result.current.showCoordinatePanel).toBe(true);
    });

    it('should update showQuickStart via setShowQuickStart', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      act(() => { result.current.setShowQuickStart(true); });
      expect(result.current.showQuickStart).toBe(true);
    });
  });

  // ========================================================================
  // Derived / computed values
  // ========================================================================

  describe('derived values', () => {
    it('should set isCollaborativeEnabled to false when no formationId and no collaborativeMode', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.isCollaborativeEnabled).toBe(false);
    });

    it('should set isCollaborativeEnabled to true when formationId is provided (default behavior)', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ formationId: 'f-1' })));
      expect(result.current.isCollaborativeEnabled).toBe(true);
    });

    it('should respect explicit collaborativeMode=false even with formationId', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ formationId: 'f-1', collaborativeMode: false })));
      expect(result.current.isCollaborativeEnabled).toBe(false);
    });

    it('should respect explicit collaborativeMode=true even without formationId', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ collaborativeMode: true })));
      expect(result.current.isCollaborativeEnabled).toBe(true);
    });

    it('should compute currentUser from auth user', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.currentUser).toEqual({
        id: 'user-1',
        name: 'Test User',
        color: '#3b82f6',
        avatar: null,
      });
    });

    it('should return null currentUser when auth user is null', () => {
      mockUseAuth.mockReturnValueOnce({ user: null });
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.currentUser).toBeNull();
    });
  });

  // ========================================================================
  // API / Collab pass-through
  // ========================================================================

  describe('API and collaboration pass-through', () => {
    it('should expose apiLoading as false initially', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.apiLoading).toBe(false);
    });

    it('should expose apiError as null initially', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.apiError).toBeNull();
    });

    it('should expose apiSaving as false initially', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.apiSaving).toBe(false);
    });

    it('should expose apiSave as a function', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(typeof result.current.apiSave).toBe('function');
    });

    it('should expose collab object', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.collab).toBeDefined();
    });

    it('should expose history object with undo/redo capabilities', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      expect(result.current.history).toBeDefined();
      expect(result.current.history.canUndo).toBe(false);
      expect(result.current.history.canRedo).toBe(false);
      expect(typeof result.current.history.pushState).toBe('function');
      expect(typeof result.current.history.undo).toBe('function');
      expect(typeof result.current.history.redo).toBe('function');
      expect(typeof result.current.history.reset).toBe('function');
    });
  });

  // ========================================================================
  // With formationId (loading from API)
  // ========================================================================

  describe('with formationId (API loading path)', () => {
    it('should initialize formation to null when formationId is provided', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ formationId: 'f-1' })));
      expect(result.current.formation).toBeNull();
    });

    it('should initialize selectedKeyframeId to empty string when formationId is provided', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ formationId: 'f-1' })));
      expect(result.current.selectedKeyframeId).toBe('');
    });

    it('should initialize currentPositions as empty Map when formationId is provided', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps({ formationId: 'f-1' })));
      expect(result.current.currentPositions).toBeInstanceOf(Map);
      expect(result.current.currentPositions.size).toBe(0);
    });
  });

  // ========================================================================
  // Return shape completeness
  // ========================================================================

  describe('return shape', () => {
    it('should return all expected state keys', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const state = result.current;

      // API / Collab
      expect(state).toHaveProperty('apiLoading');
      expect(state).toHaveProperty('apiError');
      expect(state).toHaveProperty('apiSave');
      expect(state).toHaveProperty('apiSaving');
      expect(state).toHaveProperty('isCollaborativeEnabled');
      expect(state).toHaveProperty('collab');
      expect(state).toHaveProperty('currentUser');

      // Core state
      expect(state).toHaveProperty('formation');
      expect(state).toHaveProperty('setFormation');
      expect(state).toHaveProperty('selectedPerformerIds');
      expect(state).toHaveProperty('setSelectedPerformerIds');
      expect(state).toHaveProperty('selectedKeyframeId');
      expect(state).toHaveProperty('setSelectedKeyframeId');
      expect(state).toHaveProperty('currentPositions');
      expect(state).toHaveProperty('setCurrentPositions');
      expect(state).toHaveProperty('saveStatus');
      expect(state).toHaveProperty('setSaveStatus');
      expect(state).toHaveProperty('activeTool');
      expect(state).toHaveProperty('setActiveTool');
      expect(state).toHaveProperty('zoom');
      expect(state).toHaveProperty('setZoom');
      expect(state).toHaveProperty('showGrid');
      expect(state).toHaveProperty('setShowGrid');
      expect(state).toHaveProperty('showLabels');
      expect(state).toHaveProperty('setShowLabels');
      expect(state).toHaveProperty('showRotation');
      expect(state).toHaveProperty('setShowRotation');
      expect(state).toHaveProperty('isExportDialogOpen');
      expect(state).toHaveProperty('setIsExportDialogOpen');
      expect(state).toHaveProperty('showShortcutsDialog');
      expect(state).toHaveProperty('setShowShortcutsDialog');
      expect(state).toHaveProperty('showPerformerPanel');
      expect(state).toHaveProperty('setShowPerformerPanel');
      expect(state).toHaveProperty('showAudioPanel');
      expect(state).toHaveProperty('setShowAudioPanel');
      expect(state).toHaveProperty('showPaths');
      expect(state).toHaveProperty('setShowPaths');
      expect(state).toHaveProperty('snapEnabled');
      expect(state).toHaveProperty('setSnapEnabled');
      expect(state).toHaveProperty('timeDisplayMode');
      expect(state).toHaveProperty('setTimeDisplayMode');
      expect(state).toHaveProperty('drillSettings');
      expect(state).toHaveProperty('setDrillSettings');
      expect(state).toHaveProperty('showFieldOverlay');
      expect(state).toHaveProperty('setShowFieldOverlay');
      expect(state).toHaveProperty('showAnalysisPanel');
      expect(state).toHaveProperty('setShowAnalysisPanel');
      expect(state).toHaveProperty('showMovementTools');
      expect(state).toHaveProperty('setShowMovementTools');
      expect(state).toHaveProperty('showStepSizes');
      expect(state).toHaveProperty('setShowStepSizes');
      expect(state).toHaveProperty('showCoordinatePanel');
      expect(state).toHaveProperty('setShowCoordinatePanel');
      expect(state).toHaveProperty('showQuickStart');
      expect(state).toHaveProperty('setShowQuickStart');
      expect(state).toHaveProperty('shapeToolStart');
      expect(state).toHaveProperty('setShapeToolStart');
      expect(state).toHaveProperty('shapeToolCurrent');
      expect(state).toHaveProperty('setShapeToolCurrent');
      expect(state).toHaveProperty('fingerMode');
      expect(state).toHaveProperty('setFingerMode');
      expect(state).toHaveProperty('canvasPan');
      expect(state).toHaveProperty('setCanvasPan');
      expect(state).toHaveProperty('marquee');
      expect(state).toHaveProperty('setMarquee');
      expect(state).toHaveProperty('marqueeRef');
      expect(state).toHaveProperty('clipboardRef');
      expect(state).toHaveProperty('showTemplatePicker');
      expect(state).toHaveProperty('setShowTemplatePicker');
      expect(state).toHaveProperty('transformMode');
      expect(state).toHaveProperty('setTransformMode');
      expect(state).toHaveProperty('curveEditMode');
      expect(state).toHaveProperty('setCurveEditMode');
      expect(state).toHaveProperty('snapGuides');
      expect(state).toHaveProperty('setSnapGuides');
      expect(state).toHaveProperty('showMeasurements');
      expect(state).toHaveProperty('setShowMeasurements');
      expect(state).toHaveProperty('measurementStepSize');
      expect(state).toHaveProperty('setMeasurementStepSize');
      expect(state).toHaveProperty('showGroupPanel');
      expect(state).toHaveProperty('setShowGroupPanel');
      expect(state).toHaveProperty('playbackState');
      expect(state).toHaveProperty('setPlaybackState');
      expect(state).toHaveProperty('ghostTrail');
      expect(state).toHaveProperty('setGhostTrail');
      expect(state).toHaveProperty('hasUnsavedChanges');
      expect(state).toHaveProperty('setHasUnsavedChanges');

      // Refs
      expect(state).toHaveProperty('canvasRef');
      expect(state).toHaveProperty('setDraggingPerformerId');

      // History
      expect(state).toHaveProperty('history');
    });

    it('should provide all setters as functions', () => {
      const { result } = renderHook(() => useCanvasState(defaultProps()));
      const state = result.current;

      const setterKeys = Object.keys(state).filter((k) => k.startsWith('set'));
      for (const key of setterKeys) {
        expect(typeof (state as any)[key]).toBe('function');
      }
    });
  });
});
