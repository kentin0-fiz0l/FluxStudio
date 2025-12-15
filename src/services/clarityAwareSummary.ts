/**
 * Clarity-Aware Summary Service
 *
 * Reframes project summaries based on user clarity state without
 * adding new information or making assumptions about the project.
 *
 * Part of User Test Mode: Adapts framing for better orientation
 * when users may be uncertain or blocked.
 */

import { ClarityState } from '@/hooks/useClarityState';

export type SummaryVariant = 'baseline' | 'intent_first' | 'reframe_blocked';

export interface ClarityAwareSummaryParams {
  /** Current clarity state */
  clarity: ClarityState;
  /** The original summary/description */
  baselineSummary: string;
  /** Project name (optional, for context) */
  projectName?: string;
  /** Focused project ID (optional) */
  focusedProjectId?: string | null;
}

export interface ClarityAwareSummaryResult {
  /** The reframed summary */
  summary: string;
  /** Which variant was applied */
  variant: SummaryVariant;
  /** Whether the summary was modified */
  wasModified: boolean;
}

/**
 * Truncate text to a maximum length, preserving word boundaries.
 */
function truncateToSentence(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;

  // Try to find a sentence break
  const sentenceEnd = text.slice(0, maxLength).lastIndexOf('.');
  if (sentenceEnd > maxLength * 0.5) {
    return text.slice(0, sentenceEnd + 1);
  }

  // Fall back to word boundary
  const wordBreak = text.slice(0, maxLength).lastIndexOf(' ');
  if (wordBreak > maxLength * 0.5) {
    return text.slice(0, wordBreak) + '...';
  }

  return text.slice(0, maxLength) + '...';
}

/**
 * Extract the first sentence from text.
 */
function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : truncateToSentence(text, 100);
}

/**
 * Build clarity-aware summary with appropriate framing.
 *
 * Rules:
 * - confident: Return baseline unchanged
 * - uncertain: Add intent-first framing with "start here" guidance
 * - blocked: Add calm reframe with permission-based help offer
 *
 * Never invents project facts, only reframes structure.
 * Never mentions clarity state, telemetry, or test mode.
 */
export function buildClarityAwareSummary(
  params: ClarityAwareSummaryParams
): ClarityAwareSummaryResult {
  const { clarity, baselineSummary, projectName } = params;

  // Handle empty or missing summary
  if (!baselineSummary || baselineSummary.trim().length === 0) {
    return {
      summary: 'No description provided.',
      variant: 'baseline',
      wasModified: false,
    };
  }

  const trimmedSummary = baselineSummary.trim();

  // Confident: return unchanged
  if (clarity === 'confident') {
    return {
      summary: trimmedSummary,
      variant: 'baseline',
      wasModified: false,
    };
  }

  // Uncertain: intent-first framing with starting point
  if (clarity === 'uncertain') {
    const firstSentence = getFirstSentence(trimmedSummary);
    const projectContext = projectName ? `This project (${projectName})` : 'This project';

    // Build intent-first summary
    const parts: string[] = [];

    // Intent line - what this project is for
    parts.push(`${projectContext} is about: ${firstSentence}`);

    // Starting point guidance
    parts.push('A good starting point might be reviewing recent activity or open tasks.');

    // Include baseline if it adds more context
    if (trimmedSummary.length > firstSentence.length + 20) {
      const remaining = trimmedSummary.slice(firstSentence.length).trim();
      if (remaining.length > 0) {
        parts.push(truncateToSentence(remaining, 150));
      }
    }

    return {
      summary: parts.join(' '),
      variant: 'intent_first',
      wasModified: true,
    };
  }

  // Blocked: calm reframe with permission-based help
  if (clarity === 'blocked') {
    const firstSentence = getFirstSentence(trimmedSummary);

    const parts: string[] = [];

    // Calm reframe line (non-judgy)
    parts.push("Here's what this project is working toward.");

    // Core description
    parts.push(firstSentence);

    // Permission-based help offer
    parts.push("If it would help, you can check the team discussion or recent updates for context.");

    return {
      summary: parts.join(' '),
      variant: 'reframe_blocked',
      wasModified: true,
    };
  }

  // Fallback (should not reach)
  return {
    summary: trimmedSummary,
    variant: 'baseline',
    wasModified: false,
  };
}

/**
 * Get the reframing prompt for clipboard copy (blocked state only).
 */
export function getReframingPrompt(): string {
  return 'In one sentence, what is this project trying to achieve right now?';
}

export default buildClarityAwareSummary;
