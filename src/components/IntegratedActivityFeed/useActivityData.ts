import { useMemo } from 'react';
import type { ActivityItem, ActivityFilter } from './activity-feed-types';
import { ACTIVITY_TYPE_MAP } from './activity-feed-utils';
import { Conversation } from '../../types/messaging';

interface UseActivityDataParams {
  recentActivity: any[] | undefined;
  conversationMessages: Record<string, any[]> | undefined;
  conversations: Conversation[] | undefined;
  projects: any[] | undefined;
  filter: ActivityFilter;
  showOnlyMyActivity: boolean;
  userId: string | undefined;
  currentOrganizationId: string | undefined;
}

export function useActivityData({
  recentActivity,
  conversationMessages,
  conversations,
  projects,
  filter,
  showOnlyMyActivity,
  userId,
  currentOrganizationId,
}: UseActivityDataParams) {
  const activities = useMemo((): ActivityItem[] => {
    const allActivities: ActivityItem[] = [];

    // Add workspace activities
    if (recentActivity && Array.isArray(recentActivity)) {
      recentActivity.forEach(activity => {
        allActivities.push({
          id: activity.id,
          type: activity.type as ActivityItem['type'],
          title: activity.title,
          description: activity.description,
          timestamp: new Date(activity.timestamp),
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
        const conversation = conversations?.find((c: Conversation) => c.id === conversationId);
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
            name: 'Project Manager',
          },
          context: {
            organizationId: project.organizationId,
            teamId: project.primaryTeamId || project.teamIds[0],
            projectId: project.id
          },
          metadata: {
            priority: project.priority as 'low' | 'medium' | 'high' | 'critical',
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
              priority: project.priority as 'low' | 'medium' | 'high' | 'critical'
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
  }, [recentActivity, conversationMessages, conversations, projects]);

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(activity =>
        ACTIVITY_TYPE_MAP[filter]?.includes(activity.type)
      );
    }

    // Apply user filter
    if (showOnlyMyActivity && userId) {
      filtered = filtered.filter(activity => activity.user.id === userId);
    }

    // Apply context filter (current organization)
    if (currentOrganizationId) {
      filtered = filtered.filter(activity =>
        !activity.context.organizationId ||
        activity.context.organizationId === currentOrganizationId
      );
    }

    return (filtered || []).slice(0, 50); // Limit to 50 items for performance
  }, [activities, filter, showOnlyMyActivity, userId, currentOrganizationId]);

  return { activities, filteredActivities };
}
