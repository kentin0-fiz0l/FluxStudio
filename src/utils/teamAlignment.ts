/**
 * Team Alignment Utilities
 *
 * Client-side utilities for tracking team alignment signals:
 * - Decision acknowledgements
 * - Open question ownership
 * - Alignment status computation
 *
 * All data is stored in localStorage and labeled as "Local signals"
 * since we don't have reliable backend persistence for these yet.
 */

// ============================================================================
// Types
// ============================================================================

export interface DecisionAck {
  userId: string;
  userName: string;
  acknowledgedAt: string;
}

export interface DecisionAcks {
  [decisionId: string]: DecisionAck[];
}

export interface QuestionOwner {
  userId: string;
  userName: string;
  assignedAt: string;
}

export interface QuestionOwners {
  [questionId: string]: QuestionOwner;
}

export type AlignmentStatus = 'aligned' | 'needs_attention' | 'unknown';

export interface AlignmentResult {
  status: AlignmentStatus;
  score: number;
  reason: string;
  breakdown: {
    decisionScore: number;
    questionScore: number;
    momentumScore: number;
  };
}

export interface AlignmentInput {
  decisions: Array<{ text: string; conversationId?: string }>;
  openQuestions: Array<{ text: string; conversationId?: string }>;
  acceptedStepsCount: number;
  projectId: string;
  currentUserId?: string;
  participantCount?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DECISION_ACK_KEY_PREFIX = 'fluxstudio_decision_ack_';
const QUESTION_OWNER_KEY_PREFIX = 'fluxstudio_question_owner_';

// Scoring weights (total = 100)
const DECISION_WEIGHT = 40;
const QUESTION_WEIGHT = 40;
const MOMENTUM_WEIGHT = 20;

// Alignment thresholds
const ALIGNED_THRESHOLD = 70;

// ============================================================================
// Stable ID Generation
// ============================================================================

/**
 * Generate a stable ID from text content, optionally salted with additional context.
 * Uses a simple hash algorithm for deterministic IDs across sessions.
 */
export function makeStableId(text: string, salt?: string): string {
  const input = salt ? `${text}::${salt}` : text;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `id_${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a stable decision ID from decision text and optional conversation context.
 */
export function makeDecisionId(text: string, conversationId?: string): string {
  return makeStableId(text, conversationId || 'global');
}

/**
 * Generate a stable question ID from question text and optional conversation context.
 */
export function makeQuestionId(text: string, conversationId?: string): string {
  return makeStableId(text, conversationId || 'global');
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

function getDecisionAckKey(projectId: string): string {
  return `${DECISION_ACK_KEY_PREFIX}${projectId}`;
}

function getQuestionOwnerKey(projectId: string): string {
  return `${QUESTION_OWNER_KEY_PREFIX}${projectId}`;
}

// ============================================================================
// Decision Acknowledgement
// ============================================================================

/**
 * Get all decision acknowledgements for a project.
 */
export function getDecisionAcks(projectId: string): DecisionAcks {
  try {
    const stored = localStorage.getItem(getDecisionAckKey(projectId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return {};
}

/**
 * Check if a specific user has acknowledged a decision.
 */
export function hasUserAcknowledged(
  projectId: string,
  decisionId: string,
  userId: string
): boolean {
  const acks = getDecisionAcks(projectId);
  const decisionAcks = acks[decisionId] || [];
  return decisionAcks.some(ack => ack.userId === userId);
}

/**
 * Get acknowledgement count for a decision.
 */
export function getAckCount(projectId: string, decisionId: string): number {
  const acks = getDecisionAcks(projectId);
  return (acks[decisionId] || []).length;
}

/**
 * Acknowledge a decision for a user.
 */
export function setDecisionAck(
  projectId: string,
  decisionId: string,
  userId: string,
  userName: string
): void {
  try {
    const acks = getDecisionAcks(projectId);
    const decisionAcks = acks[decisionId] || [];

    // Don't add duplicate
    if (decisionAcks.some(ack => ack.userId === userId)) {
      return;
    }

    decisionAcks.push({
      userId,
      userName,
      acknowledgedAt: new Date().toISOString(),
    });

    acks[decisionId] = decisionAcks;
    localStorage.setItem(getDecisionAckKey(projectId), JSON.stringify(acks));
  } catch {
    // localStorage not available
  }
}

/**
 * Remove acknowledgement for a user (reversible action).
 */
export function clearDecisionAck(
  projectId: string,
  decisionId: string,
  userId: string
): void {
  try {
    const acks = getDecisionAcks(projectId);
    const decisionAcks = acks[decisionId] || [];

    acks[decisionId] = decisionAcks.filter(ack => ack.userId !== userId);

    // Clean up empty arrays
    if (acks[decisionId].length === 0) {
      delete acks[decisionId];
    }

    localStorage.setItem(getDecisionAckKey(projectId), JSON.stringify(acks));
  } catch {
    // localStorage not available
  }
}

// ============================================================================
// Open Question Ownership
// ============================================================================

/**
 * Get all question owners for a project.
 */
export function getQuestionOwners(projectId: string): QuestionOwners {
  try {
    const stored = localStorage.getItem(getQuestionOwnerKey(projectId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return {};
}

/**
 * Get the owner of a specific question.
 */
export function getQuestionOwner(
  projectId: string,
  questionId: string
): QuestionOwner | null {
  const owners = getQuestionOwners(projectId);
  return owners[questionId] || null;
}

/**
 * Assign a question to a user.
 */
export function setQuestionOwner(
  projectId: string,
  questionId: string,
  userId: string,
  userName: string
): void {
  try {
    const owners = getQuestionOwners(projectId);
    owners[questionId] = {
      userId,
      userName,
      assignedAt: new Date().toISOString(),
    };
    localStorage.setItem(getQuestionOwnerKey(projectId), JSON.stringify(owners));
  } catch {
    // localStorage not available
  }
}

/**
 * Clear question ownership (unassign).
 */
export function clearQuestionOwner(projectId: string, questionId: string): void {
  try {
    const owners = getQuestionOwners(projectId);
    delete owners[questionId];
    localStorage.setItem(getQuestionOwnerKey(projectId), JSON.stringify(owners));
  } catch {
    // localStorage not available
  }
}

// ============================================================================
// Alignment Status Computation
// ============================================================================

/**
 * Compute alignment status based on decision acks, question ownership, and momentum.
 *
 * Scoring breakdown:
 * - Decision acknowledgement coverage (0-40): acknowledgedDecisions / totalDecisions * 40
 * - Open question ownership (0-40): assignedQuestions / totalQuestions * 40
 * - Momentum readiness (0-20): +20 if acceptedStepsCount > 0
 *
 * Status thresholds:
 * - Aligned: score >= 70
 * - Needs attention: score 1-69
 * - Unknown: missing key inputs or no data
 */
export function computeAlignmentStatus(input: AlignmentInput): AlignmentResult {
  const { decisions, openQuestions, acceptedStepsCount, projectId, currentUserId } = input;

  // If no decisions and no questions, status is unknown
  if (decisions.length === 0 && openQuestions.length === 0) {
    return {
      status: 'unknown',
      score: 0,
      reason: 'No decisions or questions to track',
      breakdown: { decisionScore: 0, questionScore: 0, momentumScore: 0 },
    };
  }

  const acks = getDecisionAcks(projectId);
  const owners = getQuestionOwners(projectId);

  // Calculate decision acknowledgement score
  let decisionScore = 0;
  if (decisions.length > 0) {
    const displayedDecisions = decisions.slice(0, 3); // We only show max 3
    let acknowledgedCount = 0;
    for (const decision of displayedDecisions) {
      const decisionId = makeDecisionId(decision.text, decision.conversationId);
      const decisionAcks = acks[decisionId] || [];
      // Count as acknowledged if current user has ack'd (since we can't reliably track others)
      if (currentUserId && decisionAcks.some(a => a.userId === currentUserId)) {
        acknowledgedCount++;
      } else if (decisionAcks.length > 0) {
        // At least someone acknowledged
        acknowledgedCount++;
      }
    }
    decisionScore = Math.round((acknowledgedCount / displayedDecisions.length) * DECISION_WEIGHT);
  } else {
    // No decisions means full score for this category
    decisionScore = DECISION_WEIGHT;
  }

  // Calculate question ownership score
  let questionScore = 0;
  if (openQuestions.length > 0) {
    const displayedQuestions = openQuestions.slice(0, 3); // We only show max 3
    let assignedCount = 0;
    for (const question of displayedQuestions) {
      const questionId = makeQuestionId(question.text, question.conversationId);
      if (owners[questionId]) {
        assignedCount++;
      }
    }
    questionScore = Math.round((assignedCount / displayedQuestions.length) * QUESTION_WEIGHT);
  } else {
    // No questions means full score for this category
    questionScore = QUESTION_WEIGHT;
  }

  // Calculate momentum score
  const momentumScore = acceptedStepsCount > 0 ? MOMENTUM_WEIGHT : 0;

  // Total score
  const score = decisionScore + questionScore + momentumScore;

  // Determine status
  let status: AlignmentStatus;
  let reason: string;

  if (score >= ALIGNED_THRESHOLD) {
    status = 'aligned';
    reason = 'Team is tracking decisions and questions';
  } else if (score > 0) {
    status = 'needs_attention';
    // Build specific reason
    const reasons: string[] = [];
    if (decisionScore < DECISION_WEIGHT && decisions.length > 0) {
      reasons.push('decisions need acknowledgement');
    }
    if (questionScore < QUESTION_WEIGHT && openQuestions.length > 0) {
      reasons.push('questions need owners');
    }
    if (momentumScore === 0 && acceptedStepsCount === 0) {
      reasons.push('no next steps accepted');
    }
    reason = reasons.length > 0 ? `Some ${reasons.join(', ')}` : 'Partial alignment';
  } else {
    status = 'unknown';
    reason = 'Not enough data to determine alignment';
  }

  return {
    status,
    score,
    reason,
    breakdown: {
      decisionScore,
      questionScore,
      momentumScore,
    },
  };
}

/**
 * Get a suggestion for the next action to improve alignment.
 */
export function getNextResponderSuggestion(input: AlignmentInput): {
  suggestion: string;
  action: 'assign_question' | 'accept_step' | 'acknowledge_decision' | 'discuss' | null;
  prefillText?: string;
} {
  const { decisions, openQuestions, acceptedStepsCount, projectId } = input;

  const owners = getQuestionOwners(projectId);
  const acks = getDecisionAcks(projectId);

  // Priority 1: Unassigned open questions
  const displayedQuestions = openQuestions.slice(0, 3);
  for (const question of displayedQuestions) {
    const questionId = makeQuestionId(question.text, question.conversationId);
    if (!owners[questionId]) {
      return {
        suggestion: 'Pick an owner for an open question',
        action: 'assign_question',
        prefillText: `Let's discuss: "${question.text}"`,
      };
    }
  }

  // Priority 2: No accepted next steps
  if (acceptedStepsCount === 0) {
    return {
      suggestion: 'Choose a next step to move forward',
      action: 'accept_step',
    };
  }

  // Priority 3: Unacknowledged decisions
  const displayedDecisions = decisions.slice(0, 3);
  for (const decision of displayedDecisions) {
    const decisionId = makeDecisionId(decision.text, decision.conversationId);
    const decisionAcks = acks[decisionId] || [];
    if (decisionAcks.length === 0) {
      return {
        suggestion: 'Share or confirm a decision with the team',
        action: 'acknowledge_decision',
        prefillText: `Confirming decision: "${decision.text}"`,
      };
    }
  }

  // Everything looks good
  return {
    suggestion: 'Team alignment looks good',
    action: null,
  };
}
