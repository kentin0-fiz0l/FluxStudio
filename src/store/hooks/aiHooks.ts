/**
 * AI Convenience Hooks
 *
 * Provides easy access to AI state from the store.
 * Separated from aiSlice.ts to avoid circular dependencies.
 */

import { useStore } from '../store';
import type { GenerationRequest } from '../slices/aiSlice';

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
