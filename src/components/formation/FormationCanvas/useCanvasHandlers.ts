/**
 * useCanvasHandlers - All event handlers for FormationCanvas
 *
 * Includes drag handlers, performer CRUD, keyframe management,
 * playback, save/export, alignment/distribution, shape tools, and canvas interactions.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  formationService,
  type Formation,
  type Position,
  type AudioTrack,
  type FormationExportOptions,
} from '../../../services/formationService';
import { toast } from '../../../lib/toast';
import * as formationsApi from '../../../services/formationsApi';
import {
  snapToGrid, snapToCount,
  alignPositions, distributePositions,
  generateLinePositions, generateArcPositions, generateBlockPositions,
} from '../../../utils/drillGeometry';
import type { AlignmentType, DistributionType } from '../../../utils/drillGeometry';
import type { ApplyTemplateOptions } from '../../../services/formationTemplates/types';
import { defaultColors } from './types';
import type { useCanvasState } from './useCanvasState';

type CanvasStateReturn = ReturnType<typeof useCanvasState>;

interface UseCanvasHandlersProps {
  state: CanvasStateReturn;
  formationId?: string;
  projectId: string;
  onSave?: (formation: Formation) => void;
  sandboxMode: boolean;
}

export function useCanvasHandlers({ state, formationId, projectId, onSave, sandboxMode }: UseCanvasHandlersProps) {
  const {
    formation, setFormation,
    selectedPerformerIds, setSelectedPerformerIds,
    selectedKeyframeId, setSelectedKeyframeId,
    currentPositions, setCurrentPositions,
    setSaveStatus, setHasUnsavedChanges,
    activeTool,
    snapEnabled,
    timeDisplayMode, drillSettings,
    playbackState, setPlaybackState,
    setGhostTrail,
    isCollaborativeEnabled, collab,
    apiSave,
    history,
    canvasRef,
    clipboardRef,
    setDraggingPerformerId,
    shapeToolStart, setShapeToolStart,
    setShapeToolCurrent,
    marquee, setMarquee, marqueeRef,
    fingerMode,
    showPaths,
    hasUnsavedChanges,
    setShowAudioPanel, setShowTemplatePicker,
  } = state;

  // ---- History ----

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

  const pushHistory = useCallback((label: string) => {
    if (!formation) return;
    history.pushState({
      positions: new Map(currentPositions),
      performerIds: formation.performers.map(p => p.id),
      label,
    });
    setHasUnsavedChanges(true);
  }, [formation, currentPositions, history, setHasUnsavedChanges]);

  const handleUndo = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) { collab.yUndo(); return; }
    const snapshot = history.undo();
    if (snapshot && formation) {
      setCurrentPositions(new Map(snapshot.positions));
      snapshot.positions.forEach((pos, id) => {
        formationService.updatePosition(formation.id, selectedKeyframeId, id, pos);
      });
      setHasUnsavedChanges(true);
    }
  }, [history, formation, selectedKeyframeId, isCollaborativeEnabled, collab, setCurrentPositions, setHasUnsavedChanges]);

  const handleRedo = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) { collab.yRedo(); return; }
    const snapshot = history.redo();
    if (snapshot && formation) {
      setCurrentPositions(new Map(snapshot.positions));
      snapshot.positions.forEach((pos, id) => {
        formationService.updatePosition(formation.id, selectedKeyframeId, id, pos);
      });
      setHasUnsavedChanges(true);
    }
  }, [history, formation, selectedKeyframeId, isCollaborativeEnabled, collab, setCurrentPositions, setHasUnsavedChanges]);

  // ---- Auto-save (debounced 3s) ----

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [formation, formationId, projectId, selectedKeyframeId, currentPositions, apiSave, onSave, setSaveStatus, setHasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || sandboxMode || !formationId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { handleSave(); }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, sandboxMode, formationId]);

  // ---- Performer editing ----

  const handleDeleteSelected = useCallback(() => {
    if (!formation || selectedPerformerIds.size === 0) return;
    const ids = Array.from(selectedPerformerIds);
    ids.forEach(id => {
      if (isCollaborativeEnabled && collab.isConnected) collab.removePerformer(id);
      else formationService.removePerformer(formation.id, id);
    });
    setFormation(prev => prev ? { ...prev, performers: prev.performers.filter(p => !selectedPerformerIds.has(p.id)) } : prev);
    setCurrentPositions(prev => { const next = new Map(prev); ids.forEach(id => next.delete(id)); return next; });
    setSelectedPerformerIds(new Set());
    pushHistory('Delete performers');
  }, [formation, selectedPerformerIds, isCollaborativeEnabled, collab, pushHistory, setFormation, setCurrentPositions, setSelectedPerformerIds]);

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
    setFormation(prev => prev ? { ...prev, performers: [...prev.performers, ...newPerformers], keyframes: prev.keyframes.map(kf => ({ ...kf, positions: kf.id === selectedKeyframeId ? newPositions : kf.positions })) } : prev);
    setCurrentPositions(newPositions);
    pushHistory('Duplicate performers');
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, pushHistory, setFormation, setCurrentPositions]);

  const handleCopy = useCallback(() => {
    if (!formation || selectedPerformerIds.size === 0) return;
    const copiedPerformers = formation.performers.filter(p => selectedPerformerIds.has(p.id));
    const copiedPositions = new Map<string, Position>();
    selectedPerformerIds.forEach(id => { const pos = currentPositions.get(id); if (pos) copiedPositions.set(id, { ...pos }); });
    clipboardRef.current = { performers: copiedPerformers, positions: copiedPositions };
  }, [formation, selectedPerformerIds, currentPositions, clipboardRef]);

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
    setFormation(prev => prev ? { ...prev, performers: [...prev.performers, ...newPerformers], keyframes: prev.keyframes.map(kf => ({ ...kf, positions: kf.id === selectedKeyframeId ? newPositions : kf.positions })) } : prev);
    setCurrentPositions(newPositions);
    setSelectedPerformerIds(newIds);
    pushHistory('Paste performers');
  }, [formation, currentPositions, selectedKeyframeId, pushHistory, clipboardRef, setFormation, setCurrentPositions, setSelectedPerformerIds]);

  const handleSelectAll = useCallback(() => {
    if (!formation) return;
    setSelectedPerformerIds(new Set(formation.performers.map(p => p.id)));
  }, [formation, setSelectedPerformerIds]);

  const handleDeselectAll = useCallback(() => { setSelectedPerformerIds(new Set()); }, [setSelectedPerformerIds]);

  const handleNudge = useCallback((dx: number, dy: number) => {
    if (!formation || selectedPerformerIds.size === 0) return;
    setCurrentPositions(prev => {
      const next = new Map(prev);
      selectedPerformerIds.forEach(id => {
        const pos = prev.get(id);
        if (pos) {
          const newPos = { x: Math.max(0, Math.min(100, pos.x + dx)), y: Math.max(0, Math.min(100, pos.y + dy)), rotation: pos.rotation };
          next.set(id, newPos);
          formationService.updatePosition(formation.id, selectedKeyframeId, id, newPos);
        }
      });
      return next;
    });
    setHasUnsavedChanges(true);
  }, [formation, selectedPerformerIds, selectedKeyframeId, setCurrentPositions, setHasUnsavedChanges]);

  // ---- Drag handlers ----

  const handleDragStart = useCallback((performerId: string): boolean => {
    if (!isCollaborativeEnabled || !collab.isConnected) { setDraggingPerformerId(performerId); return true; }
    const { dragging, by } = collab.isPerformerBeingDragged(performerId);
    if (dragging && by) { toast.warning(`${by.user.name} is currently moving this performer`); return false; }
    collab.setDraggingPerformer(performerId); setDraggingPerformerId(performerId); return true;
  }, [isCollaborativeEnabled, collab, setDraggingPerformerId]);

  const handleDragEnd = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) collab.setDraggingPerformer(null);
    setDraggingPerformerId(null);
    pushHistory('Move performer');
  }, [isCollaborativeEnabled, collab, pushHistory, setDraggingPerformerId]);

  // ---- Performer actions ----

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
  }, [formation, selectedKeyframeId, isCollaborativeEnabled, collab, setFormation, setCurrentPositions]);

  const handleRemovePerformer = useCallback((performerId: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) { collab.removePerformer(performerId); }
    else { formationService.removePerformer(formation.id, performerId); setFormation({ ...formation, performers: formation.performers.filter((p) => p.id !== performerId) }); }
    setSelectedPerformerIds((prev) => { const next = new Set(prev); next.delete(performerId); return next; });
    setCurrentPositions((prev) => { const next = new Map(prev); next.delete(performerId); return next; });
  }, [formation, isCollaborativeEnabled, collab, setFormation, setSelectedPerformerIds, setCurrentPositions]);

  const handleSelectPerformer = useCallback((performerId: string, multiSelect: boolean) => {
    setSelectedPerformerIds((prev) => {
      const next = new Set(multiSelect ? prev : []);
      if (next.has(performerId)) next.delete(performerId); else next.add(performerId);
      if (isCollaborativeEnabled && collab.isConnected) collab.setSelectedPerformers(Array.from(next));
      return next;
    });
  }, [isCollaborativeEnabled, collab, setSelectedPerformerIds]);

  const handleMovePerformer = useCallback((performerId: string, position: Position) => {
    if (!formation || playbackState.isPlaying) return;
    const finalPosition = snapEnabled
      ? snapToGrid(position, formation.gridSize, formation.stageWidth, formation.stageHeight)
      : position;

    if (selectedPerformerIds.has(performerId) && selectedPerformerIds.size > 1) {
      const prevPos = currentPositions.get(performerId);
      if (prevPos) {
        const dx = finalPosition.x - prevPos.x;
        const dy = finalPosition.y - prevPos.y;
        const updates = new Map<string, Position>();
        for (const id of selectedPerformerIds) {
          const p = currentPositions.get(id);
          if (p) { updates.set(id, { x: Math.max(0, Math.min(100, p.x + dx)), y: Math.max(0, Math.min(100, p.y + dy)), rotation: p.rotation }); }
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
  }, [formation, selectedKeyframeId, playbackState.isPlaying, isCollaborativeEnabled, collab, snapEnabled, selectedPerformerIds, currentPositions, setCurrentPositions]);

  const handleRotatePerformer = useCallback((performerId: string, rotation: number) => {
    if (!formation || playbackState.isPlaying) return;
    const currentPos = currentPositions.get(performerId);
    if (currentPos) { const np = { ...currentPos, rotation }; formationService.updatePosition(formation.id, selectedKeyframeId, performerId, np); setCurrentPositions((prev) => new Map(prev).set(performerId, np)); }
  }, [formation, selectedKeyframeId, currentPositions, playbackState.isPlaying, setCurrentPositions]);

  // ---- Alignment / Distribution ----

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
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, isCollaborativeEnabled, collab, setCurrentPositions]);

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
  }, [formation, selectedPerformerIds, currentPositions, selectedKeyframeId, isCollaborativeEnabled, collab, setCurrentPositions]);

  // ---- Keyframe handlers ----

  const handleKeyframeSelect = useCallback((keyframeId: string) => {
    setSelectedKeyframeId(keyframeId);
    if (formation) { const kf = formation.keyframes.find((k) => k.id === keyframeId); if (kf) setCurrentPositions(new Map(kf.positions)); }
  }, [formation, setSelectedKeyframeId, setCurrentPositions]);

  const handleKeyframeAdd = useCallback((timestamp: number) => {
    if (!formation) return;
    const finalTimestamp = timeDisplayMode === 'counts'
      ? snapToCount(timestamp, { bpm: drillSettings.bpm, countsPerPhrase: drillSettings.countsPerPhrase, startOffset: drillSettings.startOffset })
      : timestamp;
    if (isCollaborativeEnabled && collab.isConnected) { const kf = collab.addKeyframe(finalTimestamp, new Map(currentPositions)); setSelectedKeyframeId(kf.id); return; }
    const kf = formationService.addKeyframe(formation.id, finalTimestamp, new Map(currentPositions));
    if (kf) { setFormation({ ...formation, keyframes: [...formation.keyframes, kf].sort((a, b) => a.timestamp - b.timestamp) }); setSelectedKeyframeId(kf.id); }
  }, [formation, currentPositions, isCollaborativeEnabled, collab, timeDisplayMode, drillSettings, setFormation, setSelectedKeyframeId]);

  const handleKeyframeRemove = useCallback((keyframeId: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.removeKeyframe(keyframeId);
    else { formationService.removeKeyframe(formation.id, keyframeId); setFormation({ ...formation, keyframes: formation.keyframes.filter((kf) => kf.id !== keyframeId) }); }
    if (selectedKeyframeId === keyframeId && formation.keyframes.length > 1) { const remaining = formation.keyframes.filter((kf) => kf.id !== keyframeId); setSelectedKeyframeId(remaining[0].id); }
  }, [formation, selectedKeyframeId, isCollaborativeEnabled, collab, setFormation, setSelectedKeyframeId]);

  const handleKeyframeMove = useCallback((keyframeId: string, timestamp: number) => {
    if (!formation) return;
    const kf = formation.keyframes.find((k) => k.id === keyframeId);
    if (kf) { kf.timestamp = timestamp; setFormation({ ...formation, keyframes: [...formation.keyframes].sort((a, b) => a.timestamp - b.timestamp) }); }
  }, [formation, setFormation]);

  // ---- Playback ----

  const handlePlay = useCallback(() => {
    if (!formation) return;
    setGhostTrail([]);
    formationService.play(formation.id, (time) => {
      setPlaybackState((prev) => ({ ...prev, currentTime: time, isPlaying: true }));
      const positions = formationService.getPositionsAtTime(formation.id, time);
      setCurrentPositions(positions);
      setGhostTrail((prev) => [...prev.slice(-5), { time, positions: new Map(positions) }]);
    });
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
  }, [formation, setGhostTrail, setPlaybackState, setCurrentPositions]);

  const handlePause = useCallback(() => { formationService.pause(); setPlaybackState((prev) => ({ ...prev, isPlaying: false })); }, [setPlaybackState]);
  const handleStop = useCallback(() => { formationService.stop(); setPlaybackState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 })); setGhostTrail([]); if (formation && formation.keyframes.length > 0) setCurrentPositions(new Map(formation.keyframes[0].positions)); }, [formation, setPlaybackState, setGhostTrail, setCurrentPositions]);
  const handleSeek = useCallback((time: number) => { formationService.seek(time); setPlaybackState((prev) => ({ ...prev, currentTime: time })); if (formation) setCurrentPositions(formationService.getPositionsAtTime(formation.id, time)); }, [formation, setPlaybackState, setCurrentPositions]);
  const handleSpeedChange = useCallback((speed: number) => { formationService.setSpeed(speed); setPlaybackState((prev) => ({ ...prev, speed })); }, [setPlaybackState]);
  const handleToggleLoop = useCallback(() => { const loop = formationService.toggleLoop(); setPlaybackState((prev) => ({ ...prev, loop })); }, [setPlaybackState]);

  // ---- Export ----

  const handleExport = useCallback(async (options: FormationExportOptions) => {
    if (!formation) return;
    const blob = await formationService.exportFormation(formation.id, options);
    if (blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${formation.name}.${options.format}`; a.click(); URL.revokeObjectURL(url); }
  }, [formation]);

  // ---- Audio ----

  const handleAudioUpload = useCallback(async (audioTrack: AudioTrack) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.setAudioTrack(audioTrack); else setFormation({ ...formation, audioTrack });
    if (audioTrack.duration > playbackState.duration) setPlaybackState(prev => ({ ...prev, duration: audioTrack.duration }));
    setShowAudioPanel(false);
  }, [formation, playbackState.duration, isCollaborativeEnabled, collab, setFormation, setPlaybackState, setShowAudioPanel]);

  const handleAudioRemove = useCallback(async () => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.setAudioTrack(null); else setFormation({ ...formation, audioTrack: undefined });
    setShowAudioPanel(false);
  }, [formation, isCollaborativeEnabled, collab, setFormation, setShowAudioPanel]);

  // ---- Template ----

  const handleApplyTemplate = useCallback((options: Omit<ApplyTemplateOptions, 'formationId'>) => {
    if (!formation) return;
    const result = formationService.applyTemplate({ ...options, formationId: formation.id, insertAt: playbackState.currentTime || 'end' });
    if (result.success) {
      const uf = formationService.getFormation(formation.id);
      if (uf) { setFormation({ ...uf, performers: [...uf.performers], keyframes: uf.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })) }); if (result.keyframesCreated > 0 && uf.keyframes.length > 0) { const nk = uf.keyframes[uf.keyframes.length - 1]; setSelectedKeyframeId(nk.id); setCurrentPositions(new Map(nk.positions)); } }
    } else { console.error('Failed to apply template:', result.error); }
    setShowTemplatePicker(false);
    pushHistory('Apply template');
  }, [formation, playbackState.currentTime, pushHistory, setFormation, setSelectedKeyframeId, setCurrentPositions, setShowTemplatePicker]);

  // ---- Name change ----

  const handleNameChange = useCallback((newName: string) => {
    if (!formation) return;
    if (isCollaborativeEnabled && collab.isConnected) collab.updateMeta({ name: newName });
    setFormation({ ...formation, name: newName });
  }, [formation, isCollaborativeEnabled, collab, setFormation]);

  // ---- Zoom ----

  const handleZoomIn = useCallback(() => state.setZoom((z) => Math.min(3, z + 0.25)), [state]);
  const handleZoomOut = useCallback(() => state.setZoom((z) => Math.max(0.5, z - 0.25)), [state]);

  // ---- Canvas mouse/pointer events ----

  const isShapeTool = activeTool === 'line' || activeTool === 'arc' || activeTool === 'block';

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (isShapeTool && shapeToolStart) { setShapeToolCurrent({ x, y }); }
    if (isCollaborativeEnabled && collab.isConnected) { collab.updateCursor(x, y); }
  }, [isCollaborativeEnabled, collab, isShapeTool, shapeToolStart, canvasRef, setShapeToolCurrent]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (isCollaborativeEnabled && collab.isConnected) collab.clearCursor();
    setShapeToolCurrent(null);
  }, [isCollaborativeEnabled, collab, setShapeToolCurrent]);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && fingerMode === 'pan') return;
    if (activeTool !== 'select' || !canvasRef.current) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-performer]')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    marqueeRef.current = true;
    setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
  }, [activeTool, fingerMode, canvasRef, marqueeRef, setMarquee]);

  const handleCanvasPointerMoveMarquee = useCallback((e: React.PointerEvent) => {
    if (!marqueeRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarquee(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, [canvasRef, marqueeRef, setMarquee]);

  const handleCanvasPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!marqueeRef.current || !marquee || !formation) {
      marqueeRef.current = false;
      setMarquee(null);
      return;
    }
    marqueeRef.current = false;
    const minX = Math.min(marquee.startX, marquee.currentX);
    const maxX = Math.max(marquee.startX, marquee.currentX);
    const minY = Math.min(marquee.startY, marquee.currentY);
    const maxY = Math.max(marquee.startY, marquee.currentY);
    if (maxX - minX < 2 && maxY - minY < 2) { setMarquee(null); return; }
    const selected = new Set<string>();
    formation.performers.forEach(p => {
      const pos = currentPositions.get(p.id);
      if (pos && pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) { selected.add(p.id); }
    });
    setSelectedPerformerIds(selected);
    if (isCollaborativeEnabled && collab.isConnected) { collab.setSelectedPerformers(Array.from(selected)); }
    setMarquee(null);
  }, [marquee, formation, currentPositions, isCollaborativeEnabled, collab, marqueeRef, setMarquee, setSelectedPerformerIds]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !formation) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (isShapeTool) {
      if (!shapeToolStart) { setShapeToolStart({ x, y }); setShapeToolCurrent({ x, y }); return; }
      const shapeTool = activeTool as 'line' | 'arc' | 'block';
      let positions: Position[] = [];
      const count = Math.max(1, formation.performers.length);
      if (shapeTool === 'line') { positions = generateLinePositions(shapeToolStart, { x, y }, count); }
      else if (shapeTool === 'arc') {
        const dx = x - shapeToolStart.x; const dy = y - shapeToolStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const endAngle = Math.atan2(dy, dx); const startAngle = endAngle - Math.PI;
        positions = generateArcPositions(shapeToolStart, radius, startAngle, endAngle, count);
      } else if (shapeTool === 'block') {
        const topLeft = { x: Math.min(shapeToolStart.x, x), y: Math.min(shapeToolStart.y, y) };
        const bottomRight = { x: Math.max(shapeToolStart.x, x), y: Math.max(shapeToolStart.y, y) };
        positions = generateBlockPositions(topLeft, bottomRight, count);
      }
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
      setShapeToolStart(null); setShapeToolCurrent(null);
      return;
    }

    if (activeTool !== 'add') return;
    const index = formation.performers.length;
    const performer = formationService.addPerformer(formation.id, { name: `Performer ${index + 1}`, label: `P${index + 1}`, color: defaultColors[index % defaultColors.length] }, { x, y });
    if (performer) {
      const uf = formationService.getFormation(formation.id);
      if (uf) { setFormation({ ...uf, keyframes: uf.keyframes.map(kf => ({ ...kf, positions: new Map(kf.positions) })) }); const kf = uf.keyframes.find((k) => k.id === selectedKeyframeId); if (kf) setCurrentPositions(new Map(kf.positions)); }
    }
  }, [activeTool, formation, selectedKeyframeId, isShapeTool, shapeToolStart, isCollaborativeEnabled, collab, canvasRef, setShapeToolStart, setShapeToolCurrent, setCurrentPositions, setFormation]);

  // Escape key cancels shape tool in progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shapeToolStart) { setShapeToolStart(null); setShapeToolCurrent(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shapeToolStart, setShapeToolStart, setShapeToolCurrent]);

  // ---- Performer paths (memoized) ----

  const performerPaths = useMemo(() => { if (!formation || !showPaths) return new Map(); return formationService.getAllPerformerPaths(formation.id, 15); }, [formation, showPaths]);

  return {
    // History
    pushHistory, handleUndo, handleRedo,
    // Save / Export
    handleSave, handleExport,
    // Performer editing
    handleDeleteSelected, handleDuplicateSelected, handleCopy, handlePaste,
    handleSelectAll, handleDeselectAll, handleNudge,
    // Drag
    handleDragStart, handleDragEnd,
    // Performer CRUD
    handleAddPerformer, handleRemovePerformer, handleSelectPerformer, handleMovePerformer, handleRotatePerformer,
    // Alignment
    handleAlign, handleDistribute,
    // Keyframes
    handleKeyframeSelect, handleKeyframeAdd, handleKeyframeRemove, handleKeyframeMove,
    // Playback
    handlePlay, handlePause, handleStop, handleSeek, handleSpeedChange, handleToggleLoop,
    // Audio
    handleAudioUpload, handleAudioRemove,
    // Template
    handleApplyTemplate,
    // Name
    handleNameChange,
    // Zoom
    handleZoomIn, handleZoomOut,
    // Canvas interactions
    isShapeTool,
    handleCanvasMouseMove, handleCanvasMouseLeave,
    handleCanvasPointerDown, handleCanvasPointerMoveMarquee, handleCanvasPointerUp,
    handleCanvasClick,
    // Paths
    performerPaths,
  };
}
