/**
 * BeatGrid - Renders beat marker lines and beat count labels as SVG elements.
 */

import { memo } from 'react';
import type { BeatMap } from '../../../contexts/metmap/types';

interface BeatGridProps {
  containerWidth: number;
  duration: number;
  beatTimestampsSec: number[];
  beatLevelTimestampsSec: number[];
  beatMap: BeatMap | null;
  bpm: number;
  snapResolution: 'beat' | 'half-beat' | 'measure';
  OVERLAY_HEIGHT: number;
}

export const BeatGrid = memo(function BeatGrid({
  containerWidth,
  duration,
  beatTimestampsSec,
  beatLevelTimestampsSec,
  beatMap,
  bpm,
  snapResolution,
  OVERLAY_HEIGHT,
}: BeatGridProps) {
  if (containerWidth <= 0 || duration <= 0) return null;

  return (
    <>
      {/* Beat marker lines */}
      {beatTimestampsSec.map((timeSec, i) => {
        const x = (timeSec / (duration / 1000)) * containerWidth;
        const isMeasureBoundary =
          beatMap && bpm > 0
            ? i % 4 === 0
            : snapResolution === 'measure' || i % 4 === 0;
        return (
          <line
            key={i}
            x1={x}
            y1={0}
            x2={x}
            y2={OVERLAY_HEIGHT}
            stroke={
              isMeasureBoundary
                ? 'rgba(245, 158, 11, 0.45)'
                : 'rgba(245, 158, 11, 0.2)'
            }
            strokeWidth={isMeasureBoundary ? 1.5 : 0.5}
            className="pointer-events-none"
          />
        );
      })}

      {/* Beat count labels (1,2,3,4) along the bottom of the beat grid */}
      {beatLevelTimestampsSec.map((timeSec, i) => {
        const x = (timeSec / (duration / 1000)) * containerWidth;
        const beatInMeasure = (i % 4) + 1;
        const isMeasureStart = beatInMeasure === 1;
        return (
          <text
            key={`beat-label-${i}`}
            x={x + 3}
            y={OVERLAY_HEIGHT - 14}
            fontSize={isMeasureStart ? 10 : 8}
            fontWeight={isMeasureStart ? 'bold' : 'normal'}
            fill={
              isMeasureStart
                ? 'rgba(245, 158, 11, 0.7)'
                : 'rgba(245, 158, 11, 0.4)'
            }
            className="pointer-events-none select-none"
          >
            {beatInMeasure}
          </text>
        );
      })}
    </>
  );
});
