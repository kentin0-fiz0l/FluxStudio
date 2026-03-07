/**
 * SectionLeaderView - Simplified formation view for section leaders
 *
 * Filters performers to only show those matching the selected section,
 * with a simplified canvas and coordinate sheet emphasis.
 * Provides section-specific drill analysis summary.
 */

import { useState, useMemo, useCallback } from 'react';
import { Users, MapPin, ChevronLeft, ChevronRight, Footprints, Filter } from 'lucide-react';
import type { Formation, Performer, FieldConfig, DrillSet } from '../../services/formationTypes';
import { NCAA_FOOTBALL_FIELD } from '../../services/fieldConfigService';
import { positionToCoordinate, calculateStepInfo } from '../../utils/drillCoordinates';

// ============================================================================
// Types
// ============================================================================

export interface SectionLeaderViewProps {
  formation: Formation;
  sectionFilter?: string;
  fieldConfig?: FieldConfig;
  onSectionChange?: (section: string) => void;
  onSelectPerformer?: (performerId: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getUniqueSections(performers: Performer[]): string[] {
  const sections = new Set<string>();
  for (const p of performers) {
    if (p.section) sections.add(p.section);
  }
  return Array.from(sections).sort();
}

// ============================================================================
// Component
// ============================================================================

export function SectionLeaderView({
  formation,
  sectionFilter: initialSection,
  fieldConfig = NCAA_FOOTBALL_FIELD,
  onSectionChange,
  onSelectPerformer,
}: SectionLeaderViewProps) {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string>(
    initialSection ?? ''
  );
  const [selectedPerformerId, setSelectedPerformerId] = useState<string | null>(null);

  // Available sections from formation performers
  const sections = useMemo(() => getUniqueSections(formation.performers), [formation.performers]);

  // Initialize section if not set and sections exist
  const activeSection = selectedSection || sections[0] || '';

  // Filter performers to selected section
  const sectionPerformers = useMemo(() => {
    if (!activeSection) return formation.performers;
    return formation.performers.filter((p) => p.section === activeSection);
  }, [formation.performers, activeSection]);

  // Derive drill sets from keyframes
  const drillSets: DrillSet[] = useMemo(() => {
    return formation.keyframes.map((kf, i) => ({
      id: kf.id,
      name: formation.sets?.[i]?.name ?? `Set ${i + 1}`,
      counts: formation.sets?.[i]?.counts ?? 8,
      keyframeId: kf.id,
      sortOrder: i,
    }));
  }, [formation.keyframes, formation.sets]);

  const currentSet = drillSets[currentSetIndex] ?? null;
  const currentKeyframe = formation.keyframes[currentSetIndex] ?? null;
  const nextKeyframe = formation.keyframes[currentSetIndex + 1] ?? null;

  // Handle section change
  const handleSectionChange = useCallback(
    (section: string) => {
      setSelectedSection(section);
      setSelectedPerformerId(null);
      onSectionChange?.(section);
    },
    [onSectionChange]
  );

  // Handle set navigation
  const handlePrevSet = useCallback(() => {
    setCurrentSetIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNextSet = useCallback(() => {
    setCurrentSetIndex((i) => Math.min(formation.keyframes.length - 1, i + 1));
  }, [formation.keyframes.length]);

  // Handle performer selection
  const handleSelectPerformer = useCallback(
    (id: string) => {
      setSelectedPerformerId((prev) => (prev === id ? null : id));
      onSelectPerformer?.(id);
    },
    [onSelectPerformer]
  );

  // Build coordinate data for section performers at current set
  const coordinateData = useMemo(() => {
    if (!currentKeyframe) return [];
    return sectionPerformers.map((performer) => {
      const position = currentKeyframe.positions.get(performer.id) ?? null;
      const nextPosition = nextKeyframe?.positions.get(performer.id) ?? null;
      const coordinate = position
        ? positionToCoordinate(position, fieldConfig)
        : null;
      const stepInfo =
        position && nextPosition
          ? calculateStepInfo(position, nextPosition, currentSet?.counts ?? 8, fieldConfig)
          : null;

      return {
        performer,
        position,
        coordinate,
        stepInfo,
      };
    });
  }, [sectionPerformers, currentKeyframe, nextKeyframe, fieldConfig, currentSet]);

  // Section summary: count of performers, any issues
  const sectionSummary = useMemo(() => {
    const total = sectionPerformers.length;
    const missingPositions = coordinateData.filter((d) => !d.position).length;
    const hardSteps = coordinateData.filter(
      (d) => d.stepInfo?.difficulty === 'hard'
    ).length;
    return { total, missingPositions, hardSteps };
  }, [sectionPerformers, coordinateData]);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
        <Users className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-center">
          No sections defined. Assign sections to performers in the designer view.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Section selector header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={activeSection}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          aria-label="Select section"
        >
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {sectionSummary.total} performer{sectionSummary.total !== 1 ? 's' : ''}
        </span>
        {sectionSummary.hardSteps > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Footprints className="w-3 h-3" />
            {sectionSummary.hardSteps} hard step{sectionSummary.hardSteps !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Mini field preview with section performers */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <svg
          viewBox="0 0 300 180"
          className="w-full max-w-lg mx-auto bg-green-900/10 dark:bg-green-900/30 rounded-lg border border-gray-200 dark:border-gray-700"
          role="img"
          aria-label={`Field view for ${activeSection} section, ${currentSet?.name ?? 'Set 1'}`}
        >
          {/* Yard lines */}
          {Array.from({ length: 11 }, (_, i) => {
            const x = (i / 10) * 300;
            return (
              <line
                key={`yl-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={180}
                stroke="#9ca3af"
                strokeWidth={0.5}
                opacity={0.4}
              />
            );
          })}
          {/* Hash marks */}
          <line x1={0} y1={60} x2={300} y2={60} stroke="#9ca3af" strokeWidth={0.3} strokeDasharray="2 4" opacity={0.3} />
          <line x1={0} y1={120} x2={300} y2={120} stroke="#9ca3af" strokeWidth={0.3} strokeDasharray="2 4" opacity={0.3} />

          {/* Non-section performers (dimmed) */}
          {currentKeyframe &&
            formation.performers
              .filter((p) => p.section !== activeSection)
              .map((performer) => {
                const pos = currentKeyframe.positions.get(performer.id);
                if (!pos) return null;
                return (
                  <circle
                    key={performer.id}
                    cx={(pos.x / 100) * 300}
                    cy={(pos.y / 100) * 180}
                    r={4}
                    fill="#9ca3af"
                    opacity={0.15}
                  />
                );
              })}

          {/* Section performers (highlighted) */}
          {currentKeyframe &&
            sectionPerformers.map((performer) => {
              const pos = currentKeyframe.positions.get(performer.id);
              if (!pos) return null;
              const isSelected = performer.id === selectedPerformerId;
              return (
                <g key={performer.id}>
                  <circle
                    cx={(pos.x / 100) * 300}
                    cy={(pos.y / 100) * 180}
                    r={isSelected ? 10 : 7}
                    fill={performer.color}
                    stroke={isSelected ? 'white' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    className="cursor-pointer"
                    onClick={() => handleSelectPerformer(performer.id)}
                  />
                  <text
                    x={(pos.x / 100) * 300}
                    y={(pos.y / 100) * 180 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isSelected ? 7 : 6}
                    fill="white"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {performer.label}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Set navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrevSet}
          disabled={currentSetIndex === 0}
          className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous set"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {currentSet?.name ?? 'Set 1'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {currentSetIndex + 1} of {drillSets.length} &middot;{' '}
            {currentSet?.counts ?? 8} counts
          </div>
        </div>
        <button
          onClick={handleNextSet}
          disabled={currentSetIndex >= drillSets.length - 1}
          className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next set"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Coordinate sheet for section performers */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Performer</th>
              <th className="px-3 py-2 text-left font-medium">Coordinate</th>
              <th className="px-3 py-2 text-left font-medium">Steps to Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {coordinateData.map(({ performer, coordinate, stepInfo }) => {
              const isSelected = performer.id === selectedPerformerId;
              return (
                <tr
                  key={performer.id}
                  onClick={() => handleSelectPerformer(performer.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: performer.color }}
                      >
                        {performer.label}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {performer.name}
                        </div>
                        {performer.drillNumber && (
                          <div className="text-xs text-gray-400">
                            #{performer.drillNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {coordinate ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <div className="text-xs font-mono text-gray-700 dark:text-gray-300">
                          <div>{coordinate.sideToSide}</div>
                          <div className="text-gray-400">{coordinate.frontToBack}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Not in set
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {stepInfo ? (
                      <div className="flex items-center gap-1.5">
                        <Footprints className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <div>
                          <span
                            className={`text-xs font-mono ${
                              stepInfo.difficulty === 'hard'
                                ? 'text-red-500 font-semibold'
                                : stepInfo.difficulty === 'moderate'
                                  ? 'text-amber-500'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {stepInfo.stepSizeLabel}
                          </span>
                          <div className="text-[10px] text-gray-400">
                            {stepInfo.directionLabel}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sectionPerformers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-sm">No performers in this section</p>
          </div>
        )}
      </div>

      {/* Set dots (quick jump) */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-1 flex-wrap">
        {drillSets.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentSetIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentSetIndex
                ? 'bg-blue-500'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
            title={s.name}
            aria-label={`Go to ${s.name}`}
          />
        ))}
      </div>
    </div>
  );
}

export default SectionLeaderView;
