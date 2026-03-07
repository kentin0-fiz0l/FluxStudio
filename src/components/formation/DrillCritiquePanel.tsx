/**
 * DrillCritiquePanel Component
 *
 * In-editor AI-powered drill critique panel. Runs the local drill analysis
 * engine and presents results with a scored ring, category breakdowns,
 * and actionable suggestions that can highlight involved performers.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Play,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { Formation, DrillSet, Position } from '@/services/formationTypes';
import {
  generateDrillCritique,
  type DrillCritiqueResult,
  type DrillCritiqueCategory,
  type DrillSuggestion,
} from '@/services/drillAiService';

// ============================================================================
// Types
// ============================================================================

interface DrillCritiquePanelProps {
  /** Current formation data */
  formation: Formation;
  /** Drill sets for analysis */
  sets: DrillSet[];
  /** Current performer positions (for the active keyframe) */
  currentPositions: Map<string, Position>;
  /** Callback to highlight specific performers on the canvas */
  onHighlightPerformers: (ids: string[]) => void;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Score Ring
// ============================================================================

interface ScoreRingProps {
  score: number;
  size?: number;
}

function ScoreRing({ score, size = 80 }: ScoreRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const getColor = (value: number): string => {
    if (value >= 80) return '#22c55e'; // green-500
    if (value >= 60) return '#eab308'; // yellow-500
    if (value >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const color = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Score ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[9px] text-gray-400 dark:text-gray-500 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Category Bar
// ============================================================================

interface CategoryBarProps {
  category: DrillCritiqueCategory;
}

function CategoryBar({ category }: CategoryBarProps) {
  const getBarColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTextColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {category.name}
        </span>
        <span className={`text-xs font-bold ${getTextColor(category.score)}`}>
          {category.score}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(category.score)}`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        {category.details}
      </p>
    </div>
  );
}

// ============================================================================
// Suggestion Item
// ============================================================================

interface SuggestionItemProps {
  suggestion: DrillSuggestion;
  onHighlight: (ids: string[]) => void;
}

function SuggestionItem({ suggestion, onHighlight }: SuggestionItemProps) {
  const { t } = useTranslation('common');
  const getPriorityStyles = (priority: DrillSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return {
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          border: 'border-l-red-500',
        };
      case 'medium':
        return {
          badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          border: 'border-l-yellow-500',
        };
      case 'low':
        return {
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          border: 'border-l-blue-500',
        };
    }
  };

  const getTypeIcon = (type: DrillSuggestion['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-hidden="true" />;
      case 'improvement':
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />;
      case 'tip':
        return <Lightbulb className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-hidden="true" />;
    }
  };

  const styles = getPriorityStyles(suggestion.priority);
  const hasPerformers = suggestion.performerIds && suggestion.performerIds.length > 0;

  return (
    <div
      className={`border-l-2 ${styles.border} rounded-r-md bg-gray-50 dark:bg-gray-800/50 px-3 py-2`}
    >
      <div className="flex items-start gap-2">
        {getTypeIcon(suggestion.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${styles.badge}`}
            >
              {suggestion.priority}
            </span>
            {suggestion.setName && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {suggestion.setName}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {suggestion.message}
          </p>
          {hasPerformers && (
            <button
              onClick={() => onHighlight(suggestion.performerIds!)}
              className="flex items-center gap-1 mt-1.5 text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none rounded"
              aria-label={`Highlight ${suggestion.performerIds!.length} involved performers`}
            >
              <Users className="w-3 h-3" aria-hidden="true" />
              {t('formation.drillCritique.highlightPerformers', 'Highlight {{count}} performer(s)', { count: suggestion.performerIds!.length })}
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DrillCritiquePanel({
  formation,
  sets,
  currentPositions: _currentPositions,
  onHighlightPerformers,
  className = '',
}: DrillCritiquePanelProps) {
  const { t } = useTranslation('common');
  const [result, setResult] = useState<DrillCritiqueResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCategories, setShowCategories] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(() => {
    return formation.performers.length > 0 && sets.length > 0;
  }, [formation.performers.length, sets.length]);

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Run analysis (synchronous, but wrapped in setTimeout for UI responsiveness)
      setTimeout(() => {
        try {
          const critique = generateDrillCritique({
            formation,
            sets,
          });
          setResult(critique);
          setIsAnalyzing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Analysis failed');
          setIsAnalyzing(false);
        }
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsAnalyzing(false);
    }
  }, [canAnalyze, formation, sets]);

  const highPrioritySuggestions = result?.suggestions.filter((s) => s.priority === 'high') ?? [];
  const otherSuggestions = result?.suggestions.filter((s) => s.priority !== 'high') ?? [];

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('formation.drillCritique.title', 'Drill Critique')}
          </span>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !canAnalyze}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none transition-colors"
          aria-label={result ? 'Re-analyze drill' : 'Analyze drill'}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              {t('formation.drillCritique.analyzing', 'Analyzing...')}
            </>
          ) : result ? (
            <>
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              {t('formation.drillCritique.reAnalyze', 'Re-analyze')}
            </>
          ) : (
            <>
              <Play className="w-3 h-3" aria-hidden="true" />
              {t('formation.drillCritique.analyze', 'Analyze')}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!result && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t('formation.drillCritique.analyzeYourDrill', 'Analyze your drill')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
              {t('formation.drillCritique.description', 'Check spacing, stride feasibility, and movement flow across all sets.')}
            </p>
            {!canAnalyze && (
              <p className="text-xs text-amber-500 mt-2">
                {t('formation.drillCritique.addPerformersFirst', 'Add performers and sets before analyzing.')}
              </p>
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" aria-hidden="true" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Analyzing {sets.length} set{sets.length !== 1 ? 's' : ''} with{' '}
              {formation.performers.length} performer{formation.performers.length !== 1 ? 's' : ''}...
            </p>
          </div>
        )}

        {result && !isAnalyzing && (
          <div className="p-3 space-y-4">
            {/* Overall Score */}
            <div className="flex items-center gap-4">
              <ScoreRing score={result.overallScore} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t('formation.drillCritique.overallScore', 'Overall Score')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {result.summary}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center justify-between w-full text-left py-1 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none rounded"
                aria-expanded={showCategories}
              >
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {t('formation.drillCritique.categories', 'Categories')}
                </span>
                {showCategories ? (
                  <ChevronUp className="w-3 h-3 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-400" aria-hidden="true" />
                )}
              </button>
              {showCategories && (
                <div className="mt-2 space-y-3">
                  {result.categories.map((category) => (
                    <CategoryBar key={category.name} category={category} />
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center justify-between w-full text-left py-1 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none rounded"
                  aria-expanded={showSuggestions}
                >
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('formation.drillCritique.suggestions', 'Suggestions ({{count}})', { count: result.suggestions.length })}
                  </span>
                  {showSuggestions ? (
                    <ChevronUp className="w-3 h-3 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-400" aria-hidden="true" />
                  )}
                </button>
                {showSuggestions && (
                  <div className="mt-2 space-y-2">
                    {/* High priority first */}
                    {highPrioritySuggestions.map((suggestion, i) => (
                      <SuggestionItem
                        key={`high-${i}`}
                        suggestion={suggestion}
                        onHighlight={onHighlightPerformers}
                      />
                    ))}
                    {/* Others */}
                    {otherSuggestions.map((suggestion, i) => (
                      <SuggestionItem
                        key={`other-${i}`}
                        suggestion={suggestion}
                        onHighlight={onHighlightPerformers}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analysis metadata */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Analyzed {result.analysisData.summary.totalIssues} potential issues across{' '}
                {sets.length} set{sets.length !== 1 ? 's' : ''}.{' '}
                {result.analysisData.summary.performersWithIssues > 0 &&
                  `${result.analysisData.summary.performersWithIssues} performer${
                    result.analysisData.summary.performersWithIssues !== 1 ? 's' : ''
                  } involved.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default DrillCritiquePanel;
