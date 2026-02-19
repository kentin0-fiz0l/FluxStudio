/**
 * BeatMarkers - Renders detected beat positions as vertical lines on the timeline.
 *
 * Overlaid on top of the waveform. Each beat is a thin vertical line;
 * onsets (non-beat transients) are shown more faintly.
 */

import { memo, useMemo } from 'react';
import type { BeatMap } from '../../contexts/metmap/types';

interface BeatMarkersProps {
  beatMap: BeatMap;
  /** Total audio duration in seconds */
  duration: number;
  /** Width of the container in pixels */
  containerWidth: number;
  /** Height of the container in pixels */
  height?: number;
  className?: string;
}

export const BeatMarkers = memo(function BeatMarkers({
  beatMap,
  duration,
  containerWidth,
  height = 96,
  className = '',
}: BeatMarkersProps) {
  const beatLines = useMemo(() => {
    if (duration <= 0 || containerWidth <= 0) return [];
    return beatMap.beats.map(time => ({
      x: (time / duration) * containerWidth,
      time,
    }));
  }, [beatMap.beats, duration, containerWidth]);

  if (beatLines.length === 0) return null;

  return (
    <svg
      className={`pointer-events-none ${className}`}
      width={containerWidth}
      height={height}
      aria-hidden="true"
    >
      {beatLines.map((line, i) => (
        <line
          key={i}
          x1={line.x}
          y1={0}
          x2={line.x}
          y2={height}
          stroke="rgba(245, 158, 11, 0.3)"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
});

export default BeatMarkers;
