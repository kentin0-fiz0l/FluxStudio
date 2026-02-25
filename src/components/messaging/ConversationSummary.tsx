/**
 * ConversationSummary Component
 *
 * Displays AI-generated summaries with pulse-aware tone and clarity-aware detail.
 * Integrates with the summary API endpoints for fetching and generating summaries.
 *
 * Features:
 * - Fetch stored summary on mount
 * - Generate/refresh summary via API
 * - Subtle tone styling based on pulse (calm/neutral/intense)
 * - Loading, error, and empty states
 * - Project context awareness
 *
 * Usage:
 * <ConversationSummary
 *   conversationId={conversationId}
 *   projectId={projectId}
 *   onClose={() => setShowSummary(false)}
 * />
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/apiService';

// ============================================================================
// Types
// ============================================================================

type PulseTone = 'calm' | 'neutral' | 'intense';
type ClarityState = 'focused' | 'mixed' | 'uncertain';

interface SummaryContent {
  summary?: string[];
  decisions?: Array<{ text: string; decidedBy?: string }>;
  openQuestions?: Array<{ text: string; askedBy?: string }>;
  nextSteps?: Array<{ text: string; priority?: string }>;
  sentiment?: string;
}

interface SummaryData {
  id: string;
  conversationId: string;
  projectId?: string;
  content: SummaryContent;
  pulseTone: PulseTone;
  clarityState: ClarityState;
  signalMetrics?: Record<string, number>;
  generatedBy: string;
  messageCount: number;
  updatedAt: string;
}

interface ConversationSummaryProps {
  conversationId: string;
  projectId?: string | null;
  onClose: () => void;
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function SectionHeader({
  icon: Icon,
  title,
  count,
  isExpanded,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
        'text-sm font-medium text-neutral-700 dark:text-neutral-300',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
        onToggle && 'cursor-pointer'
      )}
    >
      <Icon className="w-4 h-4 text-neutral-500" aria-hidden="true" />
      <span className="flex-1 text-left">{title}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
      {onToggle && (
        isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
        )
      )}
    </button>
  );
}

function EmptySummaryState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        No Summary Yet
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-[200px]">
        Generate a summary to see key decisions, open questions, and next steps.
      </p>
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
          'bg-primary-600 text-white hover:bg-primary-700',
          'transition-colors',
          isGenerating && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isGenerating ? (
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="w-4 h-4" aria-hidden="true" />
        )}
        {isGenerating ? 'Generating...' : 'Generate Summary'}
      </button>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 animate-pulse">
        <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        Analyzing Conversation...
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Extracting key insights and action items
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mb-2" aria-hidden="true" />
      <p className="text-xs text-neutral-500">Loading summary...</p>
    </div>
  );
}

/**
 * Subtle tone indicator - doesn't use loud badges
 */
function ToneIndicator({
  pulseTone,
  clarityState,
}: {
  pulseTone: PulseTone;
  clarityState: ClarityState;
}) {
  const pulseConfig = {
    calm: { icon: Activity, label: 'Steady pace', color: 'text-green-600 dark:text-green-400' },
    neutral: { icon: Activity, label: 'Active', color: 'text-blue-600 dark:text-blue-400' },
    intense: { icon: Zap, label: 'High activity', color: 'text-orange-600 dark:text-orange-400' },
  };

  const clarityConfig = {
    focused: { icon: Target, label: 'Clear direction', color: 'text-green-600 dark:text-green-400' },
    mixed: { icon: Target, label: 'Mixed signals', color: 'text-yellow-600 dark:text-yellow-400' },
    uncertain: { icon: HelpCircle, label: 'Needs clarity', color: 'text-orange-600 dark:text-orange-400' },
  };

  const pulse = pulseConfig[pulseTone];
  const clarity = clarityConfig[clarityState];

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-neutral-500 dark:text-neutral-400">
      <div className="flex items-center gap-1">
        <pulse.icon className={cn('w-3 h-3', pulse.color)} aria-hidden="true" />
        <span>{pulse.label}</span>
      </div>
      <span className="text-neutral-300 dark:text-neutral-600">|</span>
      <div className="flex items-center gap-1">
        <clarity.icon className={cn('w-3 h-3', clarity.color)} aria-hidden="true" />
        <span>{clarity.label}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConversationSummary({
  conversationId,
  projectId,
  onClose,
  className,
}: ConversationSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [decisionsExpanded, setDecisionsExpanded] = useState(true);
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const [nextStepsExpanded, setNextStepsExpanded] = useState(true);

  // Fetch summary on mount
  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint = projectId
        ? `/projects/${projectId}/conversations/${conversationId}/summary`
        : `/conversations/${conversationId}/summary`;

      const result = await apiService.get<{ success?: boolean; summary?: SummaryData }>(endpoint);

      if (result.data?.success && result.data.summary) {
        setSummary(result.data.summary);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      // Don't show error for initial fetch - just show empty state
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, projectId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Generate or refresh summary
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const endpoint = projectId
        ? `/projects/${projectId}/conversations/${conversationId}/summary/generate`
        : `/conversations/${conversationId}/summary/generate`;

      const result = await apiService.post<{ success?: boolean; summary?: SummaryData }>(endpoint);

      if (result.data?.success && result.data.summary) {
        setSummary(result.data.summary);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const content = summary?.content;
  const hasContent = content && (
    (content.summary && content.summary.length > 0) ||
    (content.decisions && content.decisions.length > 0) ||
    (content.openQuestions && content.openQuestions.length > 0) ||
    (content.nextSteps && content.nextSteps.length > 0)
  );

  // Tone-based styling (subtle background tint)
  const toneStyles = {
    calm: 'bg-white dark:bg-neutral-900',
    neutral: 'bg-white dark:bg-neutral-900',
    intense: 'bg-orange-50/30 dark:bg-orange-950/10',
  };

  return (
    <div
      className={cn(
        'w-80 flex flex-col h-full',
        toneStyles[summary?.pulseTone || 'neutral'],
        'border-l border-neutral-200 dark:border-neutral-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" aria-hidden="true" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Summary
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {hasContent && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                isGenerating && 'opacity-50 cursor-not-allowed'
              )}
              title="Refresh summary"
            >
              <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Close summary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tone Indicator (when summary exists) */}
      {summary && (
        <ToneIndicator
          pulseTone={summary.pulseTone}
          clarityState={summary.clarityState}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : isGenerating ? (
          <GeneratingState />
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={handleGenerate}
              className="text-xs text-primary-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !hasContent ? (
          <EmptySummaryState onGenerate={handleGenerate} isGenerating={isGenerating} />
        ) : (
          <div className="p-3 space-y-4">
            {/* Summary Bullets */}
            {content?.summary && content.summary.length > 0 && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg space-y-2">
                {content.summary.map((bullet, idx) => (
                  <p
                    key={idx}
                    className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed"
                  >
                    {bullet}
                  </p>
                ))}
              </div>
            )}

            {/* Key Decisions */}
            {content?.decisions && content.decisions.length > 0 && (
              <div>
                <SectionHeader
                  icon={CheckCircle2}
                  title="Key Decisions"
                  count={content.decisions.length}
                  isExpanded={decisionsExpanded}
                  onToggle={() => setDecisionsExpanded(!decisionsExpanded)}
                />
                {decisionsExpanded && (
                  <ul className="mt-2 space-y-2 pl-2">
                    {content.decisions.map((decision, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <span>{decision.text}</span>
                          {decision.decidedBy && (
                            <span className="text-xs text-neutral-400 ml-1">
                              ({decision.decidedBy})
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Open Questions */}
            {content?.openQuestions && content.openQuestions.length > 0 && (
              <div>
                <SectionHeader
                  icon={HelpCircle}
                  title="Open Questions"
                  count={content.openQuestions.length}
                  isExpanded={questionsExpanded}
                  onToggle={() => setQuestionsExpanded(!questionsExpanded)}
                />
                {questionsExpanded && (
                  <ul className="mt-2 space-y-2 pl-2">
                    {content.openQuestions.map((question, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <span>{question.text}</span>
                          {question.askedBy && (
                            <span className="text-xs text-neutral-400 ml-1">
                              (asked by {question.askedBy})
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Next Steps */}
            {content?.nextSteps && content.nextSteps.length > 0 && (
              <div>
                <SectionHeader
                  icon={ArrowRight}
                  title="Next Steps"
                  count={content.nextSteps.length}
                  isExpanded={nextStepsExpanded}
                  onToggle={() => setNextStepsExpanded(!nextStepsExpanded)}
                />
                {nextStepsExpanded && (
                  <ul className="mt-2 space-y-2 pl-2">
                    {content.nextSteps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <ArrowRight aria-hidden="true" className={cn(
                          'w-4 h-4 flex-shrink-0 mt-0.5',
                          step.priority === 'high' ? 'text-red-500' :
                          step.priority === 'medium' ? 'text-amber-500' :
                          'text-blue-500'
                        )} />
                        <div>
                          <span>{step.text}</span>
                          {step.priority && (
                            <span className={cn(
                              'text-[10px] ml-1 px-1 py-0.5 rounded',
                              step.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              step.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>
                              {step.priority}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Sentiment (subtle) */}
            {content?.sentiment && (
              <p className="text-[10px] text-neutral-400 text-center mt-4">
                Conversation tone: {content.sentiment}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer with timestamp and source */}
      {summary && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatRelativeTime(new Date(summary.updatedAt))}
            </span>
            <span>
              {summary.generatedBy === 'disabled' ? 'Basic analysis' :
               summary.generatedBy === 'disabled-fallback' ? 'Fallback' :
               summary.generatedBy?.includes('ai') ? 'AI generated' : 'System'}
              {summary.messageCount > 0 && ` · ${summary.messageCount} msgs`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default ConversationSummary;
