import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerActivationConstraint,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  AlertCircle,
  Plus,
  GripVertical,
} from 'lucide-react';
import type { Task } from '@/hooks/useTasks';

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onTaskCreate: (status: Task['status']) => void;
  loading?: boolean;
}

interface Column {
  id: Task['status'];
  label: string;
  color: string;
  headerBg: string;
}

// Column configuration
const COLUMNS: Column[] = [
  {
    id: 'todo',
    label: 'To Do',
    color: 'bg-neutral-50',
    headerBg: 'bg-neutral-100 border-neutral-300',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-50',
    headerBg: 'bg-blue-100 border-blue-300',
  },
  {
    id: 'review',
    label: 'Review',
    color: 'bg-purple-50',
    headerBg: 'bg-purple-100 border-purple-300',
  },
  {
    id: 'completed',
    label: 'Completed',
    color: 'bg-green-50',
    headerBg: 'bg-green-100 border-green-300',
  },
];

// Priority color mapping
const PRIORITY_STYLES = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

// Sortable Task Card Component
interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  isDragging?: boolean;
}

const SortableTaskCard: React.FC<TaskCardProps & { id: string }> = ({
  task,
  onClick,
  id,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onClick={onClick}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// Task Card Component
interface TaskCardInternalProps extends TaskCardProps {
  dragHandleProps?: Record<string, unknown>;
}

const TaskCard: React.FC<TaskCardInternalProps> = ({
  task,
  onClick,
  isDragging = false,
  dragHandleProps,
}) => {
  // Check if task is overdue
  const isOverdue = useMemo(() => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }, [task.dueDate, task.status]);

  // Format due date
  const formattedDueDate = useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [task.dueDate]);

  return (
    <button
      type="button"
      className={`
        bg-white rounded-lg border border-neutral-200 p-3 mb-2
        shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left w-full
        ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}
      `}
      onClick={() => onClick(task)}
      aria-label={`Task: ${task.title}. Status: ${task.status}. Priority: ${task.priority}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...dragHandleProps}
          className="mt-1 text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Drag to move task"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-neutral-900 mb-2 line-clamp-2">
            {task.title}
          </h4>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Badge */}
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                ${PRIORITY_STYLES[task.priority]}
              `}
            >
              {task.priority}
            </span>

            {/* Due Date */}
            {task.dueDate && (
              <span
                className={`
                  inline-flex items-center gap-1 text-xs
                  ${isOverdue ? 'text-red-600 font-medium' : 'text-neutral-600'}
                `}
              >
                <Calendar size={12} />
                {formattedDueDate}
                {isOverdue && <AlertCircle size={12} />}
              </span>
            )}

            {/* Assignee Avatar */}
            {task.assignedTo && (
              <div
                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                title={`Assigned to ${task.assignedTo}`}
              >
                {task.assignedTo.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// Kanban Column Component
interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}) => {
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-neutral-200 shadow-sm">
      {/* Column Header */}
      <div
        className={`
          px-4 py-3 border-b-2 rounded-t-lg
          ${column.headerBg}
        `}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900">
            {column.label}
            <span className="ml-2 text-sm font-normal text-neutral-600">
              ({tasks.length})
            </span>
          </h3>
          <button
            onClick={onAddTask}
            className="p-1 hover:bg-white/50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Add task to ${column.label}`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Column Content - Scrollable */}
      <div
        className={`flex-1 overflow-y-auto p-3 ${column.color}`}
        style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400">
              <p className="text-sm">No tasks</p>
              <button
                onClick={onAddTask}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Add first task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                id={task.id}
                task={task}
                onClick={onTaskClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// Main Kanban Board Component
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projectId: _projectId,
  tasks,
  onTaskUpdate,
  onTaskClick,
  onTaskCreate,
  loading = false,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);

  // Update optimistic state when props change
  React.useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Task['status'], Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    };

    optimisticTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [optimisticTasks]);

  // Setup sensors with activation constraints for better UX
  const pointerActivationConstraint: PointerActivationConstraint = {
    distance: 8, // 8px of movement required before drag starts
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: pointerActivationConstraint,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = optimisticTasks.find((t) => t.id === active.id);
    setActiveTask(task || null);

    // Announce to screen readers
    if (task) {
      const announcement = `Picked up task: ${task.title}. Current status: ${task.status}. Use arrow keys to move between columns.`;
      announceToScreenReader(announcement);
    }
  };

  // Handle drag over (optional - for visual feedback)
  const handleDragOver = (_event: DragOverEvent) => {
    // Could add visual feedback here if needed
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active: _active, over } = event;

    if (!over || !activeTask) {
      setActiveTask(null);
      return;
    }

    // Determine new status based on which column/task we dropped over
    const overTask = optimisticTasks.find((t) => t.id === over.id);
    const newStatus = overTask?.status || activeTask.status;

    // If status hasn't changed, no need to update
    if (newStatus === activeTask.status) {
      setActiveTask(null);
      return;
    }

    // Optimistic update
    const previousTasks = [...optimisticTasks];
    const updatedTasks = optimisticTasks.map((task) =>
      task.id === activeTask.id ? { ...task, status: newStatus } : task
    );
    setOptimisticTasks(updatedTasks);

    // Announce to screen readers
    const announcement = `Moved task: ${activeTask.title} to ${newStatus}`;
    announceToScreenReader(announcement);

    try {
      // API call to update task
      await onTaskUpdate(activeTask.id, { status: newStatus });

      // Success notification (optional - could add toast here)
      announceToScreenReader(`Successfully updated task status`);
    } catch (error) {
      // Rollback on error
      setOptimisticTasks(previousTasks);
      announceToScreenReader(`Failed to update task. Changes reverted.`);
      console.error('Failed to update task:', error);

      // Could show error toast here
    } finally {
      setActiveTask(null);
    }
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveTask(null);
    announceToScreenReader('Drag cancelled');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-neutral-600">Loading kanban board...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Kanban Board Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        role="region"
        aria-label="Kanban board"
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
            onAddTask={() => onTaskCreate(column.id)}
          />
        ))}
      </div>

      {/* Drag Overlay - Shows dragging task */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} onClick={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>

      {/* Screen Reader Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="kanban-announcements"
      />
    </DndContext>
  );
};

// Utility: Announce to screen readers
function announceToScreenReader(message: string) {
  const liveRegion = document.getElementById('kanban-announcements');
  if (liveRegion) {
    liveRegion.textContent = message;
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
}

export default KanbanBoard;
