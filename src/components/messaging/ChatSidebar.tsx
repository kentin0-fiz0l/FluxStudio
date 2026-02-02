/**
 * ChatSidebar Component
 *
 * Conversation list sidebar with:
 * - Header with stats and new conversation button
 * - Search input
 * - Filter tabs (all, unread, starred, muted)
 * - Conversation list
 * - Empty states
 *
 * Extracted from MessagesNew.tsx for Phase 4.2 Technical Debt Resolution
 */

import { Search, UserPlus, Star, BellOff, MessageCircle, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ConversationItem } from './ConversationSidebar';
import { EmptyState, emptyStateConfigs } from '@/components/common/EmptyState';
import type { Conversation, ConversationFilter } from './types';

export interface ChatSidebarProps {
  /** List of conversations to display */
  conversations: Conversation[];
  /** Filtered conversations based on search and filter */
  filteredConversations: Conversation[];
  /** Currently selected conversation */
  selectedConversation: Conversation | null;
  /** Whether conversations are loading */
  isLoading: boolean;
  /** Current search term */
  searchTerm: string;
  /** Called when search term changes */
  onSearchChange: (term: string) => void;
  /** Current filter */
  filter: ConversationFilter;
  /** Called when filter changes */
  onFilterChange: (filter: ConversationFilter) => void;
  /** Called when a conversation is clicked */
  onConversationClick: (conversation: Conversation) => void;
  /** Called when new conversation button is clicked */
  onNewConversation: () => void;
  /** Called when "Go to Projects" is clicked */
  onNavigateToProjects: () => void;
  /** Whether to show mobile chat (hides sidebar on mobile) */
  showMobileChat: boolean;
  /** Number of online users */
  onlineCount: number;
  /** Total unread count */
  unreadCount: number;
}

export function ChatSidebar({
  conversations,
  filteredConversations,
  selectedConversation,
  isLoading,
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  onConversationClick,
  onNewConversation,
  onNavigateToProjects,
  showMobileChat,
  onlineCount,
  unreadCount,
}: ChatSidebarProps) {
  const filters: ConversationFilter[] = ['all', 'unread', 'starred', 'muted'];

  return (
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
          <Button variant="outline" size="sm" onClick={onNewConversation}>
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
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
              onPrimaryCta={onNewConversation}
              secondaryCtaLabel="Go to Projects"
              onSecondaryCta={onNavigateToProjects}
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
              onClick={() => onConversationClick(conversation)}
            />
          ))
        )}
      </div>
    </Card>
  );
}

export default ChatSidebar;
