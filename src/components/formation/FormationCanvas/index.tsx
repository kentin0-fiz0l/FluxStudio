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

import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Timeline } from '../Timeline';
import { ExportDialog } from '../ExportDialog';
import { AudioUpload } from '../AudioUpload';
import { TemplatePicker } from '../TemplatePicker';
import { CanvasToolbar } from './CanvasToolbar';
import { PerformerPanel } from './PerformerPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { OnboardingHints } from './OnboardingHints';
import { CanvasRenderer } from './CanvasRenderer';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { useCanvasState } from './useCanvasState';
import { useCanvasHandlers } from './useCanvasHandlers';
import { useCanvasKeyboardHandlers } from './useCanvasKeyboardHandlers';
import type { FormationCanvasProps } from './types';

export type { FormationCanvasProps };

export function FormationCanvas(props: FormationCanvasProps) {
  const { formationId, projectId, onSave, sandboxMode = false } = props;
  const { t } = useTranslation('common');

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
    setCurrentPositions,
    setHasUnsavedChanges,
    setShowShortcutsDialog,
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
  });

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
    </div>
  );
}

export default FormationCanvas;
