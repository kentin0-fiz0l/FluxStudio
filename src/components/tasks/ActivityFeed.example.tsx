/**
 * Activity Feed - Example Integration
 *
 * This file demonstrates various ways to integrate the Activity Feed
 * into your project views and dashboards.
 */

import * as React from 'react';
import { ActivityFeed } from './ActivityFeed';
import {
  useActivitiesQuery,
  useRecentActivitiesQuery,
  useActivityStats,
} from '@/hooks/useActivities';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ============================================================================
// Example 1: Full Activity Feed with Tabs
// ============================================================================

export function ProjectActivityPage({ projectId }: { projectId: string }) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Project Activity</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="p-0">
            <ActivityFeed projectId={projectId} />
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-0">
            <TasksOnlyFeed projectId={projectId} />
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card className="p-0">
            <MilestonesOnlyFeed projectId={projectId} />
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <ActivityStatistics projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Example 2: Sidebar Activity Widget
// ============================================================================

export function ProjectSidebar({ projectId }: { projectId: string }) {
  return (
    <aside className="w-80 border-l border-neutral-200 bg-neutral-50 p-4 overflow-y-auto">
      {/* Recent Activity Widget */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </h3>
          <Badge variant="secondary">Live</Badge>
        </div>

        <ActivityFeed projectId={projectId} compact maxItems={10} />
      </div>

      {/* Quick Stats */}
      <ActivityQuickStats projectId={projectId} />
    </aside>
  );
}

// ============================================================================
// Example 3: Dashboard Activity Summary
// ============================================================================

export function DashboardActivitySummary({ projectId }: { projectId: string }) {
  const { data, isLoading } = useRecentActivitiesQuery(projectId, 5);
  const { stats } = useActivityStats(projectId);

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-neutral-100 rounded-lg" />;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Activity Summary</h3>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Activity className="h-5 w-5 text-blue-600" />}
          label="Total"
          value={stats.total}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          label="Last 24h"
          value={stats.last24h}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-success-600" />}
          label="Last 7d"
          value={stats.last7d}
        />
      </div>

      {/* Recent Activities */}
      <div className="space-y-3">
        {data?.activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <div className="rounded-full bg-primary-100 p-2">
              <Activity className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-700">{activity.action}</p>
              <p className="text-xs text-neutral-500 mt-1">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// Example 4: Tasks-Only Feed
// ============================================================================

function TasksOnlyFeed({ projectId }: { projectId: string }) {
  const { data, isLoading } = useActivitiesQuery(projectId, {
    limit: 100,
  });

  const taskActivities = React.useMemo(() => {
    return data?.activities.filter((a) => a.type.startsWith('task.')) || [];
  }, [data]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading task activities...</div>;
  }

  if (taskActivities.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500">
        No task activities yet. Create your first task to get started!
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {taskActivities.map((activity) => (
        <div key={activity.id} className="p-4 hover:bg-neutral-50">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-700">{activity.action}</p>
              <p className="text-xs text-neutral-500 mt-1">
                by {activity.userName} •{' '}
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 5: Milestones-Only Feed
// ============================================================================

function MilestonesOnlyFeed({ projectId }: { projectId: string }) {
  const { data, isLoading } = useActivitiesQuery(projectId, {
    limit: 100,
  });

  const milestoneActivities = React.useMemo(() => {
    return data?.activities.filter((a) => a.type.startsWith('milestone.')) || [];
  }, [data]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading milestone activities...</div>;
  }

  if (milestoneActivities.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500">
        No milestone activities yet. Create your first milestone to track progress!
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-100">
      {milestoneActivities.map((activity) => (
        <div key={activity.id} className="p-4 hover:bg-neutral-50">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-secondary-100 p-2">
              <CheckCircle2 className="h-4 w-4 text-secondary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">
                {activity.entityTitle}
              </p>
              <p className="text-sm text-neutral-600 mt-1">{activity.action}</p>
              <p className="text-xs text-neutral-500 mt-1">
                by {activity.userName} •{' '}
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 6: Activity Statistics View
// ============================================================================

function ActivityStatistics({ projectId }: { projectId: string }) {
  const { stats, isLoading } = useActivityStats(projectId);

  if (isLoading) {
    return <div className="p-8 text-center">Loading statistics...</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Activities</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-100 p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Last 24 Hours</p>
              <p className="text-2xl font-bold">{stats.last24h}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-success-100 p-3">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Last 7 Days</p>
              <p className="text-2xl font-bold">{stats.last7d}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-accent-100 p-3">
              <Users className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Active Users</p>
              <p className="text-2xl font-bold">
                {Object.keys(stats.byUser).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity by Type */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Activity by Type</h3>
        <div className="space-y-3">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700 capitalize">
                {type.replace('.', ' - ')}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500"
                    style={{
                      width: `${(count / stats.total) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-neutral-900 w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Most Active Users */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
        <div className="space-y-3">
          {Object.entries(stats.byUser)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([userId, { name, count }]) => (
              <div key={userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-600">
                      {name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-700">{name}</span>
                </div>
                <Badge variant="secondary">{count} activities</Badge>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-neutral-50">
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-neutral-600 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function ActivityQuickStats({ projectId }: { projectId: string }) {
  const { stats, isLoading } = useActivityStats(projectId);

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-neutral-700">Quick Stats</h4>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-white border border-neutral-200">
          <p className="text-xs text-neutral-600">Today</p>
          <p className="text-lg font-bold">{stats.last24h}</p>
        </div>

        <div className="p-3 rounded-lg bg-white border border-neutral-200">
          <p className="text-xs text-neutral-600">This Week</p>
          <p className="text-lg font-bold">{stats.last7d}</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary-50 border border-primary-200">
        <p className="text-xs text-primary-700">Total Activities</p>
        <p className="text-2xl font-bold text-primary-900">{stats.total}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Export Examples
// ============================================================================

export default {
  ProjectActivityPage,
  ProjectSidebar,
  DashboardActivitySummary,
  TasksOnlyFeed,
  MilestonesOnlyFeed,
  ActivityStatistics,
};
