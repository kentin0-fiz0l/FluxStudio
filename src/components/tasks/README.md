# Task Detail Modal Component

A production-ready, fully accessible modal component for viewing and editing tasks in Flux Studio's Sprint 2 project management system.

## Features

### Core Functionality
- **Create & Edit Tasks**: Unified interface for creating new tasks or editing existing ones
- **Rich Text Editor**: TipTap-powered WYSIWYG editor with formatting toolbar
- **Form Validation**: Comprehensive client-side validation with inline error messages
- **Auto-save**: Editor content saves automatically on blur
- **Character Limits**: Visual indicators for title (200 chars) and description (2000 chars)

### User Experience
- **Keyboard Shortcuts**:
  - `Cmd/Ctrl + S`: Save task
  - `Escape`: Close modal
  - `Tab/Shift+Tab`: Navigate through fields
- **Loading States**: Skeleton screens and disabled inputs during save/delete
- **Confirmation Dialogs**: Destructive actions require confirmation
- **Screen Reader Support**: Full ARIA labels and live regions

### Accessibility (WCAG 2.1 Level A)
- ✅ Focus trap keeps keyboard navigation within modal
- ✅ Focus management (auto-focus title input on open)
- ✅ Keyboard navigation for all interactive elements
- ✅ Screen reader announcements for actions
- ✅ ARIA labels, roles, and properties
- ✅ Semantic HTML structure
- ✅ Visual and auditory feedback for all actions

## Installation

The component is already integrated into the Flux Studio codebase. Required dependencies:

```json
{
  "@tiptap/react": "^3.7.2",
  "@tiptap/starter-kit": "^3.7.2",
  "@tiptap/extension-placeholder": "^3.7.2",
  "@radix-ui/react-dialog": "^1.1.6",
  "@radix-ui/react-alert-dialog": "^1.1.6",
  "@radix-ui/react-select": "^2.1.6",
  "lucide-react": "^0.487.0"
}
```

## Usage

### Basic Usage

```tsx
import { TaskDetailModal, Task, TeamMember } from '@/components/tasks/TaskDetailModal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  const handleSave = async (taskId: string | null, taskData: Partial<Task>) => {
    // Save to API
    const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: taskId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    // Handle response...
  };

  const handleDelete = async (taskId: string) => {
    // Delete from API
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Task</button>

      <TaskDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId="proj_123"
        task={task}
        onSave={handleSave}
        onDelete={handleDelete}
        teamMembers={teamMembers}
      />
    </>
  );
}
```

### Create Mode vs Edit Mode

```tsx
// Edit existing task
<TaskDetailModal
  task={existingTask}  // Pass task object
  // ...other props
/>

// Create new task
<TaskDetailModal
  task={null}  // Pass null for create mode
  // ...other props
/>
```

## API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Called when modal should close |
| `projectId` | `string` | ✅ | ID of the parent project |
| `task` | `Task \| null` | ✅ | Task to edit (null for create mode) |
| `onSave` | `(taskId: string \| null, taskData: Partial<Task>) => Promise<void>` | ✅ | Called when task is saved |
| `onDelete` | `(taskId: string) => Promise<void>` | ✅ | Called when task is deleted |
| `teamMembers` | `TeamMember[]` | ✅ | List of team members for assignee dropdown |

### Types

#### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;  // HTML string from TipTap
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;  // User ID
  dueDate: string | null;      // ISO8601 format
  createdBy: string;           // User ID
  createdAt: string;           // ISO8601 format
  updatedAt: string;           // ISO8601 format
  completedAt: string | null;  // ISO8601 format
}
```

#### TeamMember

```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
}
```

## Validation Rules

### Title
- ✅ Required (cannot be empty)
- ✅ 1-200 characters
- ❌ Error shown inline with focus on save attempt

### Description
- ⚠️ Optional
- ✅ Max 2000 characters (visual warning at limit)
- ℹ️ HTML content from TipTap editor

### Due Date
- ⚠️ Optional
- ✅ Must be today or in the future
- ❌ Past dates rejected with inline error

### Status
- ✅ Required (dropdown)
- ✅ One of: todo, in-progress, review, completed

### Priority
- ✅ Required (dropdown)
- ✅ One of: low, medium, high, critical

### Assignee
- ⚠️ Optional (can be unassigned)
- ✅ Must be valid team member ID

## Rich Text Editor

The modal includes a TipTap-based rich text editor with the following features:

### Toolbar Buttons
- **Bold** (`Cmd/Ctrl + B`)
- **Italic** (`Cmd/Ctrl + I`)
- **Bullet List**
- **Numbered List**
- **Link** (prompts for URL)

### Markdown Shortcuts
TipTap supports common markdown shortcuts:
- `**bold**` → **bold**
- `*italic*` → *italic*
- `- ` → Bullet list
- `1. ` → Numbered list

### Content Format
The editor outputs HTML, which is stored in the `description` field:

```html
<p>Task description with <strong>bold</strong> and <em>italic</em> text.</p>
<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save task |
| `Escape` | Close modal (if not editing) |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |
| `Cmd/Ctrl + B` | Bold (in editor) |
| `Cmd/Ctrl + I` | Italic (in editor) |

## Accessibility Features

### Screen Reader Support
- All form fields have proper labels
- Error messages are announced
- Success/failure messages are announced
- ARIA live regions for dynamic content
- Descriptive `aria-label` attributes

### Focus Management
- Focus automatically moves to title input on modal open
- Focus is trapped within modal (Tab/Shift+Tab cycles through modal)
- Focus returns to trigger element on close
- Error fields receive focus on validation failure

### Keyboard Navigation
- All interactive elements accessible via keyboard
- Visual focus indicators on all focusable elements
- Logical tab order through form
- Escape key closes modal

### Visual Indicators
- Clear error messages in red
- Character count indicators
- Loading spinners for async actions
- Disabled state for form during save/delete

## Error Handling

### Client-side Validation
Validation occurs on:
1. Form submission (Save button click)
2. Field blur (individual field validation)
3. Real-time character counting

### Server Errors
Handle API errors in `onSave` and `onDelete` callbacks:

```tsx
const handleSave = async (taskId: string | null, taskData: Partial<Task>) => {
  try {
    const response = await fetch(/* ... */);

    if (!response.ok) {
      throw new Error('Save failed');
    }

    // Success handling...
  } catch (error) {
    console.error('Error saving task:', error);
    // Error is caught internally by modal
    throw error; // Re-throw to show error state
  }
};
```

## Styling

The component uses Tailwind CSS and follows Flux Studio's design system:

- Primary colors: `primary-500`, `primary-600`, etc.
- Error colors: `error-500`, `error-600`, etc.
- Success colors: `success-500`, `success-600`, etc.
- Neutral colors: `neutral-100` through `neutral-900`

### Customization

Override styles using `className` prop (component uses `cn()` utility for merging):

```tsx
<TaskDetailModal
  // ...props
  className="custom-modal-class"
/>
```

## Testing

### Unit Tests

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskDetailModal } from './TaskDetailModal';

test('validates required title field', async () => {
  const { getByLabelText, getByText } = render(
    <TaskDetailModal
      isOpen={true}
      task={null}
      // ...other props
    />
  );

  const saveButton = getByText('Create Task');
  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });
});
```

### Integration Tests

```tsx
test('saves task successfully', async () => {
  const mockSave = jest.fn().mockResolvedValue(undefined);

  render(
    <TaskDetailModal
      isOpen={true}
      task={null}
      onSave={mockSave}
      // ...other props
    />
  );

  // Fill in form
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'New Task' },
  });

  // Submit
  fireEvent.click(screen.getByText('Create Task'));

  await waitFor(() => {
    expect(mockSave).toHaveBeenCalledWith(null, {
      title: 'New Task',
      // ...other fields
    });
  });
});
```

## Performance

### Optimizations
- TipTap editor uses React memoization
- Form state updates are debounced for character counting
- API calls only occur on explicit save action
- Modal content is conditionally rendered (not mounted when closed)

### Bundle Size
- TipTap adds ~100KB (gzipped) to bundle
- Radix UI primitives add ~30KB (gzipped) total
- Consider code splitting for optimal load times

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

## Troubleshooting

### Editor Not Displaying
Ensure TipTap dependencies are installed:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

### Focus Issues
Check that no parent component is preventing focus:
```tsx
<Dialog modal={true}>  {/* Ensure modal is true */}
```

### Validation Not Working
Verify date format is ISO8601:
```tsx
// Correct
dueDate: "2025-11-01T00:00:00Z"

// Incorrect
dueDate: "11/01/2025"
```

## Related Components

- `Dialog` - Base modal component (Radix UI)
- `AlertDialog` - Confirmation dialog for delete action
- `Select` - Dropdown component for status/priority/assignee
- `Input` - Text input for title and date
- `Button` - Action buttons (Save, Delete, Cancel)
- `Label` - Form labels with proper semantics

## API Integration Points

### GET /api/projects/:projectId/tasks/:taskId
Fetch task data (handled by parent component)

### PUT /api/projects/:projectId/tasks/:taskId
Update existing task (called via `onSave`)

### POST /api/projects/:projectId/tasks
Create new task (called via `onSave` with `taskId: null`)

### DELETE /api/projects/:projectId/tasks/:taskId
Delete task (called via `onDelete`)

## Future Enhancements

Potential improvements for future sprints:

1. **Attachments**: File upload support
2. **Comments**: Task discussion thread
3. **Subtasks**: Hierarchical task breakdown
4. **Labels/Tags**: Custom categorization
5. **Time Tracking**: Start/stop timer for tasks
6. **Activity History**: Audit log of changes
7. **Mentions**: @mention team members in description
8. **Templates**: Pre-filled task templates
9. **Recurring Tasks**: Automatic task creation
10. **Dependencies**: Task relationships (blocks, blocked by)

## License

Proprietary - Flux Studio

## Support

For questions or issues, contact the Flux Studio development team.
