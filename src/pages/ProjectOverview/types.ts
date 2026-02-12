/**
 * Types and utility functions for ProjectOverview
 */

export interface RecentMessage {
  id: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  conversationId: string;
  conversationName?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'asset' | 'task' | 'metmap';
  description: string;
  timestamp: string;
  actor?: string;
}

export type PulseTone = 'calm' | 'neutral' | 'intense';
export type ClarityState = 'focused' | 'mixed' | 'uncertain';

export interface SummaryContent {
  summary?: string[];
  decisions?: Array<{ text: string; decidedBy?: string }>;
  openQuestions?: Array<{ text: string; askedBy?: string }>;
  nextSteps?: Array<{ text: string; priority?: string }>;
  sentiment?: string;
}

export interface ConversationSummaryData {
  id: string;
  conversationId: string;
  conversationName?: string;
  projectId?: string;
  content: SummaryContent;
  pulseTone: PulseTone;
  clarityState: ClarityState;
  generatedBy: string;
  messageCount: number;
  updatedAt: string;
}

export interface AggregatedSnapshot {
  whatsHappening: string[];
  decisions: Array<{ text: string; decidedBy?: string; conversationName?: string }>;
  openQuestions: Array<{ text: string; askedBy?: string; conversationName?: string }>;
  nextSteps: Array<{ id: string; text: string; priority?: string }>;
  overallPulse: PulseTone;
  overallClarity: ClarityState;
  lastUpdated: string;
  summaryCount: number;
  totalMessages: number;
  aiEnabled: boolean;
}

export type NextStepStatus = 'suggested' | 'accepted' | 'completed';

export interface NextStepState {
  [stepId: string]: NextStepStatus;
}

// Generate a stable ID for a next step based on its text
export function generateStepId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `step_${Math.abs(hash).toString(36)}`;
}

// LocalStorage key for next step states
function getNextStepStorageKey(projectId: string): string {
  return `fluxstudio_nextsteps_${projectId}`;
}

export function loadNextStepStates(projectId: string): NextStepState {
  try {
    const stored = localStorage.getItem(getNextStepStorageKey(projectId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or invalid JSON
  }
  return {};
}

export function saveNextStepStates(projectId: string, states: NextStepState): void {
  try {
    localStorage.setItem(getNextStepStorageKey(projectId), JSON.stringify(states));
  } catch {
    // localStorage not available
  }
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
