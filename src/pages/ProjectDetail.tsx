/**
 * ProjectDetail Page - Flux Studio Sprint 2 Integration
 *
 * Complete project detail page with integrated task management.
 * WCAG 2.1 Level A Compliant - Accessibility improvements include:
 * - Full keyboard navigation for tabs (Arrow keys, Home, End)
 * - ARIA labels and live regions for dynamic content
 * - Focus management between tabs
 * - Proper heading hierarchy
 * - Screen reader announcements for tab changes
 * - Semantic HTML and ARIA roles
 *
 * Sprint 2 Features:
 * - Task List View with sorting/filtering
 * - Kanban Board with drag-and-drop
 * - Task Detail Modal with rich text editing
 * - Real-time updates via WebSocket
 * - Activity Feed with detailed history
 * - Presence indicators
 * - View mode persistence
 *
 * Route: /projects/:id
 *
 * Tab Structure:
 * - Overview: Project metrics, description, team, activity
 * - Tasks: Integrated task management (List/Kanban views)
 * - Files: Project files and documents (placeholder)
 * - Messages: Integrated project chat
 */

import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  MessageSquare,
  ArrowLeft,
  Settings,
  MoreVertical,
  List,
  Columns,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button, Badge, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { ProjectOverviewTab } from '@/components/projects/ProjectOverviewTab';
import { ProjectMessagesTab } from '@/components/projects/ProjectMessagesTab';
import { TaskListView } from '@/components/tasks/TaskListView';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { ActivityFeed } from '@/components/tasks/ActivityFeed';
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  Task,
} from '@/hooks/useTasks';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

type ViewMode = 'list' | 'kanban';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Quick Stats Widget - Shows task statistics
 */
const QuickStats: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, review, todo, completionRate };
  }, [tasks]);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
      <h2 className="text-lg font-semibold mb-4 text-neutral-900">Quick Stats</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">Total Tasks</span>
          <span className="font-semibold text-lg text-neutral-900">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">Completed</span>
          <span className="font-semibold text-success-600">{stats.completed}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">In Progress</span>
          <span className="font-semibold text-blue-600">{stats.inProgress}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">In Review</span>
          <span className="font-semibold text-purple-600">{stats.review}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">To Do</span>
          <span className="font-semibold text-neutral-600">{stats.todo}</span>
        </div>
        <div className="pt-3 border-t border-neutral-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-neutral-600 text-sm font-medium">Completion Rate</span>
            <span className="font-semibold text-neutral-900">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-success-600 h-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
              role="progressbar"
              aria-valuenow={stats.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${stats.completionRate}% completion rate`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Presence Indicators - Shows who's currently viewing
 */
const PresenceIndicators: React.FC<{
  users: Array<{ id: string; name: string; email?: string }>;
}> = ({ users }) => {
  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex -space-x-2" role="list" aria-label="Users currently viewing">
      {users.slice(0, 5).map((user) => (
        <div
          key={user.id}
          className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm"
          title={user.name}
          role="listitem"
          aria-label={`${user.name} is viewing`}
        >
          {getInitials(user.name)}
        </div>
      ))}
      {users.length > 5 && (
        <div
          className="w-8 h-8 rounded-full bg-neutral-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm"
          title={`${users.length - 5} more user${users.length - 5 > 1 ? 's' : ''}`}
          role="listitem"
        >
          +{users.length - 5}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();

  // ============================================================================
  // State Management
  // ============================================================================

  const [activeTab, setActiveTab] = React.useState('overview');
  const [unreadCount] = React.useState(0); // TODO: Wire up to messaging context

  // Task view state
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const saved = localStorage.getItem('taskViewMode');
    return (saved as ViewMode) || 'list';
  });

  // Task modal state
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCreateMode, setIsCreateMode] = React.useState(false);

  // Refs for keyboard navigation
  const tabListRef = React.useRef<HTMLDivElement>(null);
  const tabContentRef = React.useRef<HTMLDivElement>(null);

  // Tab labels for screen reader announcements
  const tabLabels: Record<string, string> = {
    overview: 'Overview',
    tasks: 'Tasks',
    files: 'Files',
    messages: 'Messages',
  };

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Find the current project
  const project = React.useMemo(
    () => projects.find((p) => p.id === id),
    [projects, id]
  );

  // Fetch tasks with React Query
  const { data: tasks = [], isLoading: tasksLoading } = useTasksQuery(id);

  // Task mutations
  const createTask = useCreateTaskMutation(id || '');
  const updateTask = useUpdateTaskMutation(id || '');
  const deleteTask = useDeleteTaskMutation(id || '');

  // Real-time updates
  const { onlineUsers } = useTaskRealtime(id, {
    disableNotifications: false,
  });

  // ============================================================================
  // Persist View Mode
  // ============================================================================

  React.useEffect(() => {
    localStorage.setItem('taskViewMode', viewMode);
  }, [viewMode]);

  // ============================================================================
  // Tab Focus Management
  // ============================================================================

  React.useEffect(() => {
    if (tabContentRef.current) {
      tabContentRef.current.focus();
    }
  }, [activeTab]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsCreateMode(true);
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsCreateMode(false);
    setIsTaskModalOpen(true);
  };

  const handleTaskSave = async (taskId: string | null, taskData: Partial<Task>) => {
    try {
      if (taskId) {
        await updateTask.mutateAsync({ taskId, updates: taskData });
      } else {
        await createTask.mutateAsync(taskData);
      }
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      // Error is handled by mutation hooks with toast
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      // Error is handled by mutation hooks with toast
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask.mutateAsync({ taskId, updates });
    } catch (error) {
      console.error('Error updating task:', error);
      // Error is handled by mutation hooks with toast
    }
  };

  // ============================================================================
  // Status Badge Variants
  // ============================================================================

  const statusVariants = {
    planning: 'info',
    in_progress: 'warning',
    on_hold: 'default',
    completed: 'success',
    cancelled: 'error',
  } as const;

  const priorityVariants = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    urgent: 'error',
  } as const;

  // ============================================================================
  // Loading State
  // ============================================================================

  if (projectsLoading) {
    return (
      <DashboardLayout
        user={user || undefined}
        breadcrumbs={[
          { label: 'Projects', path: '/projects' },
          { label: 'Loading...', path: '#' },
        ]}
      >
        <div className="flex items-center justify-center h-full" role="status" aria-live="polite">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
            <p className="text-neutral-600">Loading project details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // Not Found State
  // ============================================================================

  if (!project) {
    return (
      <DashboardLayout
        user={user || undefined}
        breadcrumbs={[
          { label: 'Projects', path: '/projects' },
          { label: 'Not Found', path: '#' },
        ]}
      >
        <div className="flex items-center justify-center h-full" role="alert">
          <Card className="max-w-md w-full p-8 text-center">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Project Not Found</h2>
            <p className="text-neutral-600 mb-6" id="not-found-description">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/projects')}
              icon={<ArrowLeft className="h-4 w-4" />}
              aria-label="Go back to projects list"
              aria-describedby="not-found-description"
            >
              Back to Projects
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[
        { label: 'Projects', path: '/projects' },
        { label: project.name, path: `/projects/${project.id}` },
      ]}
    >
      <div className="flex flex-col h-full">
        {/* Project Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/projects')}
                  className="flex-shrink-0"
                  icon={<ArrowLeft className="h-4 w-4" />}
                  aria-label="Back to projects list"
                />
                <h1 className="text-2xl font-bold text-neutral-900 truncate" id="project-title">
                  {project.name}
                </h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap ml-12" role="group" aria-label="Project information">
                <Badge variant={statusVariants[project.status]} size="md" dot>
                  <span className="sr-only">Status: </span>
                  {project.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
                <Badge variant={priorityVariants[project.priority]} size="md">
                  <span className="sr-only">Priority: </span>
                  {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                </Badge>
                <div className="flex items-center gap-2 text-sm text-neutral-600" aria-label={`${project.members?.length || 0} team members`}>
                  <div className="flex -space-x-2" aria-hidden="true">
                    {project.members?.slice(0, 3).map((memberId, index) => (
                      <div
                        key={memberId}
                        className="w-6 h-6 rounded-full bg-primary-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                      >
                        {index + 1}
                      </div>
                    ))}
                  </div>
                  <span>{project.members?.length || 0} members</span>
                </div>
                <div className="text-sm text-neutral-600" aria-label={`Project progress: ${project.progress} percent`}>
                  Progress: <span className="font-semibold text-neutral-900">{project.progress}%</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Project actions">
              {/* Presence Indicators (only show on tasks tab) */}
              {activeTab === 'tasks' && <PresenceIndicators users={onlineUsers} />}

              <Button
                variant="outline"
                size="sm"
                icon={<Settings className="h-4 w-4" />}
                aria-label="Open project settings"
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                size="icon"
                icon={<MoreVertical className="h-4 w-4" />}
                aria-label="More project options"
                aria-haspopup="menu"
              />
            </div>
          </div>
        </header>

        {/* Sticky Tab Navigation */}
        <nav className="sticky top-0 z-10 bg-white border-b" aria-label="Project sections">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
            <TabsList
              ref={tabListRef}
              className="w-full justify-start h-12 bg-transparent p-0 gap-1"
              role="tablist"
              aria-label="Project navigation tabs"
            >
              <TabsTrigger
                value="overview"
                className={cn(
                  'data-[state=active]:border-b-2 data-[state=active]:border-primary-600',
                  'rounded-none border-b-2 border-transparent h-full px-4'
                )}
                role="tab"
                aria-selected={activeTab === 'overview'}
                aria-controls="overview-panel"
                id="overview-tab"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                Overview
              </TabsTrigger>

              <TabsTrigger
                value="tasks"
                className={cn(
                  'data-[state=active]:border-b-2 data-[state=active]:border-primary-600',
                  'rounded-none border-b-2 border-transparent h-full px-4'
                )}
                role="tab"
                aria-selected={activeTab === 'tasks'}
                aria-controls="tasks-panel"
                id="tasks-tab"
                aria-label={`Tasks, ${tasks.length} items`}
              >
                <CheckSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                Tasks
                <Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">
                  {tasks.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="files"
                className={cn(
                  'data-[state=active]:border-b-2 data-[state=active]:border-primary-600',
                  'rounded-none border-b-2 border-transparent h-full px-4'
                )}
                role="tab"
                aria-selected={activeTab === 'files'}
                aria-controls="files-panel"
                id="files-tab"
                aria-label={`Files, ${project.files?.length || 0} items`}
              >
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Files
                <Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">
                  {project.files?.length || 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="messages"
                className={cn(
                  'data-[state=active]:border-b-2 data-[state=active]:border-primary-600',
                  'rounded-none border-b-2 border-transparent h-full px-4'
                )}
                role="tab"
                aria-selected={activeTab === 'messages'}
                aria-controls="messages-panel"
                id="messages-tab"
                aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
              >
                <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                Messages
                {unreadCount > 0 && (
                  <Badge variant="solidError" size="sm" className="ml-2">
                    <span className="sr-only">{unreadCount} unread</span>
                    <span aria-hidden="true">{unreadCount}</span>
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden" ref={tabContentRef} tabIndex={-1}>
          <Tabs value={activeTab} className="h-full">
            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="h-full overflow-y-auto p-6 mt-0"
              role="tabpanel"
              id="overview-panel"
              aria-labelledby="overview-tab"
              tabIndex={0}
            >
              <div role="status" aria-live="polite" className="sr-only">
                {activeTab === 'overview' ? `Showing ${tabLabels.overview} tab` : ''}
              </div>
              <ProjectOverviewTab project={project} />
            </TabsContent>

            {/* Tasks Tab - Sprint 2 Integration */}
            <TabsContent
              value="tasks"
              className="h-full mt-0"
              role="tabpanel"
              id="tasks-panel"
              aria-labelledby="tasks-tab"
              tabIndex={0}
            >
              <div role="status" aria-live="polite" className="sr-only">
                {activeTab === 'tasks' ? `Showing ${tabLabels.tasks} tab` : ''}
              </div>

              <div className="flex h-full">
                {/* Main Content Area (70%) */}
                <main className="flex-1 overflow-y-auto p-6">
                  {/* View Toggle Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-neutral-900">Tasks</h2>

                      {/* View Toggle */}
                      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            'px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-all',
                            viewMode === 'list'
                              ? 'bg-white shadow text-neutral-900'
                              : 'text-neutral-600 hover:text-neutral-900'
                          )}
                          aria-label="List view"
                          aria-pressed={viewMode === 'list'}
                        >
                          <List className="h-4 w-4" />
                          List
                        </button>
                        <button
                          onClick={() => setViewMode('kanban')}
                          className={cn(
                            'px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium transition-all',
                            viewMode === 'kanban'
                              ? 'bg-white shadow text-neutral-900'
                              : 'text-neutral-600 hover:text-neutral-900'
                          )}
                          aria-label="Kanban view"
                          aria-pressed={viewMode === 'kanban'}
                        >
                          <Columns className="h-4 w-4" />
                          Kanban
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateTask}
                      variant="primary"
                      icon={<CheckSquare className="h-4 w-4" />}
                      aria-label="Create new task"
                    >
                      New Task
                    </Button>
                  </div>

                  {/* Task Views */}
                  {viewMode === 'list' ? (
                    <TaskListView
                      projectId={id || ''}
                      tasks={tasks}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskDelete={handleTaskDelete}
                      onTaskCreate={handleCreateTask}
                      loading={tasksLoading}
                    />
                  ) : (
                    <KanbanBoard
                      projectId={id || ''}
                      tasks={tasks}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskClick={handleTaskClick}
                      onTaskCreate={handleCreateTask}
                      loading={tasksLoading}
                    />
                  )}
                </main>

                {/* Right Sidebar (30%) */}
                <aside className="w-80 border-l border-neutral-200 overflow-y-auto flex-shrink-0">
                  <div className="p-6 space-y-6">
                    {/* Quick Stats */}
                    <QuickStats tasks={tasks} />

                    {/* Activity Feed */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                      <ActivityFeed projectId={id || ''} compact maxItems={10} />
                    </div>
                  </div>
                </aside>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent
              value="files"
              className="h-full overflow-y-auto p-6 mt-0"
              role="tabpanel"
              id="files-panel"
              aria-labelledby="files-tab"
              tabIndex={0}
            >
              <div role="status" aria-live="polite" className="sr-only">
                {activeTab === 'files' ? `Showing ${tabLabels.files} tab` : ''}
              </div>
              {/* Files Tab Placeholder */}
              <Card className="max-w-2xl mx-auto p-12 text-center">
                <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  File Management Coming Soon
                </h2>
                <p className="text-neutral-600 mb-6">
                  File upload, organization, and sharing features will be available in the
                  next update. Store and manage all your project files in one place.
                </p>
                <div className="text-sm text-neutral-500" aria-label={`Current files: ${project.files?.length || 0}`}>
                  Current files: {project.files?.length || 0}
                </div>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent
              value="messages"
              className="h-full mt-0"
              role="tabpanel"
              id="messages-panel"
              aria-labelledby="messages-tab"
              tabIndex={0}
            >
              <div role="status" aria-live="polite" className="sr-only">
                {activeTab === 'messages' ? `Showing ${tabLabels.messages} tab` : ''}
              </div>
              <ProjectMessagesTab project={project} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={id || ''}
        task={isCreateMode ? null : selectedTask}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        teamMembers={[]} // TODO: Get from project members
      />
    </DashboardLayout>
  );
};

export default ProjectDetail;
