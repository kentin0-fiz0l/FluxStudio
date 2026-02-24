/**
 * FormationCanvas Component - Decomposed version
 * Toolbar extracted to CanvasToolbar.tsx, PerformerPanel to PerformerPanel.tsx
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { PerformerMarker } from '../PerformerMarker';
import { Timeline } from '../Timeline';
import { ExportDialog } from '../ExportDialog';
import { AudioUpload } from '../AudioUpload';
import { PathOverlay } from '../PathOverlay';
import { TemplatePicker } from '../TemplatePicker';
import { FormationCursorOverlay, SelectionRingsOverlay } from '../FormationCursorOverlay';
import { ApplyTemplateOptions } from '../../../services/formationTemplates/types';
import {
  formationService,
  Formation,
  Position,
  PlaybackState,
  FormationExportOptions,
  AudioTrack,
} from '../../../services/formationService';
import { useFormation } from '../../../hooks/useFormations';
import { useFormationYjs } from '../../../hooks/useFormationYjs';
import { useFormationHistory } from '../../../hooks/useFormationHistory';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useTouchGestures } from '../../../hooks/useTouchGestures';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from '../../../lib/toast';
import { getUserColor } from '../../../services/formation/yjs/formationYjsTypes';
import * as formationsApi from '../../../services/formationsApi';
import { snapToGrid, snapToCount, alignPositions, distributePositions, generateLinePositions, generateArcPositions, generateBlockPositions, DEFAULT_DRILL_SETTINGS } from '../../../utils/drillGeometry';
import type { AlignmentType, DistributionType } from '../../../utils/drillGeometry';
import type { DrillSettings } from '../../../services/formationTypes';
import { CanvasToolbar } from './CanvasToolbar';
import { PerformerPanel } from './PerformerPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { ShapeToolOverlay } from './ShapeToolOverlay';
import { OnboardingHints } from './OnboardingHints';
import { FieldOverlay } from '../FieldOverlay';
import { TransitionGhostTrail } from '../TransitionGhostTrail';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FormationCanvasProps {
  formationId?: string;
  projectId: string;
  onSave?: (formation: Formation) => void;
  onClose?: () => void;
  collaborativeMode?: boolean;
  /** Sandbox mode — disables save/export, shows signup CTA */
  sandboxMode?: boolean;
  /** Pre-populated performers for sandbox (skips empty state) */
  sandboxPerformers?: Array<{ id: string; name: string; label: string; color: string }>;
  /** Initial positions keyed by performer ID */
  sandboxPositions?: Map<string, Position>;
}

type Tool = 'select' | 'pan' | 'add' | 'line' | 'arc' | 'block';

const defaultColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4',
];

function getInitialFormationData(
  formationId: string | undefined,
  projectId: string,
  defaultTitle: string,
  sandboxPerformers?: FormationCanvasProps['sandboxPerformers'],
  sandboxPositions?: Map<string, Position>,
) {
  if (formationId) {
    const existing = formationService.getFormation(formationId);
    if (existing) {
      return {
        formation: existing,
        keyframeId: existing.keyframes[0]?.id || '',
        positions: existing.keyframes.length > 0 ? new Map(existing.keyframes[0].positions) : new Map<string, Position>(),
      };
    }
  }
  const newFormation = formationService.createFormation(defaultTitle, projectId, {
    createdBy: 'current-user',
    performers: sandboxPerformers,
  });

  // Pre-populate positions for sandbox
  if (sandboxPositions && newFormation.keyframes[0]) {
    for (const [id, pos] of sandboxPositions) {
      newFormation.keyframes[0].positions.set(id, pos);
    }
  }

  return {
    formation: newFormation,
    keyframeId: newFormation.keyframes[0]?.id || '',
    positions: newFormation.keyframes.length > 0 ? new Map(newFormation.keyframes[0].positions) : new Map<string, Position>(),
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FormationCanvas({
  formationId, projectId, onSave, onClose: _onClose, collaborativeMode, sandboxMode = false,
  sandboxPerformers, sandboxPositions,
}: FormationCanvasProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);

  const isCollaborativeEnabled = collaborativeMode ?? !!formationId;

  const { formation: apiFormation, loading: apiLoading, error: apiError, save: apiSave, saving: apiSaving } = useFormation({ formationId, enabled: !!formationId && !isCollaborativeEnabled });

  const collab = useFormationYjs({
    projectId, formationId: formationId || '', enabled: isCollaborativeEnabled && !!formationId,
    onUpdate: (updatedFormation) => {
      if (isCollaborativeEnabled) {
        setFormation(updatedFormation);
        const keyframe = updatedFormation.keyframes.find((kf) => kf.id === selectedKeyframeId);
        if (keyframe) setCurrentPositions(new Map(keyframe.positions));
      }
    },
  });

  const currentUser = useMemo(() => {
    if (!user) return null;
    return { id: user.id, name: user.name || user.email || 'Anonymous', color: getUserColor(user.id), avatar: user.avatar };
  }, [user]);

  const [_draggingPerformerId, setDraggingPerformerId] = useState<string | null>(null);

  const initialData = useMemo(() => {
    if (!formationId) return getInitialFormationData(undefined, projectId, t('formation.untitled', 'Untitled Formation'), sandboxPerformers, sandboxPositions);
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formation, setFormation] = useState<Formation | null>(() => {
    if (!formationId && initialData) return initialData.formation;
    return null;
  });

  useEffect(() => {
    if (apiFormation && formationId) {
      const normalizedFormation = formationService.registerFormation(apiFormation);
      setFormation(normalizedFormation);
      if (normalizedFormation.keyframes.length > 0) {
        setSelectedKeyframeId(normalizedFormation.keyframes[0].id);
        setCurrentPositions(new Map(normalizedFormation.keyframes[0].positions));
      }
    }
  }, [apiFormation, formationId]);

  const [selectedPerformerIds, setSelectedPerformerIds] = useState<Set<string>>(new Set());
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string>(() => (!formationId && initialData) ? initialData.keyframeId : '');
  const [currentPositions, setCurrentPositions] = useState<Map<string, Position>>(() => (!formationId && initialData) ? initialData.positions : new Map());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [_pan, _setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRotation, setShowRotation] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showPerformerPanel, setShowPerformerPanel] = useState(true);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'time' | 'counts'>('time');
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(DEFAULT_DRILL_SETTINGS);
  const [showFieldOverlay, setShowFieldOverlay] = useState(false);
  const [shapeToolStart, setShapeToolStart] = useState<Position | null>(null);
  const [shapeToolCurrent, setShapeToolCurrent] = useState<Position | null>(null);
  // Touch: finger mode — 'select' uses single-finger to select/drag performers, 'pan' uses single-finger to pan canvas
  const [fingerMode, setFingerMode] = useState<'select' | 'pan'>('select');
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  // Rubber-band marquee selection
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const marqueeRef = useRef(false); // true while marquee drag is active
  const clipboardRef = useRef<{ performers: Formation['performers']; positions: Map<string, Position> } | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({ isPlaying: false, currentTime: 0, duration: 5000, loop: false, speed: 1 });
  const [ghostTrail, setGhostTrail] = useState<Array<{ time: number; positions: Map<string, Position> }>>([]);
  const [_historyIndex, _setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ============================================================================
  // UNDO/REDO HISTORY
  // ============================================================================

  const history = useFormationHistory({ maxHistory: 100 });

  // Push initial state into history when formation loads
  useEffect(() => {
    if (formation && formation.performers.length >= 0) {
      history.reset({
        positions: new Map(currentPositions),
        performerIds: formation.performers.map(p => p.id),
        label: 'Initial state',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation?.id]);

  /** Snapshot the current state for undo history */
  const pushHistory = useCallback((label: string) => {
    if (!formation) return;
    history.pushState({
      positions: new Map(currentPositions),
      performerIds: formation.performers.map(p => p.id),
      label,
    });
    setHasUnsavedChanges(true);
  }, [formation, currentPositions, history]);

  const handleUndo = useCallback(() => {
    // In collaborative mode, use Y.UndoManager (per-user undo)
    if (isCollaborativeEnabled && collab.isConnected) {
      collab.yUndo();
      return;
    }
    const snapshot = history.undo();
    if (snapshot && formation) {
      setCurrentPositions(new Map(snapshot.positions));
      snapshot.positions.forEach((pos, id) => {
        formationService.updatePosition(formation.id, selectedKeyframeId, id, pos);
      });
      setHasUnsavedChanges(true);
    }
  }, [history, formation, selectedKeyframeId, isCollaborativeEnabled, collab]);

  const handleRedo = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) {
      collab.yRedo();
      return;
    }
    const snapshot = history.redo();
    if (snapshot && formation) {
      setCurrentPositions(new Map(snapshot.positions));
      snapshot.positions.forEach((pos, id) => {
        formationService.updatePosition(formation.id, selectedKeyframeId, id, pos);
      });
      setHasUnsavedChanges(true);
    }
  }, [history, formation, selectedKeyframeId, isCollaborativeEnabled, collab]);

  // ============================================================================
  // AUTO-SAVE (debounced 3s after last change)
  // ============================================================================

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges || sandboxMode || !formationId) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, sandboxMode, formationId]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  const handleDeleteSelected = useCallback(() => {
    if (!formation || selectedPerformerIds.size === 0) return;
    const ids = Array.from(selectedPerformerIds);
    ids.forEach(id => {
      if (isCollaborativeEnabled && collab.isConnected) collab.removePerformer(id);
      else formationService.removePerformer(formation.id, id);
    });
    setFormation(prev => prev ? {
      ...prev,
      performers: prev.performers.filter(p => !selectedPerformerIds.has(p.id)),
    } : prev);
    setCurrentPositions(prev => {
      const next = new Map(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    setSelectedPerformerIds(new Set());
    pushHistory('Delete performers');
  }, [formation, selectedPerformerIds, isCollaborativeEnabled, collab, pushHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (!formation || selectedPerformerIds.size === 0) return;
    const newPerformers: typeof formation.performers = [];
    const newPositions = new Map(currentPositions);

    selectedPerformerIds.forEach(id => {
      const performer = formation.performers.find(p => p.id === id);
      const pos = currentPositions.get(id);
      if (!performer || !pos) return;
      const newId = `performer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      newPerformers.push({ ...performer, id: newId, label: `${performer.label}*` });
      newPositions.set(newId, { x: pos.x + 3, y: pos.y + 3, rotation: pos.rotation });
    });

    setFormation(prev => prev ? {
      ...prev,
      performers: [...prev.performers, ...newPerformers],
      keyframes: prev.keyframes.map(kf => ({
        ...kf,
        positions: kf.id === selectedKeyframeId ? newPositions : kf.positions,
      })),
    } : prev);
    setCurrentPositions(newPositions);
    pushHistory('Duplicate performers');
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, pushHistory]);

  const handleCopy = useCallback(() => {
    if (!formation || selectedPerformerIds.size === 0) return;
    const copiedPerformers = formation.performers.filter(p => selectedPerformerIds.has(p.id));
    const copiedPositions = new Map<string, Position>();
    selectedPerformerIds.forEach(id => {
      const pos = currentPositions.get(id);
      if (pos) copiedPositions.set(id, { ...pos });
    });
    clipboardRef.current = { performers: copiedPerformers, positions: copiedPositions };
  }, [formation, selectedPerformerIds, currentPositions]);

  const handlePaste = useCallback(() => {
    if (!formation || !clipboardRef.current || clipboardRef.current.performers.length === 0) return;
    const newPerformers: typeof formation.performers = [];
    const newPositions = new Map(currentPositions);
    const newIds = new Set<string>();

    clipboardRef.current.performers.forEach(performer => {
      const pos = clipboardRef.current!.positions.get(performer.id);
      if (!pos) return;
      const newId = `performer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      newPerformers.push({ ...performer, id: newId, label: `${performer.label}*` });
      newPositions.set(newId, { x: Math.min(97, pos.x + 3), y: Math.min(97, pos.y + 3), rotation: pos.rotation });
      newIds.add(newId);
    });

    setFormation(prev => prev ? {
      ...prev,
      performers: [...prev.performers, ...newPerformers],
      keyframes: prev.keyframes.map(kf => ({
        ...kf,
        positions: kf.id === selectedKeyframeId ? newPositions : kf.positions,
      })),
    } : prev);
    setCurrentPositions(newPositions);
    setSelectedPerformerIds(newIds);
    pushHistory('Paste performers');
  }, [formation, currentPositions, selectedKeyframeId, pushHistory]);

  const handleSelectAll = useCallback(() => {
    if (!formation) return;
    setSelectedPerformerIds(new Set(formation.performers.map(p => p.id)));
  }, [formation]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPerformerIds(new Set());
  }, []);

  const handleNudge = useCallback((dx: number, dy: number) => {
    if (!formation || selectedPerformerIds.size === 0) return;
    setCurrentPositions(prev => {
      const next = new Map(prev);
      selectedPerformerIds.forEach(id => {
        const pos = prev.get(id);
        if (pos) {
          const newPos = {
            x: Math.max(0, Math.min(100, pos.x + dx)),
            y: Math.max(0, Math.min(100, pos.y + dy)),
            rotation: pos.rotation,
          };
          next.set(id, newPos);
          formationService.updatePosition(formation.id, selectedKeyframeId, id, newPos);
        }
      });
      return next;
    });
    setHasUnsavedChanges(true);
  }, [formation, selectedPerformerIds, selectedKeyframeId]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  useKeyboardShortcuts({
    shortcuts: [
      { key: 'z', ctrlKey: !isMac, metaKey: isMac, action: handleUndo, description: 'Undo' },
      { key: 'z', ctrlKey: !isMac, metaKey: isMac, shiftKey: true, action: handleRedo, description: 'Redo' },
      { key: 'y', ctrlKey: !isMac, metaKey: isMac, action: handleRedo, description: 'Redo' },
      { key: 'Delete', action: handleDeleteSelected, description: 'Delete selected' },
      { key: 'Backspace', action: handleDeleteSelected, description: 'Delete selected' },
      { key: 'c', ctrlKey: !isMac, metaKey: isMac, action: handleCopy, description: 'Copy selected' },
      { key: 'v', ctrlKey: !isMac, metaKey: isMac, action: handlePaste, description: 'Paste performers' },
      { key: 'd', ctrlKey: !isMac, metaKey: isMac, action: handleDuplicateSelected, description: 'Duplicate selected' },
      { key: 'a', ctrlKey: !isMac, metaKey: isMac, action: handleSelectAll, description: 'Select all' },
      { key: 'Escape', action: handleDeselectAll, description: 'Deselect all' },
      { key: 'ArrowUp', action: () => handleNudge(0, -1), description: 'Nudge up' },
      { key: 'ArrowDown', action: () => handleNudge(0, 1), description: 'Nudge down' },
      { key: 'ArrowLeft', action: () => handleNudge(-1, 0), description: 'Nudge left' },
      { key: 'ArrowRight', action: () => handleNudge(1, 0), description: 'Nudge right' },
      { key: 'ArrowUp', shiftKey: true, action: () => handleNudge(0, -5), description: 'Nudge up (large)' },
      { key: 'ArrowDown', shiftKey: true, action: () => handleNudge(0, 5), description: 'Nudge down (large)' },
      { key: 'ArrowLeft', shiftKey: true, action: () => handleNudge(-5, 0), description: 'Nudge left (large)' },
      { key: 'ArrowRight', shiftKey: true, action: () => handleNudge(5, 0), description: 'Nudge right (large)' },
    ],
    enabled: !playbackState.isPlaying,
  });

  // Touch gesture handling: pinch-to-zoom and two-finger pan
  const handleTouchZoom = useCallback((delta: number, _cx: number, _cy: number) => {
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  const handleTouchPan = useCallback((dx: number, dy: number) => {
    setCanvasPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleLongPress = useCallback((x: number, y: number) => {
    // Long-press on a performer → select it; on empty space → deselect
    if (!formation) return;
    const performer = formation.performers.find(p => {
      const pos = currentPositions.get(p.id);
      if (!pos) return false;
      return Math.abs(pos.x - x) < 5 && Math.abs(pos.y - y) < 5;
    });
    if (performer) {
      setSelectedPerformerIds(new Set([performer.id]));
    }
  }, [formation, currentPositions]);

  useTouchGestures({
    targetRef: canvasRef,
    onZoom: handleTouchZoom,
    onPan: handleTouchPan,
    onLongPress: handleLongPress,
    enabled: true,
  });

  // Playback handlers
  const handlePlay = useCallback(() => {
    if (!formation) return;
    setGhostTrail([]);
    formationService.play(formation.id, (time) => {
      setPlaybackState((prev) => ({ ...prev, currentTime: time, isPlaying: true }));
      const positions = formationService.getPositionsAtTime(formation.id, time);
      setCurrentPositions(positions);
      // Record ghost trail snapshots (keep last 6 for 5 visible ghosts)
      setGhostTrail((prev) => [...prev.slice(-5), { time, positions: new Map(positions) }]);
    });
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
  }, [formation]);

  const handlePause = useCallback(() => { formationService.pause(); setPlaybackState((prev) => ({ ...prev, isPlaying: false })); }, []);
  const handleStop = useCallback(() => { formationService.stop(); setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 })); setGhostTrail([]); if (formation && formation.keyframes.length > 0) setCurrentPositions(new Map(formation.keyframes[0].positions)); }, [formation]);
  const handleSeek = useCallback((time: number) => { formationService.seek(time); setPlaybackState((prev) => ({ ...prev, currentTime: time })); if (formation) setCurrentPositions(formationService.getPositionsAtTime(formation.id, time)); }, [formation]);
  const handleSpeedChange = useCallback((speed: number) => { formationService.setSpeed(speed); setPlaybackState((prev) => ({ ...prev, speed })); }, []);
  const handleToggleLoop = useCallback(() => { const loop = formationService.toggleLoop(); setPlaybackState((prev) => ({ ...prev, loop })); }, []);

  // Performer handlers
  const handleAddPerformer = useCallback(() => {
    if (!formation) return;
    const index = formation.performers.length;
    const label = `P${index + 1}`;
    const color = defaultColors[index % defaultColors.length];
    const initialPosition = { x: 50, y: 50, rotation: 0 };

    if (isCollaborativeEnabled && collab.isConnected) {
      collab.addPerformer({ name: `Performer ${index + 1}`, label, color }, initialPosition);
      return;
    }

    const performer = formationService.addPerformer(formation.id, { name: `Performer ${index + 1}`, label, color }, initialPosition);
    if (performer) {
      const updatedFormation = formationService.getFormation(formation.id);
      if (updatedFormation) {
        setFormation({ ...updatedFormation, keyframes: updatedFormation.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })) });
        const keyframe = updatedFormation.keyframes.find((kf) => kf.id === selectedKeyframeId);
        if (keyframe) setCurrentPositions(new Map(keyframe.positions));
      }
    } else {
      const newPerformer = { id: `performer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: `Performer ${index + 1}`, label, color };
      const updatedKeyframes = formation.keyframes.map((kf, idx) => {
        if (idx === 0 || kf.id === selectedKeyframeId) { const newPositions = new Map(kf.positions); newPositions.set(newPerformer.id, initialPosition); return { ...kf, positions: newPositions }; }
        return kf;
      });
      setFormation({ ...formation, performers: [...formation.performers, newPerformer], keyframes: updatedKeyframes });
      setCurrentPositions(prev => { const np = new Map(prev); np.set(newPerformer.id, initialPosition); return np; });
      formationService.registerFormation({ ...formation, performers: [...formation.performers, newPerformer], keyframes: updatedKeyframes });
    }
  }, [formation, selectedKeyframeId, isCollaborativeEnabled, collab]);

  const handleRemovePerformer = useCallback((performerId: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) { collab.removePerformer(performerId); }
    else { formationService.removePerformer(formation.id, performerId); setFormation({ ...formation, performers: formation.performers.filter((p) => p.id !== performerId) }); }
    setSelectedPerformerIds((prev) => { const next = new Set(prev); next.delete(performerId); return next; });
    setCurrentPositions((prev) => { const next = new Map(prev); next.delete(performerId); return next; });
  }, [formation, isCollaborativeEnabled, collab]);

  const handleSelectPerformer = useCallback((performerId: string, multiSelect: boolean) => {
    setSelectedPerformerIds((prev) => {
      const next = new Set(multiSelect ? prev : []);
      if (next.has(performerId)) next.delete(performerId); else next.add(performerId);
      if (isCollaborativeEnabled && collab.isConnected) collab.setSelectedPerformers(Array.from(next));
      return next;
    });
  }, [isCollaborativeEnabled, collab]);

  const handleMovePerformer = useCallback((performerId: string, position: Position) => {
    if (!formation || playbackState.isPlaying) return;
    const finalPosition = snapEnabled
      ? snapToGrid(position, formation.gridSize, formation.stageWidth, formation.stageHeight)
      : position;

    // Group drag: if dragged performer is in multi-selection, move all selected by the same delta
    if (selectedPerformerIds.has(performerId) && selectedPerformerIds.size > 1) {
      const prevPos = currentPositions.get(performerId);
      if (prevPos) {
        const dx = finalPosition.x - prevPos.x;
        const dy = finalPosition.y - prevPos.y;
        const updates = new Map<string, Position>();
        for (const id of selectedPerformerIds) {
          const p = currentPositions.get(id);
          if (p) {
            updates.set(id, {
              x: Math.max(0, Math.min(100, p.x + dx)),
              y: Math.max(0, Math.min(100, p.y + dy)),
              rotation: p.rotation,
            });
          }
        }
        setCurrentPositions((prev) => {
          const next = new Map(prev);
          updates.forEach((pos, id) => {
            next.set(id, pos);
            if (isCollaborativeEnabled && collab.isConnected) collab.updatePosition(selectedKeyframeId, id, pos);
            else formationService.updatePosition(formation.id, selectedKeyframeId, id, pos);
          });
          return next;
        });
        return;
      }
    }

    if (isCollaborativeEnabled && collab.isConnected) collab.updatePosition(selectedKeyframeId, performerId, finalPosition);
    else formationService.updatePosition(formation.id, selectedKeyframeId, performerId, finalPosition);
    setCurrentPositions((prev) => new Map(prev).set(performerId, finalPosition));
  }, [formation, selectedKeyframeId, playbackState.isPlaying, isCollaborativeEnabled, collab, snapEnabled, selectedPerformerIds, currentPositions]);

  const handleAlign = useCallback((type: AlignmentType) => {
    if (!formation || selectedPerformerIds.size < 2) return;
    const ids = Array.from(selectedPerformerIds);
    const positions = ids.map((id) => currentPositions.get(id)).filter((p): p is Position => !!p);
    const aligned = alignPositions(positions, type);
    setCurrentPositions((prev) => {
      const next = new Map(prev);
      ids.forEach((id, i) => {
        if (aligned[i]) {
          next.set(id, aligned[i]);
          if (isCollaborativeEnabled && collab.isConnected) collab.updatePosition(selectedKeyframeId, id, aligned[i]);
          else formationService.updatePosition(formation.id, selectedKeyframeId, id, aligned[i]);
        }
      });
      return next;
    });
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, isCollaborativeEnabled, collab]);

  const handleDistribute = useCallback((type: DistributionType) => {
    if (!formation || selectedPerformerIds.size < 3) return;
    const ids = Array.from(selectedPerformerIds);
    const positions = ids.map((id) => currentPositions.get(id)).filter((p): p is Position => !!p);
    const distributed = distributePositions(positions, type);
    setCurrentPositions((prev) => {
      const next = new Map(prev);
      ids.forEach((id, i) => {
        if (distributed[i]) {
          next.set(id, distributed[i]);
          if (isCollaborativeEnabled && collab.isConnected) collab.updatePosition(selectedKeyframeId, id, distributed[i]);
          else formationService.updatePosition(formation.id, selectedKeyframeId, id, distributed[i]);
        }
      });
      return next;
    });
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, isCollaborativeEnabled, collab]);

  const handleDragStart = useCallback((performerId: string): boolean => {
    if (!isCollaborativeEnabled || !collab.isConnected) { setDraggingPerformerId(performerId); return true; }
    const { dragging, by } = collab.isPerformerBeingDragged(performerId);
    if (dragging && by) { toast.warning(`${by.user.name} is currently moving this performer`); return false; }
    collab.setDraggingPerformer(performerId); setDraggingPerformerId(performerId); return true;
  }, [isCollaborativeEnabled, collab]);

  const handleDragEnd = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) collab.setDraggingPerformer(null);
    setDraggingPerformerId(null);
    pushHistory('Move performer');
  }, [isCollaborativeEnabled, collab, pushHistory]);

  const handleRotatePerformer = useCallback((performerId: string, rotation: number) => {
    if (!formation || playbackState.isPlaying) return;
    const currentPos = currentPositions.get(performerId);
    if (currentPos) { const np = { ...currentPos, rotation }; formationService.updatePosition(formation.id, selectedKeyframeId, performerId, np); setCurrentPositions((prev) => new Map(prev).set(performerId, np)); }
  }, [formation, selectedKeyframeId, currentPositions, playbackState.isPlaying]);

  // Keyframe handlers
  const handleKeyframeSelect = useCallback((keyframeId: string) => {
    setSelectedKeyframeId(keyframeId);
    if (formation) { const kf = formation.keyframes.find((k) => k.id === keyframeId); if (kf) setCurrentPositions(new Map(kf.positions)); }
  }, [formation]);

  const handleKeyframeAdd = useCallback((timestamp: number) => {
    if (!formation) return;
    const finalTimestamp = timeDisplayMode === 'counts'
      ? snapToCount(timestamp, { bpm: drillSettings.bpm, countsPerPhrase: drillSettings.countsPerPhrase, startOffset: drillSettings.startOffset })
      : timestamp;
    if (isCollaborativeEnabled && collab.isConnected) { const kf = collab.addKeyframe(finalTimestamp, new Map(currentPositions)); setSelectedKeyframeId(kf.id); return; }
    const kf = formationService.addKeyframe(formation.id, finalTimestamp, new Map(currentPositions));
    if (kf) { setFormation({ ...formation, keyframes: [...formation.keyframes, kf].sort((a, b) => a.timestamp - b.timestamp) }); setSelectedKeyframeId(kf.id); }
  }, [formation, currentPositions, isCollaborativeEnabled, collab, timeDisplayMode, drillSettings]);

  const handleKeyframeRemove = useCallback((keyframeId: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.removeKeyframe(keyframeId);
    else { formationService.removeKeyframe(formation.id, keyframeId); setFormation({ ...formation, keyframes: formation.keyframes.filter((kf) => kf.id !== keyframeId) }); }
    if (selectedKeyframeId === keyframeId && formation.keyframes.length > 1) { const remaining = formation.keyframes.filter((kf) => kf.id !== keyframeId); setSelectedKeyframeId(remaining[0].id); }
  }, [formation, selectedKeyframeId, isCollaborativeEnabled, collab]);

  const handleKeyframeMove = useCallback((keyframeId: string, timestamp: number) => {
    if (!formation) return;
    const kf = formation.keyframes.find((k) => k.id === keyframeId);
    if (kf) { kf.timestamp = timestamp; setFormation({ ...formation, keyframes: [...formation.keyframes].sort((a, b) => a.timestamp - b.timestamp) }); }
  }, [formation]);

  const isShapeTool = activeTool === 'line' || activeTool === 'arc' || activeTool === 'block';

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Track mouse for shape tool preview
    if (isShapeTool && shapeToolStart) {
      setShapeToolCurrent({ x, y });
    }

    // Update collaborator cursor
    if (isCollaborativeEnabled && collab.isConnected) {
      collab.updateCursor(x, y);
    }
  }, [isCollaborativeEnabled, collab, isShapeTool, shapeToolStart]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) collab.clearCursor();
    setShapeToolCurrent(null);
  }, [isCollaborativeEnabled, collab]);

  // Rubber-band marquee selection handlers (pointer events for mouse + touch)
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // In finger-pan mode on touch, don't start marquee — let pan happen
    if (e.pointerType === 'touch' && fingerMode === 'pan') return;
    if (activeTool !== 'select' || !canvasRef.current) return;
    // Only start marquee on primary button click on empty area (not on a performer)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-performer]')) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    marqueeRef.current = true;
    setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
  }, [activeTool, fingerMode]);

  const handleCanvasPointerMoveMarquee = useCallback((e: React.PointerEvent) => {
    if (!marqueeRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarquee(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const handleCanvasPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!marqueeRef.current || !marquee || !formation) {
      marqueeRef.current = false;
      setMarquee(null);
      return;
    }
    marqueeRef.current = false;

    // Calculate marquee bounds
    const minX = Math.min(marquee.startX, marquee.currentX);
    const maxX = Math.max(marquee.startX, marquee.currentX);
    const minY = Math.min(marquee.startY, marquee.currentY);
    const maxY = Math.max(marquee.startY, marquee.currentY);

    // Only count as marquee if dragged at least 2% in any direction
    if (maxX - minX < 2 && maxY - minY < 2) {
      setMarquee(null);
      return;
    }

    // Select all performers within the marquee bounds
    const selected = new Set<string>();
    formation.performers.forEach(p => {
      const pos = currentPositions.get(p.id);
      if (pos && pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
        selected.add(p.id);
      }
    });

    setSelectedPerformerIds(selected);
    if (isCollaborativeEnabled && collab.isConnected) {
      collab.setSelectedPerformers(Array.from(selected));
    }
    setMarquee(null);
  }, [marquee, formation, currentPositions, isCollaborativeEnabled, collab]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !formation) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Shape tool: two-click interaction
    if (isShapeTool) {
      if (!shapeToolStart) {
        // First click: set start point
        setShapeToolStart({ x, y });
        setShapeToolCurrent({ x, y });
        return;
      }
      // Second click: generate positions and apply
      const shapeTool = activeTool as 'line' | 'arc' | 'block';
      let positions: Position[] = [];
      const count = Math.max(1, formation.performers.length);

      if (shapeTool === 'line') {
        positions = generateLinePositions(shapeToolStart, { x, y }, count);
      } else if (shapeTool === 'arc') {
        const dx = x - shapeToolStart.x;
        const dy = y - shapeToolStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const endAngle = Math.atan2(dy, dx);
        const startAngle = endAngle - Math.PI;
        positions = generateArcPositions(shapeToolStart, radius, startAngle, endAngle, count);
      } else if (shapeTool === 'block') {
        const topLeft = { x: Math.min(shapeToolStart.x, x), y: Math.min(shapeToolStart.y, y) };
        const bottomRight = { x: Math.max(shapeToolStart.x, x), y: Math.max(shapeToolStart.y, y) };
        positions = generateBlockPositions(topLeft, bottomRight, count);
      }

      // Apply generated positions to performers
      setCurrentPositions((prev) => {
        const next = new Map(prev);
        formation.performers.forEach((performer, i) => {
          if (i < positions.length) {
            const pos = positions[i];
            next.set(performer.id, pos);
            if (isCollaborativeEnabled && collab.isConnected) collab.updatePosition(selectedKeyframeId, performer.id, pos);
            else formationService.updatePosition(formation.id, selectedKeyframeId, performer.id, pos);
          }
        });
        return next;
      });

      // Reset shape tool state
      setShapeToolStart(null);
      setShapeToolCurrent(null);
      return;
    }

    // Add tool: click to add performer
    if (activeTool !== 'add') return;
    const index = formation.performers.length;
    const performer = formationService.addPerformer(formation.id, { name: `Performer ${index + 1}`, label: `P${index + 1}`, color: defaultColors[index % defaultColors.length] }, { x, y });
    if (performer) {
      const uf = formationService.getFormation(formation.id);
      if (uf) { setFormation({ ...uf, keyframes: uf.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })) }); const kf = uf.keyframes.find((k) => k.id === selectedKeyframeId); if (kf) setCurrentPositions(new Map(kf.positions)); }
    }
  }, [activeTool, formation, selectedKeyframeId, isShapeTool, shapeToolStart, isCollaborativeEnabled, collab]);

  // Escape key cancels shape tool in progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shapeToolStart) {
        setShapeToolStart(null);
        setShapeToolCurrent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shapeToolStart]);

  const handleSave = useCallback(async () => {
    if (!formation) return;
    setSaveStatus('saving');
    try {
      const keyframesData = formation.keyframes.map(kf => ({ id: kf.id, timestamp: kf.timestamp, transition: kf.transition, duration: kf.duration, positions: kf.id === selectedKeyframeId ? Object.fromEntries(currentPositions) : Object.fromEntries(kf.positions) }));
      let actualFormationId = formationId;
      if (formationId) { await apiSave({ name: formation.name, performers: formation.performers, keyframes: keyframesData }); }
      else { const created = await formationsApi.createFormation(projectId, { name: formation.name, description: formation.description, stageWidth: formation.stageWidth, stageHeight: formation.stageHeight, gridSize: formation.gridSize }); actualFormationId = created.id; await formationsApi.saveFormation(created.id, { name: formation.name, performers: formation.performers, keyframes: keyframesData }); }
      setSaveStatus('saved'); setHasUnsavedChanges(false); setTimeout(() => setSaveStatus('idle'), 2000);
      if (onSave) onSave({ ...formation, id: actualFormationId || formation.id });
    } catch (error) { console.error('Error saving formation:', error); setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
  }, [formation, formationId, projectId, selectedKeyframeId, currentPositions, apiSave, onSave]);

  const handleExport = useCallback(async (options: FormationExportOptions) => {
    if (!formation) return;
    const blob = await formationService.exportFormation(formation.id, options);
    if (blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${formation.name}.${options.format}`; a.click(); URL.revokeObjectURL(url); }
  }, [formation]);

  // Cmd/Ctrl+S save, Space play/pause, ? shortcut help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';

      // Cmd/Ctrl+S — save (always active, even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (isInput) return;

      // Space — toggle play/pause
      if (e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (playbackState.isPlaying) handlePause();
        else handlePlay();
      }

      // ? — show keyboard shortcuts reference
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsDialog(prev => !prev);
      }

      // +/= — zoom in, -/_ — zoom out
      if ((e.key === '=' || e.key === '+') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.min(3, z + 0.25));
      }
      if (e.key === '-' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, z - 0.25));
      }

      // Cmd/Ctrl+Z — undo, Cmd/Ctrl+Shift+Z — redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      // Arrow keys — nudge selected performers by 1 unit (or 5 with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedPerformerIds.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const delta = { x: 0, y: 0 };
        if (e.key === 'ArrowUp') delta.y = -step;
        if (e.key === 'ArrowDown') delta.y = step;
        if (e.key === 'ArrowLeft') delta.x = -step;
        if (e.key === 'ArrowRight') delta.x = step;

        setCurrentPositions(prev => {
          const next = new Map(prev);
          selectedPerformerIds.forEach(id => {
            const pos = next.get(id);
            if (pos) {
              next.set(id, {
                ...pos,
                x: Math.max(0, Math.min(100, pos.x + delta.x)),
                y: Math.max(0, Math.min(100, pos.y + delta.y)),
              });
            }
          });
          return next;
        });
        setHasUnsavedChanges(true);
      }

      // Tab — cycle selection through performers
      if (e.key === 'Tab' && formation) {
        e.preventDefault();
        const ids = formation.performers.map(p => p.id);
        if (ids.length === 0) return;
        const currentId = selectedPerformerIds.size === 1 ? Array.from(selectedPerformerIds)[0] : null;
        const currentIdx = currentId ? ids.indexOf(currentId) : -1;
        const nextIdx = e.shiftKey
          ? (currentIdx <= 0 ? ids.length - 1 : currentIdx - 1)
          : (currentIdx + 1) % ids.length;
        setSelectedPerformerIds(new Set([ids[nextIdx]]));
      }

      // Delete/Backspace — remove selected performers
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPerformerIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, playbackState.isPlaying, handlePause, handlePlay, handleUndo, handleRedo, selectedPerformerIds, formation, setCurrentPositions, setHasUnsavedChanges, setSelectedPerformerIds, handleDeleteSelected]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));

  const handleAudioUpload = useCallback(async (audioTrack: AudioTrack) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.setAudioTrack(audioTrack); else setFormation({ ...formation, audioTrack });
    if (audioTrack.duration > playbackState.duration) setPlaybackState(prev => ({ ...prev, duration: audioTrack.duration }));
    setShowAudioPanel(false);
  }, [formation, playbackState.duration, isCollaborativeEnabled, collab]);

  const handleAudioRemove = useCallback(async () => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.setAudioTrack(null); else setFormation({ ...formation, audioTrack: undefined });
    setShowAudioPanel(false);
  }, [formation, isCollaborativeEnabled, collab]);

  const handleApplyTemplate = useCallback((options: Omit<ApplyTemplateOptions, 'formationId'>) => {
    if (!formation) return;
    const result = formationService.applyTemplate({ ...options, formationId: formation.id, insertAt: playbackState.currentTime || 'end' });
    if (result.success) {
      const uf = formationService.getFormation(formation.id);
      if (uf) { setFormation({ ...uf, performers: [...uf.performers], keyframes: uf.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })) }); if (result.keyframesCreated > 0 && uf.keyframes.length > 0) { const nk = uf.keyframes[uf.keyframes.length - 1]; setSelectedKeyframeId(nk.id); setCurrentPositions(new Map(nk.positions)); } }
    } else { console.error('Failed to apply template:', result.error); }
    setShowTemplatePicker(false);
    pushHistory('Apply template');
  }, [formation, playbackState.currentTime, pushHistory]);

  const performerPaths = React.useMemo(() => { if (!formation || !showPaths) return new Map(); return formationService.getAllPerformerPaths(formation.id, 15); }, [formation, showPaths]);

  const handleNameChange = useCallback((newName: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.updateMeta({ name: newName });
    setFormation({ ...formation, name: newName });
  }, [formation, isCollaborativeEnabled, collab]);

  // Loading/error states
  if (apiLoading || (formationId && !formation)) {
    return <div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-blue-500" aria-hidden="true" /><span className="text-sm text-gray-500">{t('formation.loading', 'Loading formation...')}</span></div></div>;
  }
  if (apiError) {
    return <div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-2 text-red-500"><span className="text-lg font-medium">{t('formation.errorLoading', 'Failed to load formation')}</span><span className="text-sm">{apiError}</span></div></div>;
  }
  if (!formation) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900" role="application" aria-label={`Formation editor${formation ? `: ${formation.name}` : ''}`} aria-roledescription="formation editor">
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
          <div
            ref={canvasRef}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mx-auto"
            style={{
              width: `${formation.stageWidth * 20 * zoom}px`,
              height: `${formation.stageHeight * 20 * zoom}px`,
              cursor: activeTool === 'add' || isShapeTool ? 'crosshair' : activeTool === 'pan' || fingerMode === 'pan' ? 'grab' : 'default',
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
              touchAction: 'none',
            }}
            onClick={handleCanvasClick}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={(e) => { handleCanvasMouseMove(e as unknown as React.MouseEvent); handleCanvasPointerMoveMarquee(e); }}
            onPointerUp={handleCanvasPointerUp}
            onMouseLeave={handleCanvasMouseLeave}
          >
            {showGrid && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs><pattern id="grid" width={formation.gridSize * 20 * zoom} height={formation.gridSize * 20 * zoom} patternUnits="userSpaceOnUse"><path d={`M ${formation.gridSize * 20 * zoom} 0 L 0 0 0 ${formation.gridSize * 20 * zoom}`} fill="none" stroke="#e5e7eb" strokeWidth="1" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}
            <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 pointer-events-none" style={{ zIndex: 1 }} />
            {showFieldOverlay && (
              <FieldOverlay
                canvasWidth={formation.stageWidth * 20 * zoom}
                canvasHeight={formation.stageHeight * 20 * zoom}
              />
            )}
            {showPaths && !playbackState.isPlaying && <PathOverlay performers={formation.performers} paths={performerPaths} currentTime={playbackState.currentTime} canvasWidth={formation.stageWidth * 20 * zoom} canvasHeight={formation.stageHeight * 20 * zoom} showPaths={showPaths} selectedPerformerIds={selectedPerformerIds} />}
            {playbackState.isPlaying && ghostTrail.length > 1 && <TransitionGhostTrail performers={formation.performers} trail={ghostTrail} maxGhosts={5} canvasWidth={formation.stageWidth * 20 * zoom} canvasHeight={formation.stageHeight * 20 * zoom} />}
            {isShapeTool && shapeToolStart && shapeToolCurrent && (
              <ShapeToolOverlay
                tool={activeTool as 'line' | 'arc' | 'block'}
                start={shapeToolStart}
                current={shapeToolCurrent}
                performerCount={formation.performers.length}
                canvasWidth={formation.stageWidth * 20 * zoom}
                canvasHeight={formation.stageHeight * 20 * zoom}
              />
            )}
            {isCollaborativeEnabled && collab.collaborators.length > 0 && <SelectionRingsOverlay collaborators={collab.collaborators} performerPositions={currentPositions} canvasWidth={formation.stageWidth * 20 * zoom} canvasHeight={formation.stageHeight * 20 * zoom} />}
            {/* Rubber-band marquee selection rectangle */}
            {marquee && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
                style={{
                  left: `${Math.min(marquee.startX, marquee.currentX)}%`,
                  top: `${Math.min(marquee.startY, marquee.currentY)}%`,
                  width: `${Math.abs(marquee.currentX - marquee.startX)}%`,
                  height: `${Math.abs(marquee.currentY - marquee.startY)}%`,
                  zIndex: 40,
                }}
              />
            )}
            {formation.performers.map((performer) => {
              const position = currentPositions.get(performer.id);
              if (!position) return null;
              const { dragging: isBeingDragged, by: draggedBy } = isCollaborativeEnabled ? collab.isPerformerBeingDragged(performer.id) : { dragging: false, by: undefined };
              return <PerformerMarker key={performer.id} performer={performer} position={position} isSelected={selectedPerformerIds.has(performer.id)} isLocked={playbackState.isPlaying || isBeingDragged} showLabel={showLabels} showRotation={showRotation && selectedPerformerIds.has(performer.id)} scale={zoom} isAnimating={playbackState.isPlaying} onSelect={handleSelectPerformer} onMove={handleMovePerformer} onRotate={handleRotatePerformer} onDragStart={() => handleDragStart(performer.id)} onDragEnd={handleDragEnd} lockedByUser={draggedBy?.user.name} />;
            })}
            {isCollaborativeEnabled && collab.collaborators.length > 0 && <FormationCursorOverlay collaborators={collab.collaborators} canvasWidth={formation.stageWidth * 20 * zoom} canvasHeight={formation.stageHeight * 20 * zoom} performerPositions={currentPositions} zoom={zoom} />}
          </div>
        </div>
        {showPerformerPanel && <PerformerPanel formation={formation} selectedPerformerIds={selectedPerformerIds} onSelectPerformer={handleSelectPerformer} onAddPerformer={handleAddPerformer} onRemovePerformer={handleRemovePerformer} />}
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

      <Timeline keyframes={formation.keyframes} duration={playbackState.duration} currentTime={playbackState.currentTime} playbackState={playbackState} selectedKeyframeId={selectedKeyframeId} audioTrack={formation.audioTrack} drillSettings={drillSettings} timeDisplayMode={timeDisplayMode} onDrillSettingsChange={setDrillSettings} onPlay={handlePlay} onPause={handlePause} onStop={handleStop} onSeek={handleSeek} onSpeedChange={handleSpeedChange} onToggleLoop={handleToggleLoop} onKeyframeSelect={handleKeyframeSelect} onKeyframeAdd={handleKeyframeAdd} onKeyframeRemove={handleKeyframeRemove} onKeyframeMove={handleKeyframeMove} />
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

/** Keyboard shortcuts reference overlay */
function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '\u2318' : 'Ctrl';

  const groups = [
    {
      title: 'General',
      shortcuts: [
        { keys: `${mod}+S`, desc: 'Save formation' },
        { keys: 'Space', desc: 'Play / Pause' },
        { keys: '?', desc: 'Toggle this dialog' },
      ],
    },
    {
      title: 'Editing',
      shortcuts: [
        { keys: `${mod}+Z`, desc: 'Undo' },
        { keys: `${mod}+Shift+Z`, desc: 'Redo' },
        { keys: `${mod}+A`, desc: 'Select all' },
        { keys: `${mod}+C`, desc: 'Copy selected' },
        { keys: `${mod}+V`, desc: 'Paste' },
        { keys: `${mod}+D`, desc: 'Duplicate selected' },
        { keys: 'Delete', desc: 'Delete selected' },
        { keys: 'Escape', desc: 'Deselect all' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: '\u2191 \u2193 \u2190 \u2192', desc: 'Nudge performer (1 unit)' },
        { keys: 'Shift+Arrow', desc: 'Nudge performer (5 units)' },
        { keys: '+ / -', desc: 'Zoom in / out' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div key={s.desc} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">?</kbd> to toggle</p>
      </div>
    </div>
  );
}

export default FormationCanvas;
