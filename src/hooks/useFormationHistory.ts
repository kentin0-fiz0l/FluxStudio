/**
 * useFormationHistory - Undo/redo history for formation editor state
 *
 * Tracks snapshots of performer positions. Each mutation (move, add, remove,
 * template apply) pushes a snapshot. Ctrl+Z / Ctrl+Y navigate the stack.
 */

import { useState, useCallback, useRef } from 'react';
import type { Position } from '../services/formationService';

export interface HistorySnapshot {
  positions: Map<string, Position>;
  performerIds: string[];
  label: string; // e.g. "Move performer", "Apply template"
}

interface UseFormationHistoryOptions {
  maxHistory?: number;
}

export interface UseFormationHistoryResult {
  /** Push a new state snapshot (call after every user-initiated change) */
  pushState: (snapshot: HistorySnapshot) => void;
  /** Undo — returns the previous snapshot, or null if at the beginning */
  undo: () => HistorySnapshot | null;
  /** Redo — returns the next snapshot, or null if at the end */
  redo: () => HistorySnapshot | null;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Current history index (for display) */
  historyIndex: number;
  /** Total history length */
  historyLength: number;
  /** Reset history (e.g. on formation load) */
  reset: (initialSnapshot?: HistorySnapshot) => void;
}

export function useFormationHistory({
  maxHistory = 100,
}: UseFormationHistoryOptions = {}): UseFormationHistoryResult {
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef<HistorySnapshot[]>([]);

  const pushState = useCallback((snapshot: HistorySnapshot) => {
    const history = historyRef.current;
    // Discard any redo entries beyond current index
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(snapshot);

    // Enforce max history
    if (trimmed.length > maxHistory) {
      trimmed.shift();
    }

    historyRef.current = trimmed;
    setHistoryIndex(trimmed.length - 1);
  }, [historyIndex, maxHistory]);

  const undo = useCallback((): HistorySnapshot | null => {
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return historyRef.current[newIndex] || null;
  }, [historyIndex]);

  const redo = useCallback((): HistorySnapshot | null => {
    if (historyIndex >= historyRef.current.length - 1) return null;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    return historyRef.current[newIndex] || null;
  }, [historyIndex]);

  const reset = useCallback((initialSnapshot?: HistorySnapshot) => {
    if (initialSnapshot) {
      historyRef.current = [initialSnapshot];
      setHistoryIndex(0);
    } else {
      historyRef.current = [];
      setHistoryIndex(0);
    }
  }, []);

  return {
    pushState,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyRef.current.length - 1,
    historyIndex,
    historyLength: historyRef.current.length,
    reset,
  };
}
