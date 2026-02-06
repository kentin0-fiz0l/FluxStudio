/**
 * Agent Slice - AI Agent State Management
 *
 * Handles:
 * - Agent chat sessions
 * - Streaming messages
 * - Pending actions requiring approval
 * - Daily briefs and change tracking
 *
 * Date: 2026-02-06
 */

import { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type AgentMessageRole = 'user' | 'assistant' | 'system';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  toolsUsed?: string[];
  error?: string;
}

export interface AgentSession {
  id: string;
  projectId?: string;
  messages: AgentMessage[];
  createdAt: string;
  lastActiveAt: string;
}

export interface PendingAction {
  id: string;
  sessionId: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  payload: Record<string, unknown>;
  preview: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
}

export interface DailyBrief {
  brief: string;
  stats: {
    projectUpdates: number;
    newMessages: number;
    newAssets: number;
    notifications: number;
  };
  activeProjectCount: number;
  generatedAt: string;
}

export interface WhatChangedData {
  since: string;
  summary: {
    projectUpdates: number;
    newMessages: number;
    newAssets: number;
    notifications: number;
  };
  changes: {
    projects: Array<{ id: string; name: string; status: string; updated_at: string }>;
    messages: Array<{ id: string; conversationName: string; createdAt: string }>;
    assets: Array<{ id: string; name: string; kind: string; created_at: string }>;
    notifications: Array<{ id: string; type: string; title: string; created_at: string }>;
  };
}

export interface AgentState {
  sessions: AgentSession[];
  currentSessionId: string | null;
  pendingActions: PendingAction[];
  dailyBrief: DailyBrief | null;
  whatChanged: WhatChangedData | null;
  isStreaming: boolean;
  isLoadingBrief: boolean;
  isPanelOpen: boolean;
  error: string | null;
}

export interface AgentActions {
  // Session management
  createSession: (projectId?: string) => string;
  setCurrentSession: (sessionId: string | null) => void;
  deleteSession: (sessionId: string) => void;
  clearSessions: () => void;

  // Messages
  addMessage: (sessionId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<AgentMessage>) => void;
  streamMessageChunk: (sessionId: string, messageId: string, chunk: string) => void;
  finishStreaming: (sessionId: string, messageId: string) => void;

  // Pending actions
  addPendingAction: (action: Omit<PendingAction, 'createdAt'>) => void;
  updatePendingAction: (actionId: string, status: PendingAction['status']) => void;
  removePendingAction: (actionId: string) => void;
  clearPendingActions: () => void;

  // Daily brief
  setDailyBrief: (brief: DailyBrief | null) => void;
  setLoadingBrief: (loading: boolean) => void;

  // What changed
  setWhatChanged: (data: WhatChangedData | null) => void;

  // UI state
  setStreaming: (streaming: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setError: (error: string | null) => void;
}

export interface AgentSlice {
  agent: AgentState & AgentActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: AgentState = {
  sessions: [],
  currentSessionId: null,
  pendingActions: [],
  dailyBrief: null,
  whatChanged: null,
  isStreaming: false,
  isLoadingBrief: false,
  isPanelOpen: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createAgentSlice: StateCreator<
  AgentSlice,
  [['zustand/immer', never]],
  [],
  AgentSlice
> = (set) => ({
  agent: {
    ...initialState,

    // Session management
    createSession: (projectId) => {
      const id = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      set((state) => {
        state.agent.sessions.unshift({
          id,
          projectId,
          messages: [],
          createdAt: now,
          lastActiveAt: now,
        });
        state.agent.currentSessionId = id;
      });

      return id;
    },

    setCurrentSession: (sessionId) => {
      set((state) => {
        state.agent.currentSessionId = sessionId;
      });
    },

    deleteSession: (sessionId) => {
      set((state) => {
        state.agent.sessions = state.agent.sessions.filter((s) => s.id !== sessionId);
        if (state.agent.currentSessionId === sessionId) {
          state.agent.currentSessionId = state.agent.sessions[0]?.id || null;
        }
      });
    },

    clearSessions: () => {
      set((state) => {
        state.agent.sessions = [];
        state.agent.currentSessionId = null;
      });
    },

    // Messages
    addMessage: (sessionId, message) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      set((state) => {
        const session = state.agent.sessions.find((s) => s.id === sessionId);
        if (!session) return;

        session.messages.push({
          ...message,
          id,
          timestamp: new Date().toISOString(),
        });
        session.lastActiveAt = new Date().toISOString();
      });

      return id;
    },

    updateMessage: (sessionId, messageId, updates) => {
      set((state) => {
        const session = state.agent.sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const message = session.messages.find((m) => m.id === messageId);
        if (message) {
          Object.assign(message, updates);
        }
      });
    },

    streamMessageChunk: (sessionId, messageId, chunk) => {
      set((state) => {
        const session = state.agent.sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const message = session.messages.find((m) => m.id === messageId);
        if (message) {
          message.content += chunk;
        }
      });
    },

    finishStreaming: (sessionId, messageId) => {
      set((state) => {
        const session = state.agent.sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const message = session.messages.find((m) => m.id === messageId);
        if (message) {
          message.isStreaming = false;
        }
        state.agent.isStreaming = false;
      });
    },

    // Pending actions
    addPendingAction: (action) => {
      set((state) => {
        state.agent.pendingActions.unshift({
          ...action,
          createdAt: new Date().toISOString(),
        });
      });
    },

    updatePendingAction: (actionId, status) => {
      set((state) => {
        const action = state.agent.pendingActions.find((a) => a.id === actionId);
        if (action) {
          action.status = status;
        }
      });
    },

    removePendingAction: (actionId) => {
      set((state) => {
        state.agent.pendingActions = state.agent.pendingActions.filter((a) => a.id !== actionId);
      });
    },

    clearPendingActions: () => {
      set((state) => {
        state.agent.pendingActions = [];
      });
    },

    // Daily brief
    setDailyBrief: (brief) => {
      set((state) => {
        state.agent.dailyBrief = brief;
      });
    },

    setLoadingBrief: (loading) => {
      set((state) => {
        state.agent.isLoadingBrief = loading;
      });
    },

    // What changed
    setWhatChanged: (data) => {
      set((state) => {
        state.agent.whatChanged = data;
      });
    },

    // UI state
    setStreaming: (streaming) => {
      set((state) => {
        state.agent.isStreaming = streaming;
      });
    },

    setPanelOpen: (open) => {
      set((state) => {
        state.agent.isPanelOpen = open;
      });
    },

    togglePanel: () => {
      set((state) => {
        state.agent.isPanelOpen = !state.agent.isPanelOpen;
      });
    },

    setError: (error) => {
      set((state) => {
        state.agent.error = error;
      });
    },
  },
});
