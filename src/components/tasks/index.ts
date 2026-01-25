/**
 * Task Components - Exports
 *
 * Central export for all task-related components.
 */

// Main views
export { TaskListView, type Task, type TaskListViewProps } from './TaskListView';
export { TaskDetailModal, type TeamMember, type TaskDetailModalProps } from './TaskDetailModal';
export { KanbanBoard } from './KanbanBoard';

// Extracted components (Phase 2 refactoring)
export { TaskListControls } from './TaskListControls';
export { TaskFilterPanel, getStatusDisplay, getPriorityDisplay } from './TaskFilterPanel';
export { TaskTableHeader } from './TaskTableHeader';
export { TaskTableRow } from './TaskTableRow';
export { TaskMobileCard } from './TaskMobileCard';
export { EditableCell } from './EditableCell';

// Re-export common types for convenience
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
