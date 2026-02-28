/**
 * ConversationSidebar Component
 * Sidebar showing list of conversations with search and filters
 *
 * Features:
 * - Conversation list with avatars and preview
 * - Search functionality
 * - Filter tabs (all, unread, starred, muted)
 * - New conversation button
 * - Loading and empty states
 * - Mobile responsive (hidden on mobile when chat is open)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Star,
  BellOff,
  Pin,
  MessageCircle,
  Sparkles,
  Zap,
  Coffee,
  Rocket,
  Archive,
  CheckCheck,
} from 'lucide-react';

import { Card, Badge, Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChatAvatar } from './ChatMessageBubble';
import type { Conversation, ConversationFilter } from './types';
import { formatTime } from './utils';

// ============================================================================
// Helper Components
// ============================================================================

// Tips for empty state
const messagingTips = [
  { icon: Zap, text: 'Use @mentions to notify specific team members' },
  { icon: Coffee, text: 'Pin important messages to find them quickly' },
  { icon: Rocket, text: 'Create group chats for project-specific discussions' },
];

/**
 * Project context badge for conversation items
 */
function ProjectBadge({ projectId: _projectId, projectName }: { projectId: string; projectName: string }) {
  // _projectId available for future use (e.g., linking to project)
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      {projectName}
    </span>
  );
}

/**
 * Single conversation list item
 */
export interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMarkAsRead?: () => void;
}

const SWIPE_THRESHOLD = 60;

export const ConversationItem = React.memo(function ConversationItem({ conversation, isSelected, onClick, onPin, onMute, onDelete, onArchive, onMarkAsRead }: ConversationItemProps) {
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [swiped, setSwiped] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (contentRef.current && diff > 0) {
      const offset = Math.min(diff, 140);
      contentRef.current.style.transform = `translateX(-${offset}px)`;
      contentRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 200ms ease-out';
      if (diff > SWIPE_THRESHOLD) {
        contentRef.current.style.transform = 'translateX(-140px)';
        setSwiped(true);
      } else {
        contentRef.current.style.transform = 'translateX(0)';
        setSwiped(false);
      }
    }
  }, []);

  const closeSwipe = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 200ms ease-out';
      contentRef.current.style.transform = 'translateX(0)';
    }
    setSwiped(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Swipe-revealed actions */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        <button
          onClick={() => { onPin?.(); closeSwipe(); }}
          className="w-[46px] flex items-center justify-center bg-accent-500 text-white active:bg-accent-600"
          aria-label={conversation.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => { onMute?.(); closeSwipe(); }}
          className="w-[46px] flex items-center justify-center bg-neutral-500 text-white active:bg-neutral-600"
          aria-label={conversation.isMuted ? 'Unmute' : 'Mute'}
        >
          <BellOff className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => { onDelete?.(); closeSwipe(); }}
          className="w-[48px] flex items-center justify-center bg-red-500 text-white active:bg-red-600"
          aria-label="Delete"
        >
          <span className="text-sm font-medium">×</span>
        </button>
      </div>

      {/* Desktop context menu */}
      <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <DropdownMenuContent
          className="w-48"
          style={{ position: 'fixed', left: contextMenuPos.x, top: contextMenuPos.y }}
          side="bottom"
          align="start"
        >
          {onPin && (
            <DropdownMenuItem onClick={() => { onPin(); setContextMenuOpen(false); }}>
              <Pin className="w-4 h-4 mr-2" aria-hidden="true" />
              {conversation.isPinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
          )}
          {onMute && (
            <DropdownMenuItem onClick={() => { onMute(); setContextMenuOpen(false); }}>
              <BellOff className="w-4 h-4 mr-2" aria-hidden="true" />
              {conversation.isMuted ? 'Unmute' : 'Mute'}
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem onClick={() => { onArchive(); setContextMenuOpen(false); }}>
              <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
              {conversation.isArchived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
          )}
          {onMarkAsRead && conversation.unreadCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { onMarkAsRead(); setContextMenuOpen(false); }}>
                <CheckCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                Mark as Read
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Main content — slides left on swipe */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white dark:bg-neutral-900"
      >
        <button
          onClick={() => { if (swiped) { closeSwipe(); } else { onClick(); } }}
          onContextMenu={handleContextMenu}
          className={`w-full p-4 min-h-[64px] border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-left transition-colors touch-manipulation ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <ChatAvatar user={conversation.participant} size="md" showStatus />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
                    {conversation.title}
                  </h3>
                  {conversation.isPinned && (
                    <Pin className="w-3 h-3 text-accent-500 flex-shrink-0" aria-hidden="true" />
                  )}
                  {conversation.isMuted && (
                    <BellOff className="w-3 h-3 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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

              {/* Project badge row - only shown if conversation has project context */}
              {conversation.projectId && conversation.projectName && (
                <div className="mb-1">
                  <ProjectBadge projectId={conversation.projectId} projectName={conversation.projectName} />
                </div>
              )}

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
      </div>
    </div>
  );
});

/**
 * Empty state when no conversations exist
 */
export interface EmptyMessagesStateProps {
  onStartConversation: () => void;
}

export function EmptyMessagesState({ onStartConversation }: EmptyMessagesStateProps) {
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
          <MessageCircle className="w-12 h-12 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center animate-bounce">
          <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Start a conversation
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm">
        Connect with your team, share ideas, and collaborate in real-time.
      </p>

      <Button onClick={onStartConversation} className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
        New Message
      </Button>

      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl max-w-xs transition-all duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <TipIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-left">
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main ConversationSidebar Component
// ============================================================================

export interface ConversationSidebarProps {
  /** List of conversations to display */
  conversations: Conversation[];
  /** Currently selected conversation */
  selectedConversation: Conversation | null;
  /** Called when a conversation is clicked */
  onConversationClick: (conversation: Conversation) => void;
  /** Called when new conversation button is clicked */
  onNewConversation: () => void;
  /** Search term */
  searchTerm: string;
  /** Called when search term changes */
  onSearchChange: (term: string) => void;
  /** Current filter */
  filter: ConversationFilter;
  /** Called when filter changes */
  onFilterChange: (filter: ConversationFilter) => void;
  /** Number of online users */
  onlineCount: number;
  /** Number of unread messages */
  unreadCount: number;
  /** Whether conversations are loading */
  isLoading: boolean;
  /** Whether to show the sidebar (mobile responsive) */
  showMobileChat?: boolean;
  /** Custom empty state component */
  emptyStateComponent?: React.ReactNode;
}

export function ConversationSidebar({
  conversations,
  selectedConversation,
  onConversationClick,
  onNewConversation,
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  onlineCount,
  unreadCount,
  isLoading,
  showMobileChat = false,
  emptyStateComponent,
}: ConversationSidebarProps) {
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
          <Button variant="outline" size="sm" onClick={onNewConversation} aria-label="New conversation">
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
              className={`px-3 py-2 sm:py-1 text-xs rounded-full whitespace-nowrap transition-all touch-manipulation ${
                filter === f
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f === 'starred' && <Star className="w-3 h-3 inline mr-1" aria-hidden="true" />}
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
          <div role="status" aria-label="Loading conversations">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border-b border-neutral-100 dark:border-neutral-800 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
                      <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    </div>
                    <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          searchTerm ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No conversations match your search
              </p>
            </div>
          ) : (
            emptyStateComponent || <EmptyMessagesState onStartConversation={onNewConversation} />
          )
        ) : (
          conversations.map((conversation) => (
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

export default ConversationSidebar;
