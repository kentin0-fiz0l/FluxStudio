/**
 * AI Service - Frontend API for AI Design Assistant
 *
 * Handles communication with the backend AI endpoints.
 * Supports streaming responses for chat.
 */

import { getApiUrl, getAuthToken } from '@/utils/apiHelpers';

// ============================================================================
// Types
// ============================================================================

export interface AIContext {
  project?: {
    id: string;
    name: string;
    description?: string;
    status?: string;
  };
  files?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  assets?: Array<{
    id: string;
    name: string;
  }>;
  page?: string;
  recentActions?: string[];
}

export interface ChatOptions {
  conversationId?: string;
  model?: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  context?: AIContext;
}

export interface StreamCallbacks {
  onStart?: (conversationId: string) => void;
  onChunk?: (chunk: string) => void;
  onDone?: (conversationId: string, tokensUsed: number) => void;
  onError?: (error: string) => void;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignReviewOptions {
  description: string;
  imageUrl?: string;
  aspects?: Array<'overall' | 'accessibility' | 'usability' | 'aesthetics' | 'consistency'>;
}

export interface CodeGenerationOptions {
  description: string;
  componentType?: 'button' | 'card' | 'form' | 'modal' | 'component';
  style?: 'minimal' | 'modern' | 'playful';
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// Chat Functions
// ============================================================================

/**
 * Stream a chat message to the AI
 * Uses Server-Sent Events for real-time streaming
 */
export async function streamChat(
  message: string,
  options: ChatOptions = {},
  callbacks: StreamCallbacks = {}
): Promise<void> {
  const { conversationId, model = 'claude-sonnet-4-20250514', context } = options;
  const { onStart, onChunk, onDone, onError } = callbacks;

  const url = getApiUrl('/api/ai/chat');
  const token = getAuthToken();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        conversationId,
        model,
        context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
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
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'start':
                onStart?.(data.conversationId);
                break;
              case 'chunk':
                onChunk?.(data.content);
                break;
              case 'done':
                onDone?.(data.conversationId, data.tokensUsed || 0);
                break;
              case 'error':
                onError?.(data.error);
                break;
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    onError?.(errorMessage);
    throw error;
  }
}

/**
 * Send a chat message and get a complete response (non-streaming)
 */
export async function chat(
  message: string,
  context?: AIContext
): Promise<{ content: string; tokensUsed: number }> {
  const url = getApiUrl('/api/ai/chat/sync');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Conversation Management
// ============================================================================

/**
 * List all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  const url = getApiUrl('/api/ai/conversations');

  const response = await fetch(url, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const data = await response.json();
  return data.conversations || [];
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(id: string): Promise<{
  id: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  createdAt: string;
}> {
  const url = getApiUrl(`/api/ai/conversations/${id}`);

  const response = await fetch(url, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }

  const data = await response.json();
  return data.conversation;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const url = getApiUrl(`/api/ai/conversations/${id}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
}

// ============================================================================
// Design Review
// ============================================================================

/**
 * Get AI feedback on a design
 */
export async function reviewDesign(options: DesignReviewOptions): Promise<{
  feedback: string;
  aspects: string[];
}> {
  const url = getApiUrl('/api/ai/design-review');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || 'Design review failed');
  }

  return response.json();
}

// ============================================================================
// Code Generation
// ============================================================================

/**
 * Generate React component code
 */
export async function generateCode(options: CodeGenerationOptions): Promise<{
  code: string;
  componentType: string;
  style: string;
}> {
  const url = getApiUrl('/api/ai/generate-code');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || 'Code generation failed');
  }

  return response.json();
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if AI service is available
 */
export async function checkHealth(): Promise<{
  status: string;
  hasApiKey: boolean;
}> {
  const url = getApiUrl('/api/ai/health');

  const response = await fetch(url);

  if (!response.ok) {
    return { status: 'unhealthy', hasApiKey: false };
  }

  return response.json();
}

// ============================================================================
// Default Export
// ============================================================================

const aiService = {
  streamChat,
  chat,
  getConversations,
  getConversation,
  deleteConversation,
  reviewDesign,
  generateCode,
  checkHealth,
};

export default aiService;
