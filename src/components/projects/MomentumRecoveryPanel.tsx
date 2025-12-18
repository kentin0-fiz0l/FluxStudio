/**
 * MomentumRecoveryPanel Component
 *
 * A calm, contextual UI panel that appears after a momentum stall notification
 * to help users intentionally restart progress. Displays above the Next Steps
 * section in Project Overview.
 *
 * Recovery Options:
 * A) Resume - Encourage accepting/completing a next step
 * B) Clarify - Address open questions via Messages
 * C) Reset - Clear accepted steps (local state only)
 *
 * Auto-dismisses when:
 * - User takes a meaningful action (accepts/completes step)
 * - User navigates to Messages to discuss
 * - User manually dismisses
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquare, RefreshCw, X, HelpCircle } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { clearRecovery } from '@/utils/momentumRecovery';

// ============================================================================
// Types
// ============================================================================

interface NextStep {
  id: string;
  text: string;
  priority?: string;
}

interface OpenQuestion {
  text: string;
  conversationName?: string;
}

interface Snapshot {
  openQuestions?: OpenQuestion[];
  aiEnabled?: boolean;
}

type NextStepStatus = 'suggested' | 'accepted' | 'completed';

interface MomentumRecoveryPanelProps {
  projectId: string;
  projectName?: string;
  snapshot: Snapshot | null;
  nextSteps: NextStep[];
  nextStepStates: Record<string, NextStepStatus>;
  onAcceptStep: (stepId: string) => void;
  onClearAcceptedSteps?: () => void;
  onDismiss: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function MomentumRecoveryPanel({
  projectId,
  projectName,
  snapshot,
  nextSteps,
  nextStepStates,
  onAcceptStep,
  onClearAcceptedSteps,
  onDismiss,
  className,
}: MomentumRecoveryPanelProps) {
  const navigate = useNavigate();

  // Get step status helper
  const getStepStatus = (stepId: string): NextStepStatus => {
    return nextStepStates[stepId] || 'suggested';
  };

  // Get actionable steps (accepted first, then suggested, max 3)
  const actionableSteps = React.useMemo(() => {
    const accepted = nextSteps.filter(s => getStepStatus(s.id) === 'accepted');
    const suggested = nextSteps.filter(s => getStepStatus(s.id) === 'suggested');

    // Prioritize by priority within each group
    const sortByPriority = (a: NextStep, b: NextStep) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = order[a.priority || ''] ?? 3;
      const bPriority = order[b.priority || ''] ?? 3;
      return aPriority - bPriority;
    };

    accepted.sort(sortByPriority);
    suggested.sort(sortByPriority);

    return [...accepted, ...suggested].slice(0, 3);
  }, [nextSteps, nextStepStates]);

  // Get open questions (max 2)
  const openQuestions = React.useMemo(() => {
    return (snapshot?.openQuestions || []).slice(0, 2);
  }, [snapshot]);

  // Count of accepted steps (for reset option)
  const acceptedCount = React.useMemo(() => {
    return Object.values(nextStepStates).filter(s => s === 'accepted').length;
  }, [nextStepStates]);

  // Handle step action
  const handleStepAction = (step: NextStep) => {
    const status = getStepStatus(step.id);
    if (status === 'suggested') {
      onAcceptStep(step.id);
    }
    // Auto-dismiss after action
    handleDismiss();
  };

  // Handle discuss in messages
  const handleDiscuss = () => {
    const prefillText = encodeURIComponent(
      "Quick clarity check — what's blocking progress here?"
    );
    navigate(`/messages?projectId=${projectId}&prefill=${prefillText}`);
    handleDismiss();
  };

  // Handle reset accepted steps
  const handleReset = () => {
    if (onClearAcceptedSteps) {
      onClearAcceptedSteps();
    }
    handleDismiss();
  };

  // Handle dismiss
  const handleDismiss = () => {
    clearRecovery(projectId);
    onDismiss();
  };

  // Determine which options to show
  const hasSteps = actionableSteps.length > 0;
  const hasQuestions = openQuestions.length > 0;
  const hasAcceptedSteps = acceptedCount > 0;

  return (
    <Card className={cn(
      'border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/30',
      className
    )}>
      <CardContent className="py-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Let's restart momentum
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {projectName
                ? `${projectName} has been quiet — what's the best next move?`
                : "This project's been quiet — what's the best next move?"
              }
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
            aria-label="Dismiss recovery panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recovery Options */}
        <div className="space-y-4">
          {/* Option A: Resume - Show actionable steps */}
          {hasSteps && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Resume
              </h4>
              <div className="space-y-2">
                {actionableSteps.map((step) => {
                  const status = getStepStatus(step.id);
                  const isAccepted = status === 'accepted';

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg border transition-colors',
                        isAccepted
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-white border-gray-200 hover:border-indigo-300'
                      )}
                    >
                      <ArrowRight className={cn(
                        'w-4 h-4 flex-shrink-0',
                        step.priority === 'high' ? 'text-red-500' :
                        step.priority === 'medium' ? 'text-amber-500' :
                        'text-blue-500'
                      )} />
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {step.text}
                      </span>
                      {!isAccepted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStepAction(step)}
                          className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          Accept
                        </Button>
                      )}
                      {isAccepted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                          accepted
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option B: Clarify - Show open questions */}
          {hasQuestions && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Clarify
              </h4>
              <div className="space-y-2">
                {openQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-white"
                  >
                    <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    <span className="flex-1 text-sm text-gray-600 truncate">
                      {q.text}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscuss}
                className="w-full text-xs h-8 gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Discuss in Messages
              </Button>
            </div>
          )}

          {/* Option C: Reset - Only if there are accepted steps */}
          {hasAcceptedSteps && onClearAcceptedSteps && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear {acceptedCount} accepted step{acceptedCount > 1 ? 's' : ''} and start fresh
              </button>
            </div>
          )}

          {/* Fallback when no options available */}
          {!hasSteps && !hasQuestions && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">
                No pending items right now.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscuss}
                className="mt-2 text-xs h-8 gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Start a conversation
              </Button>
            </div>
          )}
        </div>

        {/* Subtle dismiss option */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-center">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Not now
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MomentumRecoveryPanel;
