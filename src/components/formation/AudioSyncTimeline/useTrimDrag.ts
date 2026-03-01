/**
 * useTrimDrag - Handles trim handle drag logic for adjusting active audio region.
 */

import { useEffect, useState, useCallback } from 'react';

interface UseTrimDragParams {
  containerWidth: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange?: (start: number, end: number) => void;
}

interface TrimDragState {
  side: 'start' | 'end';
  startX: number;
  startTimeMs: number;
}

export function useTrimDrag({
  containerWidth,
  duration,
  trimStart,
  trimEnd,
  onTrimChange,
}: UseTrimDragParams) {
  const [trimDrag, setTrimDrag] = useState<TrimDragState | null>(null);

  const handleTrimDragStart = useCallback(
    (side: 'start' | 'end', mouseX: number) => {
      setTrimDrag({
        side,
        startX: mouseX,
        startTimeMs: side === 'start' ? trimStart : trimEnd,
      });
    },
    [trimStart, trimEnd],
  );

  useEffect(() => {
    if (!trimDrag || !onTrimChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerWidth || duration <= 0) return;

      const deltaX = e.clientX - trimDrag.startX;
      const deltaTimeMs = (deltaX / containerWidth) * duration;
      const newTimeMs = Math.max(
        0,
        Math.min(duration, trimDrag.startTimeMs + deltaTimeMs),
      );

      if (trimDrag.side === 'start') {
        // Start handle cannot pass end handle (with 50ms minimum region)
        onTrimChange(Math.min(newTimeMs, trimEnd - 50), trimEnd);
      } else {
        // End handle cannot pass start handle
        onTrimChange(trimStart, Math.max(newTimeMs, trimStart + 50));
      }
    };

    const handleMouseUp = () => {
      setTrimDrag(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimDrag, containerWidth, duration, trimStart, trimEnd, onTrimChange]);

  return { trimDrag, handleTrimDragStart };
}
