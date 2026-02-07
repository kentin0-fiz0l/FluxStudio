/**
 * ChatHeader Component
 *
 * Chat area header with:
 * - Back button (mobile)
 * - Participant avatar and presence
 * - Action buttons (search, call, video, pin, summary, more)
 *
 * Extracted from MessagesNew.tsx for Phase 4.2 Technical Debt Resolution
 */

import {
  ArrowLeft,
  Search,
  Phone,
  Video,
  Pin,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { ChatAvatar as Avatar } from './ChatMessageBubble';
import { ConversationHeaderPresence } from './PresenceIndicator';
import type { Conversation } from './types';

export interface ChatHeaderProps {
  /** The selected conversation */
  conversation: Conversation;
  /** Whether any participant is typing */
  isTyping: boolean;
  /** Called when back button is clicked (mobile) */
  onBack: () => void;
  /** Whether message search is active */
  showMessageSearch: boolean;
  /** Called when search button is clicked */
  onToggleSearch: () => void;
  /** Whether pinned messages panel is open */
  showPinnedMessages: boolean;
  /** Called when pin button is clicked */
  onTogglePinned: () => void;
  /** Whether summary panel is open */
  showSummary: boolean;
  /** Called when summary button is clicked */
  onToggleSummary: () => void;
}

export function ChatHeader({
  conversation,
  isTyping,
  onBack,
  showMessageSearch,
  onToggleSearch,
  showPinnedMessages,
  onTogglePinned,
  showSummary,
  onToggleSummary,
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>
        <Avatar user={conversation.participant} size="md" showStatus />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] sm:max-w-[300px] md:max-w-none">
            {conversation.title}
          </h3>
          <ConversationHeaderPresence
            isOnline={conversation.participant.isOnline}
            lastSeen={conversation.participant.lastSeen}
            isTyping={isTyping}
            isGroup={conversation.type === 'group'}
            memberCount={conversation.participants?.length}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSearch}
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
          onClick={onTogglePinned}
          className={`p-2 rounded-lg transition-colors ${showPinnedMessages ? 'bg-accent-100 dark:bg-accent-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          title="Pinned messages"
        >
          <Pin className={`w-5 h-5 ${showPinnedMessages ? 'text-accent-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
        </button>
        <button
          onClick={onToggleSummary}
          className={`p-2 rounded-lg transition-colors ${showSummary ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          title="Conversation summary"
        >
          <Sparkles className={`w-5 h-5 ${showSummary ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
        </button>
        <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="More options">
          <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
