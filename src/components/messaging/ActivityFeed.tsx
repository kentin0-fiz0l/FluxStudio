/**
 * ActivityFeed Component - Unified Activity Stream
 * Combines messages, notifications, project updates into a single chronological feed
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Bell,
  Star,
  Folder,
  CheckCircle,
  Calendar,
  FileText,
  Activity,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { MessageUser } from '../../types/messaging';
import { useMessaging } from '../../hooks/useMessaging';
import { useNotifications } from '../../hooks/useNotifications';

interface ActivityFeedProps {
  className?: string;
}

type ActivityItem = {
  id: string;
  type: 'message' | 'notification' | 'project_update' | 'milestone' | 'file_shared' | 'approval' | 'meeting';
  timestamp: Date;
  user: MessageUser;
  content: string;
  metadata?: {
    conversationId?: string;
    conversationName?: string;
    projectId?: string;
    projectName?: string;
    priority?: string;
    attachments?: number;
    isUnread?: boolean;
  };
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'outline' | 'ghost';
  }>;
};

// Icon mapping - defined at module level to avoid dynamic component creation during render
const activityIconMap: Record<ActivityItem['type'], React.ComponentType<{ size?: string | number }>> = {
  message: MessageSquare,
  notification: Bell,
  project_update: Folder,
  milestone: Star,
  file_shared: FileText,
  approval: CheckCircle,
  meeting: Calendar,
};

// Color mapping function - defined at module level
const getActivityColorForItem = (type: ActivityItem['type'], priority?: string): string => {
  if (priority === 'critical') return 'text-red-600 bg-red-100';
  if (priority === 'high') return 'text-orange-600 bg-orange-100';

  switch (type) {
    case 'message': return 'text-blue-600 bg-blue-100';
    case 'notification': return 'text-purple-600 bg-purple-100';
    case 'project_update': return 'text-green-600 bg-green-100';
    case 'milestone': return 'text-yellow-600 bg-yellow-100';
    case 'file_shared': return 'text-indigo-600 bg-indigo-100';
    case 'approval': return 'text-emerald-600 bg-emerald-100';
    case 'meeting': return 'text-cyan-600 bg-cyan-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

// ActivityItemCard component - extracted outside parent to avoid creating during render
const ActivityItemCard = ({
  item,
  formatTimestamp
}: {
  item: ActivityItem;
  formatTimestamp: (date: Date) => string;
}) => {
  const Icon = activityIconMap[item.type] || Activity;
  const colorClasses = getActivityColorForItem(item.type, item.metadata?.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200',
        item.metadata?.isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Activity Icon */}
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClasses)}>
          <Icon size={16} />
        </div>

        {/* User Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={item.user.avatar} />
          <AvatarFallback className="text-xs">
            {item.user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {item.user.name}
            </span>
            <Badge variant="secondary" className="text-xs capitalize">
              {item.type.replace('_', ' ')}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatTimestamp(item.timestamp)}
            </span>
            {item.metadata?.isUnread && (
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </div>

          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
            {item.content}
          </p>

          {/* Metadata */}
          {(item.metadata?.conversationName || item.metadata?.projectName) && (
            <div className="flex items-center gap-2 mb-2">
              {item.metadata.conversationName && (
                <Badge variant="outline" className="text-xs">
                  <MessageSquare size={10} className="mr-1" />
                  {item.metadata.conversationName}
                </Badge>
              )}
              {item.metadata.projectName && (
                <Badge variant="outline" className="text-xs">
                  <Folder size={10} className="mr-1" />
                  {item.metadata.projectName}
                </Badge>
              )}
              {item.metadata.attachments && item.metadata.attachments > 0 && (
                <Badge variant="outline" className="text-xs">
                  <FileText size={10} className="mr-1" />
                  {item.metadata.attachments} files
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex gap-2">
              {item.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={action.action}
                  className="text-xs h-7"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* More actions */}
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <MoreHorizontal size={14} />
        </Button>
      </div>
    </motion.div>
  );
};

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { conversations } = useMessaging();
  const { notifications } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'messages' | 'notifications' | 'projects'>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Convert various data sources into unified activity items
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add messages from conversations
    conversations.forEach(conv => {
      if (conv.lastMessage) {
        items.push({
          id: `msg-${conv.lastMessage.id}`,
          type: 'message',
          timestamp: new Date(conv.lastMessage.createdAt),
          user: conv.lastMessage.author,
          content: conv.lastMessage.content,
          metadata: {
            conversationId: conv.id,
            conversationName: conv.name,
            priority: conv.metadata.priority,
            attachments: conv.lastMessage.attachments?.length || 0,
            isUnread: conv.unreadCount > 0
          },
          actions: [
            {
              label: 'Reply',
              action: () => {
                // Navigate to conversation
                window.location.href = `/messages?conversation=${conv.id}`;
              }
            }
          ]
        });
      }
    });

    // Add notifications
    notifications.forEach(notif => {
      let activityType: ActivityItem['type'] = 'notification';

      // Map notification types to activity types
      switch (notif.type) {
        case 'file_shared':
          activityType = 'file_shared';
          break;
        case 'approval_request':
        case 'approval_status':
          activityType = 'approval';
          break;
        case 'milestone':
          activityType = 'milestone';
          break;
        case 'consultation':
          activityType = 'meeting';
          break;
        default:
          activityType = 'notification';
      }

      items.push({
        id: `notif-${notif.id}`,
        type: activityType,
        timestamp: new Date(notif.createdAt),
        user: {
          id: 'system',
          name: 'System',
          userType: 'admin',
          avatar: undefined
        },
        content: notif.message,
        metadata: {
          priority: notif.priority,
          isUnread: !notif.isRead,
          conversationId: notif.conversationId,
          projectId: notif.projectId
        },
        actions: notif.actions?.map(action => ({
          label: action.label,
          action: () => {
            // Handle notification action
            console.log('Notification action:', action.action);
          },
          variant: action.variant as any
        }))
      });
    });

    // Sort by timestamp (most recent first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [conversations, notifications]);

  // Filter activity items
  const filteredItems = useMemo(() => {
    let filtered = activityItems;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(query) ||
        item.user.name.toLowerCase().includes(query) ||
        item.metadata?.conversationName?.toLowerCase().includes(query) ||
        item.metadata?.projectName?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterType) {
          case 'messages':
            return item.type === 'message';
          case 'notifications':
            return ['notification', 'approval', 'milestone', 'meeting'].includes(item.type);
          case 'projects':
            return item.metadata?.projectId !== undefined;
          default:
            return true;
        }
      });
    }

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (timeFilter) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(item => item.timestamp >= cutoff);
    }

    return filtered;
  }, [activityItems, searchQuery, filterType, timeFilter]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="text-blue-600" size={20} />
            Activity Feed
          </h2>
          <Badge variant="secondary">
            {filteredItems.length} items
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Time filter */}
        <div className="flex gap-1 mt-2">
          {(['today', 'week', 'month', 'all'] as const).map(filter => (
            <Button
              key={filter}
              size="sm"
              variant={timeFilter === filter ? "primary" : "ghost"}
              onClick={() => setTimeFilter(filter)}
              className="text-xs capitalize"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No activity found
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search or filters' : 'Your activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Group by date */}
            {Object.entries(
              filteredItems.reduce((groups, item) => {
                const date = item.timestamp.toDateString();
                if (!groups[date]) {
                  groups[date] = [];
                }
                groups[date].push(item);
                return groups;
              }, {} as Record<string, ActivityItem[]>)
            ).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    {new Date(date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
                <div className="space-y-3">
                  {items.map(item => (
                    <ActivityItemCard
                      key={item.id}
                      item={item}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;