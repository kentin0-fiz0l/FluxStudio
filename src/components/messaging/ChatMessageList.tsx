/**
 * ChatMessageList Component
 * Renders the scrollable message list with date separators,
 * message grouping, typing indicators, and scroll management
 */

import React, { useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { MessageCircle, Pin, Check, CheckCheck, Clock, AlertCircle, Play, Pause, AlertTriangle, CheckSquare } from 'lucide-react';
import { ChatAvatar } from './ChatMessageBubble';
import { messageIntelligenceService, type MessageAnalysis } from '@/services/messageIntelligenceService';
import { useMemoizedArray, useStableCallback } from '@/hooks/usePerformance';
import { announceToScreenReader } from '@/utils/accessibility';
import type { Message } from './types';
import type { VoiceMessage } from './types';
import type { Message as ServiceMessage, Conversation as ServiceConversation } from '@/types/messaging';

type FlatItem =
  | { type: 'date'; date: Date }
  | { type: 'message'; message: Message; isGrouped: boolean };

// ============================================================================
// Helper Components
// ============================================================================

function DateSeparator({ date }: { date: Date }) {
  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-4 my-4 px-4">
      <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        {formatDate(date)}
      </span>
      <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
    </div>
  );
}

function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  const message =
    users.length === 1
      ? `${users[0]} is typing...`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing...`
        : `${users[0]} and ${users.length - 1} others are typing...`;

  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{message}</span>
    </div>
  );
}

// ============================================================================
// InlineVoicePlayer — lightweight audio player for voice messages
// ============================================================================

function InlineVoicePlayer({ voiceMessage }: { voiceMessage: VoiceMessage }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const progress = voiceMessage.duration > 0
    ? (currentTime / voiceMessage.duration) * 100
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <audio
        ref={audioRef}
        src={voiceMessage.url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="text-xs text-neutral-500 tabular-nums">
        {formatTime(playing ? currentTime : voiceMessage.duration)}
      </span>
    </div>
  );
}

// ============================================================================
// MessageBubbleWrapper
// ============================================================================

interface MessageHandlerRefs {
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
}

interface MessageBubbleWrapperProps {
  message: Message;
  handlers: MessageHandlerRefs;
  isGrouped: boolean;
  currentUserId?: string;
  isPinned: boolean;
  isHighlighted: boolean;
  isEditing: boolean;
  editingDraft: string;
  analysis?: MessageAnalysis | null;
}

const MessageBubbleWrapper = React.memo(function MessageBubbleWrapper({
  message,
  handlers,
  isGrouped,
  currentUserId,
  isPinned,
  isHighlighted,
  isEditing,
  editingDraft,
  analysis,
}: MessageBubbleWrapperProps) {
  const onReply = useCallback(() => handlers.onReply(message), [handlers, message]);
  const onEdit = useCallback(() => handlers.onEdit(message), [handlers, message]);
  const onDelete = useCallback(() => handlers.onDelete(message.id), [handlers, message.id]);
  const onPin = useCallback(() => handlers.onPin(message.id), [handlers, message.id]);
  const onReact = useCallback((emoji: string) => handlers.onReact(message.id, emoji), [handlers, message.id]);
  const onOpenThread = useCallback(() => handlers.onOpenThread(message.id), [handlers, message.id]);
  const onJumpToMessage = handlers.onJumpToMessage;
  const onChangeEditingDraft = handlers.onChangeEditingDraft;
  const onSubmitEdit = handlers.onSubmitEdit;
  const onCancelEdit = handlers.onCancelEdit;
  const isOwn = message.author.id === currentUserId;

  const isUrgent = analysis?.urgency === 'critical' || analysis?.urgency === 'high';
  const hasActionItems = (analysis?.extractedData?.actionItems?.length ?? 0) > 0;
  const actionItemCount = analysis?.extractedData?.actionItems?.length ?? 0;

  return (
    <div
      data-message-id={message.id}
      className={`px-4 ${isGrouped ? 'pt-0.5' : 'pt-3'} ${
        isHighlighted ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500 rounded' : ''
      } ${isOwn ? 'flex justify-end' : ''}`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isOwn ? 'flex-row-reverse' : ''} ${
        isUrgent ? 'border-l-2 border-red-500 pl-2' : ''
      }`}>
        {!isGrouped && !isOwn && (
          <ChatAvatar user={message.author} size="sm" />
        )}
        {!isGrouped && isOwn && <div className="w-8" />}
        {isGrouped && <div className="w-8" />}

        <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
          {!isGrouped && (
            <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {message.author.name}
              </span>
              <span className="text-xs text-neutral-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isPinned && <Pin className="w-3 h-3 text-accent-500" aria-hidden="true" />}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingDraft}
                onChange={(e) => onChangeEditingDraft(e.target.value)}
                className="w-full p-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={onSubmitEdit}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-sm bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`inline-block p-3 rounded-2xl ${
                isOwn
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
              }`}
            >
              {/* Reply reference */}
              {message.replyTo && (
                <button
                  onClick={() => onJumpToMessage(message.replyTo!.id)}
                  className={`block mb-2 text-left text-xs p-2 rounded-lg ${
                    isOwn
                      ? 'bg-primary-500/50 hover:bg-primary-500/70'
                      : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                  }`}
                >
                  <span className="font-medium">{message.replyTo.author?.name || 'Unknown'}</span>
                  <p className="truncate">{message.replyTo.content}</p>
                </button>
              )}

              {message.voiceMessage ? (
                <InlineVoicePlayer voiceMessage={message.voiceMessage} />
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {message.isEdited && (
                <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-neutral-500'}`}>
                  {' '}(edited)
                </span>
              )}
            </div>
          )}

          {/* Read receipt for own messages */}
          {isOwn && message.status && !isEditing && (
            <div className="flex items-center gap-1 mt-0.5 justify-end">
              {message.status === 'sending' && <Clock className="w-3 h-3 text-neutral-400 animate-pulse" aria-hidden="true" />}
              {message.status === 'sent' && <Check className="w-3 h-3 text-neutral-400" aria-hidden="true" />}
              {message.status === 'delivered' && <CheckCheck className="w-3 h-3 text-neutral-400" aria-hidden="true" />}
              {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-500 dark:text-blue-400" aria-hidden="true" />}
              {message.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-500" aria-hidden="true" />}
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {message.status === 'read' ? 'Read' : message.status === 'delivered' ? 'Delivered' : message.status === 'sent' ? 'Sent' : message.status === 'sending' ? 'Sending...' : message.status === 'failed' ? 'Failed' : ''}
              </span>
            </div>
          )}

          {/* Quick actions — larger touch targets on mobile */}
          {!isEditing && (
            <div className="flex gap-0.5 sm:gap-1 mt-1 opacity-0 hover:opacity-100 focus-within:opacity-100 active:opacity-100 transition-opacity touch-manipulation">
              <button onClick={onReply} className="p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600 rounded-lg sm:rounded" title="Reply">
                <MessageCircle className="w-4 h-4 text-neutral-500" aria-hidden="true" />
              </button>
              {isOwn && (
                <>
                  <button onClick={onEdit} className="p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600 rounded-lg sm:rounded" title="Edit">
                    <span className="text-xs">✏️</span>
                  </button>
                  <button onClick={onDelete} className="p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600 rounded-lg sm:rounded" title="Delete">
                    <span className="text-xs">🗑️</span>
                  </button>
                </>
              )}
              <button onClick={onPin} className="p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600 rounded-lg sm:rounded" title={isPinned ? 'Unpin' : 'Pin'}>
                <Pin className="w-4 h-4 text-neutral-500" aria-hidden="true" />
              </button>
              <button onClick={() => onReact('👍')} className="p-2 sm:p-1 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-600 rounded-lg sm:rounded" title="React">
                <span className="text-xs">👍</span>
              </button>
            </div>
          )}

          {/* Thread indicator */}
          {message.threadReplyCount && message.threadReplyCount > 0 && (
            <button
              onClick={onOpenThread}
              className={`mt-1 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline ${
                message.threadUnreadCount && message.threadUnreadCount > 0 ? 'animate-pulse' : ''
              }`}
            >
              {message.threadLastReplierAvatar && (
                <img
                  src={message.threadLastReplierAvatar}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <span>{message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}</span>
              {message.threadUnreadCount != null && message.threadUnreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-medium">
                  {message.threadUnreadCount}
                </span>
              )}
            </button>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-full text-xs"
                >
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
            </div>
          )}

          {/* Intelligence indicators */}
          {(isUrgent || hasActionItems) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {isUrgent && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  {analysis?.urgency === 'critical' ? 'Urgent' : 'High priority'}
                </span>
              )}
              {hasActionItems && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  <CheckSquare className="w-3 h-3" aria-hidden="true" />
                  {actionItemCount} action item{actionItemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// ChatMessageList
// ============================================================================

export interface ChatMessageListProps {
  messages: Message[];
  pinnedMessageIds: string[];
  typingUsers: Array<{ userId: string; userName?: string; userEmail?: string }>;
  highlightedMessageId: string | null;
  threadHighlightId?: string | null;
  editingMessageId: string | null;
  editingDraft: string;
  currentUserId?: string;
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
}

export interface ChatMessageListRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessageList = forwardRef<ChatMessageListRef, ChatMessageListProps>(
  function ChatMessageList(
    {
      messages,
      pinnedMessageIds,
      typingUsers,
      highlightedMessageId,
      threadHighlightId,
      editingMessageId,
      editingDraft,
      currentUserId,
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
    },
    ref
  ) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Memoize message array to preserve referential equality when items haven't changed
    const messageKeyFn = useCallback((m: Message) => m.id, []);
    const stableMessages = useMemoizedArray(messages, messageKeyFn);

    const messageById = useMemo(
      () => new Map(stableMessages.map((m) => [m.id, m])),
      [stableMessages]
    );

    // Pre-compute flat items array interleaving date separators with messages
    const flatItems = useMemo<FlatItem[]>(() => {
      const items: FlatItem[] = [];
      for (let i = 0; i < stableMessages.length; i++) {
        const message = stableMessages[i];
        const prevMessage = stableMessages[i - 1];
        const showDateSeparator =
          !prevMessage ||
          message.timestamp.toDateString() !== prevMessage.timestamp.toDateString();
        const isGrouped =
          !!prevMessage &&
          prevMessage.author.id === message.author.id &&
          message.timestamp.getTime() - prevMessage.timestamp.getTime() < 60000;

        if (showDateSeparator) {
          items.push({ type: 'date', date: message.timestamp });
        }
        items.push({ type: 'message', message, isGrouped: showDateSeparator ? false : isGrouped });
      }
      return items;
    }, [stableMessages]);

    // Stabilize handler callbacks to prevent unnecessary re-renders of memoized children
    const stableOnJumpToMessage = useStableCallback(onJumpToMessage);
    const stableOnChangeEditingDraft = useStableCallback(onChangeEditingDraft);
    const stableOnSubmitEdit = useStableCallback(onSubmitEdit);
    const stableOnCancelEdit = useStableCallback(onCancelEdit);

    const handlerRefs = useMemo<MessageHandlerRefs>(() => ({
      onReply, onEdit, onDelete, onPin, onCopy, onForward, onReact,
      onOpenThread, onViewInFiles, onJumpToMessage: stableOnJumpToMessage,
      onChangeEditingDraft: stableOnChangeEditingDraft,
      onSubmitEdit: stableOnSubmitEdit, onCancelEdit: stableOnCancelEdit,
    }), [onReply, onEdit, onDelete, onPin, onCopy, onForward, onReact,
         onOpenThread, onViewInFiles, stableOnJumpToMessage, stableOnChangeEditingDraft,
         stableOnSubmitEdit, stableOnCancelEdit]);

    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        virtuosoRef.current?.scrollToIndex({
          index: flatItems.length - 1,
          behavior: 'smooth',
        });
      },
      scrollToMessage: (messageId: string) => {
        const index = flatItems.findIndex(
          (item) => item.type === 'message' && item.message.id === messageId
        );
        if (index !== -1) {
          virtuosoRef.current?.scrollToIndex({
            index,
            align: 'center',
            behavior: 'smooth',
          });
          // Highlight after scroll settles
          setTimeout(() => {
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) {
              messageEl.classList.add('ring-2', 'ring-primary-500');
              setTimeout(() => messageEl.classList.remove('ring-2', 'ring-primary-500'), 2000);
            }
          }, 300);
        }
      },
    }));

    // Message intelligence: analyze last 20 messages for urgency and action items
    const [analysisMap, setAnalysisMap] = useState<Map<string, MessageAnalysis>>(new Map());

    const recentMessageIds = useMemo(() => {
      const recent = messages.slice(-20);
      return recent.map((m) => m.id);
    }, [messages]);

    useEffect(() => {
      let cancelled = false;
      const analyzeRecent = async () => {
        const recent = messages.slice(-20);
        if (recent.length === 0) return;

        // Build a minimal service-compatible conversation object
        const stubConversation = {
          id: '',
          type: 'direct' as const,
          name: '',
          participants: [],
          metadata: { isArchived: false, isMuted: false, isPinned: false, priority: 'low' as const, tags: [] },
          lastActivity: new Date(),
          unreadCount: 0,
          permissions: { canWrite: true, canAddMembers: false, canArchive: false, canDelete: false },
          createdBy: { id: '', name: '', userType: 'client' as const },
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies ServiceConversation;

        const results = new Map<string, MessageAnalysis>();
        for (const msg of recent) {
          // Skip already-analyzed messages
          if (analysisMap.has(msg.id)) {
            results.set(msg.id, analysisMap.get(msg.id)!);
            continue;
          }
          try {
            // Adapt UI message to service message shape
            const serviceMsg = {
              id: msg.id,
              conversationId: '',
              type: 'text' as const,
              content: msg.content,
              author: { ...msg.author, userType: 'client' as const },
              status: msg.status ?? ('sent' as const),
              isEdited: msg.isEdited ?? false,
              createdAt: msg.timestamp,
              updatedAt: msg.timestamp,
              attachments: msg.attachments as unknown as ServiceMessage['attachments'],
            } satisfies ServiceMessage;
            const analysis = await messageIntelligenceService.analyzeMessage(serviceMsg, stubConversation);
            if (cancelled) return;
            results.set(msg.id, analysis);
          } catch {
            // Silently skip analysis failures
          }
        }
        if (!cancelled) {
          setAnalysisMap(results);
        }
      };
      analyzeRecent();
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recentMessageIds.join(',')]);

    const itemContent = useCallback(
      (index: number) => {
        const item = flatItems[index];
        if (!item) return null;

        if (item.type === 'date') {
          return <DateSeparator date={item.date} />;
        }

        const message = item.message;
        const parentMessage = message.replyTo?.id
          ? messageById.get(message.replyTo.id)
          : undefined;

        const enrichedMessage =
          parentMessage && message.replyTo
            ? {
                ...message,
                replyTo: {
                  id: parentMessage.id,
                  content: parentMessage.content,
                  author: parentMessage.author,
                },
              }
            : message;

        return (
          <MessageBubbleWrapper
            message={enrichedMessage}
            handlers={handlerRefs}
            isGrouped={item.isGrouped}
            currentUserId={currentUserId}
            isPinned={pinnedMessageIds.includes(message.id)}
            isHighlighted={
              highlightedMessageId === message.id || threadHighlightId === message.id
            }
            isEditing={editingMessageId === message.id}
            editingDraft={editingMessageId === message.id ? editingDraft : ''}
            analysis={analysisMap.get(message.id) ?? null}
          />
        );
      },
      [flatItems, messageById, handlerRefs, currentUserId, pinnedMessageIds, highlightedMessageId, threadHighlightId, editingMessageId, editingDraft, analysisMap]
    );

    // Announce new messages to screen readers
    const prevMessageCountRef = useRef(stableMessages.length);
    useEffect(() => {
      const prevCount = prevMessageCountRef.current;
      const newCount = stableMessages.length;
      prevMessageCountRef.current = newCount;

      if (newCount > prevCount && prevCount > 0) {
        const latestMessage = stableMessages[newCount - 1];
        if (latestMessage && latestMessage.author.id !== currentUserId) {
          announceToScreenReader(
            `New message from ${latestMessage.author.name}: ${latestMessage.content.slice(0, 100)}`
          );
        }
      }
    }, [stableMessages, currentUserId]);

    return (
      <div className="flex-1 flex flex-col relative" role="log" aria-live="polite" aria-label="Message list">
        {stableMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            <Virtuoso
              ref={virtuosoRef}
              totalCount={flatItems.length}
              itemContent={itemContent}
              initialTopMostItemIndex={flatItems.length - 1}
              followOutput="smooth"
              className="flex-1"
            />

            {typingUsers.length > 0 && (
              <TypingIndicator
                users={typingUsers.map(
                  (u) => u.userName || u.userEmail?.split('@')[0] || 'Someone'
                )}
              />
            )}
          </>
        )}
      </div>
    );
  }
);

export default ChatMessageList;
