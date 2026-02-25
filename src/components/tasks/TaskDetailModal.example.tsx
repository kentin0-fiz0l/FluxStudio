/**
 * Task Detail Modal - Example Usage
 *
 * This file demonstrates how to use the TaskDetailModal component
 * in various scenarios.
 */

import React, { useState } from 'react';
import { TaskDetailModal, Task, TeamMember } from './TaskDetailModal';

// ============================================================================
// Mock Data
// ============================================================================

const mockTeamMembers: TeamMember[] = [
  { id: 'user_1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  { id: 'user_2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
  { id: 'user_3', name: 'Carol Davis', email: 'carol@fluxstudio.com' },
  { id: 'user_4', name: 'David Wilson', email: 'david@fluxstudio.com' },
];

const mockTask: Task = {
  id: 'task_123',
  title: 'Design new landing page',
  description: '<p>Create a modern, responsive landing page with:</p><ul><li>Hero section</li><li>Feature showcase</li><li>Call-to-action</li></ul>',
  status: 'in_progress',
  priority: 'high',
  assignedTo: 'user_1',
  dueDate: '2025-11-01T00:00:00Z',
  createdBy: 'user_2',
  createdAt: '2025-10-01T10:30:00Z',
  updatedAt: '2025-10-15T14:20:00Z',
  completedAt: null,
};

// ============================================================================
// Example 1: Edit Existing Task
// ============================================================================

export const EditTaskExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (_taskId: string | null, _taskData: Partial<Task>) => {

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In real app, make API request:
    // const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(taskData),
    // });
    // const updatedTask = await response.json();
  };

  const handleDelete = async (_taskId: string) => {

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In real app, make API request:
    // await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
    //   method: 'DELETE',
    // });
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Edit Task</button>

      <TaskDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId="proj_456"
        task={mockTask}
        onSave={handleSave}
        onDelete={handleDelete}
        teamMembers={mockTeamMembers}
      />
    </div>
  );
};

// ============================================================================
// Example 2: Create New Task
// ============================================================================

export const CreateTaskExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (_taskId: string | null, _taskData: Partial<Task>) => {

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In real app, make API request:
    // const response = await fetch(`/api/projects/${projectId}/tasks`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(taskData),
    // });
    // const newTask = await response.json();
  };

  const handleDelete = async (_taskId: string) => {
    // Not used in create mode
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Create New Task</button>

      <TaskDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId="proj_456"
        task={null} // null = create mode
        onSave={handleSave}
        onDelete={handleDelete}
        teamMembers={mockTeamMembers}
      />
    </div>
  );
};

// ============================================================================
// Example 3: Full Integration with Task List
// ============================================================================

export const TaskListWithModalExample: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([mockTask]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleSave = async (taskId: string | null, taskData: Partial<Task>) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (taskId) {
      // Update existing task
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
            : task
        )
      );
    } else {
      // Create new task
      const newTask: Task = {
        id: `task_${Date.now()}`,
        title: taskData.title!,
        description: taskData.description || '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assignedTo: taskData.assignedTo || null,
        dueDate: taskData.dueDate || null,
        createdBy: 'current_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };
      setTasks((prev) => [...prev, newTask]);
    }
  };

  const handleDelete = async (taskId: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={handleCreateTask}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + New Task
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            role="button"
            tabIndex={0}
            onClick={() => handleOpenTask(task)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenTask(task); } }}
            className="p-4 border rounded cursor-pointer hover:bg-gray-50"
          >
            <h3 className="font-semibold">{task.title}</h3>
            <div className="flex gap-2 mt-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-gray-100 rounded">{task.status}</span>
              <span className="px-2 py-1 bg-gray-100 rounded">{task.priority}</span>
            </div>
          </div>
        ))}
      </div>

      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId="proj_456"
        task={selectedTask}
        onSave={handleSave}
        onDelete={handleDelete}
        teamMembers={mockTeamMembers}
      />
    </div>
  );
};

// ============================================================================
// Example 4: With API Integration
// ============================================================================

export const TaskModalWithAPIExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const projectId = 'proj_456';

  // Load task from API
  const loadTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}`
      );
      const data = await response.json();
      setTask(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save task to API
  const handleSave = async (taskId: string | null, taskData: Partial<Task>) => {
    const url = taskId
      ? `/api/projects/${projectId}/tasks/${taskId}`
      : `/api/projects/${projectId}/tasks`;

    const method = taskId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error('Failed to save task');
    }

    const savedTask = await response.json();
    return savedTask;
  };

  // Delete task from API
  const handleDelete = async (taskId: string) => {
    const response = await fetch(
      `/api/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
  };

  // Load team members from API
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  React.useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        const data = await response.json();
        setTeamMembers(data);
      } catch (error) {
        console.error('Failed to load team members:', error);
      }
    };

    loadTeamMembers();
  }, [projectId]);

  return (
    <div>
      <button onClick={() => loadTask('task_123')} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Open Task'}
      </button>

      <TaskDetailModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={projectId}
        task={task}
        onSave={handleSave}
        onDelete={handleDelete}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default {
  EditTaskExample,
  CreateTaskExample,
  TaskListWithModalExample,
  TaskModalWithAPIExample,
};
