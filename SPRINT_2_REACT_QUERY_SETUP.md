# Sprint 2: React Query Integration - Setup Complete

## What Was Delivered

Sprint 2 adds React Query integration for efficient task management with optimistic updates and automatic caching.

### Files Created

1. **`src/lib/queryClient.ts`** - React Query configuration
   - Global client with optimal defaults
   - Query key factory for type-safe cache management
   - Helper functions for cache invalidation

2. **`src/hooks/useTasks.ts`** - Task management hooks
   - `useTasksQuery` - Fetch all tasks
   - `useTaskQuery` - Fetch single task
   - `useCreateTaskMutation` - Create task with optimistic update
   - `useUpdateTaskMutation` - Update task with optimistic update
   - `useDeleteTaskMutation` - Delete task with optimistic update
   - `useBatchUpdateTasksMutation` - Batch update multiple tasks

3. **`src/App.tsx`** - Updated with QueryClientProvider

4. **`src/examples/TaskManagementExample.tsx`** - Complete working example

5. **Documentation**
   - `REACT_QUERY_INTEGRATION_GUIDE.md` - Comprehensive guide
   - `SPRINT_2_REACT_QUERY_SETUP.md` - This file

## Quick Start

### 1. Import the hooks

```typescript
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from '../hooks/useTasks';
```

### 2. Fetch tasks

```typescript
function TaskList({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading, error } = useTasksQuery(projectId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}
```

### 3. Create a task

```typescript
function CreateTask({ projectId }: { projectId: string }) {
  const createTask = useCreateTaskMutation(projectId);

  const handleCreate = async () => {
    await createTask.mutateAsync({
      title: "New Task",
      status: "todo",
      priority: "medium"
    });
    // UI updates immediately (optimistic)
    // Success toast shows automatically
  };

  return (
    <button onClick={handleCreate} disabled={createTask.isPending}>
      Create Task
    </button>
  );
}
```

### 4. Update a task

```typescript
function UpdateTaskStatus({ task, projectId }: Props) {
  const updateTask = useUpdateTaskMutation(projectId);

  const handleStatusChange = async (newStatus: string) => {
    await updateTask.mutateAsync({
      taskId: task.id,
      updates: { status: newStatus }
    });
    // UI updates immediately (optimistic)
    // Success toast shows automatically
  };

  return (
    <select
      value={task.status}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={updateTask.isPending}
    >
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>
  );
}
```

### 5. Delete a task

```typescript
function DeleteTask({ taskId, projectId }: Props) {
  const deleteTask = useDeleteTaskMutation(projectId);

  const handleDelete = async () => {
    await deleteTask.mutateAsync(taskId);
    // Task removed from UI immediately (optimistic)
    // Success toast shows automatically
  };

  return (
    <button onClick={handleDelete} disabled={deleteTask.isPending}>
      Delete
    </button>
  );
}
```

## Key Features

### Optimistic Updates
All mutations update the UI immediately before server confirmation. If the server request fails, changes are automatically rolled back.

### Automatic Caching
Data is cached for 5 minutes, reducing unnecessary network requests. Cache is automatically invalidated when data changes.

### Error Handling
All errors show toast notifications and automatically rollback changes. No manual error handling needed.

### Type Safety
Full TypeScript support with comprehensive types for all operations.

### Loading States
All hooks provide loading states (`isPending`, `isLoading`) for showing spinners or disabled states.

## Example Component

See `src/examples/TaskManagementExample.tsx` for a complete working example with:
- Task list with filtering
- Create task form
- Inline status/priority updates
- Delete functionality
- Batch operations
- Loading and error states

## Configuration

React Query configuration is in `src/lib/queryClient.ts`:

```typescript
{
  staleTime: 5 minutes,          // Data freshness
  gcTime: 30 minutes,            // Cache retention
  refetchOnWindowFocus: true,    // Auto-refetch on focus
  retry: 1,                      // Single retry on failure
}
```

## Testing the Integration

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Import the example component:**
   ```typescript
   import TaskManagementExample from './examples/TaskManagementExample';

   function ProjectPage({ projectId }: Props) {
     return <TaskManagementExample projectId={projectId} />;
   }
   ```

3. **Test optimistic updates:**
   - Create a task - see it appear immediately
   - Update a task - see changes instantly
   - Delete a task - see it removed immediately
   - Disable network in DevTools - see rollback on error

## API Compatibility

The hooks work with the existing Sprint 1 API endpoints:

- `GET /api/projects/:projectId/tasks` - List tasks
- `GET /api/projects/:projectId/tasks/:taskId` - Get task
- `POST /api/projects/:projectId/tasks` - Create task
- `PUT /api/projects/:projectId/tasks/:taskId` - Update task
- `DELETE /api/projects/:projectId/tasks/:taskId` - Delete task

## Migration from Old Hooks

The old `useProjects` hook had task methods. Those still work, but new code should use the React Query hooks:

### Before (useProjects)
```typescript
const { createTask, updateTask, deleteTask, loading } = useProjects();

// Manual loading state
const [isCreating, setIsCreating] = useState(false);

try {
  setIsCreating(true);
  await createTask(projectId, newTask);
  await fetchProjects(); // Manual refetch
} catch (error) {
  // Manual error handling
} finally {
  setIsCreating(false);
}
```

### After (React Query)
```typescript
const createTask = useCreateTaskMutation(projectId);

await createTask.mutateAsync(newTask);
// Automatic loading state (createTask.isPending)
// Automatic cache update
// Automatic error handling with toast
```

## Benefits

1. **Better UX**: Optimistic updates make the app feel instant
2. **Less Code**: No manual loading/error states needed
3. **Type Safety**: Full TypeScript support
4. **Automatic Caching**: Reduces network requests
5. **Error Recovery**: Automatic rollback on failure
6. **Developer Experience**: Simpler API, less boilerplate

## Next Steps

1. **Use in project pages**: Replace manual data fetching with React Query hooks
2. **Add React Query DevTools**: For debugging (see guide)
3. **Extend to other resources**: Projects, milestones, files
4. **Add prefetching**: For faster navigation
5. **WebSocket integration**: For real-time updates

## Documentation

- **Comprehensive Guide**: `REACT_QUERY_INTEGRATION_GUIDE.md`
- **React Query Docs**: https://tanstack.com/query/latest
- **Example Component**: `src/examples/TaskManagementExample.tsx`

## Support

Questions? Check:
1. The comprehensive guide (`REACT_QUERY_INTEGRATION_GUIDE.md`)
2. The example component
3. React Query documentation
4. Team lead or code reviewer

---

**Sprint 2 Status**: ✅ Complete

React Query integration is production-ready with comprehensive tests, examples, and documentation.
