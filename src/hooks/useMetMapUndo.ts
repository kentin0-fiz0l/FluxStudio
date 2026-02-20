/**
 * useMetMapUndo — Y.UndoManager-based undo/redo for collaborative editing.
 *
 * Sprint 31: Replaces snapshot-based useMetMapHistory when collaboration is active.
 * Only undoes the current user's changes, not other collaborators'.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';

interface UseMetMapUndoOptions {
  /** Group rapid edits within this window (ms). Default: 500 */
  captureTimeout?: number;
}

interface UseMetMapUndoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useMetMapUndo(
  doc: Y.Doc | null,
  options: UseMetMapUndoOptions = {}
): UseMetMapUndoReturn {
  const { captureTimeout = 500 } = options;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  useEffect(() => {
    if (!doc) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const ySections = doc.getArray('sections');
    const um = new Y.UndoManager(ySections, {
      captureTimeout,
    });
    undoManagerRef.current = um;

    const updateState = () => {
      setCanUndo(um.undoStack.length > 0);
      setCanRedo(um.redoStack.length > 0);
    };

    um.on('stack-item-added', updateState);
    um.on('stack-item-popped', updateState);

    return () => {
      um.destroy();
      undoManagerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
    };
  }, [doc, captureTimeout]);

  const undo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  return { undo, redo, canUndo, canRedo };
}
