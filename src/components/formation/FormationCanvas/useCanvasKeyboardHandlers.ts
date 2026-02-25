/**
 * useCanvasKeyboardHandlers - Keyboard shortcuts and touch gestures for FormationCanvas
 */

import { useCallback, useEffect, useState } from 'react';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useTouchGestures } from '../../../hooks/useTouchGestures';
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
  setCurrentPositions: React.Dispatch<React.SetStateAction<Map<string, Position>>>;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsDialog: React.Dispatch<React.SetStateAction<boolean>>;
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
}: UseCanvasKeyboardHandlersProps): { contextMenu: ContextMenuState; handleWheel: (e: React.WheelEvent) => void } {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Context menu state for long-press
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    performer: { id: string; name: string } | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, performer: null });

  const closeContextMenu = useCallback(() => {
    setContextMenuState(prev => ({ ...prev, isOpen: false, performer: null }));
  }, []);

  // Hook-based keyboard shortcuts
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

  // Global keyboard handler (Cmd+S, Space play/pause, ? shortcuts, +/- zoom, Tab cycle, etc.)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (isInput) return;

      if (e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (playbackState.isPlaying) handlePause();
        else handlePlay();
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsDialog(prev => !prev);
      }

      if ((e.key === '=' || e.key === '+') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.min(3, z + 0.25));
      }
      if (e.key === '-' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(0.5, z - 0.25));
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

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
            if (pos) { next.set(id, { ...pos, x: Math.max(0, Math.min(100, pos.x + delta.x)), y: Math.max(0, Math.min(100, pos.y + delta.y)) }); }
          });
          return next;
        });
        setHasUnsavedChanges(true);
      }

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

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPerformerIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, playbackState.isPlaying, handlePause, handlePlay, handleUndo, handleRedo, selectedPerformerIds, formation, setCurrentPositions, setHasUnsavedChanges, setSelectedPerformerIds, handleDeleteSelected, setShowShortcutsDialog, setZoom]);

  return {
    contextMenu: { ...contextMenuState, close: closeContextMenu },
    handleWheel,
  };
}
