/**
 * useYjsAwareness — Awareness functions for Yjs formation collaboration.
 *
 * Extracted from useFormationYjs to keep each file under 600 lines.
 * Handles: cursor updates, selection, dragging, active keyframe, and undo/redo.
 */

import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';

interface UseYjsAwarenessRefs {
  providerRef: MutableRefObject<WebsocketProvider | null>;
  undoManagerRef: MutableRefObject<Y.UndoManager | null>;
  localDraggingRef: MutableRefObject<string | null>;
  localActiveKeyframeRef: MutableRefObject<string | null>;
}

export function useYjsAwareness(
  { providerRef, undoManagerRef, localDraggingRef, localActiveKeyframeRef }: UseYjsAwarenessRefs,
  collaborators: FormationAwarenessState[],
) {
  // Refs for cursor throttling (50ms interval per UX spec)
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Cleanup cursor throttle timer on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current !== null) {
        clearTimeout(cursorThrottleRef.current);
        cursorThrottleRef.current = null;
      }
    };
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    const provider = providerRef.current;
    if (!provider) return;

    pendingCursorRef.current = { x, y };

    if (cursorThrottleRef.current !== null) return;

    provider.awareness.setLocalStateField('cursor', {
      x,
      y,
      timestamp: Date.now(),
    });
    provider.awareness.setLocalStateField('lastActivity', Date.now());

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      if (pendingCursorRef.current) {
        const pending = pendingCursorRef.current;
        provider.awareness.setLocalStateField('cursor', {
          x: pending.x,
          y: pending.y,
          timestamp: Date.now(),
        });
      }
    }, 50);
  }, [providerRef]);

  const clearCursor = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('cursor', null);
  }, [providerRef]);

  const setSelectedPerformers = useCallback((performerIds: string[]) => {
    const provider = providerRef.current;
    if (!provider) return;

    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...currentState,
      selectedPerformerIds: performerIds,
      lastActivity: Date.now(),
    });
  }, [providerRef]);

  const setDraggingPerformer = useCallback((performerId: string | null) => {
    const provider = providerRef.current;
    if (!provider) return;

    localDraggingRef.current = performerId;

    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...currentState,
      draggingPerformerId: performerId,
      lastActivity: Date.now(),
    });
  }, [providerRef, localDraggingRef]);

  const setActiveKeyframe = useCallback((keyframeId: string | null) => {
    const provider = providerRef.current;

    localActiveKeyframeRef.current = keyframeId;

    if (!provider) return;

    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...currentState,
      activeKeyframeId: keyframeId,
      lastActivity: Date.now(),
    });
  }, [providerRef, localActiveKeyframeRef]);

  const isPerformerBeingDragged = useCallback((performerId: string): { dragging: boolean; by?: FormationAwarenessState } => {
    const other = collaborators.find((c) => c.draggingPerformerId === performerId);
    return {
      dragging: !!other,
      by: other,
    };
  }, [collaborators]);

  const yUndo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, [undoManagerRef]);

  const yRedo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, [undoManagerRef]);

  return {
    updateCursor,
    clearCursor,
    setSelectedPerformers,
    setDraggingPerformer,
    setActiveKeyframe,
    isPerformerBeingDragged,
    yUndo,
    yRedo,
  };
}
