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

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Timeline } from '../Timeline';
import { ExportDialog } from '../ExportDialog';
import { AudioUpload } from '../AudioUpload';
import { TemplatePicker } from '../TemplatePicker';
import { DrillAnalysisPanel } from '../DrillAnalysisPanel';
import { MovementToolsPanel } from '../MovementToolsPanel';
import { CoordinatePanel } from '../CoordinatePanel';
import { StepSizeOverlay } from '../StepSizeOverlay';
import { QuickStartWizard } from '../QuickStartWizard';
import { MetMapSongSelector } from '../MetMapSongSelector';
import { MeasurementOverlay } from '../MeasurementOverlay';
import { GroupPanel } from '../GroupPanel';
import { CollisionOverlay } from '../CollisionOverlay';
import { FormationVersionHistoryPanel } from '../FormationVersionHistory';
import { CanvasToolbar } from './CanvasToolbar';
import { MobileCanvasToolbar } from './MobileCanvasToolbar';
import { MobileSetNavigator } from './MobileSetNavigator';
import { PerformerPanel } from './PerformerPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { OnboardingHints } from './OnboardingHints';
import { CanvasRenderer } from './CanvasRenderer';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useCanvasState } from './useCanvasState';
import { useCanvasHandlers } from './useCanvasHandlers';
import { useCanvasKeyboardHandlers } from './useCanvasKeyboardHandlers';
import { useCanvasAccessibility } from './useCanvasAccessibility';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useMetMapSongLink } from '../../../hooks/useMetMapSongLink';
import { NCAA_FOOTBALL_FIELD } from '../../../services/fieldConfigService';
import type { DrillSet, Position as DrillPosition, Formation } from '../../../services/formationTypes';
import type { FormationCanvasProps } from './types';

export type { FormationCanvasProps };

export function FormationCanvas(props: FormationCanvasProps) {
  const { formationId, projectId, onSave, sandboxMode = false, onPositionsChange } = props;
  const { t } = useTranslation('common');
  const [snapResolution, setSnapResolution] = useState<'beat' | 'half-beat' | 'measure'>('beat');
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const state = useCanvasState(props);

  const {
    apiLoading, apiError, apiSaving,
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

  const { isDesktop } = useBreakpoint();
  const isMobileView = !isDesktop; // < 1024px

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

  // Loading/error states
  if (apiLoading || (formationId && !formation)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" aria-hidden="true" />
          <span className="text-sm text-gray-500">{t('formation.loading', 'Loading formation...')}</span>
        </div>
      </div>
    );
  }
  if (apiError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <span className="text-lg font-medium">{t('formation.errorLoading', 'Failed to load formation')}</span>
          <span className="text-sm">{apiError}</span>
        </div>
      </div>
    );
  }
  if (!formation) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;
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

      {isDesktop ? (
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
        />
      ) : (
        <MobileSetNavigator
          keyframes={formation.keyframes}
          selectedKeyframeId={selectedKeyframeId}
          onKeyframeSelect={handleKeyframeSelect}
        />
      )}

      <div className={`flex-1 flex overflow-hidden ${isMobileView ? 'pb-[60px]' : ''}`}>
        <div id="canvas-area" className={`flex-1 relative overflow-auto bg-gray-100 dark:bg-gray-900 ${isMobileView ? 'p-2' : 'p-8'}`}>
          {sandboxMode && <OnboardingHints />}
          <AlignmentToolbar
            selectedCount={selectedPerformerIds.size}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
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
          />
        </div>
        {/* Side panels: slide-over drawers on mobile, inline on desktop */}
        {showPerformerPanel && (
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl' : ''}>
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
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl' : ''}>
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
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl' : ''}>
            <DrillAnalysisPanel
              formation={formation}
              sets={drillSets}
              onNavigateToSet={handleNavigateToSet}
            />
          </div>
        )}
        {showGroupPanel && (
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl' : ''}>
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
        {showVersionHistory && formation.id && (
          <div className={isMobileView ? 'absolute inset-y-0 right-0 z-30 w-72 shadow-xl' : ''}>
            <FormationVersionHistoryPanel
              formationId={formation.id}
              currentFormation={formation}
              onRestore={handleVersionRestore}
              onClose={() => setShowVersionHistory(false)}
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

      {/* Collision detection overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ top: '48px' }}>
        <CollisionOverlay
          positions={currentPositions}
          canvasWidth={canvasRef.current?.clientWidth ?? 800}
          canvasHeight={canvasRef.current?.clientHeight ?? 500}
        />
      </div>

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

      {/* Desktop: MetMap song selector + full Timeline */}
      {isDesktop && (
        <>
          <div id="timeline-area" className="flex items-center gap-2 px-4 py-1 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
            beatMap={metmapBeatMap ?? undefined}
          />
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

      <ExportDialog isOpen={isExportDialogOpen} formationName={formation.name} onClose={() => setIsExportDialogOpen(false)} onExport={handleExport} />
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
        />
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
    </div>
  );
}

export default FormationCanvas;
