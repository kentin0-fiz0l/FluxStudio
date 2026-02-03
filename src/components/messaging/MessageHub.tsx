/**
 * MessageHub Component - Creative-First Messaging Interface
 * Central communication hub optimized for design workflow collaboration
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Folder,
  Bell,
  Search,
  Plus,
  Clock,
  Star,
  Archive,
  Palette,
  FileImage,
  MessageCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Conversation, ConversationType, MessageUser, Priority } from '../../types/messaging';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../hooks/useMessaging';
import { cn } from '../../lib/utils';
import { VisualMessageThread } from './VisualMessageThread';
// SmartComposer not currently used in this component
import { ContextualSidebar } from './ContextualSidebar';
import { QuickActionPanel } from './QuickActionPanel';
import { ActivityFeed } from './ActivityFeed';
import { PresenceIndicators } from './PresenceIndicators';

interface MessageHubProps {
  className?: string;
}

type ViewMode = 'unified' | 'projects' | 'clients' | 'teams' | 'activity';
type FilterType = 'all' | 'unread' | 'priority' | 'mentions' | 'files';

export function MessageHub({ className }: MessageHubProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationMessages,
    setActiveConversation,
    filterConversations,
    isLoading: _isLoading
  } = useMessaging();

  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Smart context detection - group conversations by context
  const contextualConversations = useMemo(() => {
    // Apply type filters (search is applied within filterConversations)
    const typeFiltered = filterConversations({
      hasUnread: filterType === 'unread',
      // Add more filter logic here
    });

    // Group by context
    const grouped = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      thisWeek: [] as Conversation[],
      older: [] as Conversation[],
      pinned: [] as Conversation[],
      projects: new Map<string, Conversation[]>(),
      clients: new Map<string, Conversation[]>()
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    typeFiltered.forEach(conv => {
      if (conv.metadata.isPinned) {
        grouped.pinned.push(conv);
      }

      const lastActivity = new Date(conv.lastActivity);

      if (lastActivity >= today) {
        grouped.today.push(conv);
      } else if (lastActivity >= yesterday) {
        grouped.yesterday.push(conv);
      } else if (lastActivity >= weekAgo) {
        grouped.thisWeek.push(conv);
      } else {
        grouped.older.push(conv);
      }

      // Group by projects
      if (conv.projectId) {
        if (!grouped.projects.has(conv.projectId)) {
          grouped.projects.set(conv.projectId, []);
        }
        grouped.projects.get(conv.projectId)!.push(conv);
      }

      // Group by client (based on participants)
      const clientParticipant = conv.participants.find(p => p.userType === 'client');
      if (clientParticipant) {
        if (!grouped.clients.has(clientParticipant.id)) {
          grouped.clients.set(clientParticipant.id, []);
        }
        grouped.clients.get(clientParticipant.id)!.push(conv);
      }
    });

    return grouped;
  }, [conversations, filterConversations, searchQuery, filterType]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getConversationIcon = (type: ConversationType) => {
    switch (type) {
      case 'direct': return MessageCircle;
      case 'project': return Folder;
      case 'team': return Users;
      case 'consultation': return Bell;
      case 'support': return MessageSquare;
      case 'broadcast': return Bell;
      default: return MessageCircle;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const ConversationCard = ({ conversation, isActive }: { conversation: Conversation; isActive: boolean }) => {
    const Icon = getConversationIcon(conversation.type);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => setActiveConversation(conversation.id)}
        className={cn(
          'relative p-4 rounded-lg border cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:border-blue-300',
          isActive
            ? 'bg-blue-50 border-blue-300 shadow-md'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        )}
      >
        {/* Priority indicator */}
        <div className={cn(
          'absolute top-2 right-2 w-3 h-3 rounded-full',
          getPriorityColor(conversation.metadata.priority)
        )} />

        <div className="flex items-start gap-3">
          {/* Icon/Avatar */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Icon size={18} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {conversation.name}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {conversation.metadata.isPinned && (
                  <Star size={12} className="text-yellow-500 fill-current" />
                )}
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(new Date(conversation.lastActivity))}
                </span>
              </div>
            </div>

            {/* Last message preview */}
            {conversation.lastMessage && (
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={conversation.lastMessage.author.avatar} />
                  <AvatarFallback className="text-xs">
                    {conversation.lastMessage.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-600 truncate flex-1">
                  {conversation.lastMessage.content}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {conversation.type}
                </Badge>
                {conversation.lastMessage?.attachments && conversation.lastMessage.attachments.length > 0 && (
                  <FileImage size={12} className="text-gray-400" />
                )}
              </div>

              {conversation.unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const ConversationSection = ({ title, conversations, icon: Icon }: {
    title: string;
    conversations: Conversation[];
    icon?: React.ElementType;
  }) => {
    if (conversations.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon size={16} className="text-gray-600" />}
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
            {title}
          </h2>
          <Badge variant="outline" className="text-xs">
            {conversations.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {conversations.map(conv => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isActive={activeConversation?.id === conv.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('h-full bg-gray-50 flex', className)}>
      {/* Contextual Sidebar */}
      <ContextualSidebar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        className="w-64 flex-shrink-0"
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Conversations List - Hidden when in activity view */}
        {viewMode !== 'activity' && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="text-blue-600" size={20} />
                  Messages
                </h1>
                <div className="flex items-center gap-3">
                  {/* Presence Indicators */}
                  {activeConversation && (
                    <PresenceIndicators
                      conversationId={activeConversation.id}
                      currentUser={user as MessageUser}
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => setShowQuickActions(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} className="mr-1" />
                    New
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-1">
                {(['all', 'unread', 'priority', 'mentions'] as FilterType[]).map(filter => (
                  <Button
                    key={filter}
                    variant={filterType === filter ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterType(filter)}
                    className="text-xs capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'unified' && (
                <>
                  <ConversationSection
                    title="Pinned"
                    conversations={contextualConversations.pinned}
                    icon={Star}
                  />
                  <ConversationSection
                    title="Today"
                    conversations={contextualConversations.today}
                    icon={Clock}
                  />
                  <ConversationSection
                    title="Yesterday"
                    conversations={contextualConversations.yesterday}
                  />
                  <ConversationSection
                    title="This Week"
                    conversations={contextualConversations.thisWeek}
                  />
                  <ConversationSection
                    title="Older"
                    conversations={contextualConversations.older}
                    icon={Archive}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'activity' ? (
            <ActivityFeed />
          ) : activeConversation ? (
            <VisualMessageThread
              conversation={activeConversation}
              messages={conversationMessages}
              currentUser={user as MessageUser}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Welcome to Flux Studio Messages
                </h3>
                <p className="text-gray-500 max-w-md">
                  Select a conversation to start collaborating on your creative projects
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionPanel
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        currentUser={user as MessageUser}
      />
    </div>
  );
}

export default MessageHub;