/**
 * TempoCurve - SVG line chart showing BPM over time.
 *
 * Samples BPM at regular intervals across the tempo map and draws an SVG
 * filled area with a gradient. Flat line for constant tempo, curves for ramps.
 * Adds text labels at tempo change points with segment names.
 */

import { memo, useMemo, useState, useEffect } from 'react';
import type { TempoMap } from '../../../services/tempoMap';
import { countToTimeMs, getTempoAtCount, timeMsToCount } from '../../../services/tempoMap';
import { tempoEventBus } from '../../../services/formation/tempoEventBus';

interface TempoCurveProps {
  tempoMap: TempoMap;
  durationMs: number;
  zoom: number; // px per second
  height?: number; // default 20
  yOffset?: number; // vertical position
}

// Stable ID prefix for gradient defs
let gradientCounter = 0;

export const TempoCurve = memo(function TempoCurve({
  tempoMap,
  durationMs,
  zoom,
  height = 20,
  yOffset = 0,
}: TempoCurveProps) {
  const gradientId = useMemo(() => `tempo-curve-grad-${++gradientCounter}`, []);

  // Subscribe to cross-tool tempo-change events to trigger re-render
  const [, setTempoVersion] = useState(0);
  useEffect(() => {
    const unsub = tempoEventBus.subscribe('tempo-change', () => {
      setTempoVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const { linePoints, areaPath, tempoLabels } = useMemo(() => {
    if (tempoMap.segments.length === 0 || durationMs <= 0) {
      return { linePoints: '', areaPath: '', bpmRange: { min: 0, max: 0 }, tempoLabels: [] };
    }

    // Sample BPM at regular intervals (~every 100ms)
    const sampleIntervalMs = 100;
    const samples: { timeMs: number; bpm: number }[] = [];

    for (let t = 0; t <= durationMs; t += sampleIntervalMs) {
      const count = timeMsToCount(t, tempoMap);
      const bpm = getTempoAtCount(count, tempoMap);
      samples.push({ timeMs: t, bpm });
    }

    // Ensure last sample is at durationMs
    if (samples.length > 0 && samples[samples.length - 1].timeMs < durationMs) {
      const count = timeMsToCount(durationMs, tempoMap);
      const bpm = getTempoAtCount(count, tempoMap);
      samples.push({ timeMs: durationMs, bpm });
    }

    // Find BPM range for y-axis scaling
    let minBpm = Infinity;
    let maxBpm = -Infinity;
    for (const s of samples) {
      if (s.bpm < minBpm) minBpm = s.bpm;
      if (s.bpm > maxBpm) maxBpm = s.bpm;
    }

    // Add padding to range for visual clarity
    const rangePadding = Math.max((maxBpm - minBpm) * 0.1, 2);
    const range = {
      min: minBpm - rangePadding,
      max: maxBpm + rangePadding,
    };

    const totalWidthPx = (durationMs / 1000) * zoom;

    // Build polyline points and area path
    const coords = samples.map((s) => {
      const x = (s.timeMs / durationMs) * totalWidthPx;
      const yNorm =
        range.max === range.min
          ? 0.5
          : 1 - (s.bpm - range.min) / (range.max - range.min);
      const y = yOffset + yNorm * height;
      return { x, y };
    });

    const linePointsStr = coords.map((c) => `${c.x},${c.y}`).join(' ');

    // Build closed area path: line along top, then straight along bottom
    const bottomY = yOffset + height;
    let area = '';
    if (coords.length > 0) {
      area = `M ${coords[0].x},${bottomY}`;
      for (const c of coords) {
        area += ` L ${c.x},${c.y}`;
      }
      area += ` L ${coords[coords.length - 1].x},${bottomY} Z`;
    }

    // Generate labels at tempo change points using countToTimeMs
    const labels: { x: number; y: number; bpmText: string; segName?: string }[] = [];
    for (const seg of tempoMap.segments) {
      const startTimeMs = countToTimeMs(seg.startCount, tempoMap);
      const x = (startTimeMs / durationMs) * totalWidthPx;
      const bpmVal = seg.tempoStart;
      const yNorm =
        range.max === range.min
          ? 0.5
          : 1 - (bpmVal - range.min) / (range.max - range.min);
      const y = yOffset + yNorm * height;

      // Only add label if it represents a tempo different from previous
      const prevLabel = labels[labels.length - 1];
      if (!prevLabel || prevLabel.bpmText !== `${Math.round(bpmVal)}`) {
        labels.push({ x, y, bpmText: `${Math.round(bpmVal)}`, segName: seg.sectionName });
      }
    }

    return { linePoints: linePointsStr, areaPath: area, bpmRange: range, tempoLabels: labels };
  }, [tempoMap, durationMs, zoom, height, yOffset]);

  if (!linePoints || tempoMap.segments.length === 0) return null;

  return (
    <g className="tempo-curve">
      {/* Gradient definition */}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(100, 116, 139)" stopOpacity={0.2} />
          <stop offset="100%" stopColor="rgb(100, 116, 139)" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Gradient fill area under the curve */}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          className="pointer-events-none"
        />
      )}

      {/* BPM polyline */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="rgba(100, 116, 139, 0.5)"
        strokeWidth={1}
        className="pointer-events-none"
      />

      {/* BPM labels and segment names at tempo change points */}
      {tempoLabels.map((label, i) => (
        <g key={`tempo-label-${i}`}>
          <text
            x={label.x + 2}
            y={label.y - 3}
            fontSize={8}
            fill="rgba(100, 116, 139, 0.6)"
            className="pointer-events-none select-none"
            fontFamily="monospace"
          >
            {label.bpmText}
          </text>
          {label.segName && (
            <text
              x={label.x + 2}
              y={label.y - 12}
              fontSize={7}
              fill="rgba(100, 116, 139, 0.45)"
              className="pointer-events-none select-none"
            >
              {label.segName}
            </text>
          )}
        </g>
      ))}
    </g>
  );
});
