/**
 * FormationCanvas Component - Decomposed version
 *
 * State management extracted to useCanvasState.ts
 * Event handlers extracted to useCanvasHandlers.ts
 * Keyboard/touch handlers extracted to useCanvasKeyboardHandlers.ts
 * Canvas rendering extracted to CanvasRenderer.tsx
 * Keyboard shortcuts dialog extracted to KeyboardShortcutsDialog.tsx
 * Toolbar extracted to CanvasToolbar.tsx, PerformerPanel to PerformerPanel.tsx
 */

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { FormationEditorSkeleton } from '../../loading/FeatureSkeletons';
import { ErrorState } from '../../ui/error-state';
import { lazyLoadWithRetry } from '../../../utils/lazyLoad';
import { Timeline } from '../Timeline';
import { AudioUpload } from '../AudioUpload';
import { TemplatePicker } from '../TemplatePicker';
import { DrillAnalysisPanel } from '../DrillAnalysisPanel';
import { DrillCritiquePanelErrorBoundary, FormationVersionHistoryErrorBoundary } from '../../error/featureBoundaries';
import { MovementToolsPanel } from '../MovementToolsPanel';
import { CoordinatePanel } from '../CoordinatePanel';
import { StepSizeOverlay } from '../StepSizeOverlay';
import { QuickStartWizard } from '../QuickStartWizard';
import { MetMapSongSelector } from '../MetMapSongSelector';
import { MeasurementOverlay } from '../MeasurementOverlay';
import { GroupPanel } from '../GroupPanel';
import { CollisionOverlay } from '../CollisionOverlay';
import { GhostPreviewOverlay } from '../GhostPreviewOverlay';
import { GhostPreviewControls } from '../GhostPreviewControls';
import { FormationPromptBar } from '../FormationPromptBar';
import { TransitionSuggester } from '../TransitionSuggester';
import { WaypointEditor } from '../WaypointEditor';
import { CanvasEffectsLayer, CanvasEffectsPanel } from '../effects';

// Lazy-loaded heavy dialogs/panels
/* eslint-disable @typescript-eslint/no-explicit-any */
const { Component: ExportDialog } = lazyLoadWithRetry<any>(() => import('../ExportDialog').then(m => ({ default: m.ExportDialog })));
const { Component: DrillCritiquePanel } = lazyLoadWithRetry<any>(() => import('../DrillCritiquePanel').then(m => ({ default: m.DrillCritiquePanel })));
const { Component: MorphSliderDialog } = lazyLoadWithRetry<any>(() => import('../MorphDialog').then(m => ({ default: m.MorphSliderDialog })));
const { Component: FormationVersionHistoryPanel } = lazyLoadWithRetry<any>(() => import('../FormationVersionHistory').then(m => ({ default: m.FormationVersionHistoryPanel })));
const { Component: ShowPacingGraph } = lazyLoadWithRetry<any>(() => import('../ShowPacingGraph').then(m => ({ default: m.ShowPacingGraph })));
const { Component: RehearsalModePanel } = lazyLoadWithRetry<any>(() => import('../RehearsalModePanel').then(m => ({ default: m.RehearsalModePanel })));
const { Component: AIFormationFeedback } = lazyLoadWithRetry<any>(() => import('../AIFormationFeedback').then(m => ({ default: m.AIFormationFeedback })));
const { Component: GenerateFromMusicPanel } = lazyLoadWithRetry<any>(() => import('../GenerateFromMusicPanel').then(m => ({ default: m.GenerateFromMusicPanel })));
/* eslint-enable @typescript-eslint/no-explicit-any */
import { CanvasToolbar } from './CanvasToolbar';
import { MobileCanvasToolbar } from './MobileCanvasToolbar';
import { MobileSetNavigator } from './MobileSetNavigator';
import { PerformerPanel } from './PerformerPanel';
import { PathEditor } from '../PathEditor/PathEditor';
import { AlignmentToolbar } from './AlignmentToolbar';
import { OnboardingHints } from './OnboardingHints';
import { CanvasRenderer } from './CanvasRenderer';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useCanvasState } from './useCanvasState';
import { useCanvasHandlers } from './useCanvasHandlers';
import { useCanvasKeyboardHandlers } from './useCanvasKeyboardHandlers';
import { useCanvasAccessibility } from './useCanvasAccessibility';
import { useBreakpoint } from '../../../hooks/ui/useBreakpoint';
import { CollaboratorActivity } from '../CollaboratorActivity';
import { useMetMapSongLink } from '../../../hooks/metmap/useMetMapSongLink';
import { NCAA_FOOTBALL_FIELD } from '../../../services/fieldConfigService';
import { useGhostPreview } from '../../../store/slices/ghostPreviewSlice';
import { executePromptCommand } from '../../../services/promptExecutor';
import { resolveStaticCollisions } from '../../../services/collisionResolver';
import { validateFormation } from '../../../services/formationValidator';
import { FormationWarningsPanel } from '../FormationWarningsPanel';
import type { ShapeDistributionType } from './AlignmentToolbar';
import type { DrillSet, Position as DrillPosition, Formation } from '../../../services/formationTypes';
import type { DrillSuggestion } from '../../../services/drillAiService';
import type { FormationCanvasProps } from './types';

export type { FormationCanvasProps };

export function FormationCanvas(props: FormationCanvasProps) {
  const { formationId, projectId, onSave, sandboxMode = false, onPositionsChange, initialTemplateId } = props;
  const { t } = useTranslation('common');
  const [snapResolution, setSnapResolution] = useState<'beat' | 'half-beat' | 'measure'>('beat');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTransitionSuggester, setShowTransitionSuggester] = useState(false);
  const [showPacingGraph, setShowPacingGraph] = useState(false);
  const [showRehearsalMode, setShowRehearsalMode] = useState(false);
  const [showAudienceHeatmap, setShowAudienceHeatmap] = useState(false);
  const [showMorphSlider, setShowMorphSlider] = useState(false);

  const state = useCanvasState(props);

  const {
    apiLoading, apiError, apiRefetch, apiSaving,
    isCollaborativeEnabled, collab, currentUser,
    formation, setFormation,
    selectedPerformerIds, setSelectedPerformerIds,
    selectedKeyframeId,
    currentPositions, setCurrentPositions,
    saveStatus,
    activeTool, setActiveTool,
    zoom, setZoom,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    showRotation, setShowRotation,
    isExportDialogOpen, setIsExportDialogOpen,
    showShortcutsDialog, setShowShortcutsDialog,
    showPerformerPanel, setShowPerformerPanel,
    showAudioPanel, setShowAudioPanel,
    showPaths, setShowPaths,
    snapEnabled, setSnapEnabled,
    timeDisplayMode, setTimeDisplayMode,
    drillSettings, setDrillSettings,
    showFieldOverlay, setShowFieldOverlay,
    showAnalysisPanel, setShowAnalysisPanel,
    showMovementTools, setShowMovementTools,
    showStepSizes, setShowStepSizes,
    showCoordinatePanel, setShowCoordinatePanel,
    showQuickStart, setShowQuickStart,
    shapeToolStart, shapeToolCurrent,
    fingerMode, setFingerMode,
    canvasPan, setCanvasPan,
    marquee,
    showTemplatePicker, setShowTemplatePicker,
    transformMode, setTransformMode,
    curveEditMode, setCurveEditMode,
    snapGuides,
    showMeasurements, setShowMeasurements,
    measurementStepSize, setMeasurementStepSize: _setMeasurementStepSize,
    showGroupPanel, setShowGroupPanel,
    showCollabActivity, setShowCollabActivity,
    showAIFeedback, setShowAIFeedback,
    showGenerateFromMusic, setShowGenerateFromMusic,
    detectedBeatMap,
    customWaypoints, setCustomWaypoints,
    flyThroughPreset, setFlyThroughPreset,
    showWaypointEditor, setShowWaypointEditor,
    playbackState,
    ghostTrail,
    hasUnsavedChanges, setHasUnsavedChanges,
    canvasRef,
    history,
  } = state;

  // MetMap song link integration
  const handleFormationUpdate = useCallback((updates: Partial<Formation>) => {
    setFormation(prev => prev ? { ...prev, ...updates } : prev);
  }, [setFormation]);

  const {
    linkedSong,
    sections: metmapSections,
    chords: metmapChords,
    beatMap: metmapBeatMap,
    tempoMap: metmapTempoMap,
    linkSong,
    unlinkSong,
  } = useMetMapSongLink(formation, handleFormationUpdate);

  // Ghost preview state
  const ghostPreview = useGhostPreview();

  // Accept ghost preview: apply proposed positions to canvas
  const handleGhostAccept = useCallback(() => {
    if (!ghostPreview.activePreview) return;
    const proposed = ghostPreview.activePreview.proposedPositions;
    setCurrentPositions(prev => {
      const next = new Map(prev);
      for (const [id, pos] of proposed) {
        next.set(id, pos);
      }
      return next;
    });
    setHasUnsavedChanges(true);
    ghostPreview.clearPreview();
  }, [ghostPreview, setCurrentPositions, setHasUnsavedChanges]);

  // Reject ghost preview: clear without applying
  const handleGhostReject = useCallback(() => {
    ghostPreview.clearPreview();
  }, [ghostPreview]);

  // Shape distribution from AlignmentToolbar → ghost preview
  const handleDistributeInShape = useCallback((shape: ShapeDistributionType) => {
    if (!formation || selectedPerformerIds.size < 2) return;
    const ids = Array.from(selectedPerformerIds);
    const result = executePromptCommand(
      {
        type: 'distribute',
        shape,
        performerFilter: { type: 'selected', ids },
        params: shape === 'arc'
          ? { center: { x: 50, y: 50 }, radius: 30, startAngle: -Math.PI * 0.75, endAngle: -Math.PI * 0.25 }
          : shape === 'circle'
            ? { center: { x: 50, y: 50 }, radius: 30 }
            : { start: { x: 10, y: 50 }, end: { x: 90, y: shape === 'grid' ? 80 : 50 } },
      },
      formation.performers,
      currentPositions,
    );
    if (result.affectedPerformerIds.length > 0) {
      ghostPreview.setPreview({
        id: `shape-${Date.now()}`,
        source: 'prompt',
        sourceLabel: `Distribute in ${shape}`,
        proposedPositions: result.proposedPositions,
        affectedPerformerIds: result.affectedPerformerIds,
      });
    }
  }, [formation, selectedPerformerIds, currentPositions, ghostPreview]);

  // Apply transition path curves from TransitionSuggester
  const handleApplyTransitionPaths = useCallback((pathCurves: Map<string, import('../../../services/formationTypes').PathCurve>) => {
    if (!formation || !selectedKeyframeId) return;
    setFormation(prev => {
      if (!prev) return prev;
      const keyframes = prev.keyframes.map(kf => {
        if (kf.id !== selectedKeyframeId) return kf;
        return { ...kf, pathCurves: new Map([...(kf.pathCurves ?? []), ...pathCurves]) };
      });
      return { ...prev, keyframes };
    });
    setHasUnsavedChanges(true);
    setShowTransitionSuggester(false);
  }, [formation, selectedKeyframeId, setFormation, setHasUnsavedChanges]);

  // Auto-fix a single collision suggestion via ghost preview
  const handleAutoFixCollision = useCallback((suggestion: DrillSuggestion) => {
    if (!suggestion.collisionData || !currentPositions) return;
    const collisionPairs = suggestion.collisionData.map(c => ({
      id1: c.id1,
      id2: c.id2,
      distance: c.distance,
    }));
    const fix = resolveStaticCollisions(currentPositions, collisionPairs);
    const affectedIds = suggestion.performerIds ?? collisionPairs.flatMap(p => [p.id1, p.id2]);
    ghostPreview.setPreview({
      id: `collision-fix-${Date.now()}`,
      source: 'collision_fix',
      sourceLabel: `Fix ${collisionPairs.length} collision(s)`,
      proposedPositions: fix.performerAdjustments,
      affectedPerformerIds: [...new Set(affectedIds)],
    });
  }, [currentPositions, ghostPreview]);

  // Auto-fix all collision suggestions at once via ghost preview
  const handleAutoFixAllCollisions = useCallback((suggestions: DrillSuggestion[]) => {
    if (!currentPositions) return;
    const allPairs = suggestions
      .filter(s => s.collisionData)
      .flatMap(s => s.collisionData!.map(c => ({
        id1: c.id1,
        id2: c.id2,
        distance: c.distance,
      })));
    if (allPairs.length === 0) return;

    // Deduplicate collision pairs
    const seen = new Set<string>();
    const uniquePairs = allPairs.filter(p => {
      const key = [p.id1, p.id2].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const fix = resolveStaticCollisions(currentPositions, uniquePairs);
    const affectedIds = [...new Set(uniquePairs.flatMap(p => [p.id1, p.id2]))];
    ghostPreview.setPreview({
      id: `collision-fix-all-${Date.now()}`,
      source: 'collision_fix',
      sourceLabel: `Fix all ${uniquePairs.length} collision(s)`,
      proposedPositions: fix.performerAdjustments,
      affectedPerformerIds: affectedIds,
    });
  }, [currentPositions, ghostPreview]);

  const { isDesktop, isTablet } = useBreakpoint();
  const isMobileView = !isDesktop && !isTablet; // < 768px (phones only)

  // Side panel CSS: inline on desktop, slide-over on tablet/mobile
  const sidePanelClass = isMobileView
    ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl'
    : isTablet
    ? 'absolute inset-y-0 right-0 z-30 w-80 shadow-xl'
    : '';

  const handlers = useCanvasHandlers({
    state,
    formationId,
    projectId,
    onSave,
    sandboxMode,
  });

  const {
    handleUndo, handleRedo,
    handleSave, handleExport,
    handleDeleteSelected, handleDuplicateSelected, handleCopy, handlePaste,
    handleSelectAll, handleDeselectAll, handleNudge,
    handleDragStart, handleDragEnd,
    handleAddPerformer, handleRemovePerformer, handleSelectPerformer, handleMovePerformer, handleRotatePerformer,
    handleAlign, handleDistribute,
    handleKeyframeSelect, handleKeyframeAdd, handleKeyframeRemove, handleKeyframeMove,
    handlePlay, handlePause, handleStop, handleSeek, handleSpeedChange, handleToggleLoop,
    handleAudioUpload, handleAudioRemove,
    handleApplyTemplate,
    handleNameChange,
    handleZoomIn, handleZoomOut,
    isShapeTool,
    handleCanvasMouseMove, handleCanvasMouseLeave,
    handleCanvasPointerDown, handleCanvasPointerMoveMarquee, handleCanvasPointerUp,
    handleCanvasClick,
    performerPaths,
  } = handlers;

  useCanvasKeyboardHandlers({
    formation,
    playbackState,
    selectedPerformerIds,
    currentPositions,
    canvasRef,
    setZoom,
    setCanvasPan,
    setSelectedPerformerIds,
    setShowShortcutsDialog,
    setShowAnalysisPanel,
    setShowMovementTools,
    setShowCoordinatePanel,
    setTransformMode,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleCopy,
    handlePaste,
    handleDuplicateSelected,
    handleSelectAll,
    handleDeselectAll,
    handleNudge,
    handleSave,
    handlePlay,
    handlePause,
    handleKeyframeSelect,
  });

  const accessibility = useCanvasAccessibility({
    formation,
    selectedPerformerIds,
    currentPositions,
    activeTool,
    zoom,
  });

  // Notify parent when positions change (used for sandbox auto-save)
  useEffect(() => {
    if (onPositionsChange && currentPositions.size > 0) {
      onPositionsChange(currentPositions);
    }
  }, [currentPositions, onPositionsChange]);

  // Auto-apply formation template from onboarding (runs once when formation loads)
  const appliedOnboardingTemplate = useRef(false);
  useEffect(() => {
    if (appliedOnboardingTemplate.current || !formation) return;
    const templateId = initialTemplateId;
    if (!templateId) return;

    // Only auto-apply if the formation is empty (new formation)
    if (formation.performers.length > 0) {
      appliedOnboardingTemplate.current = true;
      return;
    }

    appliedOnboardingTemplate.current = true;
    handleApplyTemplate({ templateId });
    // Clean up localStorage so it doesn't re-apply on navigation
    localStorage.removeItem('onboarding_v2_template');
  }, [formation, initialTemplateId, handleApplyTemplate]);

  // All keyframe positions for heat map effects
  const keyframePositions = useMemo(() => {
    if (!formation) return [];
    return formation.keyframes.map(kf => new Map(kf.positions));
  }, [formation]);

  // Derive drill sets from keyframes for drill panels
  const drillSets: DrillSet[] = useMemo(() => {
    if (!formation) return [];
    return formation.keyframes.map((kf, i) => ({
      id: kf.id,
      name: `Set ${i + 1}`,
      counts: 8,
      keyframeId: kf.id,
      sortOrder: i,
    }));
  }, [formation]);

  // Current set index based on selected keyframe
  const currentSetIndex = useMemo(() => {
    if (!formation || !selectedKeyframeId) return 0;
    const idx = formation.keyframes.findIndex(kf => kf.id === selectedKeyframeId);
    return idx >= 0 ? idx : 0;
  }, [formation, selectedKeyframeId]);

  // Next set positions for step size overlay
  const nextSetPositions = useMemo(() => {
    if (!formation || currentSetIndex >= formation.keyframes.length - 1) return null;
    return new Map(formation.keyframes[currentSetIndex + 1].positions);
  }, [formation, currentSetIndex]);

  // Formation feasibility warnings
  const formationWarnings = useMemo(() => {
    if (!formation || currentPositions.size === 0) return [];
    const counts = drillSets[currentSetIndex]?.counts ?? 8;
    const tempo = formation.drillSettings?.bpm ?? 120;
    return validateFormation(currentPositions, nextSetPositions ?? undefined, counts, tempo);
  }, [currentPositions, nextSetPositions, formation, drillSets, currentSetIndex]);

  // Previous set positions for coordinate panel
  const prevSetPositions = useMemo(() => {
    if (!formation || currentSetIndex <= 0) return null;
    return new Map(formation.keyframes[currentSetIndex - 1].positions);
  }, [formation, currentSetIndex]);

  // Selected performer info for coordinate panel
  const selectedPerformerInfo = useMemo(() => {
    if (!formation || selectedPerformerIds.size !== 1) return null;
    const id = Array.from(selectedPerformerIds)[0];
    const performer = formation.performers.find(p => p.id === id);
    if (!performer) return null;
    return {
      id,
      name: performer.name,
      position: currentPositions.get(id) || null,
      nextPosition: nextSetPositions?.get(id) || null,
      prevPosition: prevSetPositions?.get(id) || null,
    };
  }, [formation, selectedPerformerIds, currentPositions, nextSetPositions, prevSetPositions]);

  // Handler: navigate to a set from analysis panel
  const handleNavigateToSet = useCallback((setId: string, performerIds?: string[]) => {
    if (!formation) return;
    const kf = formation.keyframes.find(k => k.id === setId);
    if (kf) {
      handleKeyframeSelect(kf.id);
      if (performerIds && performerIds.length > 0) {
        setSelectedPerformerIds(new Set(performerIds));
      }
    }
  }, [formation, handleKeyframeSelect, setSelectedPerformerIds]);

  // Handler: apply movement tool positions
  const handleApplyMovementPositions = useCallback((performerIds: string[], positions: DrillPosition[]) => {
    setCurrentPositions(prev => {
      const next = new Map(prev);
      performerIds.forEach((id, i) => {
        if (positions[i]) next.set(id, positions[i]);
      });
      return next;
    });
    setHasUnsavedChanges(true);
  }, [setCurrentPositions, setHasUnsavedChanges]);

  // Handler: quick start wizard completion
  const handleQuickStartComplete = useCallback((config: {
    showName: string;
    performers: Omit<import('../../../services/formationTypes').Performer, 'id'>[];
    initialSets: Array<{ name: string; counts: number; description: string }>;
  }) => {
    // Add performers from quick start (handleAddPerformer creates with defaults)
    for (let i = 0; i < config.performers.length; i++) {
      handleAddPerformer();
    }
    handleNameChange(config.showName);
    setShowQuickStart(false);
  }, [handleAddPerformer, handleNameChange, setShowQuickStart]);

  // Handler: curve control point drag
  const handleCurveControlPointMove = useCallback((
    keyframeId: string,
    performerId: string,
    controlPoint: 'cp1' | 'cp2',
    position: DrillPosition,
  ) => {
    if (!formation) return;
    setFormation(prev => {
      if (!prev) return prev;
      const keyframes = prev.keyframes.map(kf => {
        if (kf.id !== keyframeId) return kf;
        const pathCurves = new Map(kf.pathCurves ?? []);
        const existing = pathCurves.get(performerId) ?? { cp1: { x: 0, y: 0 }, cp2: { x: 0, y: 0 } };
        pathCurves.set(performerId, { ...existing, [controlPoint]: position });
        return { ...kf, pathCurves };
      });
      return { ...prev, keyframes };
    });
    setHasUnsavedChanges(true);
  }, [formation, setFormation, setHasUnsavedChanges]);

  // Selected keyframe index for curve editing
  const selectedKeyframeIndex = useMemo(() => {
    if (!formation || !selectedKeyframeId) return 0;
    const idx = formation.keyframes.findIndex(kf => kf.id === selectedKeyframeId);
    return idx >= 0 ? idx : 0;
  }, [formation, selectedKeyframeId]);

  // Handler: create performer group
  const handleCreateGroup = useCallback((name: string, performerIds: string[], color: string) => {
    if (!formation) return;
    const group = { id: `group-${Date.now()}`, name, performerIds, color };
    setFormation(prev => prev ? { ...prev, groups: [...(prev.groups ?? []), group] } : prev);
    setHasUnsavedChanges(true);
  }, [formation, setFormation, setHasUnsavedChanges]);

  // Handler: delete performer group
  const handleDeleteGroup = useCallback((groupId: string) => {
    setFormation(prev => prev ? { ...prev, groups: (prev.groups ?? []).filter(g => g.id !== groupId) } : prev);
    setHasUnsavedChanges(true);
  }, [setFormation, setHasUnsavedChanges]);

  // Handler: rename performer group
  const handleRenameGroup = useCallback((groupId: string, name: string) => {
    setFormation(prev => prev ? { ...prev, groups: (prev.groups ?? []).map(g => g.id === groupId ? { ...g, name } : g) } : prev);
    setHasUnsavedChanges(true);
  }, [setFormation, setHasUnsavedChanges]);

  // Handler: select group members
  const handleSelectGroup = useCallback((performerIds: string[]) => {
    setSelectedPerformerIds(new Set(performerIds));
  }, [setSelectedPerformerIds]);

  // Handler: update group color
  const handleUpdateGroupColor = useCallback((groupId: string, color: string) => {
    setFormation(prev => prev ? { ...prev, groups: (prev.groups ?? []).map(g => g.id === groupId ? { ...g, color } : g) } : prev);
    setHasUnsavedChanges(true);
  }, [setFormation, setHasUnsavedChanges]);

  // Handler: restore formation from version history
  const handleVersionRestore = useCallback((restoredFormation: Formation) => {
    setFormation(restoredFormation);
    // Update current positions to match the first keyframe of the restored formation
    if (restoredFormation.keyframes.length > 0) {
      setCurrentPositions(new Map(restoredFormation.keyframes[0].positions));
    }
    setHasUnsavedChanges(true);
    setShowVersionHistory(false);
  }, [setFormation, setCurrentPositions, setHasUnsavedChanges]);

  // Handler: apply formations generated from music AI
  const handleGenerateFormationsFromMusic = useCallback((generatedSets: Array<{ name: string; counts: number; sectionName?: string; positions: Map<string, import('../../../services/formationTypes').Position> }>) => {
    if (!formation || generatedSets.length === 0) return;
    setFormation(prev => {
      if (!prev) return prev;
      const newKeyframes = generatedSets.map((set, i) => ({
        id: `kf-music-${Date.now()}-${i}`,
        timestamp: prev.keyframes.length > 0
          ? (prev.keyframes[prev.keyframes.length - 1].timestamp + (set.counts * 500))
          : (i * set.counts * 500),
        positions: new Map(set.positions),
        duration: set.counts * 500,
      }));
      return { ...prev, keyframes: [...prev.keyframes, ...newKeyframes] };
    });
    // Select the first generated keyframe and update positions
    if (generatedSets[0].positions.size > 0) {
      setCurrentPositions(new Map(generatedSets[0].positions));
    }
    setHasUnsavedChanges(true);
    setShowGenerateFromMusic(false);
  }, [formation, setFormation, setCurrentPositions, setHasUnsavedChanges, setShowGenerateFromMusic]);

  // Loading/error states
  if (apiLoading || (formationId && !formation)) {
    return <FormationEditorSkeleton />;
  }
  if (apiError) {
    return (
      <div className="flex items-center justify-center h-full">
        <ErrorState
          title={t('formation.errorLoading', 'Failed to load formation')}
          description={apiError}
          errorType="server"
          onRetry={() => apiRefetch()}
          retryText="Retry"
        />
      </div>
    );
  }
  if (!formation) {
    return <FormationEditorSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900" role="application" aria-label={`Formation editor: ${formation.name}`} aria-roledescription="formation editor">
      {/* Skip navigation links for keyboard users */}
      <nav className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:z-[100] focus-within:top-0 focus-within:left-0 focus-within:p-2 focus-within:bg-white focus-within:dark:bg-gray-800 focus-within:shadow-lg focus-within:rounded-lg" aria-label="Skip navigation">
        <a href="#canvas-area" className="block px-4 py-2 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
          Skip to canvas
        </a>
        <a href="#timeline-area" className="block px-4 py-2 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
          Skip to timeline
        </a>
      </nav>

      {/* Screen reader announcements — accessibility hook provides detailed context */}
      <div
        ref={accessibility.liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {accessibility.announcement}
        {saveStatus === 'saving' && 'Saving formation...'}
        {saveStatus === 'saved' && 'Formation saved successfully'}
        {saveStatus === 'error' && 'Error saving formation'}
      </div>
      {/* Canvas summary for screen reader orientation (assertive, read on demand) */}
      <div className="sr-only" aria-live="off" id="canvas-summary">
        {accessibility.getCanvasSummary()}
      </div>

      {/* Off-screen accessible data table synced with the visual canvas */}
      {accessibility.tableRows.length > 0 && (
        <table
          ref={accessibility.accessibleTableRef}
          className="sr-only"
          aria-label={t('formation.performerTable', 'Performer positions')}
        >
          <thead>
            <tr>
              <th scope="col">{t('formation.name', 'Name')}</th>
              <th scope="col">{t('formation.label', 'Label')}</th>
              <th scope="col">{t('formation.position', 'Position')}</th>
              <th scope="col">{t('formation.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {accessibility.tableRows.map((row) => (
              <tr
                key={row.id}
                data-performer-id={row.id}
                tabIndex={0}
                role="row"
                aria-selected={row.isSelected}
                onKeyDown={(e) => {
                  accessibility.tableKeyboardHandlers.onKeyDown(e, row.id);
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectPerformer(row.id, false);
                  }
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (row.isSelected) handleDeleteSelected();
                  }
                }}
                onClick={() => handleSelectPerformer(row.id, false)}
              >
                <td>{row.name}</td>
                <td>{row.label}</td>
                <td>{row.coordinateDescription}</td>
                <td>{row.isSelected ? t('formation.selected', 'Selected') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(isDesktop || isTablet) ? (
        <div data-tour="formation-toolbar">
        <CanvasToolbar
          activeTool={activeTool} setActiveTool={setActiveTool}
          showGrid={showGrid} setShowGrid={setShowGrid}
          showLabels={showLabels} setShowLabels={setShowLabels}
          showRotation={showRotation} setShowRotation={setShowRotation}
          showPaths={showPaths} setShowPaths={setShowPaths}
          snapEnabled={snapEnabled} setSnapEnabled={setSnapEnabled}
          timeDisplayMode={timeDisplayMode} setTimeDisplayMode={setTimeDisplayMode}
          showFieldOverlay={showFieldOverlay} setShowFieldOverlay={setShowFieldOverlay}
          zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
          formationName={formation.name} onNameChange={handleNameChange}
          isCollaborativeEnabled={isCollaborativeEnabled} collab={collab} currentUser={currentUser}
          showPerformerPanel={showPerformerPanel} setShowPerformerPanel={setShowPerformerPanel}
          showAudioPanel={showAudioPanel} setShowAudioPanel={setShowAudioPanel}
          hasAudioTrack={!!formation?.audioTrack}
          setShowTemplatePicker={setShowTemplatePicker} setIsExportDialogOpen={setIsExportDialogOpen}
          onSave={handleSave} saveStatus={saveStatus} apiSaving={apiSaving}
          onUndo={handleUndo} onRedo={handleRedo}
          canUndo={history.canUndo} canRedo={history.canRedo}
          hasUnsavedChanges={hasUnsavedChanges}
          sandboxMode={sandboxMode}
          formationId={formationId}
          fingerMode={fingerMode}
          setFingerMode={setFingerMode}
          showAnalysisPanel={showAnalysisPanel}
          setShowAnalysisPanel={setShowAnalysisPanel}
          showMovementTools={showMovementTools}
          setShowMovementTools={setShowMovementTools}
          showStepSizes={showStepSizes}
          setShowStepSizes={setShowStepSizes}
          showCoordinatePanel={showCoordinatePanel}
          setShowCoordinatePanel={setShowCoordinatePanel}
          showMeasurements={showMeasurements}
          setShowMeasurements={setShowMeasurements}
          showGroupPanel={showGroupPanel}
          setShowGroupPanel={setShowGroupPanel}
          curveEditMode={curveEditMode}
          setCurveEditMode={setCurveEditMode}
          showVersionHistory={showVersionHistory}
          setShowVersionHistory={setShowVersionHistory}
          showTransitionSuggester={showTransitionSuggester}
          setShowTransitionSuggester={setShowTransitionSuggester}
          keyframeCount={formation.keyframes.length}
          showPacingGraph={showPacingGraph}
          setShowPacingGraph={setShowPacingGraph}
          showAudienceHeatmap={showAudienceHeatmap}
          setShowAudienceHeatmap={setShowAudienceHeatmap}
          showRehearsalMode={showRehearsalMode}
          setShowRehearsalMode={setShowRehearsalMode}
          showCollabActivity={showCollabActivity}
          setShowCollabActivity={setShowCollabActivity}
          showAIFeedback={showAIFeedback}
          onToggleAIFeedback={() => setShowAIFeedback(prev => !prev)}
          onGenerateFromMusic={() => setShowGenerateFromMusic(true)}
          showWaypointEditor={showWaypointEditor}
          setShowWaypointEditor={setShowWaypointEditor}
        />
        </div>
      ) : (
        <MobileSetNavigator
          keyframes={formation.keyframes}
          selectedKeyframeId={selectedKeyframeId}
          onKeyframeSelect={handleKeyframeSelect}
        />
      )}

      <div className={`flex-1 flex overflow-hidden ${isMobileView ? 'pb-[60px]' : ''}`}>
        <div id="canvas-area" data-tour="formation-canvas" className={`flex-1 relative overflow-auto bg-gray-100 dark:bg-gray-900 ${isMobileView ? 'p-2' : isTablet ? 'p-4' : 'p-8'}`}>
          {sandboxMode && <OnboardingHints />}
          <AlignmentToolbar
            selectedCount={selectedPerformerIds.size}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onDistributeInShape={handleDistributeInShape}
          />
          <CanvasRenderer
            formation={formation}
            currentPositions={currentPositions}
            selectedPerformerIds={selectedPerformerIds}
            activeTool={activeTool}
            zoom={zoom}
            canvasPan={canvasPan}
            fingerMode={fingerMode}
            showGrid={showGrid}
            showLabels={showLabels}
            showRotation={showRotation}
            showPaths={showPaths}
            showFieldOverlay={showFieldOverlay}
            isShapeTool={isShapeTool}
            shapeToolStart={shapeToolStart}
            shapeToolCurrent={shapeToolCurrent}
            marquee={marquee}
            playbackState={playbackState}
            ghostTrail={ghostTrail}
            performerPaths={performerPaths}
            isCollaborativeEnabled={isCollaborativeEnabled}
            collab={collab}
            canvasRef={canvasRef}
            onCanvasClick={handleCanvasClick}
            onCanvasPointerDown={handleCanvasPointerDown}
            onCanvasPointerMove={handleCanvasPointerMoveMarquee}
            onCanvasPointerUp={handleCanvasPointerUp}
            onCanvasMouseMove={handleCanvasMouseMove}
            onCanvasMouseLeave={handleCanvasMouseLeave}
            onSelectPerformer={handleSelectPerformer}
            onMovePerformer={handleMovePerformer}
            onRotatePerformer={handleRotatePerformer}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            curveEditMode={curveEditMode}
            selectedKeyframeIndex={selectedKeyframeIndex}
            onCurveControlPointMove={handleCurveControlPointMove}
            snapGuides={snapGuides}
            transformMode={transformMode}
            showAudienceHeatmap={showAudienceHeatmap}
            audienceHeatmapMode="audience"
          />
          <CanvasEffectsLayer
            performers={formation.performers}
            positions={currentPositions}
            selectedPerformerIds={selectedPerformerIds}
            performerPaths={performerPaths}
            keyframePositions={keyframePositions}
            canvasWidth={formation.stageWidth * 20 * zoom}
            canvasHeight={formation.stageHeight * 20 * zoom}
          />
          <CanvasEffectsPanel />
        </div>
        {/* Side panels: slide-over drawers on mobile, inline on desktop */}
        {showPerformerPanel && (
          <div className={sidePanelClass}>
            <PerformerPanel
              formation={formation}
              selectedPerformerIds={selectedPerformerIds}
              onSelectPerformer={handleSelectPerformer}
              onAddPerformer={handleAddPerformer}
              onRemovePerformer={handleRemovePerformer}
            />
          </div>
        )}
        {showCoordinatePanel && selectedPerformerInfo && (
          <div className={sidePanelClass}>
            <CoordinatePanel
              performerId={selectedPerformerInfo.id}
              performerName={selectedPerformerInfo.name}
              position={selectedPerformerInfo.position}
              nextPosition={selectedPerformerInfo.nextPosition}
              prevPosition={selectedPerformerInfo.prevPosition}
              fieldConfig={NCAA_FOOTBALL_FIELD}
              currentSetCounts={drillSets[currentSetIndex]?.counts ?? 8}
              prevSetCounts={currentSetIndex > 0 ? (drillSets[currentSetIndex - 1]?.counts ?? 8) : 0}
              onPositionChange={(pos) => {
                if (selectedPerformerInfo) {
                  setCurrentPositions(prev => {
                    const next = new Map(prev);
                    next.set(selectedPerformerInfo.id, pos);
                    return next;
                  });
                  setHasUnsavedChanges(true);
                }
              }}
            />
          </div>
        )}
        {showAnalysisPanel && (
          <div className={sidePanelClass}>
            <DrillAnalysisPanel
              formation={formation}
              sets={drillSets}
              onNavigateToSet={handleNavigateToSet}
            />
            <DrillCritiquePanelErrorBoundary>
              <Suspense fallback={null}>
                <DrillCritiquePanel
                  formation={formation}
                  sets={drillSets}
                  currentPositions={currentPositions}
                  onHighlightPerformers={(ids: string[]) => setSelectedPerformerIds(new Set(ids))}
                  onAutoFixCollision={handleAutoFixCollision}
                  onAutoFixAllCollisions={handleAutoFixAllCollisions}
                  className="border-t border-gray-200 dark:border-gray-700"
                />
              </Suspense>
            </DrillCritiquePanelErrorBoundary>
          </div>
        )}
        {showGroupPanel && (
          <div className={sidePanelClass}>
            <GroupPanel
              groups={formation.groups ?? []}
              performers={formation.performers}
              selectedPerformerIds={selectedPerformerIds}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
              onRenameGroup={handleRenameGroup}
              onSelectGroup={handleSelectGroup}
              onUpdateGroupColor={handleUpdateGroupColor}
              onClose={() => setShowGroupPanel(false)}
            />
          </div>
        )}
        {showCollabActivity && isCollaborativeEnabled && (
          <div className={sidePanelClass}>
            <CollaboratorActivity
              collaborators={collab.collaborators}
              currentSetName={drillSets[currentSetIndex]?.name}
              className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto"
            />
          </div>
        )}
        {showVersionHistory && formation.id && (
          <div className={sidePanelClass}>
            <FormationVersionHistoryErrorBoundary>
              <Suspense fallback={null}>
                <FormationVersionHistoryPanel
                  formationId={formation.id}
                  currentFormation={formation}
                  onRestore={handleVersionRestore}
                  onClose={() => setShowVersionHistory(false)}
                />
              </Suspense>
            </FormationVersionHistoryErrorBoundary>
          </div>
        )}
        {showRehearsalMode && (
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-80 shadow-xl' : isTablet ? 'absolute inset-y-0 right-0 z-30 w-96 shadow-xl' : ''}>
            <Suspense fallback={null}>
              <RehearsalModePanel
                formation={formation}
                sets={drillSets}
                onClose={() => setShowRehearsalMode(false)}
                onNavigateToSet={(setId: string) => handleNavigateToSet(setId)}
                onHighlightPerformers={(ids: string[]) => setSelectedPerformerIds(new Set(ids))}
              />
            </Suspense>
          </div>
        )}
        {showAIFeedback && (
          <div className={sidePanelClass}>
            <Suspense fallback={null}>
              <AIFormationFeedback
                canvasRef={canvasRef}
                formationId={formationId}
              />
            </Suspense>
          </div>
        )}
        {activeTool === 'curve' && selectedPerformerIds.size > 0 && (
          <div className={sidePanelClass}>
            <PathEditor
              performers={Array.from(selectedPerformerIds).map(id => {
                const performer = formation.performers.find(p => p.id === id);
                const currentCurve = selectedKeyframeId
                  ? formation.keyframes.find(kf => kf.id === selectedKeyframeId)?.pathCurves?.get(id) ?? null
                  : null;
                return {
                  id,
                  name: performer?.name ?? id,
                  label: performer?.label ?? id,
                  currentCurve,
                };
              })}
              onApplyCurves={(updates) => {
                if (!formation || !selectedKeyframeId) return;
                setFormation(prev => {
                  if (!prev) return prev;
                  const keyframes = prev.keyframes.map(kf => {
                    if (kf.id !== selectedKeyframeId) return kf;
                    const pathCurves = new Map(kf.pathCurves ?? []);
                    for (const [performerId, curve] of updates) {
                      pathCurves.set(performerId, curve);
                    }
                    return { ...kf, pathCurves };
                  });
                  return { ...prev, keyframes };
                });
                setHasUnsavedChanges(true);
              }}
              onClose={() => setActiveTool('select')}
            />
          </div>
        )}
      </div>

      {/* Measurement overlay (rendered over canvas) */}
      {showMeasurements && selectedPerformerIds.size >= 2 && (
        <div className="absolute inset-0 pointer-events-none" style={{ top: '48px' }}>
          <MeasurementOverlay
            performers={formation.performers}
            positions={currentPositions}
            selectedPerformerIds={selectedPerformerIds}
            canvasWidth={canvasRef.current?.clientWidth ?? 800}
            canvasHeight={canvasRef.current?.clientHeight ?? 500}
            fieldConfig={NCAA_FOOTBALL_FIELD}
            stepsPerFiveYards={measurementStepSize}
          />
        </div>
      )}

      {/* Ghost preview overlay (z-index 15: between performers and collision overlay) */}
      {ghostPreview.activePreview && (
        <div className="absolute inset-0 pointer-events-none" style={{ top: '48px' }}>
          <GhostPreviewOverlay
            preview={ghostPreview.activePreview}
            currentPositions={currentPositions}
            performers={formation.performers}
            canvasWidth={canvasRef.current?.clientWidth ?? 800}
            canvasHeight={canvasRef.current?.clientHeight ?? 500}
            ghostOpacity={ghostPreview.ghostOpacity}
            showMovementArrows={ghostPreview.showMovementArrows}
          />
        </div>
      )}

      {/* Ghost preview accept/reject controls */}
      {ghostPreview.activePreview && (
        <div className="absolute inset-0" style={{ top: '48px', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <GhostPreviewControls
              preview={ghostPreview.activePreview}
              currentPositions={currentPositions}
              canvasWidth={canvasRef.current?.clientWidth ?? 800}
              canvasHeight={canvasRef.current?.clientHeight ?? 500}
              onAccept={handleGhostAccept}
              onReject={handleGhostReject}
            />
          </div>
        </div>
      )}

      {/* Collision detection overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ top: '48px' }}>
        <CollisionOverlay
          positions={currentPositions}
          canvasWidth={canvasRef.current?.clientWidth ?? 800}
          canvasHeight={canvasRef.current?.clientHeight ?? 500}
          ghostPreviewSource={ghostPreview.activePreview?.source ?? undefined}
        />
      </div>

      {/* Waypoint Editor (floating panel) */}
      {showWaypointEditor && (
        <div className="absolute top-20 left-4 z-50">
          <WaypointEditor
            preset={flyThroughPreset}
            onPresetChange={setFlyThroughPreset}
            waypoints={customWaypoints}
            onWaypointsChange={setCustomWaypoints}
            onClose={() => setShowWaypointEditor(false)}
          />
        </div>
      )}

      {/* Transition Suggester (floating popover) */}
      {showTransitionSuggester && nextSetPositions && (
        <div className="absolute top-20 right-4 z-50">
          <TransitionSuggester
            fromPositions={currentPositions}
            toPositions={nextSetPositions}
            performerIds={formation.performers.map(p => p.id)}
            onApplyPathCurves={handleApplyTransitionPaths}
            onClose={() => setShowTransitionSuggester(false)}
          />
        </div>
      )}

      {showAudioPanel && (
        <div className="absolute top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('formation.audioTrack', 'Audio Track')}</h3>
            <button onClick={() => setShowAudioPanel(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><span className="sr-only">{t('actions.close', 'Close')}</span>&times;</button>
          </div>
          <div className="p-4">
            <AudioUpload audioTrack={formation?.audioTrack} onUpload={handleAudioUpload} onRemove={handleAudioRemove} />
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('formation.audioHelp', 'Upload an audio track to sync with your formation animation. The music will play during playback.')}</p>
          </div>
        </div>
      )}

      {/* Formation Prompt Bar (above timeline) */}
      {isDesktop && formation.performers.length > 0 && (
        <div data-tour="formation-ai-prompt">
        <FormationPromptBar
          performers={formation.performers}
          currentPositions={currentPositions}
          selectedPerformerIds={Array.from(selectedPerformerIds)}
          onApplyPositions={(positions) => {
            setCurrentPositions(positions);
            setHasUnsavedChanges(true);
          }}
          fieldConfig={formation.fieldConfig}
        />
        </div>
      )}

      {/* Desktop: MetMap song selector + full Timeline */}
      {isDesktop && (
        <>
          <div id="timeline-area" data-tour="formation-timeline" className="flex items-center gap-2 px-4 py-1 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <MetMapSongSelector
              linkedSongId={formation.metmapSongId}
              linkedSong={linkedSong}
              onLinkSong={linkSong}
              onUnlinkSong={unlinkSong}
            />
          </div>

          <Timeline
            keyframes={formation.keyframes}
            duration={playbackState.duration}
            currentTime={playbackState.currentTime}
            playbackState={playbackState}
            selectedKeyframeId={selectedKeyframeId}
            audioTrack={formation.audioTrack}
            drillSettings={drillSettings}
            timeDisplayMode={timeDisplayMode}
            snapResolution={snapResolution}
            onSnapResolutionChange={setSnapResolution}
            onDrillSettingsChange={setDrillSettings}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onToggleLoop={handleToggleLoop}
            onKeyframeSelect={handleKeyframeSelect}
            onKeyframeAdd={handleKeyframeAdd}
            onKeyframeRemove={handleKeyframeRemove}
            onKeyframeMove={handleKeyframeMove}
            sections={metmapSections}
            chords={metmapChords}
            tempoMap={metmapTempoMap ?? undefined}
            beatMap={metmapBeatMap ?? detectedBeatMap ?? undefined}
          />

          {showPacingGraph && drillSets.length > 0 && (
            <Suspense fallback={null}>
              <ShowPacingGraph
                formation={formation}
                sets={drillSets}
                tempoMap={metmapTempoMap ?? undefined}
                onNavigateToSet={(setId: string) => handleNavigateToSet(setId)}
                className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2"
              />
            </Suspense>
          )}
        </>
      )}

      {/* Mobile: bottom-anchored toolbar */}
      {isMobileView && (
        <MobileCanvasToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          fingerMode={fingerMode}
          setFingerMode={setFingerMode}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSave={handleSave}
          saveStatus={saveStatus}
          setIsExportDialogOpen={setIsExportDialogOpen}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          showFieldOverlay={showFieldOverlay}
          setShowFieldOverlay={setShowFieldOverlay}
          playbackState={playbackState}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      )}

      <Suspense fallback={null}>
        <ExportDialog
          isOpen={isExportDialogOpen}
          formationName={formation.name}
          formationId={formationId}
          performers={formation.performers}
          metmapLinked={!!linkedSong}
          hasAudioTrack={!!formation.audioTrack || !!formation.musicTrackUrl}
          onClose={() => setIsExportDialogOpen(false)}
          onExport={handleExport}
        />
      </Suspense>
      {showShortcutsDialog && <KeyboardShortcutsDialog onClose={() => setShowShortcutsDialog(false)} />}
      {(showTemplatePicker || formation.performers.length === 0) && (
        <TemplatePicker
          performerCount={formation.performers.length}
          onApply={handleApplyTemplate}
          onCancel={() => setShowTemplatePicker(false)}
          emptyState={formation.performers.length === 0}
        />
      )}

      {/* Movement Tools Panel (modal overlay) */}
      {showMovementTools && (
        <MovementToolsPanel
          selectedPositions={Array.from(selectedPerformerIds).map(id => currentPositions.get(id)).filter((p): p is DrillPosition => !!p)}
          allPositions={Array.from(currentPositions.values())}
          selectedPerformerIds={Array.from(selectedPerformerIds)}
          onApplyPositions={handleApplyMovementPositions}
          onClose={() => setShowMovementTools(false)}
          onOpenMorphSlider={() => setShowMorphSlider(true)}
        />
      )}

      {/* Morph Slider Dialog */}
      {formation && (
        <Suspense fallback={null}>
          <MorphSliderDialog
            open={showMorphSlider}
            onClose={() => setShowMorphSlider(false)}
            performers={formation.performers}
            currentPositions={currentPositions}
            onApply={(positions: Map<string, DrillPosition>) => {
              setCurrentPositions(positions);
              setHasUnsavedChanges(true);
              setShowMorphSlider(false);
            }}
          />
        </Suspense>
      )}

      {/* Quick Start Wizard (modal overlay) */}
      {showQuickStart && (
        <QuickStartWizard
          onComplete={handleQuickStartComplete}
          onClose={() => setShowQuickStart(false)}
        />
      )}

      {/* Step Size Overlay (rendered in an invisible portal over canvas) */}
      {showStepSizes && nextSetPositions && (
        <div className="absolute inset-0 pointer-events-none" style={{ top: '48px' }}>
          <StepSizeOverlay
            positions={currentPositions}
            nextPositions={nextSetPositions}
            fieldConfig={NCAA_FOOTBALL_FIELD}
            counts={drillSets[currentSetIndex]?.counts ?? 8}
            canvasWidth={canvasRef.current?.clientWidth ?? 800}
            canvasHeight={canvasRef.current?.clientHeight ?? 500}
          />
        </div>
      )}

      {/* Generate from Music Panel (modal overlay) */}
      {showGenerateFromMusic && (
        <Suspense fallback={null}>
          <GenerateFromMusicPanel
            isOpen={showGenerateFromMusic}
            onClose={() => setShowGenerateFromMusic(false)}
            sections={metmapSections}
            tempoMap={metmapTempoMap!}
            songId={linkedSong?.id}
            performers={formation.performers}
            onGenerateFormations={handleGenerateFormationsFromMusic}
          />
        </Suspense>
      )}

      {/* Formation feasibility warnings */}
      <FormationWarningsPanel warnings={formationWarnings} />
    </div>
  );
}

export default FormationCanvas;
