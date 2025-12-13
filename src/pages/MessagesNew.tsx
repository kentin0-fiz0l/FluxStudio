/**
 * Messages Page - Modern Mobile Chat Experience
 *
 * Complete messaging interface with:
 * - Mobile-first responsive design
 * - Swipe gestures (reply, delete, pin)
 * - Pull-to-refresh & infinite scroll
 * - Reply threading with quoted messages
 * - Link previews
 * - Image lightbox
 * - Emoji picker
 * - File attachments with progress
 * - Message editing & deletion
 * - Read receipts
 * - Pinned messages
 * - Mute/notification settings
 * - Voice message UI
 * - Message search
 * - Forward messages
 */

import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { ChatMessage, UserCard } from '@/components/molecules';
import { Button, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useConversationRealtime } from '../hooks/useConversationRealtime';
import { messagingSocketService, ConversationMessage } from '../services/messagingSocketService';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  Phone,
  Video,
  MoreVertical,
  UserPlus,
  Archive,
  Star,
  X,
  ArrowLeft,
  MessageCircle,
  Sparkles,
  CheckCheck,
  Check,
  Clock,
  RefreshCw,
  Zap,
  Coffee,
  Rocket,
  Pin,
  PinOff,
  BellOff,
  Bell,
  Reply,
  Trash2,
  Edit3,
  Forward,
  Copy,
  Image as ImageIcon,
  File,
  Mic,
  MicOff,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Maximize2,
  MoreHorizontal,
  Users,
  Hash,
  AtSign,
  Link2,
  Calendar,
  Filter,
  SortAsc,
  Volume2,
  VolumeX,
  Settings,
  Info,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';
import { MessageActionsMenu } from '../components/messaging/MessageActionsMenu';
import { InlineReplyPreview } from '../components/messaging/InlineReplyPreview';
import { MessageSearchPanel } from '../components/messaging/MessageSearchPanel';
import { MessageSearchResult } from '../hooks/useMessageSearch';
import { MarkdownMessage } from '../components/messaging/MarkdownMessage';
import { ThreadPanel } from '../components/messaging/ThreadPanel';
import { EmptyState, emptyStateConfigs } from '../components/common/EmptyState';

// Types
interface MessageUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  size: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageAsset {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';
  ownerId?: string;
  organizationId?: string;
  description?: string;
  createdAt?: string;
  file: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string;
    storageKey?: string;
  };
}

interface Message {
  id: string;
  content: string;
  author: MessageUser;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  isSystemMessage?: boolean;
  replyTo?: {
    id: string;
    content: string;
    author: MessageUser;
  };
  attachments?: MessageAttachment[];
  asset?: MessageAsset | null;
  linkPreviews?: LinkPreview[];
  reactions?: ReactionCount[];
  isPinned?: boolean;
  isForwarded?: boolean;
  voiceMessage?: {
    duration: number;
    waveform: number[];
    url: string;
  };
  threadReplyCount?: number;
  threadRootMessageId?: string | null;
  threadLastReplyAt?: Date;
}

interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'group' | 'channel';
  participant: MessageUser;
  participants?: MessageUser[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isTyping?: boolean;
  typingUsers?: string[];
}

type ConversationFilter = 'all' | 'unread' | 'archived' | 'starred' | 'muted';

// API response type for conversations
interface ConversationSummary {
  id: string;
  organizationId: string | null;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  members?: Array<{
    id: string;
    conversationId: string;
    userId: string;
    role: string;
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}

// Emoji data
const EMOJI_CATEGORIES = {
  recent: ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😍', '🙌'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥'],
  gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '🤝', '👏', '🙌'],
  objects: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🎉', '🎊'],
  nature: ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀', '🦞', '🦐', '🦑', '🌍', '🌎']
};

const quickReactions = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

// Messaging tips for empty state
const messagingTips = [
  { icon: Zap, text: "Press Enter to send, Shift+Enter for new line" },
  { icon: Star, text: "Star important conversations to find them quickly" },
  { icon: Coffee, text: "Take breaks! Messaging will be here when you're back" },
  { icon: Rocket, text: "Real-time updates keep you in sync instantly" },
];

// Utility functions
const formatTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

const formatMessageTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getDateSeparator = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

const extractUrls = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return text.match(urlRegex) || [];
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Components

// Online Status Indicator
function OnlineStatus({ isOnline, size = 'sm' }: { isOnline?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  return (
    <span
      className={`${sizeClasses[size]} rounded-full ${isOnline ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'} ring-2 ring-white dark:ring-neutral-900`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}

// Message Status Icon
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

// Typing Indicator - collapses when > 3 users
function TypingIndicator({ users }: { users: string[] }) {
  let text: string;
  if (users.length === 1) {
    text = `${users[0]} is typing...`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing...`;
  } else if (users.length === 3) {
    text = `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
  } else {
    // > 3 users: show first 2 + count
    text = `${users[0]}, ${users[1]}, + ${users.length - 2} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}

// Avatar Component
function Avatar({ user, size = 'md', showStatus = false }: { user: MessageUser; size?: 'sm' | 'md' | 'lg'; showStatus?: boolean }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

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
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={user.isOnline} size={size === 'lg' ? 'md' : 'sm'} />
        </div>
      )}
    </div>
  );
}

// Date Separator
function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {getDateSeparator(date)}
        </span>
      </div>
    </div>
  );
}

// Link Preview Card
function LinkPreviewCard({ preview, onRemove }: { preview: LinkPreview; onRemove?: () => void }) {
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
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{preview.siteName || new URL(preview.url).hostname}</span>
        </div>
        {preview.title && (
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">{preview.title}</h4>
        )}
        {preview.description && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1">{preview.description}</p>
        )}
      </div>
    </a>
  );
}

// Attachment Preview
function AttachmentPreview({ attachment, onView, onDownload }: { attachment: MessageAttachment; onView?: () => void; onDownload?: () => void }) {
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
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{attachment.name}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatFileSize(attachment.size)}</p>
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

// Voice Message Player
function VoiceMessagePlayer({ voiceMessage }: { voiceMessage: Message['voiceMessage'] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

// Reaction Badge
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

// Reply Preview (quoted message)
function ReplyPreview({ replyTo, onClear }: { replyTo: Message['replyTo']; onClear?: () => void }) {
  if (!replyTo) return null;

  return (
    <div className="flex items-stretch gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border-l-4 border-primary-500">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
          {replyTo.author.name}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
          {replyTo.content}
        </p>
      </div>
      {onClear && (
        <button onClick={onClear} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      )}
    </div>
  );
}

// Message Bubble
function MessageBubble({
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
}: {
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
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isOwn = message.isCurrentUser;

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
          <Avatar user={message.author} size="sm" />
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
              isPinned={message.replyTo.author.id ? false : false}
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
                        // Fallback to original URL if thumbnail fails
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
                      {message.asset.file.sizeBytes < 1024
                        ? `${message.asset.file.sizeBytes} B`
                        : message.asset.file.sizeBytes < 1024 * 1024
                        ? `${(message.asset.file.sizeBytes / 1024).toFixed(1)} KB`
                        : `${(message.asset.file.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                    </p>
                  </div>
                  <a
                    href={message.asset.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.asset.file.originalName}
                    className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
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
                  Last reply · {formatRelativeTime(message.threadLastReplyAt)}
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
            {quickReactions.map((emoji) => (
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

// Conversation List Item
function ConversationItem({
  conversation,
  isSelected,
  onClick
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-left transition-all ${
        isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar user={conversation.participant} size="md" showStatus />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
                {conversation.title}
              </h3>
              {conversation.isPinned && (
                <Pin className="w-3 h-3 text-accent-500" />
              )}
              {conversation.isMuted && (
                <BellOff className="w-3 h-3 text-neutral-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
              </span>
              {conversation.unreadCount > 0 && (
                <Badge variant="solidPrimary" size="sm" className="animate-pulse min-w-[20px] justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>

          {conversation.isTyping ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-primary-600 dark:text-primary-400 ml-1">typing...</span>
            </div>
          ) : (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
              {conversation.lastMessage?.content || 'No messages yet'}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Empty State
function EmptyMessagesState({ onStartConversation }: { onStartConversation: () => void }) {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % messagingTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const tip = messagingTips[currentTip];
  const TipIcon = tip.icon;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center">
          <MessageCircle className="w-12 h-12 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center animate-bounce">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Start a conversation
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm">
        Connect with your team, share ideas, and collaborate in real-time.
      </p>

      <Button onClick={onStartConversation} className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <UserPlus className="w-4 h-4 mr-2" />
        New Message
      </Button>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl max-w-xs transition-all duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <TipIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-left">
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// Emoji Picker Component
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState<keyof typeof EMOJI_CATEGORIES>('recent');

  return (
    <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50">
      {/* Category tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-2 py-1">
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as keyof typeof EMOJI_CATEGORIES)}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${
              category === cat
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {cat === 'recent' ? '🕒' : cat === 'smileys' ? '😀' : cat === 'gestures' ? '👍' : cat === 'objects' ? '❤️' : '🌸'}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[category].map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-transform hover:scale-125"
          >
            <span className="text-xl">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Message Input Component
// Pending attachment type for MessageInput
interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

function MessageInput({
  value,
  onChange,
  onSend,
  onAttach,
  onFileDrop,
  replyTo,
  onClearReply,
  disabled,
  placeholder = 'Type a message...',
  pendingAttachments = [],
  onRemoveAttachment
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onFileDrop?: (files: FileList) => void;
  replyTo?: Message['replyTo'];
  onClearReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  pendingAttachments?: PendingAttachment[];
  onRemoveAttachment?: (id: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      return;
    }

    // Keyboard shortcuts for formatting (Cmd/Ctrl + key)
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertFormatting('**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('_');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('[', '](url)');
          break;
        case '`':
          e.preventDefault();
          insertFormatting('`');
          break;
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Insert formatting markers around selected text or at cursor
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newValue);

    // Move cursor after formatting
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && onFileDrop) {
      onFileDrop(files);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const hasContent = value.trim() || pendingAttachments.length > 0;

  return (
    <div
      ref={dropZoneRef}
      className={`relative p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 transition-colors ${
        isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-100/80 dark:bg-primary-900/50 border-2 border-dashed border-primary-400 dark:border-primary-600 rounded-lg z-10 pointer-events-none">
          <div className="text-primary-600 dark:text-primary-400 font-medium flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Drop files to attach
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3">
          <ReplyPreview replyTo={replyTo} onClear={onClearReply} />
        </div>
      )}

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              {/* Preview or icon */}
              {attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 rounded">
                  <File className="w-5 h-5 text-neutral-500" />
                </div>
              )}

              {/* File info */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                  {attachment.file.name}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {formatFileSize(attachment.file.size)}
                </span>
              </div>

              {/* Upload progress */}
              {attachment.uploading && (
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => onRemoveAttachment?.(attachment.id)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Error indicator */}
              {attachment.error && (
                <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => insertFormatting('**')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">B</span>
        </button>
        <button
          onClick={() => insertFormatting('_')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <span className="text-sm italic text-neutral-600 dark:text-neutral-400">I</span>
        </button>
        <button
          onClick={() => insertFormatting('`')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Code (Ctrl+`)"
        >
          <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">{'<>'}</span>
        </button>
        <button
          onClick={() => insertFormatting('[', '](url)')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Link (Ctrl+K)"
        >
          <Link2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-neutral-400">Markdown supported</span>
      </div>

      <div className="flex items-end gap-2">
        {/* Attach button */}
        <button
          onClick={onAttach}
          className="flex-shrink-0 p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50"
          />

          {/* Emoji button */}
          <div className="absolute right-3 bottom-3">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </div>

        {/* Voice message button (when empty) or Send button */}
        {hasContent ? (
          <button
            onClick={onSend}
            disabled={disabled}
            className="flex-shrink-0 p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg hover:shadow-xl"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex-shrink-0 p-2.5 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            )}
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">
        <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}

// Pinned Messages Panel
function PinnedMessagesPanel({
  messages,
  onClose,
  onUnpin,
  onJumpTo
}: {
  messages: Message[];
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="absolute inset-x-0 top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-4 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-accent-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Pinned Messages</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No pinned messages yet</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-4 max-h-64 overflow-y-auto z-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-accent-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Pinned Messages ({messages.length})</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={() => onJumpTo(msg.id)}
          >
            <Avatar user={msg.author} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{msg.author.name}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{msg.content}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onUnpin(msg.id); }}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
              title="Unpin"
            >
              <PinOff className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Messages Component
function MessagesNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ========================================
  // CONVERSATION STATE (REST API based)
  // ========================================
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  // ========================================
  // REAL-TIME MESSAGING HOOK
  // ========================================
  const handleNewMessage = useCallback((data: { conversationId: string; message: ConversationMessage }) => {
    // Update conversation list with new message preview
    setConversationSummaries(prev => {
      const existing = prev.find(c => c.id === data.conversationId);
      if (!existing) return prev;

      const isActive = data.conversationId === selectedConversationId;
      const updated: ConversationSummary = {
        ...existing,
        lastMessageAt: data.message.createdAt,
        lastMessagePreview: data.message.content?.slice(0, 100) || '',
        unreadCount: isActive ? 0 : (existing.unreadCount || 0) + 1,
      };

      // Move to top
      const others = prev.filter(c => c.id !== data.conversationId);
      return [updated, ...others];
    });
  }, [selectedConversationId]);

  // Handle thread summary updates - highlight root message when thread panel is closed
  const handleThreadSummaryUpdate = useCallback((data: { threadRootMessageId: string }) => {
    // Only highlight if thread panel is closed or it's a different thread
    if (!isThreadPanelOpen || activeThreadRootId !== data.threadRootMessageId) {
      setThreadHighlightId(data.threadRootMessageId);
      // Clear highlight after 2 seconds
      setTimeout(() => {
        setThreadHighlightId(prev => prev === data.threadRootMessageId ? null : prev);
      }, 2000);
    }
  }, [isThreadPanelOpen, activeThreadRootId]);

  const realtime = useConversationRealtime({
    conversationId: selectedConversationId || undefined,
    autoConnect: true,
    onNewMessage: handleNewMessage,
    onThreadSummaryUpdate: handleThreadSummaryUpdate,
  });

  // ========================================
  // LOCAL UI STATE
  // ========================================
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState<Message['replyTo'] | undefined>();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [forwardSourceMessage, setForwardSourceMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetConversationId, setForwardTargetConversationId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Thread panel state
  const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadHighlightId, setThreadHighlightId] = useState<string | null>(null);

  // Read receipts state
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const lastReadMessageIdRef = useRef<string | null>(null);

  // Pending attachments state
  const [pendingAttachments, setPendingAttachments] = useState<{
    id: string;
    file: File;
    preview?: string;
    uploading?: boolean;
    progress?: number;
    error?: string;
    assetId?: string;
    asset?: {
      id: string;
      name: string;
      kind: string;
      file: {
        id: string;
        name: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
        thumbnailUrl?: string;
      };
    };
  }[]>([]);

  // Typing debounce state
  const lastTypingSentRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);

  // User search state for new conversations
  const [availableUsers, setAvailableUsers] = useState<MessageUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<MessageUser[]>([]);
  const [newConversationName, setNewConversationName] = useState('');

  // Typing debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // ========================================
  // FETCH CONVERSATIONS FROM REST API
  // ========================================
  const loadConversations = useCallback(async () => {
    if (!user) return;

    setIsLoadingConversations(true);
    setConversationError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/conversations?limit=50&offset=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load conversations: ${res.status}`);
      }

      const data = await res.json();
      const list = (data.conversations || []) as ConversationSummary[];

      // Sort by lastMessageAt (newest first)
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        return tb - ta;
      });

      setConversationSummaries(list);

      // Auto-select first conversation if none selected
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setConversationError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, selectedConversationId]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ========================================
  // FETCH USERS FOR NEW CONVERSATION
  // ========================================
  useEffect(() => {
    if (showNewConversation) {
      fetchUsers();
    }
  }, [showNewConversation]);

  const fetchUsers = async (search?: string) => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = search ? `/api/users?search=${encodeURIComponent(search)}` : '/api/users';
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const users = (data.users || data || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split('@')[0] || 'Unknown',
          avatar: u.avatar,
          initials: getInitials(u.name || u.email?.split('@')[0] || 'U'),
          isOnline: u.isOnline || false,
        }));
        setAvailableUsers(users.filter((u: MessageUser) => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (userSearchTerm) {
        fetchUsers(userSearchTerm);
      } else if (showNewConversation) {
        fetchUsers();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearchTerm, showNewConversation]);

  // ========================================
  // TRANSFORM DATA FOR UI
  // ========================================

  // Transform ConversationSummary to Conversation for UI
  const transformSummaryToConversation = useCallback((summary: ConversationSummary): Conversation => {
    const members = summary.members || [];
    const otherMember = members.find(m => m.userId !== user?.id) || members[0];
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
      isArchived: false,
      isMuted: false,
      isTyping: realtime.typingUsers.some(t => t.conversationId === summary.id),
      typingUsers: realtime.typingUsers
        .filter(t => t.conversationId === summary.id)
        .map(t => t.userEmail),
    };
  }, [user?.id, realtime.typingUsers]);

  // Transform ConversationMessage to Message for UI
  const transformRealtimeMessage = useCallback((msg: ConversationMessage): Message => {
    // Get user ID from different possible fields
    const authorId = msg.authorId || msg.userId || '';
    // Get content from different possible fields
    const content = msg.content || msg.text || '';
    // Get author name from different possible sources
    const authorName = msg.author?.displayName || msg.author?.email?.split('@')[0] || msg.userName || 'Unknown';

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
      isCurrentUser: authorId === user?.id,
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
      isPinned: realtime.pinnedMessageIds.includes(msg.id),
      isForwarded: false,
      isSystemMessage: msg.isSystemMessage,
      threadReplyCount: msg.threadReplyCount,
      threadRootMessageId: msg.threadRootMessageId,
      threadLastReplyAt: msg.threadLastReplyAt ? new Date(msg.threadLastReplyAt) : undefined,
    };
  }, [user?.id, realtime.pinnedMessageIds]);

  // Transformed data for UI
  const conversations: Conversation[] = useMemo(() =>
    conversationSummaries.map(transformSummaryToConversation),
    [conversationSummaries, transformSummaryToConversation]
  );

  const selectedConversation = useMemo(() => {
    const summary = conversationSummaries.find(c => c.id === selectedConversationId);
    return summary ? transformSummaryToConversation(summary) : null;
  }, [conversationSummaries, selectedConversationId, transformSummaryToConversation]);

  const messages: Message[] = useMemo(() =>
    realtime.messages.map(transformRealtimeMessage),
    [realtime.messages, transformRealtimeMessage]
  );

  // Message lookup map for finding parent messages (used for reply threading)
  const messageById = useMemo(
    () => new Map(messages.map(m => [m.id, m])),
    [messages]
  );

  // Highlighted message state (for jump-to-original animation)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Pinned messages derived from real-time state
  const pinnedMessages = useMemo(() =>
    messages.filter(m => realtime.pinnedMessageIds.includes(m.id)),
    [messages, realtime.pinnedMessageIds]
  );

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    switch (filter) {
      case 'unread':
        result = result.filter(c => c.unreadCount > 0);
        break;
      case 'archived':
        result = result.filter(c => c.isArchived);
        break;
      case 'starred':
        result = result.filter(c => c.isPinned);
        break;
      case 'muted':
        result = result.filter(c => c.isMuted);
        break;
    }

    if (searchTerm) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.timestamp.getTime() || 0;
      const bTime = b.lastMessage?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
  }, [conversations, filter, searchTerm]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they scroll into view (IntersectionObserver)
  useEffect(() => {
    if (!selectedConversationId || !messages.length || !readReceiptsEnabled) return;
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const observedMessages = new Map<Element, string>();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most recent visible message
        let mostRecentVisibleId: string | null = null;
        let mostRecentVisibleIndex = -1;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = observedMessages.get(entry.target);
            if (messageId) {
              const messageIndex = messages.findIndex(m => m.id === messageId);
              if (messageIndex > mostRecentVisibleIndex) {
                mostRecentVisibleIndex = messageIndex;
                mostRecentVisibleId = messageId;
              }
            }
          }
        });

        // Mark the most recent visible message as read
        if (mostRecentVisibleId && mostRecentVisibleId !== lastReadMessageIdRef.current) {
          // Check if this message is newer than the last read message
          const currentIndex = messages.findIndex(m => m.id === mostRecentVisibleId);
          const lastReadIndex = lastReadMessageIdRef.current
            ? messages.findIndex(m => m.id === lastReadMessageIdRef.current)
            : -1;

          if (currentIndex > lastReadIndex) {
            lastReadMessageIdRef.current = mostRecentVisibleId;
            realtime.markAsRead(mostRecentVisibleId);

            // Zero out unread count locally
            setConversationSummaries(prev =>
              prev.map(c =>
                c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c
              )
            );
          }
        }
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5, // Message is considered visible when 50% in view
      }
    );

    // Observe all message elements
    const messageElements = container.querySelectorAll('[data-message-id]');
    messageElements.forEach((element) => {
      const messageId = element.getAttribute('data-message-id');
      if (messageId) {
        observedMessages.set(element, messageId);
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [selectedConversationId, messages, realtime, readReceiptsEnabled]);

  // Reset last read message when conversation changes
  useEffect(() => {
    lastReadMessageIdRef.current = null;
  }, [selectedConversationId]);

  // Keyboard shortcut for search (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate when we have a conversation selected
      if (!selectedConversationId) return;

      // Ctrl+F or Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowMessageSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConversationId]);

  // ========================================
  // MESSAGE HANDLERS (WebSocket based)
  // ========================================

  const handleSendMessage = async () => {
    // Get uploaded attachments (those with assetId and no error)
    const uploadedAttachments = pendingAttachments.filter(a => a.assetId && !a.error && !a.uploading);
    const hasText = newMessage.trim().length > 0;
    const hasAttachments = uploadedAttachments.length > 0;

    // Need either text or attachments
    if ((!hasText && !hasAttachments) || !selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      // Send attachments first (one message per attachment)
      for (let i = 0; i < uploadedAttachments.length; i++) {
        const attachment = uploadedAttachments[i];
        // For the first attachment, include any text
        const messageText = (i === 0 && hasText) ? newMessage.trim() : '';

        realtime.sendMessage(messageText, {
          replyToMessageId: i === 0 ? replyTo?.id : undefined,
          assetId: attachment.assetId,
        });
      }

      // If we have text but no attachments, send text-only message
      if (hasText && !hasAttachments) {
        realtime.sendMessage(newMessage.trim(), {
          replyToMessageId: replyTo?.id,
        });
      }

      // Clear state
      setNewMessage('');
      setReplyTo(undefined);
      // Clean up pending attachments (revoke object URLs)
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
      // Stop typing indicator
      realtime.stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator with debouncing (max 1 event per second)
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    // Start typing indicator with debouncing
    if (value.trim()) {
      const now = Date.now();
      // Only send typing event at most once per second
      if (now - lastTypingSentRef.current > 1000) {
        realtime.startTyping();
        lastTypingSentRef.current = now;
        isTypingRef.current = true;
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 5 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          realtime.stopTyping();
          isTypingRef.current = false;
        }
      }, 5000);
    } else {
      // Text cleared - stop typing immediately
      if (isTypingRef.current) {
        realtime.stopTyping();
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      author: message.author
    });
    // Scroll composer into view
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Find the message to check if user has already reacted
    const msg = messages.find(m => m.id === messageId);
    const reactions = msg?.reactions || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const hasUserReacted = existingReaction?.userIds?.includes(user?.id || '') || false;

    if (hasUserReacted) {
      realtime.removeReaction(messageId, emoji);
    } else {
      realtime.addReaction(messageId, emoji);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    // Check if message is already pinned
    const isPinned = realtime.pinnedMessageIds.includes(messageId);
    if (isPinned) {
      realtime.unpinMessage(messageId);
    } else {
      realtime.pinMessage(messageId);
    }
  };

  const handleCopyMessage = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.content) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // Start editing a message
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content || '');
  };

  // Submit edited message
  const handleSubmitEdit = () => {
    if (!editingMessageId || !editingDraft.trim()) return;
    realtime.editMessage(editingMessageId, editingDraft.trim());
    setEditingMessageId(null);
    setEditingDraft('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingDraft('');
  };

  // Jump to original message (for reply threading)
  const handleJumpToMessage = useCallback((messageId: string) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`
    );
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);

    // Clear highlight after a short timeout
    setTimeout(() => {
      setHighlightedMessageId(prev => (prev === messageId ? null : prev));
    }, 2000);
  }, []);

  // Handle search result click - switch conversation if needed, then jump to message
  const handleSearchResultClick = useCallback((result: MessageSearchResult) => {
    // If it's a different conversation, switch to it first
    if (result.conversationId !== selectedConversationId) {
      setSelectedConversationId(result.conversationId);
      setShowMobileChat(true);
      // Wait for messages to load, then jump
      setTimeout(() => {
        handleJumpToMessage(result.id);
      }, 500);
    } else {
      handleJumpToMessage(result.id);
    }
    setShowMessageSearch(false);
  }, [selectedConversationId, handleJumpToMessage]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversationId) return;
    try {
      realtime.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Start forward flow - open modal
  const handleStartForward = (message: Message) => {
    setForwardSourceMessage(message);
    setForwardTargetConversationId(null);
    setIsForwardModalOpen(true);
  };

  // Confirm forward - send to selected conversation
  const handleConfirmForward = () => {
    if (!forwardSourceMessage || !forwardTargetConversationId) return;

    realtime.forwardMessage(forwardTargetConversationId, forwardSourceMessage.id);
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  };

  // Close forward modal
  const handleCancelForward = () => {
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  };

  // ========================================
  // THREAD HANDLERS
  // ========================================

  // Open thread panel and load thread messages
  const handleOpenThread = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;

    setActiveThreadRootId(messageId);
    setIsThreadPanelOpen(true);
    setIsLoadingThread(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/conversations/${selectedConversationId}/threads/${messageId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Transform to Message format
        const transformedMessages = (data.messages || []).map((m: any) => ({
          id: m.id,
          content: m.text,
          timestamp: new Date(m.createdAt),
          author: {
            id: m.userId,
            name: m.userName || 'Unknown',
            initials: (m.userName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          },
          status: 'delivered' as const,
        }));
        setThreadMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, [selectedConversationId]);

  // Close thread panel
  const handleCloseThread = useCallback(() => {
    setIsThreadPanelOpen(false);
    setActiveThreadRootId(null);
    setThreadMessages([]);
  }, []);

  // Reply to thread
  const handleThreadReply = useCallback(async (text: string) => {
    if (!selectedConversationId || !activeThreadRootId) return;

    // Send message with thread root reference
    realtime.sendMessage(text, {
      replyToMessageId: activeThreadRootId,
    });

    // Optimistically add to thread messages
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      content: text,
      timestamp: new Date(),
      author: {
        id: user?.id || '',
        name: user?.name || user?.email?.split('@')[0] || 'You',
        initials: (user?.name || user?.email || 'Y').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      },
      status: 'sending',
    };
    setThreadMessages(prev => [...prev, newMessage]);
  }, [selectedConversationId, activeThreadRootId, realtime, user]);

  // Legacy handler - direct forward without modal
  const handleForwardMessage = async (messageId: string, toConversationId: string) => {
    realtime.forwardMessage(toConversationId, messageId);
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedConversationId) return;

    const token = localStorage.getItem('auth_token');

    for (const file of Array.from(files)) {
      const attachmentId = `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let preview: string | undefined;

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Add to pending with uploading state
      setPendingAttachments(prev => [...prev, {
        id: attachmentId,
        file,
        preview,
        uploading: true,
        progress: 0
      }]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/conversations/${selectedConversationId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        // Update attachment with assetId and completed state
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, assetId: data.asset.id, asset: data.asset }
            : a
        ));
      } catch (error) {
        console.error('Failed to upload file:', error);
        // Mark as error
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, error: 'Upload failed' }
            : a
        ));
      }
    }

    // Clear the input
    e.target.value = '';
  };

  // Handle dropped files (for drag & drop support)
  const handleFileDrop = async (files: FileList) => {
    if (!selectedConversationId) return;

    const token = localStorage.getItem('auth_token');

    for (const file of Array.from(files)) {
      const attachmentId = `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let preview: string | undefined;

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Add to pending with uploading state
      setPendingAttachments(prev => [...prev, {
        id: attachmentId,
        file,
        preview,
        uploading: true,
        progress: 0
      }]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/conversations/${selectedConversationId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        // Update attachment with assetId and completed state
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, assetId: data.asset.id, asset: data.asset }
            : a
        ));
      } catch (error) {
        console.error('Failed to upload dropped file:', error);
        // Mark as error
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, error: 'Upload failed' }
            : a
        ));
      }
    }
  };

  // Handle viewing attachment in Files app
  const handleViewInFiles = useCallback((assetId: string) => {
    // Navigate to Assets page with the asset selected
    navigate(`/assets?highlight=${assetId}`);
  }, [navigate]);

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      // Revoke object URL to free memory
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleClearAllAttachments = () => {
    pendingAttachments.forEach(a => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setPendingAttachments([]);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setShowMobileChat(true);
  };

  // Create new conversation via REST API
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const isGroup = selectedUsers.length > 1;
      const name = isGroup ? newConversationName || `Group with ${selectedUsers.map(u => u.name).join(', ')}` : null;

      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isGroup,
          memberIds: selectedUsers.map(u => u.id),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await res.json();
      const conversationId = data.conversation?.id;

      // Close dialog and open new conversation
      setShowNewConversation(false);
      setSelectedUsers([]);
      setNewConversationName('');
      setUserSearchTerm('');

      if (conversationId) {
        setSelectedConversationId(conversationId);
        setShowMobileChat(true);
        // Refresh conversation list
        await loadConversations();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Toggle user selection for new conversation
  const toggleUserSelection = (user: MessageUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  // Calculate stats
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineCount = conversations.filter(c => c.participant?.isOnline).length;

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Messages' }]}
      onLogout={logout}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Error Banner */}
      {conversationError && (
        <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Connection Error</p>
                <p className="text-xs text-red-700 dark:text-red-300">{conversationError}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadConversations}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!realtime.isConnected && selectedConversationId && (
        <div className="mx-4 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting to real-time messaging...
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex gap-0 md:gap-6 md:p-6">
        {/* Conversations Sidebar */}
        <Card className={`w-full md:w-96 flex flex-col overflow-hidden border-0 md:border ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Messages</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {onlineCount} online · {unreadCount} unread
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowNewConversation(true)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'unread', 'starred', 'muted'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                    filter === f
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {f === 'starred' && <Star className="w-3 h-3 inline mr-1" />}
                  {f === 'muted' && <BellOff className="w-3 h-3 inline mr-1" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              searchTerm ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    No conversations match your search
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title={emptyStateConfigs.messages.title}
                  description={emptyStateConfigs.messages.description}
                  primaryCtaLabel={emptyStateConfigs.messages.primaryCtaLabel}
                  onPrimaryCta={() => setShowCreateModal(true)}
                  learnMoreItems={emptyStateConfigs.messages.learnMoreItems as unknown as string[]}
                  size="sm"
                />
              )
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                />
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <Avatar user={selectedConversation.participant} size="md" showStatus />
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedConversation.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedConversation.participant.isOnline ? (
                        <span className="text-green-600 dark:text-green-400">Online</span>
                      ) : (
                        'Offline'
                      )}
                      {selectedConversation.type === 'group' && selectedConversation.participants && (
                        <span> · {selectedConversation.participants.length} members</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    className={`p-2 rounded-lg transition-colors ${showMessageSearch ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Search messages (Ctrl+F)"
                  >
                    <Search className={`w-5 h-5 ${showMessageSearch ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Voice call">
                    <Phone className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Video call">
                    <Video className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <button
                    onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                    className={`p-2 rounded-lg transition-colors ${showPinnedMessages ? 'bg-accent-100 dark:bg-accent-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Pinned messages"
                  >
                    <Pin className={`w-5 h-5 ${showPinnedMessages ? 'text-accent-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="More options">
                    <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Pinned Messages Panel */}
              {showPinnedMessages && (
                <PinnedMessagesPanel
                  messages={pinnedMessages}
                  onClose={() => setShowPinnedMessages(false)}
                  onUnpin={(id) => handlePinMessage(id)}
                  onJumpTo={(id) => {
                    // Scroll to message
                    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
                    if (messageEl) {
                      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      messageEl.classList.add('ring-2', 'ring-primary-500');
                      setTimeout(() => messageEl.classList.remove('ring-2', 'ring-primary-500'), 2000);
                    }
                    setShowPinnedMessages(false);
                  }}
                />
              )}

              {/* Message Search Panel */}
              {showMessageSearch && (
                <MessageSearchPanel
                  conversationId={selectedConversationId}
                  onResultClick={handleSearchResultClick}
                  onClose={() => setShowMessageSearch(false)}
                />
              )}

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto py-4"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const prevMessage = messages[index - 1];
                      const showDateSeparator = !prevMessage ||
                        message.timestamp.toDateString() !== prevMessage.timestamp.toDateString();
                      const isGrouped = prevMessage &&
                        prevMessage.author.id === message.author.id &&
                        message.timestamp.getTime() - prevMessage.timestamp.getTime() < 60000;

                      // Look up parent message for reply threading
                      const parentMessage = message.replyTo?.id
                        ? messageById.get(message.replyTo.id)
                        : undefined;

                      // Enrich message with parent data if available
                      const enrichedMessage = parentMessage && message.replyTo
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
                        <React.Fragment key={message.id}>
                          {showDateSeparator && <DateSeparator date={message.timestamp} />}
                          <MessageBubble
                            message={enrichedMessage}
                            onReply={() => handleReply(message)}
                            onEdit={() => handleStartEdit(message)}
                            onDelete={() => handleDeleteMessage(message.id)}
                            onPin={() => handlePinMessage(message.id)}
                            onCopy={() => handleCopyMessage(message.id)}
                            onJumpToMessage={handleJumpToMessage}
                            onForward={() => handleStartForward(message)}
                            onReact={(emoji) => handleReact(message.id, emoji)}
                            onOpenThread={() => handleOpenThread(message.id)}
                            onViewInFiles={handleViewInFiles}
                            isGrouped={isGrouped}
                            currentUserId={user?.id}
                            isPinned={realtime.pinnedMessageIds.includes(message.id)}
                            isHighlighted={highlightedMessageId === message.id || threadHighlightId === message.id}
                            isEditing={editingMessageId === message.id}
                            editingDraft={editingMessageId === message.id ? editingDraft : ''}
                            onChangeEditingDraft={setEditingDraft}
                            onSubmitEdit={handleSubmitEdit}
                            onCancelEdit={handleCancelEdit}
                          />
                        </React.Fragment>
                      );
                    })}

                    {/* Typing indicator - from real-time hook (uses userName for better display) */}
                    {realtime.typingUsers.length > 0 && (
                      <TypingIndicator users={realtime.typingUsers.map(u => u.userName || u.userEmail?.split('@')[0] || 'Someone')} />
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input - with typing indicators */}
              <div ref={composerRef}>
                <MessageInput
                  value={newMessage}
                  onChange={handleInputChange}
                  onSend={handleSendMessage}
                  onAttach={handleAttach}
                  onFileDrop={handleFileDrop}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(undefined)}
                  disabled={isSending || !realtime.isConnected}
                  pendingAttachments={pendingAttachments}
                  onRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            </>
          ) : (
            <EmptyMessagesState onStartConversation={() => setShowNewConversation(true)} />
          )}
        </Card>

        {/* Thread Panel */}
        {isThreadPanelOpen && activeThreadRootId && selectedConversation && (
          <ThreadPanel
            conversationId={selectedConversation.id}
            rootMessage={{
              id: activeThreadRootId,
              userId: messages.find(m => m.id === activeThreadRootId)?.author.id || '',
              conversationId: selectedConversation.id,
              text: messages.find(m => m.id === activeThreadRootId)?.content || '',
              userName: messages.find(m => m.id === activeThreadRootId)?.author.name,
              createdAt: messages.find(m => m.id === activeThreadRootId)?.timestamp.toISOString() || new Date().toISOString(),
            }}
            messages={threadMessages.map(m => ({
              id: m.id,
              userId: m.author.id,
              conversationId: selectedConversation.id,
              text: m.content,
              userName: m.author.name,
              createdAt: m.timestamp.toISOString(),
            }))}
            isLoading={isLoadingThread}
            onClose={handleCloseThread}
            onReply={handleThreadReply}
            currentUserId={user?.id}
          />
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={(open) => {
        setShowNewConversation(open);
        if (!open) {
          setSelectedUsers([]);
          setUserSearchTerm('');
          setNewConversationName('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-600" />
              New Conversation
            </DialogTitle>
            <DialogDescription>
              Search for team members to start a conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    <span>{u.name}</span>
                    <button
                      onClick={() => toggleUserSelection(u)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Group name input (when multiple users selected) */}
            {selectedUsers.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Group Name (optional)
                </label>
                <input
                  type="text"
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* User list */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {userSearchTerm ? 'Search Results' : 'Team Members'}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {userSearchTerm ? 'No users found' : 'No team members available'}
                    </p>
                  </div>
                ) : (
                  availableUsers.map((u) => {
                    const isSelected = selectedUsers.some(s => s.id === u.id);
                    return (
                      <button
                        key={u.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => toggleUserSelection(u)}
                      >
                        <Avatar user={u} size="md" showStatus />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{u.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {u.isOnline ? (
                              <span className="text-green-600 dark:text-green-400">Online</span>
                            ) : (
                              'Offline'
                            )}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={selectedUsers.length === 0}
              >
                {selectedUsers.length > 1 ? (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Message Modal */}
      <Dialog open={isForwardModalOpen} onOpenChange={setIsForwardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forward message</DialogTitle>
            <DialogDescription>
              Select a conversation to forward this message to.
            </DialogDescription>
          </DialogHeader>

          {/* Message preview */}
          {forwardSourceMessage?.content && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
              <p className="text-xs text-neutral-500 mb-1">Message preview:</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
                {forwardSourceMessage.content}
              </p>
            </div>
          )}

          {/* Conversation list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {conversations
              .filter(c => c.id !== selectedConversation?.id)
              .map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setForwardTargetConversationId(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                    forwardTargetConversationId === conv.id
                      ? 'bg-primary-100 dark:bg-primary-900 border border-primary-300'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-transparent'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium">
                    {conv.isGroup ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      conv.participants[0]?.initials || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {conv.name}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {forwardTargetConversationId === conv.id && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </button>
              ))}

            {conversations.filter(c => c.id !== selectedConversation?.id).length === 0 && (
              <p className="text-center text-sm text-neutral-500 py-4">
                No other conversations available
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={handleCancelForward}>
              Cancel
            </Button>
            <Button
              disabled={!forwardTargetConversationId}
              onClick={handleConfirmForward}
            >
              Forward
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export { MessagesNew };
export default MessagesNew;
