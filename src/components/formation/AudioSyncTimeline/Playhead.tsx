/**
 * Playhead - SVG playhead indicator with glow effect when playing.
 */

import { memo } from 'react';

interface PlayheadProps {
  playheadX: number;
  isPlaying: boolean;
  OVERLAY_HEIGHT: number;
}

export const Playhead = memo(function Playhead({
  playheadX,
  isPlaying,
  OVERLAY_HEIGHT,
}: PlayheadProps) {
  return (
    <>
      {isPlaying && (
        <line
          x1={playheadX}
          y1={0}
          x2={playheadX}
          y2={OVERLAY_HEIGHT}
          stroke="rgba(239, 68, 68, 0.25)"
          strokeWidth={6}
          className="pointer-events-none"
        />
      )}
      <line
        x1={playheadX}
        y1={0}
        x2={playheadX}
        y2={OVERLAY_HEIGHT}
        stroke="#ef4444"
        strokeWidth={2}
        className="pointer-events-none"
      />
      <polygon
        points={`${playheadX - 5},0 ${playheadX + 5},0 ${playheadX},7`}
        fill="#ef4444"
        className="pointer-events-none"
      />
    </>
  );
});
