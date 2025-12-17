/**
 * ConversationSummary Component
 *
 * Displays a summary of a conversation including:
 * - Auto-generated summary text (placeholder for AI integration)
 * - Key decisions made in the conversation
 * - Open questions / action items
 * - Participant activity overview
 *
 * This is a scaffold for future AI-powered summaries.
 *
 * Usage:
 * <ConversationSummary
 *   conversationId={conversationId}
 *   summary={summaryData}
 *   onClose={() => setShowSummary(false)}
 * />
 */

import * as React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Users,
  Clock,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface KeyDecision {
  id: string;
  text: string;
  decidedBy?: string;
  timestamp?: Date;
}

interface OpenQuestion {
  id: string;
  text: string;
  askedBy?: string;
  timestamp?: Date;
}

interface ParticipantActivity {
  userId: string;
  name: string;
  avatar?: string;
  messageCount: number;
  lastActive?: Date;
}

export interface ConversationSummaryData {
  /** AI-generated or extracted summary text */
  summaryText?: string;
  /** Key decisions made in conversation */
  keyDecisions?: KeyDecision[];
  /** Open questions that need answers */
  openQuestions?: OpenQuestion[];
  /** Participant activity stats */
  participantActivity?: ParticipantActivity[];
  /** When the summary was last generated */
  generatedAt?: Date;
  /** Whether summary is currently being generated */
  isGenerating?: boolean;
  /** Error if summary generation failed */
  error?: string;
}

interface ConversationSummaryProps {
  /** Conversation ID */
  conversationId: string;
  /** Summary data */
  summary?: ConversationSummaryData;
  /** Whether the panel is loading */
  isLoading?: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Callback to refresh/regenerate summary */
  onRefresh?: () => void;
  /** Additional class name */
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
      <Icon className="w-4 h-4 text-neutral-500" />
      <span className="flex-1 text-left">{title}</span>
      {count !== undefined && (
        <span className="text-xs bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
      {onToggle && (
        isExpanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )
      )}
    </button>
  );
}

function EmptySummaryState({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        No Summary Yet
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-[200px]">
        Summary generation will be available in a future update.
      </p>
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
            'bg-primary-600 text-white',
            'opacity-50 cursor-not-allowed'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Generate Summary
        </button>
      )}
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 animate-pulse">
        <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
      </div>
      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        Generating Summary...
      </h4>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Analyzing conversation content
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConversationSummary({
  conversationId,
  summary,
  isLoading,
  onClose,
  onRefresh,
  className,
}: ConversationSummaryProps) {
  const [decisionsExpanded, setDecisionsExpanded] = React.useState(true);
  const [questionsExpanded, setQuestionsExpanded] = React.useState(true);
  const [activityExpanded, setActivityExpanded] = React.useState(false);

  const hasContent = summary && (
    summary.summaryText ||
    (summary.keyDecisions && summary.keyDecisions.length > 0) ||
    (summary.openQuestions && summary.openQuestions.length > 0)
  );

  return (
    <div
      className={cn(
        'w-80 flex flex-col h-full',
        'bg-white dark:bg-neutral-900',
        'border-l border-neutral-200 dark:border-neutral-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Summary
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && hasContent && (
            <button
              onClick={onRefresh}
              disabled={summary?.isGenerating}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                summary?.isGenerating && 'opacity-50 cursor-not-allowed'
              )}
              title="Refresh summary"
            >
              <RefreshCw className={cn('w-4 h-4', summary?.isGenerating && 'animate-spin')} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Close summary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <GeneratingState />
        ) : summary?.isGenerating ? (
          <GeneratingState />
        ) : summary?.error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400">{summary.error}</p>
          </div>
        ) : !hasContent ? (
          <EmptySummaryState onGenerate={onRefresh} />
        ) : (
          <div className="p-3 space-y-4">
            {/* Summary Text */}
            {summary?.summaryText && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {summary.summaryText}
                </p>
                {summary.generatedAt && (
                  <p className="text-[10px] text-neutral-400 mt-2">
                    Generated {formatRelativeTime(summary.generatedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Key Decisions */}
            {summary?.keyDecisions && summary.keyDecisions.length > 0 && (
              <div>
                <SectionHeader
                  icon={CheckCircle2}
                  title="Key Decisions"
                  count={summary.keyDecisions.length}
                  isExpanded={decisionsExpanded}
                  onToggle={() => setDecisionsExpanded(!decisionsExpanded)}
                />
                {decisionsExpanded && (
                  <ul className="mt-2 space-y-2 pl-2">
                    {summary.keyDecisions.map((decision) => (
                      <li
                        key={decision.id}
                        className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{decision.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Open Questions */}
            {summary?.openQuestions && summary.openQuestions.length > 0 && (
              <div>
                <SectionHeader
                  icon={HelpCircle}
                  title="Open Questions"
                  count={summary.openQuestions.length}
                  isExpanded={questionsExpanded}
                  onToggle={() => setQuestionsExpanded(!questionsExpanded)}
                />
                {questionsExpanded && (
                  <ul className="mt-2 space-y-2 pl-2">
                    {summary.openQuestions.map((question) => (
                      <li
                        key={question.id}
                        className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{question.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Participant Activity */}
            {summary?.participantActivity && summary.participantActivity.length > 0 && (
              <div>
                <SectionHeader
                  icon={Users}
                  title="Participant Activity"
                  count={summary.participantActivity.length}
                  isExpanded={activityExpanded}
                  onToggle={() => setActivityExpanded(!activityExpanded)}
                />
                {activityExpanded && (
                  <ul className="mt-2 space-y-2">
                    {summary.participantActivity.map((participant) => (
                      <li
                        key={participant.userId}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        {participant.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {participant.name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {participant.messageCount} messages
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with timestamp */}
      {hasContent && summary?.generatedAt && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-[10px] text-neutral-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated {formatRelativeTime(summary.generatedAt)}
          </p>
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
