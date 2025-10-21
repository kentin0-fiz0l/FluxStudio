# TaskSearch Component

A comprehensive search and filtering interface for task management, built for Flux Studio's Sprint 2 project management system.

## Features

- **Full-Text Search**: Search across task titles and descriptions with 300ms debouncing
- **Multi-Select Filters**: Filter by status, priority, assignee, due date, and creator
- **Smart Sorting**: Sort by recent, title, due date, priority, or status
- **URL State Sync**: Bookmark and share filtered views via URL parameters
- **Keyboard Shortcuts**: `Cmd+K` / `Ctrl+K` to focus search
- **Preset Filters**: Quick access to "My tasks", "Overdue", "High priority", etc.
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: WCAG 2.1 Level A compliant with full keyboard navigation

## Installation

The component is already integrated into the Flux Studio codebase. Import it:

```typescript
import { TaskSearch } from '@/components/tasks/TaskSearch';
import { useTaskSearch } from '@/hooks/useTaskSearch';
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { TaskSearch } from '@/components/tasks/TaskSearch';
import { Task, TeamMember } from '@/hooks/useTaskSearch';

function MyTaskPage() {
  const [tasks, setTasks] = useState<Task[]>([...]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);

  const teamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
    { id: 'user-2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
  ];

  return (
    <div>
      <TaskSearch
        tasks={tasks}
        onFilteredTasks={setFilteredTasks}
        teamMembers={teamMembers}
        currentUserId="user-1"
      />

      {/* Render filtered tasks */}
      <TaskList tasks={filteredTasks} />
    </div>
  );
}
```

## Props

### TaskSearch Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tasks` | `Task[]` | Required | Array of tasks to search and filter |
| `onFilteredTasks` | `(tasks: Task[]) => void` | Required | Callback when filtered tasks change |
| `teamMembers` | `TeamMember[]` | Required | Team members for assignee filter |
| `currentUserId` | `string` | Required | Current user ID for "My tasks" preset |
| `syncWithURL` | `boolean` | `true` | Enable URL state synchronization |
| `showPresets` | `boolean` | `true` | Show preset filter buttons |
| `compact` | `boolean` | `false` | Enable compact mode for narrow layouts |
| `className` | `string` | `undefined` | Custom CSS class name |

### useTaskSearch Hook

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tasks` | `Task[]` | Required | Array of tasks to filter |
| `teamMembers` | `TeamMember[]` | Required | Team members list |
| `currentUserId` | `string` | Required | Current user ID |
| `options.syncWithURL` | `boolean` | `true` | Enable URL state sync |
| `options.debounceDelay` | `number` | `300` | Search debounce delay (ms) |
| `options.initialSort` | `SortOption` | `'recent'` | Initial sort option |

## Data Types

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

type SortOption =
  | 'recent'
  | 'title-asc'
  | 'title-desc'
  | 'due-date'
  | 'priority'
  | 'status';

type DueDateFilter =
  | 'overdue'
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'no-date'
  | null;
```

## Advanced Examples

### Using the Hook Directly

For custom UI implementations:

```tsx
import { useTaskSearch } from '@/hooks/useTaskSearch';

function CustomSearch() {
  const {
    filteredTasks,
    filters,
    updateFilter,
    toggleFilter,
    clearAllFilters,
    activeFilterCount,
    resultCount,
    applyPreset,
  } = useTaskSearch(tasks, teamMembers, currentUserId, {
    syncWithURL: false,
    debounceDelay: 500,
    initialSort: 'priority',
  });

  return (
    <div>
      {/* Custom search UI */}
      <input
        value={filters.query}
        onChange={(e) => updateFilter('query', e.target.value)}
      />

      <button onClick={() => applyPreset('my-tasks')}>
        My Tasks
      </button>

      <p>{resultCount} tasks found</p>
    </div>
  );
}
```

### Compact Mode for Sidebars

```tsx
<TaskSearch
  tasks={tasks}
  onFilteredTasks={setFilteredTasks}
  teamMembers={teamMembers}
  currentUserId={currentUser.id}
  compact={true}
  showPresets={false}
  className="max-w-md"
/>
```

### Without URL Synchronization (for modals)

```tsx
<TaskSearch
  tasks={tasks}
  onFilteredTasks={setFilteredTasks}
  teamMembers={teamMembers}
  currentUserId={currentUser.id}
  syncWithURL={false}
/>
```

## Filter Types

### Status Filters
- **To Do**: Tasks not yet started
- **In Progress**: Tasks currently being worked on
- **Review**: Tasks awaiting review
- **Completed**: Finished tasks

### Priority Filters
- **Low**: Non-urgent tasks
- **Medium**: Standard priority
- **High**: Important tasks
- **Critical**: Urgent, high-impact tasks

### Due Date Filters
- **Overdue**: Past due date and not completed
- **Today**: Due today
- **This Week**: Due within 7 days
- **This Month**: Due within current month
- **No Date**: Tasks without a due date

### Preset Filters

Quick access buttons that apply multiple filters:

- **My Tasks**: Tasks assigned to current user (excluding completed)
- **Overdue**: Past due date and not completed
- **High Priority**: High or critical priority tasks
- **In Progress**: Tasks currently in progress

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` or `Ctrl+K` | Focus search input |
| `Tab` | Navigate through filters |
| `Enter` | Activate focused filter button |
| `Escape` | Close filter panel (when focused) |

## URL State Synchronization

When enabled, filters are reflected in the URL query parameters:

```
/tasks?q=authentication&status=in-progress&priority=high&sort=due-date
```

This allows users to:
- Bookmark filtered views
- Share links to specific filter combinations
- Use browser back/forward navigation
- Deep link to filtered states

### URL Parameter Format

| Parameter | Type | Example |
|-----------|------|---------|
| `q` | string | `q=authentication` |
| `status` | array | `status=todo&status=in-progress` |
| `priority` | array | `priority=high&priority=critical` |
| `assignee` | array | `assignee=user-1&assignee=user-2` |
| `due` | string | `due=overdue` |
| `creator` | array | `creator=user-1` |
| `sort` | string | `sort=priority` |

## Accessibility

The component is WCAG 2.1 Level A compliant:

### Screen Reader Support
- Semantic HTML with proper roles
- ARIA labels on all interactive elements
- Live regions for dynamic content updates
- Descriptive button labels

### Keyboard Navigation
- Full keyboard access to all features
- Visible focus indicators
- Logical tab order
- Keyboard shortcuts for common actions

### Focus Management
- Search input auto-focuses on `Cmd+K`
- Focus preserved when toggling panels
- Focus trapped in modal-like experiences

## Performance Optimization

### Debouncing
Search queries are debounced by 300ms to prevent excessive filtering:

```typescript
const debouncedQuery = useDebounce(filters.query, 300);
```

### Memoization
Expensive calculations are memoized:

```typescript
const filteredTasks = useMemo(() => {
  // Complex filtering logic
}, [tasks, filters]);
```

### URL Updates
URL changes use `replace: true` to avoid polluting browser history:

```typescript
setSearchParams(params, { replace: true });
```

## Styling & Theming

The component uses Flux Studio's design system:

- **Colors**: Primary, secondary, neutral, error, success, warning, info
- **Spacing**: Consistent padding and margins
- **Typography**: Font sizes, weights from design system
- **Borders**: Rounded corners and border colors
- **Shadows**: Subtle shadows for depth

### Custom Styling

Override with className prop:

```tsx
<TaskSearch
  {...props}
  className="custom-search-wrapper"
/>
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Comprehensive test suite included:

```bash
npm test src/components/tasks/TaskSearch.test.tsx
```

Test coverage includes:
- Hook filtering logic
- Component rendering
- User interactions
- Accessibility compliance
- Edge cases

## Troubleshooting

### Search not working
- Check that `tasks` prop is an array
- Verify `onFilteredTasks` callback is defined
- Ensure debounce delay hasn't been set too high

### Filters not applying
- Verify filter values match task data types
- Check for typos in status/priority values
- Ensure tasks have required properties

### URL sync not working
- Confirm `syncWithURL` is `true` (default)
- Check that component is wrapped in Router
- Verify browser supports URL API

### Performance issues
- Reduce debounce delay if too slow
- Check if task array is very large (>1000 items)
- Consider pagination for large datasets

## Migration Guide

### From TaskListView Filters

The TaskListView component had basic filtering. TaskSearch provides enhanced functionality:

**Before:**
```tsx
<TaskListView
  tasks={tasks}
  // filters were internal
/>
```

**After:**
```tsx
<TaskSearch
  tasks={tasks}
  onFilteredTasks={setFilteredTasks}
  teamMembers={teamMembers}
  currentUserId={userId}
/>
<TaskListView tasks={filteredTasks} />
```

## Future Enhancements

Potential improvements for future sprints:

- [ ] Saved search presets (custom user-defined filters)
- [ ] Search history and suggestions
- [ ] Advanced date range picker
- [ ] Tag-based filtering
- [ ] Export filtered results
- [ ] Bulk actions on filtered tasks
- [ ] Filter templates

## Contributing

When modifying this component:

1. Update TypeScript types in `useTaskSearch.ts`
2. Add tests for new features
3. Update this documentation
4. Follow Flux Design Language principles
5. Ensure accessibility compliance
6. Test on mobile devices

## Support

For questions or issues:
- Check example files in `TaskSearch.example.tsx`
- Review test cases in `TaskSearch.test.tsx`
- Contact the Flux Studio development team

## License

Copyright © 2025 Flux Studio. All rights reserved.
