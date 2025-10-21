# Activity Feed - Quick Start Guide

## Installation & Setup

The Activity Feed is already integrated. No additional setup required!

## Basic Usage

### 1. Display Activity Feed in a Project

```tsx
import { ActivityFeed } from '@/components/tasks/ActivityFeed';

function ProjectPage() {
  const projectId = "proj_123"; // From route params or props

  return (
    <div className="container">
      <ActivityFeed projectId={projectId} />
    </div>
  );
}
```

### 2. Compact Sidebar Feed

```tsx
<ActivityFeed
  projectId={projectId}
  compact={true}
  maxItems={10}
/>
```

### 3. Custom Query with Hooks

```tsx
import { useActivitiesQuery } from '@/hooks/useActivities';

function CustomActivityView({ projectId }) {
  const { data, isLoading, error } = useActivitiesQuery(projectId, {
    limit: 20,
    type: 'task.completed',  // Only show completed tasks
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.activities.map(activity => (
        <li key={activity.id}>{activity.action}</li>
      ))}
    </ul>
  );
}
```

## Common Patterns

### Show Recent Activity (Last 24h)

```tsx
import { useRecentActivitiesQuery } from '@/hooks/useActivities';

function DashboardWidget({ projectId }) {
  const { data } = useRecentActivitiesQuery(projectId, 5);

  return (
    <div className="widget">
      <h3>Recent Activity</h3>
      {data?.activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

### Filter by User

```tsx
import { useUserActivitiesQuery } from '@/hooks/useActivities';

function UserActivityTimeline({ projectId, userId }) {
  const { data } = useUserActivitiesQuery(projectId, userId);

  return <ActivityFeed activities={data?.activities || []} />;
}
```

### Activity Statistics

```tsx
import { useActivityStats } from '@/hooks/useActivities';

function ProjectStats({ projectId }) {
  const { stats, isLoading } = useActivityStats(projectId);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h3>Activity Stats</h3>
      <p>Total: {stats.total}</p>
      <p>Last 24h: {stats.last24h}</p>
      <p>Last 7d: {stats.last7d}</p>

      <h4>By Type:</h4>
      {Object.entries(stats.byType).map(([type, count]) => (
        <div key={type}>{type}: {count}</div>
      ))}
    </div>
  );
}
```

## Activity Types Reference

| Type | Description | Triggered By |
|------|-------------|--------------|
| `task.created` | New task created | POST /api/projects/:id/tasks |
| `task.updated` | Task modified | PUT /api/projects/:id/tasks/:taskId |
| `task.completed` | Task marked complete | PUT /api/projects/:id/tasks/:taskId (status=completed) |
| `task.deleted` | Task removed | DELETE /api/projects/:id/tasks/:taskId |
| `comment.created` | Comment added | Future implementation |
| `comment.deleted` | Comment removed | Future implementation |
| `member.added` | Team member added | Future implementation |
| `milestone.created` | Milestone created | POST /api/projects/:id/milestones |
| `milestone.completed` | Milestone completed | PUT /api/projects/:id/milestones/:id (status=completed) |

## Utility Functions

### Group Activities by Date

```tsx
import { groupActivitiesByDate } from '@/utils/activityHelpers';

const grouped = groupActivitiesByDate(activities);
// Returns: [["Today", [...activities]], ["Yesterday", [...activities]], ...]
```

### Search Activities

```tsx
import { searchActivities } from '@/utils/activityHelpers';

const results = searchActivities(activities, 'bug fix');
// Returns activities matching the search query
```

### Get Most Active Users

```tsx
import { getMostActiveUsers } from '@/utils/activityHelpers';

const topUsers = getMostActiveUsers(activities, 5);
// Returns: [{ userId, userName, count }, ...]
```

### Get Activity Trend

```tsx
import { getActivityTrend } from '@/utils/activityHelpers';

const trend = getActivityTrend(activities, 7);
// Returns: [{ date: "Oct 10", count: 15 }, ...]
```

## Real-Time Updates

Activities are automatically updated in real-time via:
1. **Polling**: Every 30 seconds (configurable in useActivitiesQuery)
2. **Socket.IO**: Instant updates when activities occur

### Socket.IO Events

```tsx
import { useEffect } from 'react';
import { io } from 'socket.io-client';

function ProjectRoom({ projectId }) {
  useEffect(() => {
    const socket = io('http://localhost:3002', {
      auth: { token: localStorage.getItem('auth_token') }
    });

    socket.emit('join:project', { projectId });

    socket.on('activity:new', (activity) => {
      console.log('New activity:', activity);
      // React Query will auto-refetch
    });

    return () => {
      socket.emit('leave:project', { projectId });
      socket.disconnect();
    };
  }, [projectId]);
}
```

## Styling & Customization

### Custom Activity Colors

```tsx
import { getActivityColor } from '@/utils/activityHelpers';

const colorClass = getActivityColor('task.completed');
// Returns: "text-success-600 bg-success-100"
```

### Custom Date Formatting

```tsx
import { formatActivityTime, formatFullActivityTime } from '@/utils/activityHelpers';

const shortTime = formatActivityTime('2025-10-17T14:30:00Z');
// Returns: "2:30 PM"

const fullTime = formatFullActivityTime('2025-10-17T14:30:00Z');
// Returns: "Oct 17, 2025, 2:30 PM"
```

## Performance Tips

1. **Use appropriate limits**: Don't fetch more activities than needed
2. **Enable compact mode**: For sidebar displays
3. **Leverage caching**: React Query automatically caches results
4. **Use specific filters**: Filter on the server (type, userId) rather than client

### Good Example
```tsx
// Fetches only 10 items, filtered on server
const { data } = useActivitiesQuery(projectId, {
  limit: 10,
  type: 'task.completed'
});
```

### Bad Example
```tsx
// Fetches 1000 items, filters on client
const { data } = useActivitiesQuery(projectId, { limit: 1000 });
const filtered = data?.activities.filter(a => a.type === 'task.completed');
```

## Troubleshooting

### Activities Not Showing

1. Check project access (user must be project member)
2. Verify authentication token
3. Check browser console for errors
4. Ensure activities directory exists: `/data/activities/`

### Slow Performance

1. Reduce `limit` parameter
2. Enable more specific filters
3. Check if too many activities (>1000 per project)
4. Consider implementing virtual scrolling

### Real-Time Updates Not Working

1. Verify Socket.IO connection
2. Check if user is in project room
3. Ensure auth token is valid
4. Check server logs for Socket.IO errors

## API Endpoints

### Get Activities
```
GET /api/projects/:projectId/activities?limit=50&offset=0&type=task.created
```

### Response
```json
{
  "success": true,
  "activities": [...],
  "total": 125,
  "hasMore": true
}
```

## Need Help?

- See full documentation: `ACTIVITY_FEED_IMPLEMENTATION.md`
- Check type definitions: `src/types/activity.ts`
- View examples: `src/components/tasks/ActivityFeed.tsx`
- Ask the team in #engineering channel
