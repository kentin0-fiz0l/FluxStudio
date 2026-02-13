/**
 * Agent Hooks - React hooks for AI Agent functionality
 *
 * Provides:
 * - useAgentSession - Session and chat management with SSE streaming
 * - useAgentActions - Pending action management
 * - useDailyBrief - Fetch daily brief
 * - useWhatChanged - Fetch changes since timestamp
 *
 * Date: 2026-02-06
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store/store';
import { apiService } from '@/services/apiService';

// ============================================================================
// Types
// ============================================================================

interface ChatOptions {
  projectId?: string;
}


interface SearchResult {
  id: string;
  name: string;
  description: string;
  status: string;
  organizationName: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchDailyBrief() {
  const response = await apiService.get('/agent/daily_brief');
  return response.data;
}

async function fetchWhatChanged(since?: string) {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  const response = await apiService.get(`/agent/what_changed${params}`);
  return response.data;
}

async function fetchPendingActions() {
  const response = await apiService.get('/agent/pending_actions');
  return response.data;
}

async function searchProjects(query: string) {
  const response = await apiService.get(`/agent/search_projects?query=${encodeURIComponent(query)}`);
  return response.data;
}

async function approveAction(actionId: string) {
  const response = await apiService.post(`/agent/pending_action/${actionId}/approve`);
  return response.data;
}

async function rejectAction(actionId: string) {
  const response = await apiService.post(`/agent/pending_action/${actionId}/reject`);
  return response.data;
}

async function createSession(projectId?: string): Promise<{ id?: string }> {
  const response = await apiService.post('/agent/session', { projectId });
  return response.data as { id?: string };
}

// ============================================================================
// useAgentSession Hook
// ============================================================================

export function useAgentSession(options: ChatOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const {
    sessions,
    currentSessionId,
    isStreaming,
    createSession: createSessionStore,
    setCurrentSession,
    addMessage,
    updateMessage,
    streamMessageChunk,
    finishStreaming,
    setStreaming,
    setError,
  } = useStore((state) => state.agent);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Create new session
  const startNewSession = useCallback(async () => {
    try {
      const response = await createSession(options.projectId);
      const sessionId = createSessionStore(options.projectId);
      // Update with server session ID if different
      if (response.id && response.id !== sessionId) {
        setCurrentSession(response.id);
      }
      return sessionId;
    } catch (error) {
      console.error('[useAgentSession] Failed to create session:', error);
      return createSessionStore(options.projectId);
    }
  }, [options.projectId, createSessionStore, setCurrentSession]);

  // Send message with SSE streaming
  const sendMessage = useCallback(async (message: string) => {
    let sessionId = currentSessionId;

    // Create session if none exists
    if (!sessionId) {
      sessionId = await startNewSession();
    }

    // Add user message
    addMessage(sessionId, { role: 'user', content: message });

    // Create streaming assistant message
    const assistantMsgId = addMessage(sessionId, {
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    setStreaming(true);
    setError(null);

    try {
      // Get auth token (stored as 'auth_token' by AuthContext)
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Fetch CSRF token for POST request
      const baseUrl = import.meta.env.VITE_API_URL || '';
      let csrfToken = '';
      try {
        const csrfResponse = await fetch(`${baseUrl}/api/csrf-token`, {
          credentials: 'include',
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          csrfToken = csrfData.csrfToken || '';
        }
      } catch (e) {
        console.warn('[useAgentSession] Failed to fetch CSRF token:', e);
      }

      // Create EventSource for SSE
      const response = await fetch(`${baseUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sessionId,
          projectId: options.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  // Session started
                  if (data.sessionId && data.sessionId !== sessionId) {
                    setCurrentSession(data.sessionId);
                  }
                  break;

                case 'chunk':
                  streamMessageChunk(sessionId, assistantMsgId, data.content);
                  break;

                case 'tools':
                  updateMessage(sessionId, assistantMsgId, { toolsUsed: data.tools });
                  break;

                case 'done':
                  finishStreaming(sessionId, assistantMsgId);
                  break;

                case 'error':
                  updateMessage(sessionId, assistantMsgId, {
                    error: data.error,
                    isStreaming: false,
                  });
                  setError(data.error);
                  break;
              }
            } catch (e) {
              console.error('[useAgentSession] Failed to parse SSE data:', e);
            }
          }
        }
      }

      finishStreaming(sessionId, assistantMsgId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateMessage(sessionId, assistantMsgId, {
        error: errorMessage,
        isStreaming: false,
      });
      setError(errorMessage);
      setStreaming(false);
    }
  }, [
    currentSessionId,
    startNewSession,
    addMessage,
    setStreaming,
    setError,
    setCurrentSession,
    streamMessageChunk,
    updateMessage,
    finishStreaming,
    options.projectId,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    session: currentSession,
    sessions,
    messages: currentSession?.messages || [],
    isStreaming,
    sendMessage,
    startNewSession,
    setCurrentSession,
  };
}

// ============================================================================
// useAgentActions Hook
// ============================================================================

export function useAgentActions() {
  const queryClient = useQueryClient();
  const { pendingActions, updatePendingAction } =
    useStore((state) => state.agent);

  // Fetch pending actions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agent', 'pending-actions'],
    queryFn: fetchPendingActions,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Sync with store
  useEffect(() => {
    if (data) {
      // Store handles its own state
    }
  }, [data]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: approveAction,
    onSuccess: (_, actionId) => {
      updatePendingAction(actionId, 'approved');
      queryClient.invalidateQueries({ queryKey: ['agent', 'pending-actions'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: rejectAction,
    onSuccess: (_, actionId) => {
      updatePendingAction(actionId, 'rejected');
      queryClient.invalidateQueries({ queryKey: ['agent', 'pending-actions'] });
    },
  });

  return {
    pendingActions: data || pendingActions,
    isLoading,
    refetch,
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

// ============================================================================
// useDailyBrief Hook
// ============================================================================

export function useDailyBrief() {
  const { dailyBrief, setDailyBrief, isLoadingBrief, setLoadingBrief } =
    useStore((state) => state.agent);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent', 'daily-brief'],
    queryFn: fetchDailyBrief,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Sync with store
  useEffect(() => {
    if (data) {
      setDailyBrief(data);
    }
    setLoadingBrief(isLoading);
  }, [data, isLoading, setDailyBrief, setLoadingBrief]);

  return {
    brief: data || dailyBrief,
    isLoading: isLoading || isLoadingBrief,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

// ============================================================================
// useWhatChanged Hook
// ============================================================================

export function useWhatChanged(since?: string) {
  const { whatChanged, setWhatChanged } = useStore((state) => state.agent);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent', 'what-changed', since],
    queryFn: () => fetchWhatChanged(since),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Sync with store
  useEffect(() => {
    if (data) {
      setWhatChanged(data);
    }
  }, [data, setWhatChanged]);

  return {
    changes: data || whatChanged,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

// ============================================================================
// useAgentSearch Hook
// ============================================================================

export function useAgentSearch() {
  const searchMutation = useMutation({
    mutationFn: searchProjects,
  });

  return {
    search: searchMutation.mutate,
    searchAsync: searchMutation.mutateAsync,
    results: searchMutation.data as SearchResult[] | undefined,
    isSearching: searchMutation.isPending,
    error: searchMutation.error instanceof Error ? searchMutation.error.message : null,
  };
}

// ============================================================================
// useAgentPanel Hook
// ============================================================================

export function useAgentPanel() {
  const { isPanelOpen, setPanelOpen, togglePanel } = useStore((state) => state.agent);

  return {
    isOpen: isPanelOpen,
    open: () => setPanelOpen(true),
    close: () => setPanelOpen(false),
    toggle: togglePanel,
  };
}
