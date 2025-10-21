/**
 * Task Components - Exports
 *
 * Central export for all task-related components.
 */

export { TaskListView, type Task, type TaskListViewProps } from './TaskListView';
export { TaskDetailModal, type TeamMember, type TaskDetailModalProps } from './TaskDetailModal';
export { KanbanBoard } from './KanbanBoard';

// Re-export common types for convenience
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
