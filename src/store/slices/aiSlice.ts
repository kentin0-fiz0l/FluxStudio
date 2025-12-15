/**
 * AI Slice - AI Creative Co-Pilot state
 *
 * Handles:
 * - Chat conversations with AI
 * - Generation requests (text, image, code, music)
 * - AI suggestions and recommendations
 * - Model configurations
 * - Usage tracking
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type AIModel =
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gemini-pro'
  | 'local';

export type GenerationType =
  | 'text'
  | 'code'
  | 'image'
  | 'music'
  | 'suggestion'
  | 'analysis'
  | 'summary';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  model?: AIModel;
  generationType?: GenerationType;
  metadata?: Record<string, unknown>;
  attachments?: AIAttachment[];
  isStreaming?: boolean;
  error?: string;
}

export interface AIAttachment {
  id: string;
  type: 'image' | 'file' | 'code' | 'audio';
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  model: AIModel;
  systemPrompt?: string;
  projectId?: string;
  entityId?: string;
  entityType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRequest {
  id: string;
  type: GenerationType;
  prompt: string;
  model: AIModel;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  progress?: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AISuggestion {
  id: string;
  type: 'action' | 'content' | 'optimization' | 'warning';
  title: string;
  description: string;
  confidence: number; // 0-1
  context: {
    entityType?: string;
    entityId?: string;
    projectId?: string;
  };
  actions?: {
    label: string;
    action: string;
    payload?: unknown;
  }[];
  dismissed: boolean;
  appliedAt?: string;
  createdAt: string;
}

export interface AIUsage {
  tokensUsed: number;
  tokensLimit: number;
  requestsToday: number;
  requestsLimit: number;
  lastReset: string;
}

export interface AIPreferences {
  defaultModel: AIModel;
  autoSuggest: boolean;
  suggestThreshold: number; // 0-1, minimum confidence for showing suggestions
  streamResponses: boolean;
  saveHistory: boolean;
  maxHistoryLength: number;
}

export interface AIState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  generationRequests: GenerationRequest[];
  suggestions: AISuggestion[];
  usage: AIUsage;
  preferences: AIPreferences;
  isProcessing: boolean;
  currentStreamingMessageId: string | null;
  error: string | null;
}

export interface AIActions {
  // Conversations
  createConversation: (options?: {
    title?: string;
    model?: AIModel;
    systemPrompt?: string;
    projectId?: string;
    entityId?: string;
    entityType?: string;
  }) => string;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;

  // Messages
  sendMessage: (conversationId: string, content: string, attachments?: AIAttachment[]) => Promise<void>;
  addMessage: (conversationId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<AIMessage>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  streamMessageChunk: (conversationId: string, messageId: string, chunk: string) => void;
  finishStreaming: (conversationId: string, messageId: string) => void;

  // Generation
  requestGeneration: (request: Omit<GenerationRequest, 'id' | 'status' | 'createdAt'>) => string;
  updateGenerationStatus: (id: string, updates: Partial<GenerationRequest>) => void;
  cancelGeneration: (id: string) => void;
  clearCompletedGenerations: () => void;

  // Suggestions
  addSuggestion: (suggestion: Omit<AISuggestion, 'id' | 'createdAt' | 'dismissed'>) => string;
  dismissSuggestion: (id: string) => void;
  applySuggestion: (id: string) => void;
  clearSuggestions: () => void;

  // Preferences
  updatePreferences: (updates: Partial<AIPreferences>) => void;

  // Usage
  updateUsage: (updates: Partial<AIUsage>) => void;
  incrementUsage: (tokens: number) => void;

  // Error handling
  setError: (error: string | null) => void;
  setProcessing: (isProcessing: boolean) => void;
}

export interface AISlice {
  ai: AIState & AIActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialPreferences: AIPreferences = {
  defaultModel: 'claude-3-sonnet',
  autoSuggest: true,
  suggestThreshold: 0.7,
  streamResponses: true,
  saveHistory: true,
  maxHistoryLength: 100,
};

const initialUsage: AIUsage = {
  tokensUsed: 0,
  tokensLimit: 100000,
  requestsToday: 0,
  requestsLimit: 500,
  lastReset: new Date().toISOString().split('T')[0],
};

const initialState: AIState = {
  conversations: [],
  activeConversationId: null,
  generationRequests: [],
  suggestions: [],
  usage: initialUsage,
  preferences: initialPreferences,
  isProcessing: false,
  currentStreamingMessageId: null,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createAISlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  AISlice
> = (set, get) => ({
  ai: {
    ...initialState,

    // Conversation actions
    createConversation: (options = {}) => {
      const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      set((state) => {
        state.ai.conversations.unshift({
          id,
          title: options.title || 'New Conversation',
          messages: [],
          model: options.model || state.ai.preferences.defaultModel,
          systemPrompt: options.systemPrompt,
          projectId: options.projectId,
          entityId: options.entityId,
          entityType: options.entityType,
          createdAt: now,
          updatedAt: now,
        });
        state.ai.activeConversationId = id;
      });

      return id;
    },

    setActiveConversation: (id) => {
      set((state) => {
        state.ai.activeConversationId = id;
      });
    },

    deleteConversation: (id) => {
      set((state) => {
        state.ai.conversations = state.ai.conversations.filter((c) => c.id !== id);
        if (state.ai.activeConversationId === id) {
          state.ai.activeConversationId = state.ai.conversations[0]?.id || null;
        }
      });
    },

    clearConversations: () => {
      set((state) => {
        state.ai.conversations = [];
        state.ai.activeConversationId = null;
      });
    },

    // Message actions
    sendMessage: async (conversationId, content, attachments) => {
      const conversation = get().ai.conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      // Add user message
      get().ai.addMessage(conversationId, {
        role: 'user',
        content,
        attachments,
      });

      // Create streaming assistant message
      const assistantMessageId = get().ai.addMessage(conversationId, {
        role: 'assistant',
        content: '',
        model: conversation.model,
        isStreaming: true,
      });

      set((state) => {
        state.ai.isProcessing = true;
        state.ai.currentStreamingMessageId = assistantMessageId;
        state.ai.error = null;
      });

      try {
        // This would be replaced with actual API call
        // For now, simulate streaming response
        const response = await simulateAIResponse(content, conversation.model);

        if (get().ai.preferences.streamResponses) {
          // Simulate streaming
          for (let i = 0; i < response.length; i += 10) {
            const chunk = response.slice(i, i + 10);
            get().ai.streamMessageChunk(conversationId, assistantMessageId, chunk);
            await new Promise((r) => setTimeout(r, 50));
          }
        } else {
          get().ai.updateMessage(conversationId, assistantMessageId, { content: response });
        }

        get().ai.finishStreaming(conversationId, assistantMessageId);

        // Update usage
        const estimatedTokens = Math.ceil((content.length + response.length) / 4);
        get().ai.incrementUsage(estimatedTokens);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        get().ai.updateMessage(conversationId, assistantMessageId, {
          error: errorMessage,
          isStreaming: false,
        });
        get().ai.setError(errorMessage);
      } finally {
        set((state) => {
          state.ai.isProcessing = false;
          state.ai.currentStreamingMessageId = null;
        });
      }
    },

    addMessage: (conversationId, message) => {
      const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      set((state) => {
        const conversation = state.ai.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        conversation.messages.push({
          ...message,
          id,
          timestamp: new Date().toISOString(),
        });
        conversation.updatedAt = new Date().toISOString();

        // Update title if first user message
        if (conversation.messages.length === 1 && message.role === 'user') {
          conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }
      });

      return id;
    },

    updateMessage: (conversationId, messageId, updates) => {
      set((state) => {
        const conversation = state.ai.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        const message = conversation.messages.find((m) => m.id === messageId);
        if (message) {
          Object.assign(message, updates);
        }
      });
    },

    deleteMessage: (conversationId, messageId) => {
      set((state) => {
        const conversation = state.ai.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        conversation.messages = conversation.messages.filter((m) => m.id !== messageId);
      });
    },

    streamMessageChunk: (conversationId, messageId, chunk) => {
      set((state) => {
        const conversation = state.ai.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        const message = conversation.messages.find((m) => m.id === messageId);
        if (message) {
          message.content += chunk;
        }
      });
    },

    finishStreaming: (conversationId, messageId) => {
      set((state) => {
        const conversation = state.ai.conversations.find((c) => c.id === conversationId);
        if (!conversation) return;

        const message = conversation.messages.find((m) => m.id === messageId);
        if (message) {
          message.isStreaming = false;
        }
      });
    },

    // Generation actions
    requestGeneration: (request) => {
      const id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      set((state) => {
        state.ai.generationRequests.unshift({
          ...request,
          id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      });

      // Start processing (would be async in real implementation)
      setTimeout(() => {
        get().ai.updateGenerationStatus(id, { status: 'processing' });
      }, 100);

      return id;
    },

    updateGenerationStatus: (id, updates) => {
      set((state) => {
        const request = state.ai.generationRequests.find((r) => r.id === id);
        if (request) {
          Object.assign(request, updates);
          if (updates.status === 'completed' || updates.status === 'failed') {
            request.completedAt = new Date().toISOString();
          }
        }
      });
    },

    cancelGeneration: (id) => {
      set((state) => {
        const request = state.ai.generationRequests.find((r) => r.id === id);
        if (request && (request.status === 'pending' || request.status === 'processing')) {
          request.status = 'failed';
          request.error = 'Cancelled by user';
          request.completedAt = new Date().toISOString();
        }
      });
    },

    clearCompletedGenerations: () => {
      set((state) => {
        state.ai.generationRequests = state.ai.generationRequests.filter(
          (r) => r.status === 'pending' || r.status === 'processing'
        );
      });
    },

    // Suggestion actions
    addSuggestion: (suggestion) => {
      const id = `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      set((state) => {
        // Check if auto-suggest is enabled and confidence meets threshold
        if (!state.ai.preferences.autoSuggest) return;
        if (suggestion.confidence < state.ai.preferences.suggestThreshold) return;

        state.ai.suggestions.unshift({
          ...suggestion,
          id,
          dismissed: false,
          createdAt: new Date().toISOString(),
        });

        // Limit suggestions
        if (state.ai.suggestions.length > 20) {
          state.ai.suggestions = state.ai.suggestions.slice(0, 20);
        }
      });

      return id;
    },

    dismissSuggestion: (id) => {
      set((state) => {
        const suggestion = state.ai.suggestions.find((s) => s.id === id);
        if (suggestion) {
          suggestion.dismissed = true;
        }
      });
    },

    applySuggestion: (id) => {
      set((state) => {
        const suggestion = state.ai.suggestions.find((s) => s.id === id);
        if (suggestion) {
          suggestion.appliedAt = new Date().toISOString();
          suggestion.dismissed = true;
        }
      });
    },

    clearSuggestions: () => {
      set((state) => {
        state.ai.suggestions = [];
      });
    },

    // Preferences actions
    updatePreferences: (updates) => {
      set((state) => {
        Object.assign(state.ai.preferences, updates);
      });
    },

    // Usage actions
    updateUsage: (updates) => {
      set((state) => {
        Object.assign(state.ai.usage, updates);
      });
    },

    incrementUsage: (tokens) => {
      set((state) => {
        // Check if we need to reset daily usage
        const today = new Date().toISOString().split('T')[0];
        if (state.ai.usage.lastReset !== today) {
          state.ai.usage.tokensUsed = 0;
          state.ai.usage.requestsToday = 0;
          state.ai.usage.lastReset = today;
        }

        state.ai.usage.tokensUsed += tokens;
        state.ai.usage.requestsToday += 1;
      });
    },

    // Error handling
    setError: (error) => {
      set((state) => {
        state.ai.error = error;
      });
    },

    setProcessing: (isProcessing) => {
      set((state) => {
        state.ai.isProcessing = isProcessing;
      });
    },
  },
});

// ============================================================================
// Simulation Helper (would be replaced with actual API)
// ============================================================================

async function simulateAIResponse(prompt: string, _model: AIModel): Promise<string> {
  await new Promise((r) => setTimeout(r, 500));

  const responses = [
    "I understand you're working on this creative project. Here are some suggestions to enhance your work...",
    "Based on the context, I'd recommend considering these approaches for your design...",
    "That's an interesting direction! Here's how we could develop this idea further...",
    "I can help you refine this concept. Let me break down some key considerations...",
  ];

  return responses[Math.floor(Math.random() * responses.length)] +
    `\n\nYour input: "${prompt.slice(0, 50)}..."`;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useAI = () => {
  return useStore((state) => state.ai);
};

export const useActiveConversation = () => {
  const activeId = useStore((state) => state.ai.activeConversationId);
  const conversations = useStore((state) => state.ai.conversations);
  return activeId ? conversations.find((c) => c.id === activeId) : null;
};

export const useAIConversations = () => {
  return useStore((state) => state.ai.conversations);
};

export const useAISuggestions = (filterDismissed = true) => {
  const suggestions = useStore((state) => state.ai.suggestions);
  return filterDismissed ? suggestions.filter((s) => !s.dismissed) : suggestions;
};

export const useAIUsage = () => {
  const usage = useStore((state) => state.ai.usage);
  return {
    ...usage,
    tokensRemaining: usage.tokensLimit - usage.tokensUsed,
    requestsRemaining: usage.requestsLimit - usage.requestsToday,
    isAtLimit: usage.tokensUsed >= usage.tokensLimit || usage.requestsToday >= usage.requestsLimit,
  };
};

export const useAIPreferences = () => {
  const preferences = useStore((state) => state.ai.preferences);
  const updatePreferences = useStore((state) => state.ai.updatePreferences);
  return { preferences, updatePreferences };
};

export const useGenerationRequests = (status?: GenerationRequest['status']) => {
  const requests = useStore((state) => state.ai.generationRequests);
  return status ? requests.filter((r) => r.status === status) : requests;
};
