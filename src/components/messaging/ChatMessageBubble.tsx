/**
 * ChatMessageBubble Component
 * Renders individual chat messages with all associated UI elements
 *
 * This is the enhanced version extracted from MessagesNew.tsx
 * with support for inline editing, voice messages, asset attachments,
 * read receipts, thread indicators, and quick reactions.
 *
 * Features:
 * - Message content with markdown support
 * - Inline editing mode
 * - Reply preview with jump-to-message
 * - File/image attachments
 * - Voice message player
 * - Reactions with quick emoji picker
 * - Thread reply indicators
 * - Read receipts
 * - Action menu (reply, edit, delete, pin, forward)
 */

import { useState, memo } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Pin,
  Download,
  File,
  Play,
  Pause,
  Volume2,
  Maximize2,
  Forward,
  Reply,
  Smile,
  MessageCircle,
} from 'lucide-react';

import { MessageActionsMenu } from './MessageActionsMenu';
import { InlineReplyPreview } from './InlineReplyPreview';
import { MarkdownMessage } from './MarkdownMessage';
import type { Message, MessageUser, MessageAttachment, LinkPreview, ReactionCount } from './types';
import { formatMessageTime, formatRelativeTime, formatFileSize, getInitials, QUICK_REACTIONS } from './utils';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Message delivery status icon
 */
function MessageStatusIcon({ status }: { status?: Message['status'] }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-neutral-400 animate-pulse" />;
    case 'sent':
      return <Check className="w-3 h-3 text-neutral-400" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-neutral-400" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-primary-500" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return null;
  }
}

/**
 * User avatar with optional online status indicator
 */
export function ChatAvatar({
  user,
  size = 'md',
  showStatus = false
}: {
  user: MessageUser;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const statusSize = size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <div className="relative flex-shrink-0">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-semibold`}>
          {user.initials || getInitials(user.name)}
        </div>
      )}
      {showStatus && (
        <div className={`absolute -bottom-0.5 -right-0.5 ${statusSize} rounded-full border-2 border-white dark:border-neutral-900 ${
          user.isOnline ? 'bg-green-500' : 'bg-neutral-400'
        }`} />
      )}
    </div>
  );
}

/**
 * Link preview card for URLs in messages
 */
function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
    >
      {preview.imageUrl && (
        <div className="w-full h-32 bg-neutral-100 dark:bg-neutral-800">
          <img src={preview.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {preview.faviconUrl && (
            <img src={preview.faviconUrl} alt="" className="w-4 h-4" />
          )}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {preview.siteName || new URL(preview.url).hostname}
          </span>
        </div>
        {preview.title && (
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {preview.title}
          </h4>
        )}
        {preview.description && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}

/**
 * Attachment preview for files, images, and videos
 */
function AttachmentPreview({
  attachment,
  onView,
  onDownload
}: {
  attachment: MessageAttachment;
  onView?: () => void;
  onDownload?: () => void;
}) {
  if (attachment.type === 'image') {
    return (
      <div className="relative group mt-2 rounded-lg overflow-hidden max-w-xs cursor-pointer" onClick={onView}>
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.name}
          className="w-full h-auto max-h-64 object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
        <video
          src={attachment.url}
          controls
          className="w-full"
          poster={attachment.thumbnailUrl}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 max-w-xs">
      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
        <File className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <button
        onClick={onDownload}
        className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
      </button>
    </div>
  );
}

/**
 * Voice message player with waveform visualization
 */
function VoiceMessagePlayer({ voiceMessage }: { voiceMessage: Message['voiceMessage'] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress] = useState(0); // TODO: implement audio playback with progress tracking

  if (!voiceMessage) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 min-w-[200px]">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 hover:bg-primary-700 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white ml-0.5" />
        )}
      </button>
      <div className="flex-1">
        <div className="flex gap-0.5 h-8 items-end">
          {voiceMessage.waveform.map((amp, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-colors ${
                i / voiceMessage.waveform.length <= progress
                  ? 'bg-primary-600'
                  : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
              style={{ height: `${amp * 100}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {formatDuration(voiceMessage.duration)}
        </p>
      </div>
    </div>
  );
}

/**
 * Reaction badge showing emoji and count
 */
function ReactionBadge({
  reaction,
  onClick,
  currentUserId
}: {
  reaction: ReactionCount;
  onClick: () => void;
  currentUserId?: string;
}) {
  const hasReacted = currentUserId ? reaction.userIds.includes(currentUserId) : false;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
        hasReacted
          ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
          : 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}
      title={`${reaction.count} reaction${reaction.count !== 1 ? 's' : ''}`}
    >
      <span>{reaction.emoji}</span>
      <span className="text-neutral-600 dark:text-neutral-400">{reaction.count}</span>
    </button>
  );
}

// ============================================================================
// Main ChatMessageBubble Component
// ============================================================================

export interface ChatMessageBubbleProps {
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
  currentUserId?: string;
  isPinned?: boolean;
  isHighlighted?: boolean;
  isEditing?: boolean;
  editingDraft?: string;
  onChangeEditingDraft?: (value: string) => void;
  onSubmitEdit?: () => void;
  onCancelEdit?: () => void;
  readBy?: { id: string; name: string; avatar?: string }[];
}

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
  readBy = []
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
        {/* Reply preview - shows quoted original message */}
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
            <Forward className="w-3 h-3" />
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
          }`}
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

          {/* Asset attachment (from backend) - click to view in Files app */}
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
                  {/* Download button overlay */}
                  <a
                    href={message.asset.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.asset.file.originalName || message.asset.name}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover/asset:opacity-100 transition-opacity"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
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
                      <File className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-red-500'}`} />
                    ) : message.asset.kind === 'video' ? (
                      <Play className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-blue-500'}`} />
                    ) : message.asset.kind === 'audio' ? (
                      <Volume2 className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-green-500'}`} />
                    ) : (
                      <File className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-neutral-500'}`} />
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
                    <Download className={`w-4 h-4 ${isOwn ? 'text-white/70' : 'text-neutral-400'}`} />
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
              <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
                edited
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-neutral-500 dark:text-neutral-400'}`}>
              {formatMessageTime(message.timestamp)}
            </span>
            {isOwn && <MessageStatusIcon status={message.status} />}
          </div>

          {/* Pinned badge */}
          {isPinned && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <Pin className="w-3 h-3 text-white" />
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

        {/* Thread replies pill with hover preview */}
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
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
            {/* Hover preview tooltip (desktop only) */}
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
              <Smile className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={onReply}
              className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Reply"
            >
              <Reply className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
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
 * Only re-renders when message content or UI state changes
 */
export const ChatMessageBubble = memo(ChatMessageBubbleComponent, (prev, next) => {
  // Re-render if any of these change
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
