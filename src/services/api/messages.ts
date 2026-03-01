/**
 * Messaging API endpoints
 */

import { buildMessagingUrl, buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  sendMessageSchema,
  SendMessageInput,
  editMessageSchema,
  EditMessageInput,
  addReactionSchema,
  AddReactionInput,
} from '../apiValidation';

export function messagesApi(service: ApiService) {
  return {
    getMessages(channelId?: string) {
      const url = channelId
        ? buildMessagingUrl(`/messages?channelId=${channelId}`)
        : buildMessagingUrl('/messages');
      return service.makeRequest(url);
    },

    sendMessage(data: SendMessageInput) {
      const validated = validate(sendMessageSchema, data);
      return service.makeRequest(buildMessagingUrl('/messages'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    // ========================================================================
    // Conversations
    // ========================================================================

    getConversations(params?: { limit?: number; offset?: number; projectId?: string }) {
      const searchParams = new URLSearchParams();
      if (params?.limit != null) searchParams.set('limit', String(params.limit));
      if (params?.offset != null) searchParams.set('offset', String(params.offset));
      if (params?.projectId) searchParams.set('projectId', params.projectId);
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/api/conversations${qs ? `?${qs}` : ''}`));
    },

    getConversation(id: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${id}`));
    },

    createConversation(data: { name?: string; isGroup?: boolean; memberUserIds?: string[]; organizationId?: string; projectId?: string }) {
      return service.makeRequest(buildApiUrl('/api/conversations'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateConversation(id: string, data: { name?: string; isGroup?: boolean }) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${id}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    // ========================================================================
    // Conversation Messages
    // ========================================================================

    getConversationMessages(conversationId: string, params?: { limit?: number; before?: string }) {
      const searchParams = new URLSearchParams();
      if (params?.limit != null) searchParams.set('limit', String(params.limit));
      if (params?.before) searchParams.set('before', params.before);
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`));
    },

    createMessage(conversationId: string, data: { text?: string; assetId?: string; replyToMessageId?: string; projectId?: string }) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/messages`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    editMessage(conversationId: string, messageId: string, data: EditMessageInput) {
      const validated = validate(editMessageSchema, data);
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/messages/${messageId}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    deleteMessage(conversationId: string, messageId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/messages/${messageId}`), {
        method: 'DELETE',
      });
    },

    // ========================================================================
    // Reactions
    // ========================================================================

    addReaction(messageId: string, data: AddReactionInput) {
      const validated = validate(addReactionSchema, data);
      return service.makeRequest(buildApiUrl(`/api/messages/${messageId}/reactions`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    removeReaction(messageId: string, emoji: string) {
      return service.makeRequest(buildApiUrl(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`), {
        method: 'DELETE',
      });
    },

    getReactions(messageId: string) {
      return service.makeRequest(buildApiUrl(`/api/messages/${messageId}/reactions`));
    },

    // ========================================================================
    // Pins
    // ========================================================================

    pinMessage(messageId: string) {
      return service.makeRequest(buildApiUrl(`/api/messages/${messageId}/pin`), {
        method: 'POST',
      });
    },

    unpinMessage(messageId: string) {
      return service.makeRequest(buildApiUrl(`/api/messages/${messageId}/pin`), {
        method: 'DELETE',
      });
    },

    getPinnedMessages(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/pins`));
    },

    // ========================================================================
    // Read Receipts
    // ========================================================================

    markAsRead(conversationId: string, data: { lastReadMessageId: string }) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/read`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getReadStates(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/read-states`));
    },

    // ========================================================================
    // Threads
    // ========================================================================

    getThreadMessages(conversationId: string, threadRootMessageId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/threads/${threadRootMessageId}/messages`));
    },

    getThreadSummary(conversationId: string, threadRootMessageId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/threads/${threadRootMessageId}/summary`));
    },

    // ========================================================================
    // Members
    // ========================================================================

    addMember(conversationId: string, data: { userId: string; role?: string }) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/members`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    removeMember(conversationId: string, userId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/members/${userId}`), {
        method: 'DELETE',
      });
    },

    leaveConversation(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/members/me`), {
        method: 'DELETE',
      });
    },

    // ========================================================================
    // Mute / Archive
    // ========================================================================

    muteConversation(conversationId: string, data?: { duration?: number }) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/mute`), {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      });
    },

    unmuteConversation(conversationId: string) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/mute`), {
        method: 'DELETE',
      });
    },

    archiveConversation(conversationId: string, archived?: boolean) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/archive`), {
        method: 'PATCH',
        body: JSON.stringify({ archived: archived ?? true }),
      });
    },

    // ========================================================================
    // Search
    // ========================================================================

    searchMessages(params: { q: string; conversationId?: string; limit?: number; offset?: number }) {
      const searchParams = new URLSearchParams();
      searchParams.set('q', params.q);
      if (params.conversationId) searchParams.set('conversationId', params.conversationId);
      if (params.limit != null) searchParams.set('limit', String(params.limit));
      if (params.offset != null) searchParams.set('offset', String(params.offset));
      return service.makeRequest(buildApiUrl(`/api/messages/search?${searchParams.toString()}`));
    },

    // ========================================================================
    // Files
    // ========================================================================

    uploadConversationFile(conversationId: string, formData: FormData) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/upload`), {
        method: 'POST',
        body: formData,
      });
    },

    uploadVoiceMessage(conversationId: string, formData: FormData) {
      return service.makeRequest(buildApiUrl(`/api/conversations/${conversationId}/voice-message`), {
        method: 'POST',
        body: formData,
      });
    },
  };
}
