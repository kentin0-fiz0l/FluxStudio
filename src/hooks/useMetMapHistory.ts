/**
 * useMetMapHistory - Undo/Redo for MetMap section editing.
 *
 * Uses a snapshot-based approach (deep-clone past/future arrays)
 * matching the pattern in timelineSlice. Caps at 50 entries.
 */

import { useState, useCallback, useRef } from 'react';
import type { Section } from '../contexts/metmap/types';

const MAX_HISTORY = 50;

export interface MetMapHistoryControls {
  /** Save a snapshot before making a change. */
  saveSnapshot: (sections: Section[]) => void;
  /** Undo the last change. Returns restored sections, or null if nothing to undo. */
  undo: (currentSections: Section[]) => Section[] | null;
  /** Redo a previously undone change. Returns restored sections, or null if nothing to redo. */
  redo: (currentSections: Section[]) => Section[] | null;
  canUndo: boolean;
  canRedo: boolean;
}

function cloneSections(sections: Section[]): Section[] {
  return JSON.parse(JSON.stringify(sections));
}

export function useMetMapHistory(): MetMapHistoryControls {
  const pastRef = useRef<Section[][]>([]);
  const futureRef = useRef<Section[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveSnapshot = useCallback((sections: Section[]) => {
    pastRef.current.push(cloneSections(sections));
    // Cap history
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift();
    }
    // New action clears redo
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback((currentSections: Section[]): Section[] | null => {
    if (pastRef.current.length === 0) return null;
    const previous = pastRef.current.pop()!;
    futureRef.current.unshift(cloneSections(currentSections));
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    return previous;
  }, []);

  const redo = useCallback((currentSections: Section[]): Section[] | null => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current.shift()!;
    pastRef.current.push(cloneSections(currentSections));
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    return next;
  }, []);

  return { saveSnapshot, undo, redo, canUndo, canRedo };
}
