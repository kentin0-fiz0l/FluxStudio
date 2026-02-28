/**
 * Message Transformers Hook
 *
 * Transforms API/WebSocket data to UI Message/Conversation types.
 * Extracted from MessagesNew.tsx for Phase 4.2 decomposition.
 */

import { useCallback, useRef } from 'react';
import type { Message, Conversation, ConversationListItem } from '@/components/messaging/types';
import { ConversationMessage } from '@/services/messagingSocketService';
import { getInitials } from '@/components/messaging';

export interface ReadState {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  lastReadMessageId: string;
}

export interface UseMessageTransformersOptions {
  userId?: string;
  pinnedMessageIds: string[];
  typingUsers: Array<{ conversationId: string; userId: string; userEmail?: string }>;
  readStates?: ReadState[];
  messageIds?: string[];
}

export function useMessageTransformers({
  userId,
  pinnedMessageIds,
  typingUsers,
  readStates = [],
  messageIds = [],
}: UseMessageTransformersOptions) {

  // Stabilize pinnedMessageIds: only update ref if content actually changed
  const pinnedIdsRef = useRef<string[]>(pinnedMessageIds);
  if (
    pinnedMessageIds.length !== pinnedIdsRef.current.length ||
    pinnedMessageIds.some((id, i) => id !== pinnedIdsRef.current[i])
  ) {
    pinnedIdsRef.current = pinnedMessageIds;
  }
  const stablePinnedIds = pinnedIdsRef.current;

  // Stabilize readStates: only update ref if content actually changed
  const readStatesRef = useRef<ReadState[]>(readStates);
  if (
    readStates.length !== readStatesRef.current.length ||
    readStates.some((rs, i) => {
      const prev = readStatesRef.current[i];
      return !prev || rs.userId !== prev.userId || rs.lastReadMessageId !== prev.lastReadMessageId;
    })
  ) {
    readStatesRef.current = readStates;
  }
  const stableReadStates = readStatesRef.current;

  // Stabilize messageIds: only update ref if content actually changed
  const messageIdsRef = useRef<string[]>(messageIds);
  if (
    messageIds.length !== messageIdsRef.current.length ||
    messageIds.some((id, i) => id !== messageIdsRef.current[i])
  ) {
    messageIdsRef.current = messageIds;
  }
  const stableMessageIds = messageIdsRef.current;

  // Transform ConversationListItem to Conversation for UI
  const transformSummaryToConversation = useCallback((summary: ConversationListItem): Conversation => {
    const members = summary.members || [];
    const otherMember = members.find(m => m.userId !== userId) || members[0];
    const otherUser = otherMember?.user;

    return {
      id: summary.id,
      title: summary.name || otherUser?.name || otherUser?.email?.split('@')[0] || 'Conversation',
      type: summary.isGroup ? 'group' : 'direct',
      participant: {
        id: otherUser?.id || otherMember?.userId || '',
        name: otherUser?.name || otherUser?.email?.split('@')[0] || 'Unknown',
        initials: getInitials(otherUser?.name || otherUser?.email?.split('@')[0] || 'U'),
        isOnline: false,
      },
      participants: members.map(m => ({
        id: m.user?.id || m.userId,
        name: m.user?.name || m.user?.email?.split('@')[0] || 'Unknown',
        initials: getInitials(m.user?.name || m.user?.email?.split('@')[0] || 'U'),
        isOnline: false,
      })),
      lastMessage: summary.lastMessagePreview ? {
        id: '',
        content: summary.lastMessagePreview,
        author: { id: '', name: '', initials: '' },
        timestamp: summary.lastMessageAt ? new Date(summary.lastMessageAt) : new Date(),
        isCurrentUser: false,
      } : undefined,
      unreadCount: summary.unreadCount || 0,
      isPinned: false,
      isArchived: summary.isArchived || false,
      isMuted: summary.isMuted || false,
      isTyping: typingUsers.some(t => t.conversationId === summary.id),
      typingUsers: typingUsers
        .filter(t => t.conversationId === summary.id)
        .map(t => t.userEmail || ''),
      projectId: summary.projectId || null,
      projectName: summary.projectName || null,
    };
  }, [userId, typingUsers]);

  // Transform ConversationMessage to Message for UI
  const transformRealtimeMessage = useCallback((msg: ConversationMessage): Message => {
    const authorId = msg.authorId || msg.userId || '';
    const content = msg.content || msg.text || '';
    const authorName = msg.author?.displayName || msg.author?.email?.split('@')[0] || msg.userName || 'Unknown';

    // Compute readBy: find users whose lastReadMessageId is at an index >= this message's index
    const msgIndex = stableMessageIds.indexOf(msg.id);
    const readBy: Array<{ id: string; name: string; avatar?: string }> = [];
    if (msgIndex >= 0) {
      for (const rs of stableReadStates) {
        // Skip the current user's own read state
        if (rs.userId === userId) continue;
        const readIndex = stableMessageIds.indexOf(rs.lastReadMessageId);
        if (readIndex >= msgIndex) {
          readBy.push({
            id: rs.userId,
            name: rs.userName || 'User',
            avatar: rs.avatarUrl,
          });
        }
      }
    }

    return {
      id: msg.id,
      content,
      author: {
        id: authorId,
        name: authorName,
        initials: getInitials(authorName || 'U'),
        isOnline: false,
        avatar: msg.userAvatar,
      },
      timestamp: new Date(msg.createdAt),
      isCurrentUser: authorId === userId,
      status: 'sent',
      isEdited: !!msg.editedAt,
      editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
      isDeleted: false,
      replyTo: msg.replyToMessageId ? {
        id: msg.replyToMessageId,
        content: '',
        author: { id: '', name: '', initials: '' },
      } : undefined,
      attachments: [],
      asset: msg.asset ? {
        id: msg.asset.id,
        name: msg.asset.name,
        kind: msg.asset.kind,
        ownerId: msg.asset.ownerId,
        organizationId: msg.asset.organizationId,
        description: msg.asset.description,
        createdAt: msg.asset.createdAt,
        file: msg.asset.file,
      } : undefined,
      reactions: msg.reactions || [],
      isPinned: stablePinnedIds.includes(msg.id),
      isForwarded: false,
      isSystemMessage: msg.isSystemMessage,
      threadReplyCount: msg.threadReplyCount,
      threadRootMessageId: msg.threadRootMessageId,
      threadLastReplyAt: msg.threadLastReplyAt ? new Date(msg.threadLastReplyAt) : undefined,
      linkPreviews: msg.linkPreviews?.map((lp: { url: string; title?: string; description?: string; imageUrl?: string; siteName?: string; faviconUrl?: string }) => ({
        url: lp.url,
        title: lp.title,
        description: lp.description,
        imageUrl: lp.imageUrl,
        siteName: lp.siteName,
        faviconUrl: lp.faviconUrl,
      })),
      voiceMessage: msg.voiceMessage ? {
        duration: msg.voiceMessage.duration,
        url: msg.voiceMessage.url,
        waveform: msg.voiceMessage.waveform || [],
      } : undefined,
      readBy,
    };
  }, [userId, stablePinnedIds, stableReadStates, stableMessageIds]);

  // Transform multiple summaries to conversations
  const transformConversations = useCallback((summaries: ConversationListItem[]): Conversation[] => {
    return summaries.map(transformSummaryToConversation);
  }, [transformSummaryToConversation]);

  // Transform multiple messages
  const transformMessages = useCallback((msgs: ConversationMessage[]): Message[] => {
    return msgs.map(transformRealtimeMessage);
  }, [transformRealtimeMessage]);

  // Create message lookup map
  const createMessageMap = useCallback((messages: Message[]): Map<string, Message> => {
    return new Map(messages.map(m => [m.id, m]));
  }, []);

  return {
    transformSummaryToConversation,
    transformRealtimeMessage,
    transformConversations,
    transformMessages,
    createMessageMap,
  };
}

export default useMessageTransformers;
