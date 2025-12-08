'use client';

import { clsx } from 'clsx';
import { Section, SECTION_COLORS, ConfidenceLevel } from '@/types/metmap';

interface SectionPadGridProps {
  sections: Section[];
  currentSectionIndex: number;
  onSectionSelect: (index: number) => void;
  onConfidenceChange?: (sectionId: string, confidence: ConfidenceLevel) => void;
  className?: string;
  maxColumns?: number;
}

/**
 * Get confidence color based on level
 */
function getConfidenceColor(confidence: ConfidenceLevel): string {
  const colors = {
    1: '#ef4444', // red
    2: '#f97316', // orange
    3: '#eab308', // yellow
    4: '#84cc16', // lime
    5: '#22c55e', // green
  };
  return colors[confidence];
}

/**
 * Individual Section Pad
 * Tactile, hardware-inspired pad button for section navigation
 */
function SectionPad({
  section,
  index,
  isActive,
  onSelect,
}: {
  section: Section;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const sectionColor = section.color || SECTION_COLORS[section.type];
  const confidenceColor = getConfidenceColor(section.confidence);

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'relative aspect-square rounded-lg transition-all duration-100',
        'flex flex-col items-center justify-center gap-1 p-2',
        'min-w-[60px] min-h-[60px]',
        isActive
          ? 'shadow-pad-active scale-95 ring-2 ring-hw-brass'
          : 'shadow-pad hover:scale-[1.02] active:scale-95 active:shadow-pad-active'
      )}
      style={{
        backgroundColor: isActive ? sectionColor : `${sectionColor}40`,
      }}
    >
      {/* Confidence indicator dot */}
      <div
        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
        style={{ backgroundColor: confidenceColor }}
      />

      {/* Section number */}
      <span
        className={clsx(
          'text-lg font-bold',
          isActive ? 'text-white' : 'text-white/70'
        )}
      >
        {index + 1}
      </span>

      {/* Section name (truncated) */}
      <span
        className={clsx(
          'text-[9px] font-medium truncate w-full text-center',
          isActive ? 'text-white/90' : 'text-white/50'
        )}
      >
        {section.name}
      </span>

      {/* Active indicator glow */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-lg animate-pulse opacity-30"
          style={{ boxShadow: `0 0 20px ${sectionColor}` }}
        />
      )}
    </button>
  );
}

/**
 * Section Pad Grid Component
 * Hardware-style grid of section pads for rapid navigation during practice
 * Inspired by Orchid MIDI controller pad layout
 */
export function SectionPadGrid({
  sections,
  currentSectionIndex,
  onSectionSelect,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onConfidenceChange,
  className = '',
  maxColumns = 4,
}: SectionPadGridProps) {
  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No sections to display
      </div>
    );
  }

  // Calculate grid layout
  const numSections = sections.length;
  const columns = Math.min(maxColumns, numSections);

  return (
    <div className={clsx('bg-hw-charcoal rounded-xl p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
          Sections
        </span>
        <span className="text-[10px] text-gray-600">
          {currentSectionIndex + 1} / {sections.length}
        </span>
      </div>

      {/* Pad Grid */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {sections.map((section, index) => (
          <SectionPad
            key={section.id}
            section={section}
            index={index}
            isActive={index === currentSectionIndex}
            onSelect={() => onSectionSelect(index)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-gray-700/50">
        <div className="flex items-center justify-center gap-3 text-[9px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Needs work</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Mastered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact section strip for horizontal scrolling
 */
export function SectionStrip({
  sections,
  currentSectionIndex,
  onSectionSelect,
  className = '',
}: Omit<SectionPadGridProps, 'maxColumns' | 'onConfidenceChange'>) {
  return (
    <div className={clsx('flex gap-1.5 overflow-x-auto pb-1', className)}>
      {sections.map((section, index) => {
        const isActive = index === currentSectionIndex;
        const sectionColor = section.color || SECTION_COLORS[section.type];
        const confidenceColor = getConfidenceColor(section.confidence);

        return (
          <button
            key={section.id}
            onClick={() => onSectionSelect(index)}
            className={clsx(
              'flex-shrink-0 px-3 py-2 rounded-lg transition-all',
              'flex items-center gap-2 min-h-[44px]',
              isActive
                ? 'shadow-pad-active ring-1 ring-hw-brass'
                : 'shadow-pad hover:scale-[1.02] active:scale-95'
            )}
            style={{
              backgroundColor: isActive ? sectionColor : `${sectionColor}30`,
            }}
          >
            {/* Confidence dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: confidenceColor }}
            />

            <span
              className={clsx(
                'text-sm font-medium whitespace-nowrap',
                isActive ? 'text-white' : 'text-white/70'
              )}
            >
              {section.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Confidence rating buttons with hardware aesthetic
 */
export function ConfidenceRating({
  value,
  onChange,
  className = '',
}: {
  value: ConfidenceLevel;
  onChange: (level: ConfidenceLevel) => void;
  className?: string;
}) {
  const levels: ConfidenceLevel[] = [1, 2, 3, 4, 5];

  return (
    <div className={clsx('flex gap-2', className)}>
      {levels.map((level) => {
        const isActive = level <= value;
        const color = getConfidenceColor(level);

        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={clsx(
              'w-11 h-11 rounded-lg font-bold text-lg transition-all',
              'min-w-[44px] min-h-[44px]',
              isActive
                ? 'shadow-pad-active scale-95'
                : 'shadow-pad hover:scale-[1.02] active:scale-95 active:shadow-pad-active'
            )}
            style={{
              backgroundColor: isActive ? color : '#3d3d42',
              color: isActive ? 'white' : '#6b7280',
            }}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
}

export default SectionPadGrid;
