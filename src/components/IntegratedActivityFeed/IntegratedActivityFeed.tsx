/**
 * Integrated Activity Feed
 * Cross-feature activity timeline that connects projects, messages, and user actions
 */

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { useWorkspace } from '@/store';
import { useAuth } from '@/store/slices/authSlice';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useMessaging } from '../../hooks/useMessaging';
import type { ActivityFilter } from './activity-feed-types';
import { FILTER_OPTIONS, ACTIVITY_TYPE_MAP } from './activity-feed-utils';
import { useActivityData } from './useActivityData';
import { ActivityFeedHeader } from './ActivityFeedHeader';
import { ActivityFeedItem } from './ActivityFeedItem';
import { ActivityFeedEmptyState } from './ActivityFeedEmptyState';

export function IntegratedActivityFeed() {
  const { state } = useWorkspace();
  const { user } = useAuth();
  const { projects, currentOrganization } = useOrganization();
  const { conversations, conversationMessages } = useMessaging();

  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [showOnlyMyActivity, setShowOnlyMyActivity] = useState(false);

  const { activities, filteredActivities } = useActivityData({
    recentActivity: state?.recentActivity,
    conversationMessages: conversationMessages as unknown as Record<string, any[]> | undefined,
    conversations,
    projects,
    filter,
    showOnlyMyActivity,
    userId: user?.id,
    currentOrganizationId: currentOrganization?.id,
  });

  const filterOptions = FILTER_OPTIONS.map(option => ({
    ...option,
    count: option.value === 'all'
      ? activities.length
      : activities.filter(a => (ACTIVITY_TYPE_MAP as Record<string, string[]>)[option.value]?.includes(a.type)).length,
  }));

  return (
    <Card className="h-full">
      <ActivityFeedHeader
        filter={filter}
        setFilter={setFilter}
        showOnlyMyActivity={showOnlyMyActivity}
        setShowOnlyMyActivity={setShowOnlyMyActivity}
        filterOptions={filterOptions}
      />

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {filteredActivities.length === 0 ? (
            <ActivityFeedEmptyState />
          ) : (
            <div className="p-4 space-y-4">
              {filteredActivities.map((activity) => (
                <ActivityFeedItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default IntegratedActivityFeed;
