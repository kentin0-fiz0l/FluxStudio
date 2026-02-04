/**
 * ThreadPanel Component
 * Full thread view for message threads with reply functionality.
 *
 * Features:
 * - Shows root message at top
 * - Lists all thread replies
 * - Composer for new thread replies
 * - Responsive: sidebar on desktop, modal on mobile
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownMessage } from './MarkdownMessage';

// Types
interface ThreadMessage {
  id: string;
  userId: string;
  conversationId: string;
  text: string;
  userName?: string;
  userAvatar?: string;
  createdAt: string;
  editedAt?: string;
  assetId?: string;
  replyToMessageId?: string;
  threadRootMessageId?: string;
}

interface ThreadPanelProps {
  conversationId: string;
  rootMessage: ThreadMessage;
  messages: ThreadMessage[];
  isLoading?: boolean;
  onClose: () => void;
  onReply: (text: string) => Promise<void>;
  currentUserId?: string;
  className?: string;
}

// Helper to format time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get initials from name
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Thread Message Component
function ThreadMessageBubble({
  message,
  isCurrentUser,
  isRoot,
}: {
  message: ThreadMessage;
  isCurrentUser: boolean;
  isRoot?: boolean;
}) {
  const name = message.userName || (isCurrentUser ? 'You' : 'Unknown User');

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors',
        isRoot
          ? 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.userAvatar ? (
          <img
            src={message.userAvatar}
            alt={name}
            className={cn('rounded-full object-cover', isRoot ? 'w-10 h-10' : 'w-8 h-8')}
          />
        ) : (
          <div
            className={cn(
              'rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-medium',
              isRoot ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
            )}
          >
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-medium text-neutral-900 dark:text-neutral-100', isRoot ? 'text-sm' : 'text-xs')}>
            {name}
          </span>
          <span className="text-xs text-neutral-400">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-xs text-neutral-400 italic">(edited)</span>
          )}
        </div>
        <div className={cn('text-neutral-800 dark:text-neutral-200', isRoot ? 'text-sm' : 'text-sm')}>
          <MarkdownMessage text={message.text} />
        </div>
      </div>
    </div>
  );
}

// Thread Composer
function ThreadComposer({
  onSend,
  disabled,
  placeholder = 'Reply to thread...',
}: {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!text.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending || disabled}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-neutral-400 mt-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

// localStorage key for thread hint dismissal
const THREAD_HINT_DISMISSED_KEY = 'fx_thread_hint_dismissed_v1';

// Helper to check if hint was dismissed (runs only on client)
function getInitialHintState(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(THREAD_HINT_DISMISSED_KEY);
}

// Main ThreadPanel
export function ThreadPanel({
  rootMessage,
  messages,
  isLoading = false,
  onClose,
  onReply,
  currentUserId,
  className,
}: ThreadPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(getInitialHintState);

  // Dismiss the hint
  const dismissHint = () => {
    localStorage.setItem(THREAD_HINT_DISMISSED_KEY, 'true');
    setShowFirstTimeHint(false);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={cn(
        'flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700',
        // Desktop: fixed width sidebar
        'md:w-96',
        // Mobile: full screen overlay
        'fixed inset-0 md:relative md:inset-auto z-50 md:z-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Thread</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hidden md:block p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
        >
          <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>
      </div>

      {/* First-time thread hint */}
      {showFirstTimeHint && (
        <div className="mx-3 mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                Threads keep conversations focused
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Reply here to continue this specific discussion without cluttering the main conversation.
              </p>
            </div>
            <button
              onClick={dismissHint}
              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        </div>
      )}

      {/* Root Message */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <ThreadMessageBubble
          message={rootMessage}
          isCurrentUser={rootMessage.userId === currentUserId}
          isRoot
        />
        <div className="mt-2 text-xs text-neutral-500">
          {messages.length} {messages.length === 1 ? 'reply' : 'replies'}
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No replies yet</p>
            <p className="text-xs text-neutral-400 mt-1">Be the first to reply</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ThreadMessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.userId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <ThreadComposer onSend={onReply} />
    </div>
  );
}

export default ThreadPanel;
