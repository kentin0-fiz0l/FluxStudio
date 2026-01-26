/**
 * VisualTimeline Component
 *
 * A visual bar graph showing tempo changes across sections.
 * Displays section names, bar counts, and tempo ramps.
 */

import { useMemo } from 'react';
import { Section } from '../../contexts/MetMapContext';

interface VisualTimelineProps {
  sections: Section[];
  currentBar: number;
  isPlaying: boolean;
  onSectionClick?: (sectionIndex: number) => void;
  loopSection?: number | null;
  className?: string;
}

// Color palette for sections
const SECTION_COLORS = [
  { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-700' },
];

export function VisualTimeline({
  sections,
  currentBar,
  isPlaying,
  onSectionClick,
  loopSection,
  className = ''
}: VisualTimelineProps) {
  // Calculate total bars and tempo range
  const { totalBars, minTempo, maxTempo } = useMemo(() => {
    let total = 0;
    let min = 300;
    let max = 20;

    for (const section of sections) {
      total += section.bars;
      min = Math.min(min, section.tempoStart, section.tempoEnd || section.tempoStart);
      max = Math.max(max, section.tempoStart, section.tempoEnd || section.tempoStart);
    }

    // Add padding to tempo range
    const range = max - min;
    return {
      totalBars: total,
      minTempo: Math.max(20, min - range * 0.1),
      maxTempo: max + range * 0.1
    };
  }, [sections]);

  // Find current section
  const currentSectionIndex = useMemo(() => {
    let barCount = 0;
    for (let i = 0; i < sections.length; i++) {
      barCount += sections[i].bars;
      if (currentBar <= barCount) return i;
    }
    return sections.length - 1;
  }, [sections, currentBar]);

  // Calculate tempo height percentage
  const getTempoHeight = (tempo: number) => {
    const range = maxTempo - minTempo;
    if (range === 0) return 50;
    return ((tempo - minTempo) / range) * 80 + 10; // 10-90% range
  };

  if (sections.length === 0) {
    return (
      <div className={`h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm ${className}`}>
        Add sections to see the timeline
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      {/* Tempo scale */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>{Math.round(maxTempo)} BPM</span>
        <span className="text-gray-500 font-medium">Tempo Timeline</span>
        <span>{Math.round(minTempo)} BPM</span>
      </div>

      {/* Timeline visualization */}
      <div className="flex h-20 gap-0.5 items-end">
        {sections.map((section, index) => {
          const widthPercent = (section.bars / totalBars) * 100;
          const color = SECTION_COLORS[index % SECTION_COLORS.length];
          const isCurrent = index === currentSectionIndex && isPlaying;
          const isLooped = loopSection === index;
          const hasTempoRamp = section.tempoEnd && section.tempoEnd !== section.tempoStart;

          const startHeight = getTempoHeight(section.tempoStart);
          const endHeight = hasTempoRamp ? getTempoHeight(section.tempoEnd!) : startHeight;

          return (
            <div
              key={section.id || index}
              className={`relative group cursor-pointer transition-all ${
                isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
              } ${isLooped ? 'ring-2 ring-yellow-500 ring-offset-1' : ''}`}
              style={{ width: `${widthPercent}%`, minWidth: '30px' }}
              onClick={() => onSectionClick?.(index)}
              role="button"
              tabIndex={0}
              aria-label={`${section.name}: ${section.bars} bars, ${section.tempoStart}${hasTempoRamp ? `-${section.tempoEnd}` : ''} BPM`}
            >
              {/* Tempo bar with gradient for ramps */}
              <div
                className={`w-full rounded-t transition-colors ${color.bg} ${
                  isCurrent ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  height: `${startHeight}%`,
                  clipPath: hasTempoRamp
                    ? `polygon(0 ${100 - startHeight}%, 100% ${100 - endHeight}%, 100% 100%, 0 100%)`
                    : undefined
                }}
              />

              {/* Section info overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                <span className="text-[10px] font-medium text-white drop-shadow truncate max-w-full px-1">
                  {section.name}
                </span>
              </div>

              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                <div className="font-medium">{section.name}</div>
                <div className="text-gray-300">
                  {section.bars} bars · {section.tempoStart}
                  {hasTempoRamp ? `→${section.tempoEnd}` : ''} BPM
                </div>
                {isLooped && <div className="text-yellow-400">🔁 Looping</div>}
              </div>

              {/* Loop indicator */}
              {isLooped && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px]">🔁</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Playhead indicator */}
      {isPlaying && totalBars > 0 && (
        <div className="relative h-1 mt-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100"
            style={{ width: `${(currentBar / totalBars) * 100}%` }}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {sections.map((section, index) => {
          const color = SECTION_COLORS[index % SECTION_COLORS.length];
          return (
            <div
              key={section.id || index}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${color.light} ${color.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${color.bg}`} />
              <span>{section.name}</span>
              <span className="text-gray-400">({section.bars})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VisualTimeline;
