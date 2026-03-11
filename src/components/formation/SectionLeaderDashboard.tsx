/**
 * SectionLeaderDashboard - Per-section overview with difficulty, performers, and practice notes
 *
 * Side panel (~350px) showing section-specific drill data:
 * 1. Section selector dropdown
 * 2. Performer roster with individual difficulty indicators
 * 3. Per-set difficulty bar chart (color-coded)
 * 4. Transition complexity indicators
 * 5. Practice note editor (localStorage-persisted)
 * 6. Export Section Dot Books placeholder
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Users,
  BarChart3,
  FileText,
  MessageSquare,
  ChevronDown,
  X,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Target,
} from 'lucide-react';
import type { Formation, Performer, DrillSet } from '../../services/formationTypes';
import type { TempoMap } from '../../services/tempoMap';
import { fullDrillAnalysis } from '../../services/drillAnalysis';
import { rateFormation, type DifficultyScore } from '../../services/difficultyRating';
import { generateRehearsalPlan, type RehearsalPlan } from '../../services/rehearsalPlanGenerator';

// ============================================================================
// Types
// ============================================================================

export interface SectionLeaderDashboardProps {
  formation: Formation;
  sets: DrillSet[];
  tempoMap?: TempoMap;
  onNavigateToSet?: (setId: string) => void;
  onClose?: () => void;
}

interface PerSetDifficulty {
  setId: string;
  setName: string;
  score: number;
  label: string;
}

interface TransitionIssue {
  setName: string;
  setId: string;
  performerName: string;
  type: 'stride' | 'direction';
  detail: string;
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

function difficultyColor(score: number): string {
  if (score <= 3) return '#22c55e';
  if (score <= 6) return '#f59e0b';
  if (score <= 8) return '#f97316';
  return '#ef4444';
}

function practiceNoteKey(formationId: string, section: string, setId: string): string {
  return `fluxstudio-practice-note:${formationId}:${section}:${setId}`;
}

function priorityBadgeClasses(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function DifficultyBar({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const widthPct = Math.min(100, (score / maxScore) * 100);
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${widthPct}%`, backgroundColor: difficultyColor(score) }}
      />
    </div>
  );
}

function PracticeNoteEditor({
  formationId,
  section,
  setId,
  setName,
}: {
  formationId: string;
  section: string;
  setId: string;
  setName: string;
}) {
  const key = practiceNoteKey(formationId, section, setId);
  const [note, setNote] = useState(() => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      setNote(value);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          if (value.trim()) {
            localStorage.setItem(key, value);
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          // quota exceeded, silently ignore
        }
      }, 500);
    },
    [key],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
        <MessageSquare className="w-3 h-3" />
        <span>{setName} notes</span>
      </div>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Section-specific rehearsal notes..."
        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 resize-none outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
        rows={2}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SectionLeaderDashboard({
  formation,
  sets,
  tempoMap,
  onNavigateToSet,
  onClose,
}: SectionLeaderDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [rehearsalPlan, setRehearsalPlan] = useState<RehearsalPlan | null>(null);

  const sections = useMemo(() => getUniqueSections(formation.performers), [formation.performers]);

  // Initialize section
  const activeSection = selectedSection || sections[0] || '';

  // Performers in selected section
  const sectionPerformers = useMemo(() => {
    if (!activeSection) return [];
    return formation.performers.filter((p) => p.section === activeSection);
  }, [formation.performers, activeSection]);

  const sectionPerformerIds = useMemo(
    () => new Set(sectionPerformers.map((p) => p.id)),
    [sectionPerformers],
  );

  // Run full analysis
  const analysisResult = useMemo(() => {
    if (sets.length === 0) return null;
    return fullDrillAnalysis(formation, sets, undefined, tempoMap);
  }, [formation, sets, tempoMap]);

  // Overall difficulty
  const overallDifficulty: DifficultyScore | null = useMemo(() => {
    if (!analysisResult) return null;
    return rateFormation(analysisResult, formation, sets);
  }, [analysisResult, formation, sets]);

  // Per-set difficulty for this section's performers
  const perSetDifficulty: PerSetDifficulty[] = useMemo(() => {
    if (!analysisResult || sets.length < 2) return [];
    const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

    return sortedSets.map((set) => {
      // Count issues relevant to this section's performers for this set
      const setIssues = analysisResult.issues.filter(
        (issue) =>
          issue.setId === set.id &&
          issue.performerIds.some((pid) => sectionPerformerIds.has(pid)),
      );
      // Simple score: clamp issue count to 1-10
      const score = Math.min(10, Math.max(1, Math.round(setIssues.length * 1.5 + 1)));
      const label =
        score <= 3 ? 'Easy' : score <= 6 ? 'Moderate' : score <= 8 ? 'Hard' : 'Expert';
      return { setId: set.id, setName: set.name, score, label };
    });
  }, [analysisResult, sets, sectionPerformerIds]);

  // Transition complexity: hardest transitions for this section
  const transitionIssues: TransitionIssue[] = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.issues
      .filter(
        (issue) =>
          (issue.type === 'stride' ||
            issue.type === 'direction_change' ||
            issue.type === 'tempo_aware_stride') &&
          issue.performerIds.some((pid) => sectionPerformerIds.has(pid)),
      )
      .slice(0, 10)
      .map((issue) => ({
        setName: issue.setName ?? '',
        setId: issue.setId ?? '',
        performerName: issue.performerNames[0] ?? 'Unknown',
        type: issue.type === 'direction_change' ? 'direction' : 'stride',
        detail: issue.message,
      }));
  }, [analysisResult, sectionPerformerIds]);

  // Per-performer difficulty indicators
  const performerIssueMap = useMemo(() => {
    if (!analysisResult) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const issue of analysisResult.issues) {
      for (const pid of issue.performerIds) {
        if (sectionPerformerIds.has(pid)) {
          map.set(pid, (map.get(pid) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [analysisResult, sectionPerformerIds]);

  const handleGenerateRehearsalPlan = useCallback(() => {
    if (!activeSection || sets.length < 2) return;
    const plan = generateRehearsalPlan(formation, 60, [activeSection]);
    setRehearsalPlan(plan);
  }, [formation, sets, activeSection]);

  // Clear rehearsal plan when section changes
  useEffect(() => {
    setRehearsalPlan(null);
  }, [activeSection]);

  if (sections.length === 0) {
    return (
      <div
        className="absolute top-0 right-0 bottom-0 w-[350px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col"
        role="complementary"
        aria-label="Section leader dashboard"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Users className="w-4 h-4" />
            Section Dashboard
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-sm text-center">
          No sections defined. Assign sections to performers first.
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-[350px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col"
      role="complementary"
      aria-label="Section leader dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Users className="w-4 h-4" />
          Section Dashboard
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400" aria-label="Close dashboard">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Section Selector */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="relative">
          <select
            value={activeSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full text-sm font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white appearance-none cursor-pointer pr-8"
            aria-label="Select section"
          >
            {sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{sectionPerformers.length} performer{sectionPerformers.length !== 1 ? 's' : ''}</span>
          {overallDifficulty && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: difficultyColor(overallDifficulty.overall) }}
            >
              {overallDifficulty.overall}/10 {overallDifficulty.label}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Performer Roster */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
            <Users className="w-3.5 h-3.5" />
            Roster
          </div>
          <div className="space-y-1">
            {sectionPerformers.map((performer) => {
              const issueCount = performerIssueMap.get(performer.id) ?? 0;
              return (
                <div
                  key={performer.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: performer.color }}
                  >
                    {performer.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {performer.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {[performer.instrument, performer.drillNumber].filter(Boolean).join(' · ') || 'No info'}
                    </div>
                  </div>
                  {issueCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        issueCount >= 5
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : issueCount >= 2
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {issueCount} issue{issueCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Set Difficulty Bars */}
        {perSetDifficulty.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Difficulty by Set
            </div>
            <div className="space-y-2">
              {perSetDifficulty.map((psd) => (
                <div key={psd.setId}>
                  <div className="flex items-center justify-between mb-0.5">
                    <button
                      onClick={() => {
                        onNavigateToSet?.(psd.setId);
                        setExpandedSetId((prev) => (prev === psd.setId ? null : psd.setId));
                      }}
                      className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors"
                    >
                      {psd.setName}
                    </button>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: difficultyColor(psd.score) }}
                    >
                      {psd.score}/10
                    </span>
                  </div>
                  <DifficultyBar score={psd.score} />
                  {/* Practice notes for expanded set */}
                  {expandedSetId === psd.setId && (
                    <PracticeNoteEditor
                      formationId={formation.id}
                      section={activeSection}
                      setId={psd.setId}
                      setName={psd.setName}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transition Complexity */}
        {transitionIssues.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Hard Transitions
            </div>
            <div className="space-y-1.5">
              {transitionIssues.map((ti, i) => (
                <button
                  key={`ti-${i}`}
                  onClick={() => onNavigateToSet?.(ti.setId)}
                  className="w-full text-left flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <ArrowRight
                    className={`w-3 h-3 flex-shrink-0 mt-0.5 ${
                      ti.type === 'direction' ? 'text-orange-400' : 'text-red-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">
                      {ti.performerName} at {ti.setName}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{ti.detail}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rehearsal Plan */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            Rehearsal Plan
          </div>
          {!rehearsalPlan ? (
            <button
              onClick={handleGenerateRehearsalPlan}
              disabled={sets.length < 2}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Rehearsal Plan
            </button>
          ) : (
            <div className="space-y-2">
              {/* Summary */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-2">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{rehearsalPlan.summary}</span>
              </div>

              {/* Blocks */}
              {rehearsalPlan.blocks.map((block) => (
                <div
                  key={block.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5"
                >
                  {/* Block header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Target className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                        {block.sets[0]}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityBadgeClasses(block.priority)}`}
                    >
                      {block.priority}
                    </span>
                  </div>

                  {/* Metadata row */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-1.5">
                    <span>{block.estimatedMinutes} min</span>
                    <span>Difficulty {block.difficultyScore}/10</span>
                  </div>

                  {/* Focus areas */}
                  <ul className="space-y-0.5">
                    {block.focusAreas.map((area, idx) => (
                      <li key={idx} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                        <span className="text-gray-300 dark:text-gray-600 mt-px">&#8226;</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {rehearsalPlan.blocks.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">
                  No rehearsal blocks needed for this section.
                </p>
              )}

              {/* Regenerate button */}
              <button
                onClick={() => setRehearsalPlan(null)}
                className="w-full text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1"
              >
                Clear plan
              </button>
            </div>
          )}
        </div>

        {/* Practice Notes Section */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
            <FileText className="w-3.5 h-3.5" />
            Practice Notes
          </div>
          <p className="text-[11px] text-gray-400 mb-2">
            Click a set name above to expand its practice notes.
          </p>
          <button
            className="w-full text-xs text-left px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            onClick={() => {
              // Future: Export Section Dot Books
            }}
            title="Export Section Dot Books (coming soon)"
          >
            Export Section Dot Books...
          </button>
        </div>
      </div>
    </div>
  );
}

export default SectionLeaderDashboard;
