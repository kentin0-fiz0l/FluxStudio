/**
 * SectionRegions - SVG layer showing colored background rectangles per MetMap section.
 *
 * Maps each section to start/end time using the tempo map and renders
 * semi-transparent colored regions with section name labels.
 */

import { memo, useMemo } from 'react';
import type { Section } from '../../../contexts/metmap/types';
import type { TempoMap } from '../../../services/tempoMap';
import { countToTimeMs } from '../../../services/tempoMap';

// Distinct palette for section regions -- cycles when sections exceed palette length
const SECTION_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48', // rose
];

interface SectionRegionsProps {
  sections: Section[];
  tempoMap: TempoMap;
  durationMs: number;
  zoom: number; // px per second
  height: number;
}

export const SectionRegions = memo(function SectionRegions({
  sections,
  tempoMap,
  durationMs,
  zoom,
  height,
}: SectionRegionsProps) {
  const regions = useMemo(() => {
    if (sections.length === 0 || tempoMap.segments.length === 0 || durationMs <= 0) {
      return [];
    }

    const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
    const result: {
      name: string;
      timeSignature: string;
      startMs: number;
      endMs: number;
      color: string;
    }[] = [];

    // Walk through sorted sections, finding their corresponding tempo map segments
    // to compute start/end times
    let currentCount = 1;

    for (let i = 0; i < sorted.length; i++) {
      const section = sorted[i];
      const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
      const sectionBeats = section.bars * beatsPerBar;

      if (sectionBeats <= 0) continue;

      const startMs = countToTimeMs(currentCount, tempoMap);
      const endCount = currentCount + sectionBeats;
      const endMs = countToTimeMs(endCount, tempoMap);

      result.push({
        name: section.name,
        timeSignature: section.timeSignature,
        startMs,
        endMs: Math.min(endMs, durationMs),
        color: SECTION_COLORS[i % SECTION_COLORS.length],
      });

      currentCount = endCount;
    }

    return result;
  }, [sections, tempoMap, durationMs]);

  if (regions.length === 0) return null;

  const totalWidthPx = (durationMs / 1000) * zoom;

  return (
    <g className="section-regions">
      {regions.map((region, i) => {
        const x = (region.startMs / durationMs) * totalWidthPx;
        const width = ((region.endMs - region.startMs) / durationMs) * totalWidthPx;

        return (
          <g key={`section-region-${i}`}>
            {/* Background rectangle */}
            <rect
              x={x}
              y={0}
              width={Math.max(width, 0)}
              height={height}
              fill={region.color}
              opacity={0.08}
              className="pointer-events-none"
            />
            {/* Vertical divider line at section boundary */}
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={region.color}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.35}
              className="pointer-events-none"
            />
            {/* Time signature badge */}
            <rect
              x={x + 2}
              y={2}
              width={24}
              height={12}
              rx={3}
              fill={region.color}
              opacity={0.15}
              className="pointer-events-none"
            />
            <text
              x={x + 14}
              y={11}
              fontSize={8}
              fontWeight="700"
              fill={region.color}
              opacity={0.7}
              textAnchor="middle"
              className="pointer-events-none select-none"
            >
              {region.timeSignature}
            </text>
            {/* Section name label */}
            <text
              x={x + 30}
              y={11}
              fontSize={9}
              fontWeight="600"
              fill={region.color}
              opacity={0.6}
              className="pointer-events-none select-none"
            >
              {region.name}
            </text>
          </g>
        );
      })}
    </g>
  );
});
