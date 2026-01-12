# React Query Quick Reference Card

## Import Hooks

```typescript
import {
  useTasksQuery,              // Fetch all tasks
  useTaskQuery,               // Fetch single task
  useCreateTaskMutation,      // Create task
  useUpdateTaskMutation,      // Update task
  useDeleteTaskMutation,      // Delete task
  useBatchUpdateTasksMutation // Batch update
} from '../hooks/useTasks';
```

## Fetch Tasks

```typescript
const { data: tasks = [], isLoading, error, refetch } = useTasksQuery(projectId);

// Check states
if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;

// Use data
tasks.map(task => <TaskItem key={task.id} task={task} />)
```

## Create Task

```typescript
const createTask = useCreateTaskMutation(projectId);

await createTask.mutateAsync({
  title: "Task Title",
  description: "Optional description",
  status: "todo",              // 'todo' | 'in_progress' | 'review' | 'completed'
  priority: "high",            // 'low' | 'medium' | 'high' | 'critical'
  assignedTo: userId,          // Optional
  dueDate: "2025-12-31"       // Optional
});

// Check mutation state
createTask.isPending  // true while creating
createTask.isError    // true if failed
createTask.isSuccess  // true if succeeded
```

## Update Task

```typescript
const updateTask = useUpdateTaskMutation(projectId);

await updateTask.mutateAsync({
  taskId: task.id,
  updates: {
    status: "completed",
    priority: "high",
    title: "New title",
    // ... any task field
  }
});
```

## Delete Task

```typescript
const deleteTask = useDeleteTaskMutation(projectId);

await deleteTask.mutateAsync(taskId);
```

## Batch Update

```typescript
const batchUpdate = useBatchUpdateTasksMutation(projectId);

await batchUpdate.mutateAsync({
  taskIds: [task1.id, task2.id, task3.id],
  updates: { status: "completed" }
});
```

## Error Handling

```typescript
try {
  await createTask.mutateAsync(newTask);
  // Success - toast shown automatically
} catch (error) {
  // Error - toast shown automatically, cache rolled back
  console.error('Additional error handling:', error);
}
```

## Conditional Fetching

```typescript
// Don't fetch if projectId is undefined
const { data: tasks } = useTasksQuery(projectId, {
  enabled: !!projectId
});
```

## Custom Refetch Interval

```typescript
// Auto-refetch every 30 seconds
const { data: tasks } = useTasksQuery(projectId, {
  refetchInterval: 30000
});
```

## Manual Refetch

```typescript
const { data: tasks, refetch } = useTasksQuery(projectId);

// Trigger manual refetch
await refetch();
```

## Loading States

```typescript
const createTask = useCreateTaskMutation(projectId);

<button
  onClick={handleCreate}
  disabled={createTask.isPending}
>
  {createTask.isPending ? 'Creating...' : 'Create Task'}
</button>
```

## Cache Invalidation

```typescript
import { queryClient, queryKeys } from '../lib/queryClient';

// Invalidate task list
queryClient.invalidateQueries({
  queryKey: queryKeys.tasks.list(projectId)
});

// Invalidate all project queries
import { invalidateProjectQueries } from '../lib/queryClient';
invalidateProjectQueries(projectId);
```

## Task Types

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
```

## Common Patterns

### Status Dropdown
```typescript
const updateTask = useUpdateTaskMutation(projectId);

<select
  value={task.status}
  onChange={(e) => updateTask.mutateAsync({
    taskId: task.id,
    updates: { status: e.target.value }
  })}
  disabled={updateTask.isPending}
>
  <option value="todo">To Do</option>
  <option value="in_progress">In Progress</option>
  <option value="review">Review</option>
  <option value="completed">Completed</option>
</select>
```

### Create Form
```typescript
const [title, setTitle] = useState('');
const createTask = useCreateTaskMutation(projectId);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await createTask.mutateAsync({ title, status: 'todo', priority: 'medium' });
  setTitle(''); // Clear form
};

<form onSubmit={handleSubmit}>
  <input value={title} onChange={(e) => setTitle(e.target.value)} />
  <button disabled={createTask.isPending}>Create</button>
</form>
```

### Delete Confirmation
```typescript
const deleteTask = useDeleteTaskMutation(projectId);

const handleDelete = async (taskId: string) => {
  if (confirm('Delete this task?')) {
    await deleteTask.mutateAsync(taskId);
  }
};
```

### Bulk Actions
```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());
const batchUpdate = useBatchUpdateTasksMutation(projectId);

const markAllCompleted = async () => {
  await batchUpdate.mutateAsync({
    taskIds: Array.from(selected),
    updates: { status: 'completed' }
  });
  setSelected(new Set()); // Clear selection
};
```

## Configuration

Default query config (`src/lib/queryClient.ts`):
- `staleTime: 5 minutes` - Data freshness
- `gcTime: 30 minutes` - Cache retention
- `refetchOnWindowFocus: true` - Auto-refetch on focus
- `retry: 1` - Single retry on error

## Key Benefits

1. **Optimistic Updates**: UI updates instantly
2. **Automatic Caching**: Reduces network requests
3. **Error Rollback**: Automatic undo on failure
4. **No Boilerplate**: No manual loading/error states
5. **Type Safety**: Full TypeScript support

## Help

- Full Guide: `REACT_QUERY_INTEGRATION_GUIDE.md`
- Setup Guide: `SPRINT_2_REACT_QUERY_SETUP.md`
- Example: `src/examples/TaskManagementExample.tsx`
- Docs: https://tanstack.com/query/latest
