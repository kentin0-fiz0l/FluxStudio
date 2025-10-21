/**
 * Integrated Activity Feed
 * Cross-feature activity timeline that connects projects, messages, and user actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  MessageSquare,
  Folder,
  FileImage,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Palette,
  Calendar,
  Activity,
  Filter,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useMessaging } from '../contexts/MessagingContext';
import { cn } from '../lib/utils';

interface ActivityItem {
  id: string;
  type: 'message' | 'project_created' | 'project_updated' | 'file_upload' | 'conversation_created' |
        'review_completed' | 'milestone_reached' | 'user_joined' | 'status_change';
  title: string;
  description: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  context: {
    organizationId?: string;
    teamId?: string;
    projectId?: string;
    conversationId?: string;
    messageId?: string;
  };
  metadata?: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    oldValue?: string;
    newValue?: string;
    attachmentCount?: number;
    participants?: number;
  };
  actionable?: {
    label: string;
    action: () => void;
  };
}

type ActivityFilter = 'all' | 'messages' | 'projects' | 'files' | 'reviews' | 'milestones';

export function IntegratedActivityFeed() {
  const { state } = useWorkspace();
  const { user } = useAuth();
  const { projects, currentOrganization } = useOrganization();
  const { conversations, conversationMessages } = useMessaging();

  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [showOnlyMyActivity, setShowOnlyMyActivity] = useState(false);

  // Generate integrated activity feed from multiple sources
  const activities = useMemo((): ActivityItem[] => {
    const allActivities: ActivityItem[] = [];

    // Add workspace activities
    if (state?.recentActivity && Array.isArray(state.recentActivity)) {
      state.recentActivity.forEach(activity => {
      allActivities.push({
        id: activity.id,
        type: activity.type as any,
        title: activity.title,
        description: activity.description,
        timestamp: activity.timestamp,
        user: {
          id: activity.userId,
          name: activity.userName,
        },
        context: {
          organizationId: activity.organizationId,
          teamId: activity.teamId,
          projectId: activity.projectId,
          conversationId: activity.conversationId,
        },
        metadata: activity.metadata
      });
      });
    }

    // Add recent messages as activities
    if (conversationMessages && typeof conversationMessages === 'object') {
      Object.entries(conversationMessages).forEach(([conversationId, messages]) => {
        const conversation = conversations?.find(c => c.id === conversationId);
      if (messages && Array.isArray(messages)) {
        messages.slice(0, 5).forEach(message => {
        allActivities.push({
          id: `message-${message.id}`,
          type: 'message',
          title: `New message in ${conversation?.name || 'Conversation'}`,
          description: message.content.slice(0, 100) + (message.content.length > 100 ? '...' : ''),
          timestamp: new Date(message.createdAt),
          user: {
            id: message.author.id,
            name: message.author.name,
            avatar: message.author.avatar,
            role: message.author.userType
          },
          context: {
            conversationId: message.conversationId,
            messageId: message.id,
            projectId: conversation?.projectId
          },
          metadata: {
            attachmentCount: message.attachments?.length || 0,
            participants: conversation?.participants?.length || 0
          },
          actionable: {
            label: 'View Conversation',
            action: () => {
              // Navigate to conversation
            }
          }
        });
        });
      }
      });
    }

    // Add project activities
    if (projects && Array.isArray(projects)) {
      projects.slice(0, 10).forEach(project => {
      // Project creation activity
      allActivities.push({
        id: `project-created-${project.id}`,
        type: 'project_created',
        title: `Project "${project.name}" created`,
        description: project.description || `New ${project.metadata.projectType} project`,
        timestamp: new Date(project.createdAt),
        user: {
          id: project.managerId,
          name: 'Project Manager', // Would get from user data
        },
        context: {
          organizationId: project.organizationId,
          teamId: project.teamId,
          projectId: project.id
        },
        metadata: {
          priority: project.priority as any,
          tags: [project.metadata.projectType, project.metadata.serviceCategory]
        },
        actionable: {
          label: 'View Project',
          action: () => {
            // Navigate to project
          }
        }
      });

      // Add status changes if project is not new
      if (project.status !== 'planning') {
        allActivities.push({
          id: `project-status-${project.id}`,
          type: 'status_change',
          title: `${project.name} status updated`,
          description: `Project status changed to ${project.status}`,
          timestamp: new Date(project.updatedAt),
          user: {
            id: project.managerId,
            name: 'Project Manager',
          },
          context: {
            organizationId: project.organizationId,
            projectId: project.id
          },
          metadata: {
            newValue: project.status,
            priority: project.priority as any
          }
        });
      }
    });
    }

    // Sort by timestamp (newest first)
    return allActivities.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return bTime - aTime;
    });
  }, [state.recentActivity, conversationMessages, conversations, projects]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply type filter
    if (filter !== 'all') {
      const typeMap = {
        messages: ['message'],
        projects: ['project_created', 'project_updated', 'status_change'],
        files: ['file_upload'],
        reviews: ['review_completed'],
        milestones: ['milestone_reached']
      };
      filtered = filtered.filter(activity =>
        typeMap[filter]?.includes(activity.type)
      );
    }

    // Apply user filter
    if (showOnlyMyActivity && user) {
      filtered = filtered.filter(activity => activity.user.id === user.id);
    }

    // Apply context filter (current organization)
    if (currentOrganization) {
      filtered = filtered.filter(activity =>
        !activity.context.organizationId ||
        activity.context.organizationId === currentOrganization.id
      );
    }

    return (filtered || []).slice(0, 50); // Limit to 50 items for performance
  }, [activities, filter, showOnlyMyActivity, user, currentOrganization]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'project_created':
      case 'project_updated': return Folder;
      case 'file_upload': return FileImage;
      case 'conversation_created': return MessageSquare;
      case 'review_completed': return CheckCircle;
      case 'milestone_reached': return Star;
      case 'user_joined': return Users;
      case 'status_change': return AlertCircle;
      default: return Activity;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'message': return 'text-blue-600 bg-blue-100';
      case 'project_created':
      case 'project_updated': return 'text-green-600 bg-green-100';
      case 'file_upload': return 'text-purple-600 bg-purple-100';
      case 'conversation_created': return 'text-indigo-600 bg-indigo-100';
      case 'review_completed': return 'text-emerald-600 bg-emerald-100';
      case 'milestone_reached': return 'text-yellow-600 bg-yellow-100';
      case 'user_joined': return 'text-cyan-600 bg-cyan-100';
      case 'status_change': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filterOptions: { value: ActivityFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All Activity', count: activities.length },
    { value: 'messages', label: 'Messages', count: activities.filter(a => a.type === 'message').length },
    { value: 'projects', label: 'Projects', count: activities.filter(a => ['project_created', 'project_updated', 'status_change'].includes(a.type)).length },
    { value: 'files', label: 'Files', count: activities.filter(a => a.type === 'file_upload').length },
    { value: 'reviews', label: 'Reviews', count: activities.filter(a => a.type === 'review_completed').length },
    { value: 'milestones', label: 'Milestones', count: activities.filter(a => a.type === 'milestone_reached').length },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Activity Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showOnlyMyActivity ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyMyActivity(!showOnlyMyActivity)}
            >
              My Activity
            </Button>
            <Button variant="outline" size="sm">
              <Filter size={14} className="mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1 mt-3">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(option.value)}
              className="text-xs h-7"
            >
              {option.label}
              {option.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {option.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Activity will appear here as you work</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredActivities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorClasses = getActivityColor(activity.type);

                return (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    {/* Activity Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      colorClasses
                    )}>
                      <Icon size={16} />
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          {activity.actionable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={activity.actionable.action}
                            >
                              <ExternalLink size={10} />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {activity.description}
                      </p>

                      {/* User and Metadata */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={activity.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {activity.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-600">
                            {activity.user.name}
                          </span>
                          {activity.user.role && (
                            <Badge variant="outline" className="text-xs">
                              {activity.user.role}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {activity.metadata?.priority && (
                            <Badge
                              variant={activity.metadata.priority === 'high' || activity.metadata.priority === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {activity.metadata.priority}
                            </Badge>
                          )}
                          {activity.metadata?.attachmentCount && activity.metadata.attachmentCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {activity.metadata.attachmentCount} files
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {activity.metadata?.tags && activity.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {(activity.metadata.tags || []).slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default IntegratedActivityFeed;