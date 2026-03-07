/**
 * BeatGrid - Renders beat marker lines and beat count labels as SVG elements.
 *
 * When an optional tempoMap is provided, uses tempo-map-aware beat generation
 * (variable tempo, variable time signatures) instead of constant-BPM arrays.
 */

import { memo, useMemo } from 'react';
import type { BeatMap } from '../../../contexts/metmap/types';
import type { TempoMap } from '../../../services/tempoMap';
import { getBeatTimestampsFromTempoMap } from './helpers';

interface BeatGridProps {
  containerWidth: number;
  duration: number;
  beatTimestampsSec: number[];
  beatLevelTimestampsSec: number[];
  beatMap: BeatMap | null;
  bpm: number;
  snapResolution: 'beat' | 'half-beat' | 'measure';
  OVERLAY_HEIGHT: number;
  /** When provided, uses tempo-map-aware beat generation instead of constant BPM. */
  tempoMap?: TempoMap;
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
  tempoMap,
}: BeatGridProps) {
  if (containerWidth <= 0 || duration <= 0) return null;

  // When tempoMap is provided, compute beats from it instead of the constant-BPM arrays
  const tempoMapBeats = useMemo(() => {
    if (!tempoMap || tempoMap.segments.length === 0) return null;
    return getBeatTimestampsFromTempoMap(tempoMap, duration);
  }, [tempoMap, duration]);

  // Tempo-map-aware rendering path
  if (tempoMapBeats && tempoMapBeats.length > 0) {
    return (
      <>
        {/* Beat marker lines from tempo map */}
        {tempoMapBeats.map((beat, i) => {
          const x = (beat.time / duration) * containerWidth;
          return (
            <line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={OVERLAY_HEIGHT}
              stroke={
                beat.isDownbeat
                  ? 'rgba(245, 158, 11, 0.45)'
                  : 'rgba(245, 158, 11, 0.2)'
              }
              strokeWidth={beat.isDownbeat ? 1.5 : 0.5}
              className="pointer-events-none"
            />
          );
        })}

        {/* Beat count labels from tempo map */}
        {tempoMapBeats.map((beat, i) => {
          const x = (beat.time / duration) * containerWidth;
          return (
            <text
              key={`beat-label-${i}`}
              x={x + 3}
              y={OVERLAY_HEIGHT - 14}
              fontSize={beat.isDownbeat ? 10 : 8}
              fontWeight={beat.isDownbeat ? 'bold' : 'normal'}
              fill={
                beat.isDownbeat
                  ? 'rgba(245, 158, 11, 0.7)'
                  : 'rgba(245, 158, 11, 0.4)'
              }
              className="pointer-events-none select-none"
            >
              {beat.beatInBar}
            </text>
          );
        })}

        {/* Bar number annotations at downbeat positions */}
        {tempoMapBeats
          .filter((beat) => beat.isDownbeat)
          .map((beat, i) => {
            const x = (beat.time / duration) * containerWidth;
            return (
              <text
                key={`bar-num-${i}`}
                x={x + 3}
                y={10}
                fontSize={8}
                fontWeight="600"
                fill="rgba(245, 158, 11, 0.5)"
                className="pointer-events-none select-none"
                fontFamily="monospace"
              >
                {beat.barNumber}
              </text>
            );
          })}
      </>
    );
  }

  // Fallback: existing constant-BPM rendering path (backward compatible)
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
