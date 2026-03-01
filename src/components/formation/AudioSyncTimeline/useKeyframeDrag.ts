/**
 * useKeyframeDrag - Handles keyframe drag logic with snap-to-beat and drag preview guide line.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { snapToBeat } from '../../../services/audioAnalysis';
import { effectiveBpmForSnap, SNAP_THRESHOLD_PX } from './helpers';

interface UseKeyframeDragParams {
  containerWidth: number;
  duration: number;
  bpm: number;
  snapResolution: 'beat' | 'half-beat' | 'measure';
  onKeyframeMove: (keyframeId: string, newTimestamp: number) => void;
}

interface DragState {
  keyframeId: string;
  startX: number;
  startTimeMs: number;
}

export function useKeyframeDrag({
  containerWidth,
  duration,
  bpm,
  snapResolution,
  onKeyframeMove,
}: UseKeyframeDragParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
  const [snapTooltipIds, setSnapTooltipIds] = useState<Set<string>>(new Set());
  const snapTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragSnappedRef = useRef(false);

  const handleDragStart = useCallback(
    (keyframeId: string, startX: number, startTimeMs: number) => {
      setDragState({ keyframeId, startX, startTimeMs });
    },
    [],
  );

  useEffect(() => {
    if (!dragState) {
      setDragPreviewTime(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerWidth || duration <= 0) return;

      const deltaX = e.clientX - dragState.startX;
      const deltaPx = deltaX;
      const deltaTimeMs = (deltaPx / containerWidth) * duration;
      let newTimeMs = Math.max(
        0,
        Math.min(duration, dragState.startTimeMs + deltaTimeMs),
      );

      const effectiveBpm = effectiveBpmForSnap(bpm, snapResolution);
      let didSnap = false;
      if (effectiveBpm > 0) {
        const snappedMs = snapToBeat(newTimeMs, effectiveBpm);
        const snappedPx = (snappedMs / duration) * containerWidth;
        const currentPx = (newTimeMs / duration) * containerWidth;
        if (Math.abs(snappedPx - currentPx) < SNAP_THRESHOLD_PX) {
          setDragPreviewTime(snappedMs);
          newTimeMs = snappedMs;
          didSnap = true;
        }
      }

      if (!didSnap) {
        setDragPreviewTime(null);
      }
      dragSnappedRef.current = didSnap;

      onKeyframeMove(dragState.keyframeId, Math.round(newTimeMs));
    };

    const handleMouseUp = () => {
      if (dragSnappedRef.current && dragState) {
        const kfId = dragState.keyframeId;
        setSnapTooltipIds(new Set([kfId]));
        if (snapTooltipTimerRef.current) {
          clearTimeout(snapTooltipTimerRef.current);
        }
        snapTooltipTimerRef.current = setTimeout(() => {
          setSnapTooltipIds(new Set());
          snapTooltipTimerRef.current = null;
        }, 500);
      }
      dragSnappedRef.current = false;
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, containerWidth, duration, bpm, snapResolution, onKeyframeMove]);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (snapTooltipTimerRef.current) {
        clearTimeout(snapTooltipTimerRef.current);
      }
    };
  }, []);

  return { dragState, dragPreviewTime, snapTooltipIds, handleDragStart };
}
