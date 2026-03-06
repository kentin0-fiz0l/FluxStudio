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
import { CanvasToolbar } from './CanvasToolbar';
import { PerformerPanel } from './PerformerPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { OnboardingHints } from './OnboardingHints';
import { CanvasRenderer } from './CanvasRenderer';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useCanvasState } from './useCanvasState';
import { useCanvasHandlers } from './useCanvasHandlers';
import { useCanvasKeyboardHandlers } from './useCanvasKeyboardHandlers';
import { NCAA_FOOTBALL_FIELD } from '../../../services/fieldConfigService';
import type { DrillSet, Position as DrillPosition } from '../../../services/formationTypes';
import type { FormationCanvasProps } from './types';

export type { FormationCanvasProps };

export function FormationCanvas(props: FormationCanvasProps) {
  const { formationId, projectId, onSave, sandboxMode = false, onPositionsChange } = props;
  const { t } = useTranslation('common');
  const [snapResolution, setSnapResolution] = useState<'beat' | 'half-beat' | 'measure'>('beat');

  const state = useCanvasState(props);

  const {
    apiLoading, apiError, apiSaving,
    isCollaborativeEnabled, collab, currentUser,
    formation,
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
    playbackState,
    ghostTrail,
    hasUnsavedChanges, setHasUnsavedChanges,
    canvasRef,
    history,
  } = state;

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
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {saveStatus === 'saving' && 'Saving formation...'}
        {saveStatus === 'saved' && 'Formation saved successfully'}
        {saveStatus === 'error' && 'Error saving formation'}
        {selectedPerformerIds.size > 0 && `${selectedPerformerIds.size} performer${selectedPerformerIds.size > 1 ? 's' : ''} selected`}
      </div>

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
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-auto p-8 bg-gray-100 dark:bg-gray-900">
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
          />
        </div>
        {showPerformerPanel && (
          <PerformerPanel
            formation={formation}
            selectedPerformerIds={selectedPerformerIds}
            onSelectPerformer={handleSelectPerformer}
            onAddPerformer={handleAddPerformer}
            onRemovePerformer={handleRemovePerformer}
          />
        )}
        {showCoordinatePanel && selectedPerformerInfo && (
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
        )}
        {showAnalysisPanel && (
          <DrillAnalysisPanel
            formation={formation}
            sets={drillSets}
            onNavigateToSet={handleNavigateToSet}
          />
        )}
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
      />

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
