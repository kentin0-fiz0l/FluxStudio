/**
 * AI API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function aiApi(service: ApiService) {
  return {
    chat(data: {
      message: string;
      context?: object;
      conversationId?: string;
      model?: string;
    }) {
      return service.makeRequest(buildApiUrl('/ai/chat'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    chatSync(data: {
      message: string;
      context?: object;
      model?: string;
    }) {
      return service.makeRequest(buildApiUrl('/ai/chat/sync'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    analyzeDesign(data: {
      description: string;
      imageUrl?: string;
      aspects?: string[];
    }) {
      return service.makeRequest(buildApiUrl('/ai/design-review'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    generateCode(data: {
      description: string;
      componentType?: string;
      style?: string;
    }) {
      return service.makeRequest(buildApiUrl('/ai/generate-code'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getDesignFeedback(data: {
      imageUrl: string;
      context?: {
        projectType?: string;
        industry?: string;
        targetAudience?: string;
        brandGuidelines?: string;
        focusAreas?: string[];
      };
    }) {
      return service.makeRequest(buildApiUrl('/ai/design-feedback/analyze'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    generateProjectStructure(data: {
      description: string;
      category?: string;
      complexity?: string;
    }) {
      return service.makeRequest(buildApiUrl('/ai/generate-project-structure'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    generateTemplate(data: {
      description: string;
      category?: string;
      complexity?: string;
    }) {
      return service.makeRequest(buildApiUrl('/ai/generate-template'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getConversations() {
      return service.makeRequest(buildApiUrl('/ai/conversations'));
    },

    getConversation(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/ai/conversations/${conversationId}`));
    },

    deleteConversation(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/ai/conversations/${conversationId}`), {
        method: 'DELETE',
      });
    },

    getUsage(limit?: number) {
      const query = limit ? `?limit=${limit}` : '';
      return service.makeRequest(buildApiUrl(`/ai/usage${query}`));
    },

    getHealth() {
      return service.makeRequest(buildApiUrl('/ai/health'));
    },
  };
}
