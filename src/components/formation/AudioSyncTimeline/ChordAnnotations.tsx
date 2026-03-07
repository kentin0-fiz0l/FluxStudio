/**
 * ChordAnnotations - SVG layer showing chord symbols at their bar:beat positions.
 *
 * Converts each chord's bar:beat position to a time position using the tempo map
 * and displays the chord symbol text at the corresponding x position.
 */

import { memo, useMemo } from 'react';
import type { Chord, Section } from '../../../contexts/metmap/types';
import type { TempoMap } from '../../../services/tempoMap';
import { countToTimeMs } from '../../../services/tempoMap';

interface ChordAnnotationsProps {
  chords: Chord[];
  sections: Section[];
  tempoMap: TempoMap;
  zoom: number; // px per second
  yOffset?: number; // default 14
}

export const ChordAnnotations = memo(function ChordAnnotations({
  chords,
  sections,
  tempoMap,
  zoom,
  yOffset = 14,
}: ChordAnnotationsProps) {
  const annotations = useMemo(() => {
    if (
      chords.length === 0 ||
      sections.length === 0 ||
      tempoMap.segments.length === 0
    ) {
      return [];
    }

    const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

    // Build a lookup: for each section, compute the count offset where it starts
    const sectionCountOffsets: Map<string | number, { startCount: number; beatsPerBar: number; startBar: number }> = new Map();
    let currentCount = 1;

    for (let i = 0; i < sorted.length; i++) {
      const section = sorted[i];
      const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
      const sectionBeats = section.bars * beatsPerBar;

      // Key by sectionId if available, otherwise by orderIndex
      const key = section.id || i;
      sectionCountOffsets.set(key, {
        startCount: currentCount,
        beatsPerBar,
        startBar: section.startBar,
      });

      // Also key by section name for chords that reference by sectionName
      if (section.name) {
        sectionCountOffsets.set(section.name, {
          startCount: currentCount,
          beatsPerBar,
          startBar: section.startBar,
        });
      }

      currentCount += sectionBeats;
    }

    const result: { symbol: string; timeMs: number; endMs: number }[] = [];

    for (const chord of chords) {
      // Resolve the section this chord belongs to
      const sectionInfo =
        (chord.sectionId && sectionCountOffsets.get(chord.sectionId)) ||
        (chord.sectionName && sectionCountOffsets.get(chord.sectionName)) ||
        (chord.sectionOrder !== undefined && sectionCountOffsets.get(chord.sectionOrder)) ||
        null;

      if (!sectionInfo) continue;

      // Convert bar:beat within the section to a global count
      // chord.bar is relative to the section's startBar
      const barsIntoSection = chord.bar - sectionInfo.startBar;
      const beatsIntoSection =
        barsIntoSection * sectionInfo.beatsPerBar + (chord.beat - 1);
      const globalCount = sectionInfo.startCount + beatsIntoSection;

      const timeMs = countToTimeMs(globalCount, tempoMap);
      const endCount = globalCount + (chord.durationBeats || 1);
      const endMs = countToTimeMs(endCount, tempoMap);

      result.push({
        symbol: chord.symbol,
        timeMs,
        endMs,
      });
    }

    return result;
  }, [chords, sections, tempoMap]);

  if (annotations.length === 0 || tempoMap.totalDurationMs <= 0) return null;

  const totalWidthPx = (tempoMap.totalDurationMs / 1000) * zoom;

  return (
    <g className="chord-annotations">
      {annotations.map((ann, i) => {
        const x = (ann.timeMs / tempoMap.totalDurationMs) * totalWidthPx;
        const endX = (ann.endMs / tempoMap.totalDurationMs) * totalWidthPx;
        const barWidth = Math.max(endX - x, 0);
        // Alternate row positions to avoid overlapping adjacent chords
        const row = i % 2;
        const rowY = yOffset + row * 14;

        return (
          <g key={`chord-${i}`}>
            {/* Duration bar behind symbol */}
            {barWidth > 0 && (
              <rect
                x={x}
                y={rowY - 9}
                width={barWidth}
                height={12}
                rx={2}
                fill="rgba(148, 163, 184, 0.1)"
                className="pointer-events-none"
              />
            )}
            {/* Chord symbol text */}
            <text
              x={x + 2}
              y={rowY}
              fontSize={10}
              fill="rgba(148, 163, 184, 0.7)"
              className="pointer-events-none select-none"
              fontFamily="monospace"
            >
              {ann.symbol}
            </text>
          </g>
        );
      })}
    </g>
  );
});
