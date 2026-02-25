/**
 * TeamAlignmentPanel Component
 *
 * A calm, compact panel showing team alignment signals in Project Overview.
 * Helps teams coordinate on decisions, open questions, and next steps
 * without heavy workflow overhead.
 *
 * Features:
 * - Alignment Health indicator (Aligned / Needs attention / Unknown)
 * - Decision acknowledgements (local storage)
 * - Open question ownership (local storage)
 * - Next responder suggestion
 *
 * All signals are client-side only (localStorage) and labeled as "Local signals".
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  HelpCircle,
  Users,
  UserCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Circle,
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/slices/authSlice';
import { useNotifications } from '@/store/slices/notificationSlice';
import {
  makeDecisionId,
  makeQuestionId,
  getDecisionAcks,
  setDecisionAck,
  clearDecisionAck,
  hasUserAcknowledged,
  getQuestionOwner,
  setQuestionOwner,
  clearQuestionOwner,
  computeAlignmentStatus,
  getNextResponderSuggestion,
  AlignmentStatus,
} from '@/utils/teamAlignment';

// ============================================================================
// Types
// ============================================================================

interface Decision {
  text: string;
  decidedBy?: string;
  conversationName?: string;
  conversationId?: string;
}

interface OpenQuestion {
  text: string;
  askedBy?: string;
  conversationName?: string;
  conversationId?: string;
}

interface NextStep {
  id: string;
  text: string;
  priority?: string;
}

type NextStepStatus = 'suggested' | 'accepted' | 'completed';

interface Snapshot {
  decisions: Decision[];
  openQuestions: OpenQuestion[];
  nextSteps: NextStep[];
  aiEnabled?: boolean;
}

interface TeamAlignmentPanelProps {
  projectId: string;
  projectName?: string;
  snapshot: Snapshot | null;
  nextStepStates: Record<string, NextStepStatus>;
  participantCount?: number;
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Alignment health badge with calm, non-alarming styling
 */
const AlignmentHealthBadge: React.FC<{
  status: AlignmentStatus;
  reason: string;
}> = ({ status, reason }) => {
  const config = {
    aligned: {
      label: 'Aligned',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    needs_attention: {
      label: 'Needs attention',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Circle,
    },
    unknown: {
      label: 'Unknown',
      className: 'bg-gray-50 text-gray-500 border-gray-200',
      icon: HelpCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border',
          className
        )}
        title={reason}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
        {label}
      </span>
      <span className="text-xs text-gray-400" title={reason}>
        {reason}
      </span>
    </div>
  );
};

/**
 * Single decision row with acknowledge action
 */
const DecisionRow: React.FC<{
  decision: Decision;
  decisionId: string;
  isAcknowledged: boolean;
  ackCount: number;
  onAcknowledge: () => void;
  onUnacknowledge: () => void;
}> = ({ decision, isAcknowledged, ackCount, onAcknowledge, onUnacknowledge }) => {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <CheckCircle2
        aria-hidden="true"
        className={cn(
          'w-4 h-4 flex-shrink-0 mt-0.5',
          isAcknowledged ? 'text-green-500' : 'text-gray-300'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 line-clamp-2">{decision.text}</p>
        <div className="flex items-center gap-2 mt-1">
          {decision.conversationName && (
            <span className="text-xs text-gray-400">
              from {decision.conversationName}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {ackCount > 0 ? `${ackCount} ack'd` : 'No acks yet'}
          </span>
        </div>
      </div>
      <button
        onClick={isAcknowledged ? onUnacknowledge : onAcknowledge}
        className={cn(
          'text-xs px-2 py-1 rounded transition-colors flex-shrink-0',
          isAcknowledged
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        {isAcknowledged ? "Ack'd" : 'Ack'}
      </button>
    </div>
  );
};

/**
 * Single question row with assign action
 */
const QuestionRow: React.FC<{
  question: OpenQuestion;
  owner: { userName: string } | null;
  onAssignToMe: () => void;
  onUnassign: () => void;
  onDiscuss: () => void;
}> = ({ question, owner, onAssignToMe, onUnassign, onDiscuss }) => {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 line-clamp-2">{question.text}</p>
        <div className="flex items-center gap-2 mt-1">
          {question.conversationName && (
            <span className="text-xs text-gray-400">
              from {question.conversationName}
            </span>
          )}
          {owner ? (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <UserCheck className="w-3 h-3" aria-hidden="true" />
              {owner.userName}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {owner ? (
          <button
            onClick={onUnassign}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Unassign
          </button>
        ) : (
          <button
            onClick={onAssignToMe}
            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Assign to me
          </button>
        )}
        <button
          onClick={onDiscuss}
          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          title="Discuss in messages"
        >
          <MessageSquare className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function TeamAlignmentPanel({
  projectId,
  snapshot,
  nextStepStates,
  participantCount,
  className,
}: TeamAlignmentPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // Collapsed state
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Force re-render trigger for localStorage updates
  const [refreshKey, setRefreshKey] = React.useState(0);
  const forceRefresh = () => setRefreshKey(k => k + 1);

  // Extract data from snapshot
  const decisions = snapshot?.decisions || [];
  const openQuestions = snapshot?.openQuestions || [];
  const displayedDecisions = decisions.slice(0, 3);
  const displayedQuestions = openQuestions.slice(0, 3);

  // Count accepted steps
  const acceptedStepsCount = Object.values(nextStepStates).filter(
    status => status === 'accepted'
  ).length;

  // Compute alignment status
  const alignmentResult = React.useMemo(() => {
    return computeAlignmentStatus({
      decisions: displayedDecisions.map(d => ({
        text: d.text,
        conversationId: d.conversationId,
      })),
      openQuestions: displayedQuestions.map(q => ({
        text: q.text,
        conversationId: q.conversationId,
      })),
      acceptedStepsCount,
      projectId,
      currentUserId: user?.id,
      participantCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayedDecisions,
    displayedQuestions,
    acceptedStepsCount,
    projectId,
    user?.id,
    participantCount,
    refreshKey,
  ]);

  // Get next responder suggestion
  const suggestion = React.useMemo(() => {
    return getNextResponderSuggestion({
      decisions: displayedDecisions.map(d => ({
        text: d.text,
        conversationId: d.conversationId,
      })),
      openQuestions: displayedQuestions.map(q => ({
        text: q.text,
        conversationId: q.conversationId,
      })),
      acceptedStepsCount,
      projectId,
      currentUserId: user?.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayedDecisions,
    displayedQuestions,
    acceptedStepsCount,
    projectId,
    user?.id,
    refreshKey,
  ]);

  // Decision handlers
  const handleAcknowledge = React.useCallback(
    (decision: Decision) => {
      if (!user) return;
      const decisionId = makeDecisionId(decision.text, decision.conversationId);
      setDecisionAck(projectId, decisionId, user.id, user.name || '');
      forceRefresh();
      addNotification({
        type: 'info',
        title: 'Decision acknowledged',
        message: 'Your acknowledgement has been recorded locally',
        priority: 'low',
      });
    },
    [projectId, user, addNotification]
  );

  const handleUnacknowledge = React.useCallback(
    (decision: Decision) => {
      if (!user) return;
      const decisionId = makeDecisionId(decision.text, decision.conversationId);
      clearDecisionAck(projectId, decisionId, user.id);
      forceRefresh();
    },
    [projectId, user]
  );

  // Question handlers
  const handleAssignToMe = React.useCallback(
    (question: OpenQuestion) => {
      if (!user) return;
      const questionId = makeQuestionId(question.text, question.conversationId);
      setQuestionOwner(projectId, questionId, user.id, user.name || '');
      forceRefresh();
      addNotification({
        type: 'info',
        title: 'Question assigned',
        message: `You're now responsible for: "${question.text.slice(0, 50)}..."`,
        priority: 'low',
      });
    },
    [projectId, user, addNotification]
  );

  const handleUnassign = React.useCallback(
    (question: OpenQuestion) => {
      const questionId = makeQuestionId(question.text, question.conversationId);
      clearQuestionOwner(projectId, questionId);
      forceRefresh();
    },
    [projectId]
  );

  const handleDiscuss = React.useCallback(
    (questionText: string) => {
      const prefill = encodeURIComponent(`Let's discuss: "${questionText}"`);
      navigate(`/messages?projectId=${projectId}&prefill=${prefill}`);
    },
    [navigate, projectId]
  );

  // Navigate to messages with suggestion prefill
  const handleSuggestionAction = React.useCallback(() => {
    if (suggestion.prefillText) {
      const prefill = encodeURIComponent(suggestion.prefillText);
      navigate(`/messages?projectId=${projectId}&prefill=${prefill}`);
    } else {
      navigate(`/messages?projectId=${projectId}`);
    }
  }, [navigate, projectId, suggestion.prefillText]);

  // Get ack info for a decision
  const getDecisionAckInfo = React.useCallback(
    (decision: Decision) => {
      const decisionId = makeDecisionId(decision.text, decision.conversationId);
      const acks = getDecisionAcks(projectId);
      const decisionAcks = acks[decisionId] || [];
      const isAcknowledged = user
        ? hasUserAcknowledged(projectId, decisionId, user.id)
        : false;
      return { isAcknowledged, ackCount: decisionAcks.length };
    },
    [projectId, user]
  );

  // Get owner info for a question
  const getQuestionOwnerInfo = React.useCallback(
    (question: OpenQuestion) => {
      const questionId = makeQuestionId(question.text, question.conversationId);
      return getQuestionOwner(projectId, questionId);
    },
    [projectId]
  );

  // Don't render if no meaningful data
  if (
    displayedDecisions.length === 0 &&
    displayedQuestions.length === 0 &&
    acceptedStepsCount === 0
  ) {
    return null;
  }

  return (
    <Card className={cn('border-gray-200', className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <h4 className="text-sm font-medium text-gray-700">Team Alignment</h4>
            <span className="text-xs text-gray-400">(Local signals)</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Alignment Health */}
        <AlignmentHealthBadge
          status={alignmentResult.status}
          reason={alignmentResult.reason}
        />

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Decisions Section */}
            {displayedDecisions.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Decisions ({displayedDecisions.length})
                </h5>
                <div className="bg-gray-50 rounded-lg p-2">
                  {displayedDecisions.map((decision, idx) => {
                    const decisionId = makeDecisionId(
                      decision.text,
                      decision.conversationId
                    );
                    const { isAcknowledged, ackCount } = getDecisionAckInfo(decision);
                    return (
                      <DecisionRow
                        key={decisionId || idx}
                        decision={decision}
                        decisionId={decisionId}
                        isAcknowledged={isAcknowledged}
                        ackCount={ackCount}
                        onAcknowledge={() => handleAcknowledge(decision)}
                        onUnacknowledge={() => handleUnacknowledge(decision)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Open Questions Section */}
            {displayedQuestions.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Open Questions ({displayedQuestions.length})
                </h5>
                <div className="bg-gray-50 rounded-lg p-2">
                  {displayedQuestions.map((question, idx) => {
                    const questionId = makeQuestionId(
                      question.text,
                      question.conversationId
                    );
                    const owner = getQuestionOwnerInfo(question);
                    return (
                      <QuestionRow
                        key={questionId || idx}
                        question={question}
                        owner={owner}
                        onAssignToMe={() => handleAssignToMe(question)}
                        onUnassign={() => handleUnassign(question)}
                        onDiscuss={() => handleDiscuss(question.text)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Responder Suggestion */}
            {suggestion.action && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{suggestion.suggestion}</p>
                  {suggestion.action === 'discuss' ||
                  suggestion.action === 'acknowledge_decision' ||
                  suggestion.action === 'assign_question' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestionAction}
                      className="text-xs"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" aria-hidden="true" />
                      Open Messages
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Footer */}
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              Signals are lightweight and project-scoped
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
