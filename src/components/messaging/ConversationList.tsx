/**
 * Conversation List Component
 * Displays all conversations with filtering, search, and real-time updates
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Archive, MessageCircle, Users, Folder, Bell, BellOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Conversation, ConversationFilter, ConversationType, Priority } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import { cn } from '../../lib/utils';

interface ConversationListProps {
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  onCreateConversation: () => void;
  className?: string;
}

const conversationTypeIcons = {
  direct: MessageCircle,
  project: Folder,
  team: Users,
  consultation: Bell,
  support: MessageCircle,
  broadcast: Bell,
};

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export function ConversationList({
  selectedConversationId,
  onConversationSelect,
  onCreateConversation,
  className
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>({});
  const [showArchived, setShowArchived] = useState(false);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [filter, showArchived]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getConversations({
        ...filter,
        isArchived: showArchived,
      });
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(query) ||
      conv.description?.toLowerCase().includes(query) ||
      conv.participants.some(p => p.name.toLowerCase().includes(query)) ||
      conv.lastMessage?.content.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Group conversations by type
  const groupedConversations = useMemo(() => {
    const groups = filteredConversations.reduce((acc, conv) => {
      if (!acc[conv.type]) {
        acc[conv.type] = [];
      }
      acc[conv.type].push(conv);
      return acc;
    }, {} as Record<ConversationType, Conversation[]>);

    // Sort each group by last activity
    Object.keys(groups).forEach(type => {
      groups[type as ConversationType].sort((a, b) => {
        const getValidTime = (date: Date) => {
          const dateObj = date instanceof Date ? date : new Date(date);
          return isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
        };
        return getValidTime(b.lastActivity) - getValidTime(a.lastActivity);
      });
    });

    return groups;
  }, [filteredConversations]);

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
    const IconComponent = conversationTypeIcons[conversation.type];
    const isSelected = conversation.id === selectedConversationId;
    const hasUnread = conversation.unreadCount > 0;

    return (
      <button
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors text-left w-full",
          "hover:bg-accent",
          isSelected && "bg-accent border border-primary/20",
          hasUnread && "bg-blue-50 dark:bg-blue-950/20"
        )}
        onClick={() => onConversationSelect(conversation)}
      >
        {/* Conversation Icon & Status */}
        <div className="relative">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            conversation.metadata.color || "bg-primary/10"
          )}>
            {conversation.metadata.icon ? (
              <span className="text-lg">{conversation.metadata.icon}</span>
            ) : (
              <IconComponent className="w-5 h-5" />
            )}
          </div>

          {/* Priority indicator */}
          {conversation.metadata.priority !== 'low' && (
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full",
              priorityColors[conversation.metadata.priority]
            )} />
          )}
        </div>

        {/* Conversation Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              "font-medium truncate",
              hasUnread && "font-semibold"
            )}>
              {conversation.name}
            </h3>

            <div className="flex items-center gap-1">
              {conversation.metadata.isPinned && (
                <div className="w-1 h-1 bg-primary rounded-full" />
              )}
              {conversation.metadata.isMuted && (
                <BellOff className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {formatLastActivity(conversation.lastActivity)}
              </span>
            </div>
          </div>

          {/* Last Message Preview */}
          {conversation.lastMessage && (
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-medium">
                {conversation.lastMessage.author.name}:
              </span>{' '}
              {conversation.lastMessage.content}
            </p>
          )}

          {/* Participants (for direct conversations) */}
          {conversation.type === 'direct' && conversation.participants.length <= 3 && (
            <div className="flex items-center gap-1 mt-1">
              {conversation.participants.slice(0, 3).map(participant => (
                <Avatar key={participant.id} className="w-4 h-4">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="text-xs">
                    {participant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {conversation.participants.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{conversation.participants.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {conversation.metadata.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {conversation.metadata.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-1">
                  {tag}
                </Badge>
              ))}
              {conversation.metadata.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1">
                  +{conversation.metadata.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Unread Count */}
        {hasUnread && (
          <Badge className="bg-primary text-primary-foreground min-w-[20px] h-5 text-xs">
            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter({ hasUnread: true })}>
                  Unread only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ isPinned: true })}>
                  Pinned only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter({ priority: 'high' })}>
                  High priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowArchived(!showArchived)}>
                  {showArchived ? 'Hide archived' : 'Show archived'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilter({}); setShowArchived(false); }}>
                  Clear filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={onCreateConversation} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No conversations found</p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search terms' : 'Start a new conversation to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateConversation} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {Object.entries(groupedConversations).map(([type, convs]) => (
              <div key={type}>
                {Object.keys(groupedConversations).length > 1 && (
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {type}
                  </div>
                )}
                {convs.map(conversation => (
                  <ConversationItem key={conversation.id} conversation={conversation} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationList;