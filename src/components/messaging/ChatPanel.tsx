/**
 * ChatPanel Component
 * Composition shell that assembles the chat header, message list,
 * pinned messages panel, and input area into a single chat view.
 */

import React, { useMemo, forwardRef, useCallback } from 'react';
import { X, MessageCircle } from 'lucide-react';

import { Card } from '@/components/ui';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import type { ChatMessageListRef } from './ChatMessageList';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import { ChatInputArea } from './ChatInputArea';
import type { Message, Conversation } from './types';

export function EmptyChatState({ onStartConversation }: { onStartConversation: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        Select a conversation
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Choose a conversation from the sidebar or start a new one.
      </p>
      <button
        onClick={onStartConversation}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        Start New Conversation
      </button>
    </div>
  );
}

function ThreadMicroHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-indigo-900 dark:text-indigo-100">
            <span className="font-medium">Threads keep replies organized.</span>
            {' '}Click the reply icon on any message to start a focused thread.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss hint"
        >
          <X className="w-4 h-4 text-indigo-500" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main ChatPanel Component
// ============================================================================

export interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  pinnedMessageIds: string[];
  typingUsers: Array<{ userId: string; userName?: string; userEmail?: string }>;
  isConnected: boolean;
  highlightedMessageId: string | null;
  threadHighlightId?: string | null;
  editingMessageId: string | null;
  editingDraft: string;
  currentUserId?: string;
  showMobileChat: boolean;
  onMobileBack: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onForward: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  onViewInFiles?: (assetId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onChangeEditingDraft: (draft: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onStartConversation: () => void;
  showPinnedMessages: boolean;
  onTogglePinnedMessages: () => void;
  showSummaryPanel: boolean;
  onToggleSummaryPanel: () => void;
  showMessageSearch: boolean;
  onToggleMessageSearch: () => void;
  showThreadHint?: boolean;
  onDismissThreadHint?: () => void;
  messageSearchPanel?: React.ReactNode;
  composer: React.ReactNode;
  onMoreOptions?: () => void;
  moreOptionsSlot?: React.ReactNode;
}

export interface ChatPanelRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(function ChatPanel(
  {
    conversation,
    messages,
    pinnedMessageIds,
    typingUsers,
    isConnected,
    highlightedMessageId,
    threadHighlightId,
    editingMessageId,
    editingDraft,
    currentUserId,
    showMobileChat,
    onMobileBack,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onCopy,
    onForward,
    onReact,
    onOpenThread,
    onViewInFiles,
    onJumpToMessage,
    onChangeEditingDraft,
    onSubmitEdit,
    onCancelEdit,
    onStartConversation,
    showPinnedMessages,
    onTogglePinnedMessages,
    showSummaryPanel,
    onToggleSummaryPanel,
    showMessageSearch,
    onToggleMessageSearch,
    showThreadHint,
    onDismissThreadHint,
    messageSearchPanel,
    composer,
    onMoreOptions,
    moreOptionsSlot,
  },
  ref
) {
  const pinnedMessages = useMemo(
    () => messages.filter((m) => pinnedMessageIds.includes(m.id)),
    [messages, pinnedMessageIds]
  );

  const handlePinnedJumpTo = useCallback(
    (id: string) => {
      onJumpToMessage(id);
      onTogglePinnedMessages();
    },
    [onJumpToMessage, onTogglePinnedMessages]
  );

  const cardClassName = `flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`;

  if (!conversation) {
    return (
      <Card className={cardClassName}>
        <EmptyChatState onStartConversation={onStartConversation} />
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <ChatHeader
        conversation={conversation}
        isTyping={typingUsers.some((t) => t.userId === conversation.participant?.id)}
        onBack={onMobileBack}
        showMessageSearch={showMessageSearch}
        onToggleSearch={onToggleMessageSearch}
        showPinnedMessages={showPinnedMessages}
        onTogglePinned={onTogglePinnedMessages}
        showSummary={showSummaryPanel}
        onToggleSummary={onToggleSummaryPanel}
        onMoreOptions={onMoreOptions}
        moreOptionsSlot={moreOptionsSlot}
      />

      {showPinnedMessages && (
        <PinnedMessagesPanel
          messages={pinnedMessages}
          onClose={onTogglePinnedMessages}
          onUnpin={onPin}
          onJumpTo={handlePinnedJumpTo}
        />
      )}

      {showMessageSearch && messageSearchPanel}

      {showThreadHint && messages.length > 0 && onDismissThreadHint && (
        <ThreadMicroHint onDismiss={onDismissThreadHint} />
      )}

      <ChatMessageList
        ref={ref as React.Ref<ChatMessageListRef>}
        messages={messages}
        pinnedMessageIds={pinnedMessageIds}
        typingUsers={typingUsers}
        highlightedMessageId={highlightedMessageId}
        threadHighlightId={threadHighlightId}
        editingMessageId={editingMessageId}
        editingDraft={editingDraft}
        currentUserId={currentUserId}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onPin={onPin}
        onCopy={onCopy}
        onForward={onForward}
        onReact={onReact}
        onOpenThread={onOpenThread}
        onViewInFiles={onViewInFiles}
        onJumpToMessage={onJumpToMessage}
        onChangeEditingDraft={onChangeEditingDraft}
        onSubmitEdit={onSubmitEdit}
        onCancelEdit={onCancelEdit}
      />

      <ChatInputArea isConnected={isConnected} composer={composer} />
    </Card>
  );
});

export default ChatPanel;
