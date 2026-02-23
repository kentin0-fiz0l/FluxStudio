/**
 * ChatMessageBubble Component
 * Renders individual chat messages with all associated UI elements
 *
 * Decomposed from the original monolithic file.
 * Sub-components extracted to MessageHelpers.tsx
 */

import { useState, memo } from 'react';
import {
  Pin,
  Download,
  File,
  Play,
  Volume2,
  Forward,
  Reply,
  Smile,
  MessageCircle,
} from 'lucide-react';

import { MessageActionsMenu } from '../MessageActionsMenu';
import { InlineReplyPreview } from '../InlineReplyPreview';
import { MarkdownMessage } from '../MarkdownMessage';
import type { Message } from '../types';
import { formatMessageTime, formatRelativeTime, formatFileSize, QUICK_REACTIONS } from '../utils';

import {
  MessageStatusIcon,
  ChatAvatar,
  LinkPreviewCard,
  AttachmentPreview,
  VoiceMessagePlayer,
  ReactionBadge,
} from './MessageHelpers';

// Re-export helpers for consumers that import them directly
export {
  MessageStatusIcon,
  ChatAvatar,
  LinkPreviewCard,
  AttachmentPreview,
  VoiceMessagePlayer,
  ReactionBadge,
} from './MessageHelpers';

// ============================================================================
// Types
// ============================================================================

interface ChatMessageBubbleProps {
  message: Message;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onOpenThread?: () => void;
  onViewInFiles?: (assetId: string) => void;
  showAvatar?: boolean;
  isGrouped?: boolean;
  currentUserId: string;
  isPinned?: boolean;
  isHighlighted?: boolean;
  isEditing?: boolean;
  editingDraft?: string;
  onChangeEditingDraft?: (draft: string) => void;
  onSubmitEdit?: () => void;
  onCancelEdit?: () => void;
  readBy?: Array<{ id: string; name: string; avatar?: string }>;
  onRetry?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

function ChatMessageBubbleComponent({
  message,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onReact,
  onCopy,
  onJumpToMessage,
  onOpenThread,
  onViewInFiles,
  showAvatar = true,
  isGrouped = false,
  currentUserId,
  isPinned = false,
  isHighlighted = false,
  isEditing = false,
  editingDraft = '',
  onChangeEditingDraft,
  onSubmitEdit,
  onCancelEdit,
  readBy = [],
  onRetry,
}: ChatMessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isOwn = message.isCurrentUser;

  // Deleted message placeholder
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-1`}>
        <div className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 italic text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      data-message-id={message.id}
      className={`relative group flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 ${isGrouped ? 'py-0.5' : 'py-1'} transition-all ${isHighlighted ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar (for non-own messages) */}
      {!isOwn && showAvatar && !isGrouped && (
        <div className="mr-2 mt-1">
          <ChatAvatar user={message.author} size="sm" />
        </div>
      )}
      {!isOwn && !showAvatar && !isGrouped && <div className="w-10 mr-2" />}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isGrouped && !isOwn ? 'ml-12' : ''}`}>
        {/* Reply preview */}
        {message.replyTo && message.replyTo.content && (
          <div className="mb-1">
            <InlineReplyPreview
              messageId={message.replyTo.id}
              authorName={message.replyTo.author.name || 'Unknown'}
              text={message.replyTo.content}
              isPinned={false}
              onJumpToMessage={onJumpToMessage}
              isOwnMessage={isOwn}
            />
          </div>
        )}

        {/* Forwarded indicator */}
        {message.isForwarded && (
          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <Forward className="w-3 h-3" aria-hidden="true" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Author name for group chats */}
        {!isOwn && !isGrouped && (
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-0.5 ml-1">
            {message.author.name}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-md'
          } ${message.status === 'sending' ? 'opacity-70' : ''} ${message.status === 'failed' ? 'ring-2 ring-red-400/50' : ''}`}
        >
          {/* Text content / Inline edit */}
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                className={`w-full text-sm bg-transparent border rounded-md px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/60 ${
                  isOwn
                    ? 'border-white/30 text-white placeholder-white/50'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100'
                }`}
                value={editingDraft}
                onChange={(e) => onChangeEditingDraft?.(e.target.value)}
                rows={Math.min(5, Math.max(1, editingDraft.split('\n').length))}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmitEdit?.();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancelEdit?.();
                  }
                }}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={onCancelEdit}
                  className={`hover:underline ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitEdit}
                  className={`font-medium hover:underline ${isOwn ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            message.content && (
              <MarkdownMessage text={message.content} className="text-sm" />
            )
          )}

          {/* Voice message */}
          {message.voiceMessage && (
            <VoiceMessagePlayer voiceMessage={message.voiceMessage} />
          )}

          {/* Asset attachment (from backend) */}
          {message.asset && message.asset.file && (
            <div className="mt-2">
              {message.asset.kind === 'image' ? (
                <div className="relative group/asset">
                  <button
                    onClick={() => onViewInFiles?.(message.asset!.id)}
                    className="block text-left"
                    title="View in Files"
                  >
                    <img
                      src={message.asset.file.thumbnailUrl || message.asset.file.url}
                      alt={message.asset.name}
                      className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== message.asset?.file.url) {
                          target.src = message.asset?.file.url || '';
                        }
                      }}
                    />
                  </button>
                  <a
                    href={message.asset.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.asset.file.originalName || message.asset.name}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover/asset:opacity-100 transition-opacity"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
               </a>
                </div>
              ) : (
                <div
                  onClick={() => onViewInFiles?.(message.asset!.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isOwn
                      ? 'bg-white/10 border-white/20 hover:bg-white/20'
                      : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                  title="View in Files"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isOwn ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}>
                    {message.asset.kind === 'pdf' ? (
                      <File className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-red-500'}`} aria-hidden="true" />
                    ) : message.asset.kind === 'video' ? (
                      <Play className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-blue-500'}`} aria-hidden="true" />
                    ) : message.asset.kind === 'audio' ? (
                      <Volume2 className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-green-500'}`} aria-hidden="true" />
                    ) : (
                      <File className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-neutral-500'}`} aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {message.asset.file.originalName || message.asset.name}
                    </p>
                    <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {formatFileSize(message.asset.file.sizeBytes)}
                    </p>
                  </div>
                  <a
                    href={message.asset.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.asset.file.originalName}
                    className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className={`w-4 h-4 ${isOwn ? 'text-white/70' : 'text-neutral-400'}`} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Legacy Attachments */}
          {message.attachments?.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onView={() => {/* open lightbox */}}
              onDownload={() => window.open(attachment.url, '_blank')}
            />
          ))}

          {/* Link previews */}
          {message.linkPreviews?.map((preview, i) => (
            <LinkPreviewCard key={i} preview={preview} />
          ))}

          {/* Footer: time, edited, status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {message.isEdited && (
              <span
                className={`text-[10px] cursor-help ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}
                title={
                  message.editHistory && message.editHistory.length > 0
                    ? `Original: "${message.editHistory[0].content.slice(0, 100)}${message.editHistory[0].content.length > 100 ? '...' : ''}"${message.editHistory.length > 1 ? ` (+${message.editHistory.length - 1} more edits)` : ''}`
                    : 'This message was edited'
                }
              >
                edited
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
              {formatMessageTime(message.timestamp)}
            </span>
            {isOwn && message.status && <MessageStatusIcon status={message.status} />}
          </div>

          {/* Failed message retry */}
          {message.status === 'failed' && onRetry && (
            <div className="flex items-center gap-1 mt-1 justify-end">
              <span className="text-[10px] text-red-400">Failed to send</span>
              <button
                onClick={onRetry}
                className="text-[10px] font-medium text-red-300 hover:text-white underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Pinned badge */}
          {isPinned && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <Pin className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-1">
            {message.reactions.map((reaction) => (
              <ReactionBadge
                key={reaction.emoji}
                reaction={reaction}
                onClick={() => onReact(reaction.emoji)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        {/* Read receipt avatars */}
        {isOwn && readBy.length > 0 && (
          <div className={`flex items-center gap-0.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            <span className="text-[10px] text-neutral-400 mr-1">Seen by</span>
            <div className="flex -space-x-1.5">
              {readBy.slice(0, 5).map((reader) => (
                <div
                  key={reader.id}
                  className="w-4 h-4 rounded-full border border-white dark:border-neutral-900 overflow-hidden"
                  title={reader.name}
                >
                  {reader.avatar ? (
                    <img src={reader.avatar} alt={reader.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-[8px] font-medium text-primary-600 dark:text-primary-400">
                        {reader.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {readBy.length > 5 && (
                <div className="w-4 h-4 rounded-full border border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                  <span className="text-[8px] font-medium text-neutral-600 dark:text-neutral-300">
                    +{readBy.length - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thread replies pill */}
        {(message.threadReplyCount || 0) > 0 && onOpenThread && (
          <div className="relative group/thread">
            <button
              onClick={onOpenThread}
              className={`flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isOwn
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
            {message.threadLastReplyAt && (
              <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} hidden group-hover/thread:block pointer-events-none z-20`}>
                <div className="px-2 py-1 bg-neutral-900 dark:bg-neutral-700 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
                  Last reply {formatRelativeTime(message.threadLastReplyAt)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick actions bar */}
        {showActions && (
          <div
            className={`absolute ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="React"
            >
              <Smile className="w-4 h-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
            </button>
            <button
              onClick={onReply}
              className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Reply"
            >
              <Reply className="w-4 h-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
            </button>
            <MessageActionsMenu
              messageId={message.id}
              canReply
              canReact
              canPin
              canEdit={isOwn}
              canForward
              canDelete={isOwn}
              canOpenThread={!!onOpenThread}
              isPinned={isPinned}
              hasReplies={(message.threadReplyCount || 0) > 0}
              onReply={() => onReply()}
              onReact={() => setShowReactions(true)}
              onPinToggle={() => onPin()}
              onEdit={isOwn ? () => onEdit() : undefined}
              onForward={() => onForward()}
              onCopy={() => onCopy()}
              onDelete={isOwn ? () => onDelete() : undefined}
              onOpenThread={onOpenThread}
              align={isOwn ? 'start' : 'end'}
              side="top"
            />
          </div>
        )}

        {/* Quick reactions popup */}
        {showReactions && (
          <div
            className={`absolute ${isOwn ? 'right-0' : 'left-12'} -top-10 flex gap-1 p-1.5 bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700 z-10`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); setShowReactions(false); }}
                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-transform hover:scale-125"
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized ChatMessageBubble for performance optimization
 */
export const ChatMessageBubble = memo(ChatMessageBubbleComponent, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.isEdited === next.message.isEdited &&
    prev.message.isDeleted === next.message.isDeleted &&
    prev.isPinned === next.isPinned &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isEditing === next.isEditing &&
    prev.editingDraft === next.editingDraft &&
    prev.isGrouped === next.isGrouped &&
    prev.showAvatar === next.showAvatar &&
    JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions) &&
    JSON.stringify(prev.readBy) === JSON.stringify(next.readBy)
  );
});

export default ChatMessageBubble;
