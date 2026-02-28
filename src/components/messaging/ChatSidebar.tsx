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

import { Search, UserPlus, Star, BellOff, Archive, MessageCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
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
  /** Called when mute is toggled on a conversation */
  onMuteConversation?: (conversationId: string) => void;
  /** Called when archive is toggled on a conversation */
  onArchiveConversation?: (conversationId: string) => void;
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
  onMuteConversation,
  onArchiveConversation,
}: ChatSidebarProps) {
  const filters: ConversationFilter[] = ['all', 'unread', 'archived', 'starred', 'muted'];

  return (
    <Card className={`w-full md:w-72 lg:w-96 flex-shrink-0 flex flex-col overflow-hidden border-0 md:border ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
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
            <UserPlus className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
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
              {f === 'starred' && <Star className="w-3 h-3 inline mr-1" aria-hidden="true" />}
              {f === 'archived' && <Archive className="w-3 h-3 inline mr-1" aria-hidden="true" />}
              {f === 'muted' && <BellOff className="w-3 h-3 inline mr-1" aria-hidden="true" />}
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
          <div className="p-4 space-y-3" role="status" aria-busy="true" aria-label="Loading conversations">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton animation="shimmer" variant="avatar" size="md" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton animation="shimmer" className="h-4 w-24" />
                    <Skeleton animation="shimmer" className="h-3 w-10" />
                  </div>
                  <Skeleton animation="shimmer" className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          searchTerm ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" aria-hidden="true" />
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
          (() => {
            const unread = filteredConversations.filter(c => c.unreadCount > 0);
            const read = filteredConversations.filter(c => c.unreadCount === 0);
            return (
              <>
                {unread.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversation?.id === conversation.id}
                    onClick={() => onConversationClick(conversation)}
                    onMute={onMuteConversation ? () => onMuteConversation(conversation.id) : undefined}
                    onDelete={onArchiveConversation ? () => onArchiveConversation(conversation.id) : undefined}
                  />
                ))}
                {unread.length > 0 && read.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2" role="separator">
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      Earlier
                    </span>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                )}
                {read.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversation?.id === conversation.id}
                    onClick={() => onConversationClick(conversation)}
                    onMute={onMuteConversation ? () => onMuteConversation(conversation.id) : undefined}
                    onDelete={onArchiveConversation ? () => onArchiveConversation(conversation.id) : undefined}
                  />
                ))}
              </>
            );
          })()
        )}
      </div>
    </Card>
  );
}

export default ChatSidebar;
