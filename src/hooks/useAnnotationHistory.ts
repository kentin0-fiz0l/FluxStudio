/**
 * useAnnotationHistory Hook
 * Manages undo/redo history for annotations
 */

import { useState, useCallback } from 'react';
import { ImageAnnotation } from '../types/messaging';

interface AnnotationHistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  annotation: ImageAnnotation;
  previousState?: ImageAnnotation;
  timestamp: Date;
  userId: string;
}

interface UseAnnotationHistoryOptions {
  currentUserId: string;
  annotations: ImageAnnotation[];
  onAnnotationsChange: (annotations: ImageAnnotation[]) => void;
}

interface UseAnnotationHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addToHistory: (action: 'create' | 'update' | 'delete', annotation: ImageAnnotation, previousState?: ImageAnnotation) => void;
  historyIndex: number;
  historyLength: number;
}

export function useAnnotationHistory({
  currentUserId,
  annotations,
  onAnnotationsChange
}: UseAnnotationHistoryOptions): UseAnnotationHistoryReturn {
  const [history, setHistory] = useState<AnnotationHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((
    action: 'create' | 'update' | 'delete',
    annotation: ImageAnnotation,
    previousState?: ImageAnnotation
  ) => {
    const entry: AnnotationHistoryEntry = {
      id: `history-${Date.now()}`,
      action,
      annotation,
      previousState,
      timestamp: new Date(),
      userId: currentUserId
    };

    setHistory(prev => [...prev.slice(0, historyIndex + 1), entry]);
    setHistoryIndex(prev => prev + 1);
  }, [currentUserId, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex < 0) return;

    const entry = history[historyIndex];

    switch (entry.action) {
      case 'create':
        onAnnotationsChange(annotations.filter(a => a.id !== entry.annotation.id));
        break;
      case 'delete':
        onAnnotationsChange([...annotations, entry.annotation]);
        break;
      case 'update':
        if (entry.previousState) {
          onAnnotationsChange(
            annotations.map(a => a.id === entry.annotation.id ? entry.previousState! : a)
          );
        }
        break;
    }

    setHistoryIndex(prev => prev - 1);
  }, [historyIndex, history, annotations, onAnnotationsChange]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];

    switch (entry.action) {
      case 'create':
        onAnnotationsChange([...annotations, entry.annotation]);
        break;
      case 'delete':
        onAnnotationsChange(annotations.filter(a => a.id !== entry.annotation.id));
        break;
      case 'update':
        onAnnotationsChange(
          annotations.map(a => a.id === entry.annotation.id ? entry.annotation : a)
        );
        break;
    }

    setHistoryIndex(nextIndex);
  }, [historyIndex, history, annotations, onAnnotationsChange]);

  return {
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    addToHistory,
    historyIndex,
    historyLength: history.length
  };
}

export type { AnnotationHistoryEntry };
