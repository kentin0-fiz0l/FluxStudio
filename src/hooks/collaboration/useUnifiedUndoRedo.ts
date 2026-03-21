/**
 * useUnifiedUndoRedo - React hook for unified undo/redo across MetMap + Drill Writer.
 *
 * Takes two Y.UndoManager instances (one for formation data, one for MetMap sections)
 * and provides a single Ctrl+Z / Ctrl+Shift+Z keyboard handler that undoes/redoes
 * the most recent action from either manager.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { UnifiedUndoManager } from '../../services/collaboration/unifiedUndoManager';

interface UseUnifiedUndoRedoOptions {
  /** Y.UndoManager for formation data (performers, keyframes, sets) */
  formationUndoManager: Y.UndoManager | null;
  /** Y.UndoManager for MetMap sections */
  metmapUndoManager: Y.UndoManager | null;
  /** Whether the hook is active (default: true) */
  enabled?: boolean;
}

interface UseUnifiedUndoRedoReturn {
  /** Undo the most recent action from either manager */
  undo: () => void;
  /** Redo the most recently undone action */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

export function useUnifiedUndoRedo({
  formationUndoManager,
  metmapUndoManager,
  enabled = true,
}: UseUnifiedUndoRedoOptions): UseUnifiedUndoRedoReturn {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const unifiedRef = useRef<UnifiedUndoManager | null>(null);

  // Create/destroy UnifiedUndoManager when managers change
  useEffect(() => {
    if (!enabled || !formationUndoManager || !metmapUndoManager) {
      unifiedRef.current?.destroy();
      unifiedRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const unified = new UnifiedUndoManager(formationUndoManager, metmapUndoManager);
    unifiedRef.current = unified;

    const updateState = () => {
      setCanUndo(unified.canUndo);
      setCanRedo(unified.canRedo);
    };

    const unsub = unified.on('stack-changed', updateState);

    return () => {
      unsub();
      unified.destroy();
      unifiedRef.current = null;
    };
  }, [formationUndoManager, metmapUndoManager, enabled]);

  const undo = useCallback(() => {
    unifiedRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    unifiedRef.current?.redo();
  }, []);

  // Register keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        unifiedRef.current?.undo();
      } else if (
        (e.key === 'z' && e.shiftKey) ||
        (e.key === 'y' && !e.shiftKey)
      ) {
        e.preventDefault();
        unifiedRef.current?.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  return { undo, redo, canUndo, canRedo };
}
