/**
 * InlineThread Component
 * Expandable inline thread that appears below the parent message.
 *
 * On desktop (>768px): renders inline below parent message
 * On mobile: delegates to ThreadPanel (side panel behavior)
 */

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownMessage } from './MarkdownMessage';

interface ThreadMessage {
  id: string;
  userId: string;
  conversationId: string;
  text: string;
  userName?: string;
  userAvatar?: string;
  createdAt: string;
  editedAt?: string;
}

interface InlineThreadProps {
  rootMessage: ThreadMessage;
  messages: ThreadMessage[];
  onReply: (text: string) => Promise<void>;
  currentUserId: string;
  conversationId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function ThreadReplyBubble({
  message,
  isCurrentUser,
}: {
  message: ThreadMessage;
  isCurrentUser: boolean;
}) {
  const name = message.userName || (isCurrentUser ? 'You' : 'Unknown User');

  return (
    <div className="flex gap-2 py-1.5">
      <div className="flex-shrink-0">
        {message.userAvatar ? (
          <img
            src={message.userAvatar}
            alt={name}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-medium">
            {getInitials(name)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {name}
          </span>
          <span className="text-[10px] text-neutral-400">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="text-sm text-neutral-800 dark:text-neutral-200">
          <MarkdownMessage text={message.text} />
        </div>
      </div>
    </div>
  );
}

function CompactComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() || isSending || disabled) return;
    setIsSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Reply..."
        disabled={disabled || isSending}
        className="flex-1 px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || isSending || disabled}
        className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function InlineThread({
  messages,
  onReply,
  currentUserId,
  isExpanded,
  onToggle,
}: InlineThreadProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure content height for animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [messages, isExpanded]);

  // Get the last replier for collapsed state
  const lastReplier = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastReplierName = lastReplier?.userName || 'Unknown';

  if (messages.length === 0) return null;

  return (
    <div className="ml-12 mt-1">
      {/* Collapsed thread indicator */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors w-full text-left',
          'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30',
          'text-primary-600 dark:text-primary-400'
        )}
      >
        <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span>{messages.length} {messages.length === 1 ? 'reply' : 'replies'}</span>
        {!isExpanded && lastReplier && (
          <>
            <span className="text-neutral-400">-</span>
            {lastReplier.userAvatar ? (
              <img
                src={lastReplier.userAvatar}
                alt={lastReplierName}
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-medium">
                {getInitials(lastReplierName)}
              </div>
            )}
            <span className="text-neutral-500 dark:text-neutral-400 truncate">
              {lastReplierName}
            </span>
          </>
        )}
        <span className="ml-auto flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* Expanded thread content */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: isExpanded ? `${contentHeight + 100}px` : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="pl-2 border-l-2 border-primary-200 dark:border-primary-800 mt-2 ml-1"
        >
          {messages.map((message) => (
            <ThreadReplyBubble
              key={message.id}
              message={message}
              isCurrentUser={message.userId === currentUserId}
            />
          ))}
          <CompactComposer onSend={onReply} />
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to determine thread display mode based on viewport width
 */
export function useThreadMode(): 'inline' | 'panel' {
  const [mode, setMode] = useState<'inline' | 'panel'>(() =>
    typeof window !== 'undefined' && window.innerWidth > 768 ? 'inline' : 'panel'
  );

  useEffect(() => {
    const handleResize = () => {
      setMode(window.innerWidth > 768 ? 'inline' : 'panel');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return mode;
}

export default InlineThread;
