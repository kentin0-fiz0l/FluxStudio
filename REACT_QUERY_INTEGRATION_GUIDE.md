# React Query Integration Guide - Sprint 2

## Overview

This guide documents the React Query integration for Flux Studio's Sprint 2 project management system. The integration provides efficient data fetching, caching, and optimistic updates for a superior user experience.

## Architecture

### Key Components

1. **Query Client Configuration** (`src/lib/queryClient.ts`)
   - Centralized React Query configuration
   - Query key factory for type-safe cache management
   - Helper functions for cache invalidation

2. **Task Management Hooks** (`src/hooks/useTasks.ts`)
   - Complete task CRUD operations
   - Optimistic updates with rollback
   - Automatic cache synchronization

3. **App Integration** (`src/App.tsx`)
   - QueryClientProvider wrapper
   - Global cache management

## Features

### 1. Automatic Caching

Tasks are automatically cached for 5 minutes to reduce unnecessary network requests:

```typescript
const { data: tasks, isLoading, error } = useTasksQuery(projectId);
```

### 2. Optimistic Updates

All mutations (create, update, delete) use optimistic updates for instant UI feedback:

```typescript
const createTask = useCreateTaskMutation(projectId);

// UI updates immediately, then syncs with server
await createTask.mutateAsync({
  title: "New Task",
  status: "todo",
  priority: "high"
});
```

### 3. Automatic Error Handling

Failed mutations automatically rollback and show error toasts:

```typescript
// On error:
// 1. Cache reverts to previous state
// 2. Error toast displays to user
// 3. No manual error handling needed
```

### 4. Window Focus Refetching

Data automatically refetches when users return to the window, ensuring collaboration awareness:

```typescript
// Automatic - no code needed
// When user switches tabs and returns, fresh data loads
```

### 5. Type Safety

Full TypeScript support with comprehensive types:

```typescript
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  // ... more fields
}
```

## Usage Examples

### Basic Task Fetching

```typescript
import { useTasksQuery } from '../hooks/useTasks';

function TaskList({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading, error } = useTasksQuery(projectId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### Creating Tasks

```typescript
import { useCreateTaskMutation } from '../hooks/useTasks';

function CreateTaskForm({ projectId }: { projectId: string }) {
  const createTask = useCreateTaskMutation(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createTask.mutateAsync({
        title: "New Feature",
        description: "Implement user authentication",
        status: "todo",
        priority: "high"
      });
      // Success toast automatically shown
      // UI already updated optimistically
    } catch (error) {
      // Error toast automatically shown
      // UI automatically rolled back
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button
        type="submit"
        disabled={createTask.isPending}
      >
        {createTask.isPending ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  );
}
```

### Updating Tasks

```typescript
import { useUpdateTaskMutation } from '../hooks/useTasks';

function TaskStatusDropdown({ task, projectId }: Props) {
  const updateTask = useUpdateTaskMutation(projectId);

  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { status: newStatus }
      });
    } catch (error) {
      // Error already handled with toast and rollback
    }
  };

  return (
    <select
      value={task.status}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={updateTask.isPending}
    >
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="review">Review</option>
      <option value="completed">Completed</option>
    </select>
  );
}
```

### Deleting Tasks

```typescript
import { useDeleteTaskMutation } from '../hooks/useTasks';

function DeleteTaskButton({ taskId, projectId }: Props) {
  const deleteTask = useDeleteTaskMutation(projectId);

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;

    try {
      await deleteTask.mutateAsync(taskId);
      // Task removed from UI immediately
      // Success toast shown automatically
    } catch (error) {
      // Task restored to UI
      // Error toast shown
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteTask.isPending}
    >
      {deleteTask.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Batch Operations

```typescript
import { useBatchUpdateTasksMutation } from '../hooks/useTasks';

function BulkTaskActions({ selectedTaskIds, projectId }: Props) {
  const batchUpdate = useBatchUpdateTasksMutation(projectId);

  const handleMarkAllCompleted = async () => {
    try {
      await batchUpdate.mutateAsync({
        taskIds: selectedTaskIds,
        updates: { status: 'completed' }
      });
      // All tasks updated in UI immediately
      // Single success toast for batch operation
    } catch (error) {
      // All tasks rolled back
      // Error toast shown
    }
  };

  return (
    <button
      onClick={handleMarkAllCompleted}
      disabled={batchUpdate.isPending}
    >
      Mark {selectedTaskIds.length} tasks as completed
    </button>
  );
}
```

### Fetching Single Task

```typescript
import { useTaskQuery } from '../hooks/useTasks';

function TaskDetailModal({ taskId, projectId }: Props) {
  const { data: task, isLoading } = useTaskQuery(projectId, taskId);

  if (isLoading) return <LoadingSpinner />;
  if (!task) return <div>Task not found</div>;

  return (
    <div>
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <div>Status: {task.status}</div>
      <div>Priority: {task.priority}</div>
    </div>
  );
}
```

## Query Key Structure

Query keys follow a hierarchical structure for efficient cache invalidation:

```typescript
// All tasks for a project
['tasks', 'list', projectId]

// Single task detail
['tasks', 'detail', taskId]

// All projects
['projects', 'list']

// Single project
['projects', 'detail', projectId]
```

### Cache Invalidation Helpers

```typescript
import { invalidateProjectQueries } from '../lib/queryClient';

// Invalidate all queries related to a project
invalidateProjectQueries(projectId);
// Invalidates: project details, tasks, milestones

import { queryKeys } from '../lib/queryClient';

// Invalidate specific queries
queryClient.invalidateQueries({
  queryKey: queryKeys.tasks.list(projectId)
});
```

## Configuration

### Query Client Settings

Located in `src/lib/queryClient.ts`:

```typescript
{
  staleTime: 1000 * 60 * 5,        // 5 minutes - data freshness
  gcTime: 1000 * 60 * 30,          // 30 minutes - cache retention
  refetchOnWindowFocus: true,       // Auto-refetch on window focus
  refetchOnMount: false,            // Don't refetch if data is fresh
  retry: 1,                         // Single retry on failure
}
```

### Customizing Query Behavior

You can override defaults per query:

```typescript
const { data: tasks } = useTasksQuery(projectId, {
  staleTime: 1000 * 60 * 10,  // Keep fresh for 10 minutes
  refetchInterval: 30000,      // Auto-refetch every 30 seconds
  enabled: !!projectId,        // Disable if no projectId
});
```

## Performance Optimizations

### 1. Request Deduplication

Multiple components requesting the same data will share a single request:

```typescript
// Component A
const { data: tasks } = useTasksQuery(projectId);

// Component B (same projectId)
const { data: tasks } = useTasksQuery(projectId);
// Only ONE network request made
```

### 2. Background Refetching

Stale data is served immediately while fresh data loads in background:

```typescript
// User sees cached data instantly
// Fresh data loads in background
// UI updates seamlessly when fresh data arrives
```

### 3. Optimistic Updates

UI updates before server confirmation for instant perceived performance:

```typescript
// Click "Mark as completed"
// UI updates immediately
// Server request happens in background
// Rollback only if error occurs
```

### 4. Intelligent Retries

Failed requests retry once with exponential backoff:

```typescript
// First attempt: immediate
// Retry after: 1000ms (if first fails)
// Max retry delay: 30000ms
```

## Error Handling

### Automatic Error Handling

All mutations automatically handle errors with:
- Cache rollback
- Error toast notification
- Loading state management

### Custom Error Handling

For custom error handling beyond toasts:

```typescript
const createTask = useCreateTaskMutation(projectId);

try {
  await createTask.mutateAsync(newTask);
} catch (error) {
  // Automatic toast already shown
  // Add custom handling here:
  console.error('Task creation failed:', error);
  analytics.trackError('create_task_failed', error);
}
```

### Global Error Boundary

Wrap queries in error boundaries for graceful degradation:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <TaskList projectId={projectId} />
</ErrorBoundary>
```

## Testing

### Mocking Queries

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithQuery(component: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}
```

### Testing Optimistic Updates

```typescript
test('updates task optimistically', async () => {
  const { getByText, getByRole } = renderWithQuery(
    <TaskList projectId="123" />
  );

  // Click update button
  const updateButton = getByRole('button', { name: /update/i });
  fireEvent.click(updateButton);

  // UI should update immediately
  expect(getByText(/updated/i)).toBeInTheDocument();

  // Server request happens in background
  await waitFor(() => {
    expect(mockUpdateTask).toHaveBeenCalled();
  });
});
```

## Migration from Old Hooks

### Before (src/hooks/useProjects.ts)

```typescript
const { createTask, updateTask, deleteTask } = useProjects();

// Manual state management
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

try {
  setLoading(true);
  await createTask(projectId, newTask);
  // Manual refetch
  await fetchProjects();
} catch (error) {
  setError(error);
} finally {
  setLoading(false);
}
```

### After (React Query)

```typescript
const createTask = useCreateTaskMutation(projectId);

// Automatic state management
await createTask.mutateAsync(newTask);
// Automatic cache update
// Automatic loading states
// Automatic error handling
```

## Best Practices

### 1. Enable Queries Conditionally

```typescript
// Don't fetch if projectId is undefined
const { data: tasks } = useTasksQuery(projectId, {
  enabled: !!projectId
});
```

### 2. Use Query Keys Consistently

```typescript
// Good - use query key factory
queryKeys.tasks.list(projectId)

// Bad - hardcoded keys
['tasks', projectId]
```

### 3. Invalidate Queries After Mutations

```typescript
// Automatic in mutation hooks
onSuccess: () => {
  invalidateProjectQueries(projectId);
}
```

### 4. Handle Loading States

```typescript
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage />;
// Render data
```

### 5. Provide Fallback Data

```typescript
const { data: tasks = [] } = useTasksQuery(projectId);
// Default to empty array if no data
```

## Troubleshooting

### Issue: Stale Data After Mutation

**Solution:** Ensure cache invalidation in mutation's `onSuccess`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.tasks.list(projectId)
  });
}
```

### Issue: Infinite Refetching

**Solution:** Set appropriate `staleTime` and disable unnecessary refetches:

```typescript
const { data } = useTasksQuery(projectId, {
  staleTime: 1000 * 60 * 5,
  refetchOnMount: false,
});
```

### Issue: TypeScript Errors

**Solution:** Ensure types are properly defined:

```typescript
const { data: tasks } = useTasksQuery(projectId);
// data is Task[] | undefined
// Use default: const { data: tasks = [] }
```

## Future Enhancements

1. **React Query DevTools Integration**
   ```typescript
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

   <QueryClientProvider client={queryClient}>
     <App />
     <ReactQueryDevtools initialIsOpen={false} />
   </QueryClientProvider>
   ```

2. **Infinite Queries for Large Lists**
   ```typescript
   const {
     data,
     fetchNextPage,
     hasNextPage,
   } = useInfiniteQuery({
     queryKey: ['tasks', 'infinite'],
     queryFn: ({ pageParam = 0 }) => fetchTasks(pageParam),
     getNextPageParam: (lastPage) => lastPage.nextCursor,
   });
   ```

3. **Prefetching for Navigation**
   ```typescript
   const queryClient = useQueryClient();

   const handleMouseEnter = () => {
     queryClient.prefetchQuery({
       queryKey: queryKeys.tasks.list(projectId),
       queryFn: () => fetchTasks(projectId),
     });
   };
   ```

4. **WebSocket Integration**
   ```typescript
   useEffect(() => {
     const socket = io();

     socket.on('task:updated', (task: Task) => {
       queryClient.setQueryData(
         queryKeys.tasks.detail(task.id),
         task
       );
     });
   }, []);
   ```

## Support

For questions or issues with React Query integration:
- Review this guide
- Check React Query docs: https://tanstack.com/query/latest
- Review example component: `src/examples/TaskManagementExample.tsx`
- Consult team lead or code reviewer

## Summary

React Query integration provides:
- Automatic caching and background refetching
- Optimistic updates for instant UI feedback
- Error handling with rollback
- Type-safe query management
- Superior developer experience
- Better user experience with faster perceived performance

The integration is production-ready and follows React Query best practices for optimal performance and maintainability.
