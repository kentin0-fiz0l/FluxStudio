/**
 * useCanvasKeyboardHandlers - Keyboard shortcuts and touch gestures for FormationCanvas
 */

import { useCallback, useEffect, useState } from 'react';
import { useTouchGestures } from '../../../hooks/useTouchGestures';
import { useKeybindingStore, bindingMatchesEvent } from '../../../hooks/useKeybindingStore';
import type { Formation, Position, PlaybackState } from '../../../services/formationService';

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  performer: { id: string; name: string } | null;
  close: () => void;
}

interface UseCanvasKeyboardHandlersProps {
  // State
  formation: Formation | null;
  playbackState: PlaybackState;
  selectedPerformerIds: Set<string>;
  currentPositions: Map<string, Position>;
  canvasRef: React.RefObject<HTMLDivElement>;
  // Setters
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setCanvasPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setSelectedPerformerIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowShortcutsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  // Drill panel toggles
  setShowAnalysisPanel?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMovementTools?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCoordinatePanel?: React.Dispatch<React.SetStateAction<boolean>>;
  // Transform mode
  setTransformMode?: React.Dispatch<React.SetStateAction<'none' | 'rotate' | 'scale' | 'mirror'>>;
  // Handlers from useCanvasHandlers
  handleUndo: () => void;
  handleRedo: () => void;
  handleDeleteSelected: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleDuplicateSelected: () => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleNudge: (dx: number, dy: number) => void;
  handleSave: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  // Drill navigation
  handleKeyframeSelect?: (id: string) => void;
}

export function useCanvasKeyboardHandlers({
  formation,
  playbackState,
  selectedPerformerIds,
  currentPositions,
  canvasRef,
  setZoom,
  setCanvasPan,
  setSelectedPerformerIds,
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
  setShowAnalysisPanel,
  setShowMovementTools,
  setShowCoordinatePanel,
  setTransformMode,
  handleKeyframeSelect,
}: UseCanvasKeyboardHandlersProps): { contextMenu: ContextMenuState; handleWheel: (e: React.WheelEvent) => void } {
  // Context menu state for long-press
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    performer: { id: string; name: string } | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, performer: null });

  const closeContextMenu = useCallback(() => {
    setContextMenuState(prev => ({ ...prev, isOpen: false, performer: null }));
  }, []);

  // Touch gesture handling
  const handleTouchZoom = useCallback((delta: number, _cx: number, _cy: number) => {
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, [setZoom]);

  const handleTouchPan = useCallback((dx: number, dy: number) => {
    setCanvasPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [setCanvasPan]);

  const handleLongPress = useCallback((x: number, y: number) => {
    if (!formation) return;
    const performer = formation.performers.find(p => {
      const pos = currentPositions.get(p.id);
      if (!pos) return false;
      return Math.abs(pos.x - x) < 5 && Math.abs(pos.y - y) < 5;
    });
    if (performer) {
      setSelectedPerformerIds(new Set([performer.id]));
      // Convert percentage coords to viewport px for menu positioning
      const el = canvasRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setContextMenuState({
          isOpen: true,
          position: { x: rect.left + (x / 100) * rect.width, y: rect.top + (y / 100) * rect.height },
          performer: { id: performer.id, name: performer.name },
        });
      }
    }
  }, [formation, currentPositions, setSelectedPerformerIds, canvasRef]);

  // Double-tap to toggle zoom between 1x and 2x
  const handleDoubleTap = useCallback((_x: number, _y: number) => {
    setZoom(z => z >= 1.5 ? 1 : 2);
  }, [setZoom]);

  // Wheel zoom handler for desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + wheel = zoom
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    } else {
      // Plain wheel = pan
      setCanvasPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [setZoom, setCanvasPan]);

  useTouchGestures({
    targetRef: canvasRef,
    onZoom: handleTouchZoom,
    onPan: handleTouchPan,
    onLongPress: handleLongPress,
    onDoubleTap: handleDoubleTap,
    enabled: true,
  });

  // Keybinding store for customizable shortcuts
  const { getBinding } = useKeybindingStore();

  // Global keyboard handler — uses keybinding store for customizable shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';

      // Save always works (even in inputs)
      if (bindingMatchesEvent(getBinding('save'), e)) {
        e.preventDefault();
        handleSave();
        return;
      }

      if (isInput) return;

      // Play / Pause
      if (bindingMatchesEvent(getBinding('playPause'), e)) {
        e.preventDefault();
        if (playbackState.isPlaying) handlePause();
        else handlePlay();
      }

      // Toggle shortcuts dialog
      if (bindingMatchesEvent(getBinding('shortcuts'), e) || (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setShowShortcutsDialog(prev => !prev);
      }

      // Zoom
      if (bindingMatchesEvent(getBinding('zoomIn'), e)) {
        e.preventDefault();
        setZoom(z => Math.min(3, z + 0.25));
      }
      if (bindingMatchesEvent(getBinding('zoomOut'), e)) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, z - 0.25));
      }

      // Undo / Redo
      if (bindingMatchesEvent(getBinding('undo'), e)) {
        e.preventDefault();
        handleUndo();
      }
      if (bindingMatchesEvent(getBinding('redo'), e)) {
        e.preventDefault();
        handleRedo();
      }

      // Copy / Paste / Duplicate / Select All
      if (bindingMatchesEvent(getBinding('copy'), e)) {
        e.preventDefault();
        handleCopy();
      }
      if (bindingMatchesEvent(getBinding('paste'), e)) {
        e.preventDefault();
        handlePaste();
      }
      if (bindingMatchesEvent(getBinding('duplicate'), e)) {
        e.preventDefault();
        handleDuplicateSelected();
      }
      if (bindingMatchesEvent(getBinding('selectAll'), e)) {
        e.preventDefault();
        handleSelectAll();
      }

      // Page Up/Down: navigate between sets/keyframes
      if ((e.key === 'PageUp' || e.key === 'PageDown') && formation && handleKeyframeSelect) {
        e.preventDefault();
        const kfs = formation.keyframes;
        if (kfs.length > 1) {
          let curIdx = 0;
          if (currentPositions.size > 0) {
            const firstId = Array.from(currentPositions.keys())[0];
            const curPos = currentPositions.get(firstId);
            if (curPos) {
              for (let i = 0; i < kfs.length; i++) {
                const kfPos = kfs[i].positions.get(firstId);
                if (kfPos && Math.abs(kfPos.x - curPos.x) < 0.01 && Math.abs(kfPos.y - curPos.y) < 0.01) {
                  curIdx = i;
                  break;
                }
              }
            }
          }
          const targetIdx = e.key === 'PageDown'
            ? Math.min(curIdx + 1, kfs.length - 1)
            : Math.max(curIdx - 1, 0);
          handleKeyframeSelect(kfs[targetIdx].id);
        }
      }

      // Arrow keys: Ctrl+Arrow = move performer, Alt+Arrow = spatial navigation, plain Arrow = nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Ctrl+Arrow: move selected performer(s) position (accessibility)
        if ((e.ctrlKey || e.metaKey) && selectedPerformerIds.size > 0 && !e.altKey) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          if (e.key === 'ArrowUp') handleNudge(0, -step);
          else if (e.key === 'ArrowDown') handleNudge(0, step);
          else if (e.key === 'ArrowLeft') handleNudge(-step, 0);
          else if (e.key === 'ArrowRight') handleNudge(step, 0);
        }
        // Alt+Arrow: navigate to nearest performer in that direction (accessibility)
        else if (e.altKey && formation && selectedPerformerIds.size === 1) {
          e.preventDefault();
          const currentId = Array.from(selectedPerformerIds)[0];
          const currentPos = currentPositions.get(currentId);
          if (currentPos) {
            let bestId: string | null = null;
            let bestDist = Infinity;
            for (const p of formation.performers) {
              if (p.id === currentId) continue;
              const pos = currentPositions.get(p.id);
              if (!pos) continue;
              const dx = pos.x - currentPos.x;
              const dy = pos.y - currentPos.y;
              // Check direction
              const isCorrectDirection =
                (e.key === 'ArrowRight' && dx > 0) ||
                (e.key === 'ArrowLeft' && dx < 0) ||
                (e.key === 'ArrowDown' && dy > 0) ||
                (e.key === 'ArrowUp' && dy < 0);
              if (!isCorrectDirection) continue;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < bestDist) {
                bestDist = dist;
                bestId = p.id;
              }
            }
            if (bestId) {
              setSelectedPerformerIds(new Set([bestId]));
            }
          }
        }
        // Plain Arrow (no modifiers except Shift): nudge selected performers
        else if (selectedPerformerIds.size > 0 && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          if (e.key === 'ArrowUp') handleNudge(0, -step);
          else if (e.key === 'ArrowDown') handleNudge(0, step);
          else if (e.key === 'ArrowLeft') handleNudge(-step, 0);
          else if (e.key === 'ArrowRight') handleNudge(step, 0);
        }
      }

      // Drill: Next/Previous set
      if (formation && handleKeyframeSelect) {
        const nextBinding = getBinding('nextSet');
        const prevBinding = getBinding('prevSet');
        if (bindingMatchesEvent(nextBinding, e) || bindingMatchesEvent(prevBinding, e)) {
          e.preventDefault();
          const kfs = formation.keyframes;
          if (kfs.length > 1) {
            let curIdx = 0;
            if (currentPositions.size > 0) {
              const firstId = Array.from(currentPositions.keys())[0];
              const curPos = currentPositions.get(firstId);
              if (curPos) {
                for (let i = 0; i < kfs.length; i++) {
                  const kfPos = kfs[i].positions.get(firstId);
                  if (kfPos && Math.abs(kfPos.x - curPos.x) < 0.01 && Math.abs(kfPos.y - curPos.y) < 0.01) {
                    curIdx = i;
                    break;
                  }
                }
              }
            }
            const targetIdx = bindingMatchesEvent(nextBinding, e)
              ? Math.min(curIdx + 1, kfs.length - 1)
              : Math.max(curIdx - 1, 0);
            handleKeyframeSelect(kfs[targetIdx].id);
          }
        }
      }

      // Movement tools
      if (setShowMovementTools && bindingMatchesEvent(getBinding('movementTools'), e)) {
        e.preventDefault();
        setShowMovementTools(prev => !prev);
      }

      // Analysis panel
      if (setShowAnalysisPanel && bindingMatchesEvent(getBinding('drillAnalysis'), e)) {
        e.preventDefault();
        setShowAnalysisPanel(prev => !prev);
      }

      // Coordinate info panel
      if (setShowCoordinatePanel && bindingMatchesEvent(getBinding('coordinateInfo'), e)) {
        e.preventDefault();
        setShowCoordinatePanel(prev => !prev);
      }

      // Transform mode shortcuts (R=rotate, S=scale, M=mirror) — requires selection
      if (setTransformMode && selectedPerformerIds.size > 1 && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setTransformMode(prev => prev === 'rotate' ? 'none' : 'rotate');
        }
        if (e.key === 's' && !e.shiftKey) {
          e.preventDefault();
          setTransformMode(prev => prev === 'scale' ? 'none' : 'scale');
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setTransformMode(prev => prev === 'mirror' ? 'none' : 'mirror');
        }
      }

      // Escape cancels transform mode
      if (e.key === 'Escape' && setTransformMode) {
        setTransformMode('none');
      }

      // Number keys 1-9 to jump to specific set (not customizable)
      if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && formation && handleKeyframeSelect) {
        const setNum = parseInt(e.key, 10) - 1;
        if (setNum < formation.keyframes.length) {
          e.preventDefault();
          handleKeyframeSelect(formation.keyframes[setNum].id);
        }
      }

      // Cycle through performers
      if (bindingMatchesEvent(getBinding('cyclePerformer'), e) && formation) {
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

      // Delete selected
      if (bindingMatchesEvent(getBinding('delete'), e) && selectedPerformerIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }

      // Deselect
      if (bindingMatchesEvent(getBinding('deselect'), e)) {
        e.preventDefault();
        handleDeselectAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [getBinding, handleSave, playbackState.isPlaying, handlePause, handlePlay, handleUndo, handleRedo, handleCopy, handlePaste, handleDuplicateSelected, handleSelectAll, handleNudge, selectedPerformerIds, formation, currentPositions, setSelectedPerformerIds, handleDeleteSelected, handleDeselectAll, setShowShortcutsDialog, setZoom, setShowAnalysisPanel, setShowMovementTools, setShowCoordinatePanel, setTransformMode, handleKeyframeSelect]);

  return {
    contextMenu: { ...contextMenuState, close: closeContextMenu },
    handleWheel,
  };
}
