/**
 * FormationCanvas Component - Flux Studio
 *
 * Main canvas for creating and editing dance/marching formations.
 * Includes grid-based positioning, performer drag-drop, and keyframe animation.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Grid,
  Users,
  Trash2,
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PerformerMarker } from './PerformerMarker';
import { Timeline } from './Timeline';
import { ExportDialog } from './ExportDialog';
import {
  formationService,
  Formation,
  Position,
  PlaybackState,
  FormationExportOptions,
} from '../../services/formationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FormationCanvasProps {
  formationId?: string;
  projectId: string;
  onSave?: (formation: Formation) => void;
  onClose?: () => void;
}

type Tool = 'select' | 'pan' | 'add';

// ============================================================================
// PERFORMER COLORS
// ============================================================================

const defaultColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Helper to get initial formation data
function getInitialFormationData(formationId: string | undefined, projectId: string, defaultTitle: string) {
  if (formationId) {
    const existing = formationService.getFormation(formationId);
    if (existing) {
      return {
        formation: existing,
        keyframeId: existing.keyframes[0]?.id || '',
        positions: existing.keyframes.length > 0
          ? new Map(existing.keyframes[0].positions)
          : new Map<string, Position>(),
      };
    }
  }
  const newFormation = formationService.createFormation(defaultTitle, projectId, { createdBy: 'current-user' });
  return {
    formation: newFormation,
    keyframeId: newFormation.keyframes[0]?.id || '',
    positions: newFormation.keyframes.length > 0
      ? new Map(newFormation.keyframes[0].positions)
      : new Map<string, Position>(),
  };
}

export function FormationCanvas({
  formationId,
  projectId,
  onSave,
  onClose: _onClose,
}: FormationCanvasProps) {
  const { t } = useTranslation('common');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Lazy initialization for formation state
  const [formation, setFormation] = useState<Formation | null>(() => {
    const data = getInitialFormationData(formationId, projectId, t('formation.untitled', 'Untitled Formation'));
    return data.formation;
  });
  const [selectedPerformerIds, setSelectedPerformerIds] = useState<Set<string>>(new Set());
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string>(() => {
    const data = getInitialFormationData(formationId, projectId, t('formation.untitled', 'Untitled Formation'));
    return data.keyframeId;
  });
  const [currentPositions, setCurrentPositions] = useState<Map<string, Position>>(() => {
    const data = getInitialFormationData(formationId, projectId, t('formation.untitled', 'Untitled Formation'));
    return data.positions;
  });

  // UI state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [_pan, _setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRotation, setShowRotation] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showPerformerPanel, setShowPerformerPanel] = useState(true);

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 5000, // Default 5 seconds
    loop: false,
    speed: 1,
  });

  // History for undo/redo (simplified)
  const [_historyIndex, _setHistoryIndex] = useState(0);

  // Playback handlers - position updates happen in the callback from formationService
  const handlePlay = useCallback(() => {
    if (!formation) return;
    formationService.play(formation.id, (time) => {
      setPlaybackState((prev) => ({ ...prev, currentTime: time, isPlaying: true }));
      // Update positions in the same callback to avoid separate effect
      const positions = formationService.getPositionsAtTime(formation.id, time);
      setCurrentPositions(positions);
    });
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
  }, [formation]);

  const handlePause = useCallback(() => {
    formationService.pause();
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const handleStop = useCallback(() => {
    formationService.stop();
    setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    // Reset to first keyframe positions
    if (formation && formation.keyframes.length > 0) {
      setCurrentPositions(new Map(formation.keyframes[0].positions));
    }
  }, [formation]);

  const handleSeek = useCallback((time: number) => {
    formationService.seek(time);
    setPlaybackState((prev) => ({ ...prev, currentTime: time }));
    if (formation) {
      const positions = formationService.getPositionsAtTime(formation.id, time);
      setCurrentPositions(positions);
    }
  }, [formation]);

  const handleSpeedChange = useCallback((speed: number) => {
    formationService.setSpeed(speed);
    setPlaybackState((prev) => ({ ...prev, speed }));
  }, []);

  const handleToggleLoop = useCallback(() => {
    const loop = formationService.toggleLoop();
    setPlaybackState((prev) => ({ ...prev, loop }));
  }, []);

  // Performer handlers
  const handleAddPerformer = useCallback(() => {
    if (!formation) return;

    const index = formation.performers.length;
    const label = `P${index + 1}`;
    const color = defaultColors[index % defaultColors.length];

    const performer = formationService.addPerformer(
      formation.id,
      { name: `Performer ${index + 1}`, label, color },
      { x: 50, y: 50 } // Center of canvas
    );

    if (performer) {
      setFormation({ ...formation, performers: [...formation.performers, performer] });
      // Update positions with new performer
      const keyframe = formation.keyframes.find((kf) => kf.id === selectedKeyframeId);
      if (keyframe) {
        setCurrentPositions(new Map(keyframe.positions));
      }
    }
  }, [formation, selectedKeyframeId]);

  const handleRemovePerformer = useCallback((performerId: string) => {
    if (!formation) return;

    formationService.removePerformer(formation.id, performerId);
    setFormation({
      ...formation,
      performers: formation.performers.filter((p) => p.id !== performerId),
    });
    setSelectedPerformerIds((prev) => {
      const next = new Set(prev);
      next.delete(performerId);
      return next;
    });
    setCurrentPositions((prev) => {
      const next = new Map(prev);
      next.delete(performerId);
      return next;
    });
  }, [formation]);

  const handleSelectPerformer = useCallback((performerId: string, multiSelect: boolean) => {
    setSelectedPerformerIds((prev) => {
      const next = new Set(multiSelect ? prev : []);
      if (next.has(performerId)) {
        next.delete(performerId);
      } else {
        next.add(performerId);
      }
      return next;
    });
  }, []);

  const handleMovePerformer = useCallback((performerId: string, position: Position) => {
    if (!formation || playbackState.isPlaying) return;

    formationService.updatePosition(formation.id, selectedKeyframeId, performerId, position);
    setCurrentPositions((prev) => new Map(prev).set(performerId, position));
  }, [formation, selectedKeyframeId, playbackState.isPlaying]);

  const handleRotatePerformer = useCallback((performerId: string, rotation: number) => {
    if (!formation || playbackState.isPlaying) return;

    const currentPos = currentPositions.get(performerId);
    if (currentPos) {
      const newPosition = { ...currentPos, rotation };
      formationService.updatePosition(formation.id, selectedKeyframeId, performerId, newPosition);
      setCurrentPositions((prev) => new Map(prev).set(performerId, newPosition));
    }
  }, [formation, selectedKeyframeId, currentPositions, playbackState.isPlaying]);

  // Keyframe handlers
  const handleKeyframeSelect = useCallback((keyframeId: string) => {
    setSelectedKeyframeId(keyframeId);
    if (formation) {
      const keyframe = formation.keyframes.find((kf) => kf.id === keyframeId);
      if (keyframe) {
        setCurrentPositions(new Map(keyframe.positions));
      }
    }
  }, [formation]);

  const handleKeyframeAdd = useCallback((timestamp: number) => {
    if (!formation) return;

    // Copy current positions to new keyframe
    const keyframe = formationService.addKeyframe(formation.id, timestamp, new Map(currentPositions));
    if (keyframe) {
      setFormation({
        ...formation,
        keyframes: [...formation.keyframes, keyframe].sort((a, b) => a.timestamp - b.timestamp),
      });
      setSelectedKeyframeId(keyframe.id);
    }
  }, [formation, currentPositions]);

  const handleKeyframeRemove = useCallback((keyframeId: string) => {
    if (!formation) return;

    formationService.removeKeyframe(formation.id, keyframeId);
    setFormation({
      ...formation,
      keyframes: formation.keyframes.filter((kf) => kf.id !== keyframeId),
    });

    // Select first keyframe if current was deleted
    if (selectedKeyframeId === keyframeId && formation.keyframes.length > 1) {
      const remaining = formation.keyframes.filter((kf) => kf.id !== keyframeId);
      setSelectedKeyframeId(remaining[0].id);
    }
  }, [formation, selectedKeyframeId]);

  const handleKeyframeMove = useCallback((keyframeId: string, timestamp: number) => {
    if (!formation) return;

    const keyframe = formation.keyframes.find((kf) => kf.id === keyframeId);
    if (keyframe) {
      // Update in service (simplified - would need proper implementation)
      keyframe.timestamp = timestamp;
      setFormation({
        ...formation,
        keyframes: [...formation.keyframes].sort((a, b) => a.timestamp - b.timestamp),
      });
    }
  }, [formation]);

  // Canvas handlers
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'add' || !canvasRef.current || !formation) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add performer at click position
    const index = formation.performers.length;
    const label = `P${index + 1}`;
    const color = defaultColors[index % defaultColors.length];

    const performer = formationService.addPerformer(
      formation.id,
      { name: `Performer ${index + 1}`, label, color },
      { x, y }
    );

    if (performer) {
      setFormation({ ...formation, performers: [...formation.performers, performer] });
      const keyframe = formation.keyframes.find((kf) => kf.id === selectedKeyframeId);
      if (keyframe) {
        setCurrentPositions(new Map(keyframe.positions));
      }
    }
  }, [activeTool, formation, selectedKeyframeId]);

  // Save handler
  const handleSave = useCallback(() => {
    if (formation && onSave) {
      onSave(formation);
    }
  }, [formation, onSave]);

  // Export handler
  const handleExport = useCallback(async (options: FormationExportOptions) => {
    if (!formation) return;

    const blob = await formationService.exportFormation(formation.id, options);
    if (blob) {
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formation.name}.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [formation]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));

  if (!formation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Left: Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded ${
                activeTool === 'select'
                  ? 'bg-white dark:bg-gray-600 shadow'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('formation.selectTool', 'Select')}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded ${
                activeTool === 'pan'
                  ? 'bg-white dark:bg-gray-600 shadow'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('formation.panTool', 'Pan')}
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('add')}
              className={`p-2 rounded ${
                activeTool === 'add'
                  ? 'bg-white dark:bg-gray-600 shadow'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={t('formation.addTool', 'Add Performer')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* View toggles */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded ${
              showGrid ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={t('formation.toggleGrid', 'Toggle Grid')}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded ${
              showLabels ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={t('formation.toggleLabels', 'Toggle Labels')}
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowRotation(!showRotation)}
            className={`p-2 rounded ${
              showRotation ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={t('formation.toggleRotation', 'Toggle Rotation Handles')}
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Zoom controls */}
          <button onClick={handleZoomOut} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Formation name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={formation.name}
            onChange={(e) => setFormation({ ...formation, name: e.target.value })}
            className="px-3 py-1 text-center font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPerformerPanel(!showPerformerPanel)}
            className={`p-2 rounded ${
              showPerformerPanel ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={t('formation.togglePerformers', 'Toggle Performers Panel')}
          >
            <Users className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          <button
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">{t('formation.export', 'Export')}</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm">{t('actions.save', 'Save')}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-auto p-8 bg-gray-100 dark:bg-gray-900">
          <div
            ref={canvasRef}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mx-auto"
            style={{
              width: `${formation.stageWidth * 20 * zoom}px`,
              height: `${formation.stageHeight * 20 * zoom}px`,
              cursor: activeTool === 'add' ? 'crosshair' : activeTool === 'pan' ? 'grab' : 'default',
            }}
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <pattern
                    id="grid"
                    width={formation.gridSize * 20 * zoom}
                    height={formation.gridSize * 20 * zoom}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${formation.gridSize * 20 * zoom} 0 L 0 0 0 ${formation.gridSize * 20 * zoom}`}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            {/* Stage border */}
            <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 pointer-events-none" style={{ zIndex: 1 }} />

            {/* Performers */}
            {formation.performers.map((performer) => {
              const position = currentPositions.get(performer.id);
              if (!position) return null;

              return (
                <PerformerMarker
                  key={performer.id}
                  performer={performer}
                  position={position}
                  isSelected={selectedPerformerIds.has(performer.id)}
                  isLocked={playbackState.isPlaying}
                  showLabel={showLabels}
                  showRotation={showRotation && selectedPerformerIds.has(performer.id)}
                  scale={zoom}
                  onSelect={handleSelectPerformer}
                  onMove={handleMovePerformer}
                  onRotate={handleRotatePerformer}
                />
              );
            })}
          </div>
        </div>

        {/* Performer panel */}
        {showPerformerPanel && (
          <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('formation.performers', 'Performers')}
              </h3>
              <button
                onClick={handleAddPerformer}
                className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title={t('formation.addPerformer', 'Add Performer')}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {formation.performers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                  {t('formation.noPerformers', 'No performers yet. Click + to add.')}
                </p>
              ) : (
                <div className="space-y-1">
                  {formation.performers.map((performer) => (
                    <div
                      key={performer.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                        selectedPerformerIds.has(performer.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleSelectPerformer(performer.id, false)}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: performer.color }}
                      >
                        {performer.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {performer.name}
                        </p>
                        {performer.group && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {performer.group}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePerformer(performer.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formation.performers.length} {t('formation.performersCount', 'performers')} •{' '}
                {formation.keyframes.length} {t('formation.keyframesCount', 'keyframes')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <Timeline
        keyframes={formation.keyframes}
        duration={playbackState.duration}
        currentTime={playbackState.currentTime}
        playbackState={playbackState}
        selectedKeyframeId={selectedKeyframeId}
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

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        formationName={formation.name}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
}

export default FormationCanvas;
