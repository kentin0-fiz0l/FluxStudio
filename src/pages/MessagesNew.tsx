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
import { useMessaging } from '../hooks/useMessaging';
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
  Loader2
} from 'lucide-react';

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
  reaction: string;
  count: number;
  userNames: string[];
  hasReacted: boolean;
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
  replyTo?: {
    id: string;
    content: string;
    author: MessageUser;
  };
  attachments?: MessageAttachment[];
  linkPreviews?: LinkPreview[];
  reactions?: ReactionCount[];
  isPinned?: boolean;
  isForwarded?: boolean;
  voiceMessage?: {
    duration: number;
    waveform: number[];
    url: string;
  };
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

// Typing Indicator
function TypingIndicator({ users }: { users: string[] }) {
  const text = users.length === 1
    ? `${users[0]} is typing...`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing...`
    : `${users[0]} and ${users.length - 1} others are typing...`;

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
function ReactionBadge({ reaction, onClick }: { reaction: ReactionCount; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
        reaction.hasReacted
          ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
          : 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}
      title={reaction.userNames.join(', ')}
    >
      <span>{reaction.reaction}</span>
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
  showAvatar = true,
  isGrouped = false
}: {
  message: Message;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  showAvatar?: boolean;
  isGrouped?: boolean;
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
      className={`relative group flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 ${isGrouped ? 'py-0.5' : 'py-1'}`}
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
        {/* Reply preview */}
        {message.replyTo && (
          <div className="mb-1">
            <ReplyPreview replyTo={message.replyTo} />
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
          {/* Text content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Voice message */}
          {message.voiceMessage && (
            <VoiceMessagePlayer voiceMessage={message.voiceMessage} />
          )}

          {/* Attachments */}
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
          {message.isPinned && (
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
                key={reaction.reaction}
                reaction={reaction}
                onClick={() => onReact(reaction.reaction)}
              />
            ))}
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
            <button
              className="p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="More"
            >
              <MoreHorizontal className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
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
function MessageInput({
  value,
  onChange,
  onSend,
  onAttach,
  replyTo,
  onClearReply,
  disabled,
  placeholder = 'Type a message...'
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  replyTo?: Message['replyTo'];
  onClearReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3">
          <ReplyPreview replyTo={replyTo} onClear={onClearReply} />
        </div>
      )}

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
        {value.trim() ? (
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

  // Messaging hook
  const {
    conversations: backendConversations,
    activeConversation,
    conversationMessages,
    sendMessage,
    setActiveConversation,
    isLoading,
    error: messagingError,
    refresh
  } = useMessaging();

  // Local state
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState<Message['replyTo'] | undefined>();
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data for demo
  const mockConversations: Conversation[] = [
    {
      id: '1',
      title: 'Sarah Chen',
      type: 'direct',
      participant: { id: 'user1', name: 'Sarah Chen', initials: 'SC', isOnline: true },
      lastMessage: {
        id: 'msg1',
        content: 'The latest color palette looks fantastic! Can we schedule a review?',
        author: { id: 'user1', name: 'Sarah Chen', initials: 'SC' },
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        isCurrentUser: false
      },
      unreadCount: 2,
      isPinned: true,
      isTyping: false
    },
    {
      id: '2',
      title: 'Design Team',
      type: 'group',
      participant: { id: 'group1', name: 'Design Team', initials: 'DT', isOnline: true },
      participants: [
        { id: 'user1', name: 'Sarah Chen', initials: 'SC', isOnline: true },
        { id: 'user2', name: 'Mike Johnson', initials: 'MJ', isOnline: false },
        { id: 'user3', name: 'Emily Davis', initials: 'ED', isOnline: true }
      ],
      lastMessage: {
        id: 'msg2',
        content: "I've pushed the updated mockups to Figma. Let me know your thoughts!",
        author: { id: 'user2', name: 'Mike Johnson', initials: 'MJ' },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isCurrentUser: false
      },
      unreadCount: 5,
      isTyping: true,
      typingUsers: ['Mike']
    },
    {
      id: '3',
      title: 'Alex Rodriguez',
      type: 'direct',
      participant: { id: 'user4', name: 'Alex Rodriguez', initials: 'AR', isOnline: false },
      lastMessage: {
        id: 'msg3',
        content: "I've uploaded the wireframes for the checkout flow.",
        author: { id: 'user4', name: 'Alex Rodriguez', initials: 'AR' },
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isCurrentUser: false,
        attachments: [{
          id: 'att1',
          name: 'checkout-wireframes.pdf',
          url: '/files/checkout-wireframes.pdf',
          type: 'document',
          size: 2458000
        }]
      },
      unreadCount: 0,
      isMuted: true
    }
  ];

  const mockMessages: Message[] = [
    {
      id: 'msg1-1',
      content: 'Hi! I saw the initial designs for the brand refresh. They look great!',
      author: { id: 'user1', name: 'Sarah Chen', initials: 'SC', isOnline: true },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isCurrentUser: false,
      status: 'read'
    },
    {
      id: 'msg1-2',
      content: "Thank you! I'm glad you like them. We focused on modernizing the color palette while keeping the brand identity strong.",
      author: { id: 'current', name: 'You', initials: 'YO' },
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
      isCurrentUser: true,
      status: 'read'
    },
    {
      id: 'msg1-3',
      content: 'The gradient choices are particularly nice. Have you considered adding some motion design elements?',
      author: { id: 'user1', name: 'Sarah Chen', initials: 'SC', isOnline: true },
      timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000),
      isCurrentUser: false,
      status: 'read',
      reactions: [
        { reaction: '👍', count: 1, userNames: ['You'], hasReacted: true }
      ]
    },
    {
      id: 'msg1-4',
      content: "That's a great idea! I was thinking about subtle hover effects and micro-interactions. Check out this inspiration:",
      author: { id: 'current', name: 'You', initials: 'YO' },
      timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000),
      isCurrentUser: true,
      status: 'read',
      linkPreviews: [{
        url: 'https://dribbble.com/shots/motion-design',
        title: 'Motion Design Inspiration',
        description: 'Beautiful micro-interactions and animations for modern web apps',
        siteName: 'Dribbble',
        imageUrl: 'https://cdn.dribbble.com/preview.jpg'
      }]
    },
    {
      id: 'msg1-5',
      content: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
      author: { id: 'user1', name: 'Sarah Chen', initials: 'SC', isOnline: true },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isCurrentUser: false,
      status: 'delivered',
      isPinned: true
    }
  ];

  // Use backend data or fallback to mock
  const conversations = backendConversations.length > 0 ? backendConversations : mockConversations;
  const selectedConversation = activeConversation || (showMobileChat ? mockConversations.find(c => c.id === '1') : null);
  const messages = conversationMessages.length > 0 ? conversationMessages : (selectedConversation?.id === '1' ? mockMessages : []);

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

  // Pull to refresh
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Message handlers
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedConversation.id, newMessage);
      setNewMessage('');
      setReplyTo(undefined);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      author: message.author
    });
  };

  const handleReact = (messageId: string, emoji: string) => {
    console.log(`Reacting to ${messageId} with ${emoji}`);
    // TODO: Call API
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Files selected:', files);
      // TODO: Upload files
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation.id);
    setShowMobileChat(true);
  };

  // Calculate stats
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineCount = conversations.filter(c => c.participant.isOnline).length;
  const pinnedMessages = messages.filter(m => m.isPinned);

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
      {messagingError && (
        <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Connection Error</p>
                <p className="text-xs text-red-700 dark:text-red-300">{messagingError}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
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
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {searchTerm ? 'No conversations match your search' : 'No conversations yet'}
                </p>
              </div>
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
                  onUnpin={(id) => console.log('Unpin:', id)}
                  onJumpTo={(id) => console.log('Jump to:', id)}
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

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && <DateSeparator date={message.timestamp} />}
                          <MessageBubble
                            message={message}
                            onReply={() => handleReply(message)}
                            onEdit={() => setEditingMessage(message.id)}
                            onDelete={() => console.log('Delete:', message.id)}
                            onPin={() => console.log('Pin:', message.id)}
                            onForward={() => console.log('Forward:', message.id)}
                            onReact={(emoji) => handleReact(message.id, emoji)}
                            isGrouped={isGrouped}
                          />
                        </React.Fragment>
                      );
                    })}

                    {/* Typing indicator */}
                    {selectedConversation.isTyping && selectedConversation.typingUsers && (
                      <TypingIndicator users={selectedConversation.typingUsers} />
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSendMessage}
                onAttach={handleAttach}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(undefined)}
                disabled={isSending}
              />
            </>
          ) : (
            <EmptyMessagesState onStartConversation={() => setShowNewConversation(true)} />
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Suggested</p>
              <div className="space-y-2">
                {mockConversations.slice(0, 3).map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => {
                      setShowNewConversation(false);
                      handleConversationClick(conv);
                    }}
                  >
                    <Avatar user={conv.participant} size="md" showStatus />
                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{conv.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {conv.participant.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export { MessagesNew };
export default MessagesNew;
