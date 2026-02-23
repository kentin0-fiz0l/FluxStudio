/**
 * ProjectDetail Page - Decomposed version
 * Sub-components in ProjectDetailHelpers.tsx and ProjectDetailTabs.tsx
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
  Layers,
  PenTool,
  Target,
  Play,
  BarChart3,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button, Badge, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { ProjectOverviewTab } from '@/components/projects/ProjectOverviewTab';
import { ProjectMessagesTab } from '@/components/projects/ProjectMessagesTab';
import { ProjectFilesTab } from '@/components/projects/ProjectFilesTab';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import {
  useTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  Task,
} from '@/hooks/useTasks';
import { useTaskRealtime } from '@/hooks/useTaskRealtime';
import { useAssets, AssetRecord } from '@/contexts/AssetsContext';
import { AssetDetailDrawer } from '@/components/assets/AssetDetailDrawer';
import { useProjectCounts } from '@/hooks/useProjectCounts';
import { useActiveProject } from '@/store';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { DocumentList } from '@/components/documents/DocumentList';
import { TiptapCollaborativeEditor } from '@/components/documents/TiptapCollaborativeEditor';
import { FormationsTab } from '@/components/projects/FormationsTab';
import { useFormations } from '@/hooks/useFormations';

import { ProjectHealthDashboard } from '@/components/analytics/ProjectHealthDashboard';
import { DeadlineRiskPanel } from '@/components/analytics/DeadlineRiskPanel';
import { TeamWorkloadPanel } from '@/components/analytics/TeamWorkloadPanel';
import { ProjectDetailSkeleton } from '@/components/loading/LoadingStates';
import { PresenceIndicators, statusVariants, priorityVariants } from './ProjectDetailHelpers';
import { TasksTabPanel, AssetsTabPanel, BoardsTabPanel } from './ProjectDetailTabs';
import type { DesignBoard, ViewMode } from './ProjectDetailTabs';

// ============================================================================
// Main Component
// ============================================================================

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const activeProjectContext = useActiveProject();
  const setActiveProject = activeProjectContext?.setActiveProject ?? (() => {});
  const isProjectFocused = activeProjectContext?.isProjectFocused ?? (() => false);

  // State
  const [activeTab, setActiveTab] = React.useState('overview');
  const { counts: projectCounts } = useProjectCounts(id);
  const messagesCount = projectCounts?.messages ?? 0;

  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const saved = localStorage.getItem('taskViewMode');
    return (saved as ViewMode) || 'list';
  });

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [isCreateMode, setIsCreateMode] = React.useState(false);
  const [activeDocumentId, setActiveDocumentId] = React.useState<number | null>(null);

  const tabListRef = React.useRef<HTMLDivElement>(null);
  const tabContentRef = React.useRef<HTMLDivElement>(null);

  const tabLabels: Record<string, string> = {
    overview: 'Overview', tasks: 'Tasks', documents: 'Documents',
    files: 'Files', assets: 'Assets', boards: 'Boards', analytics: 'Analytics', messages: 'Messages',
  };

  // Boards state
  const [boards, setBoards] = React.useState<DesignBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = React.useState(false);
  const [newBoardName, setNewBoardName] = React.useState('');
  const [showNewBoardInput, setShowNewBoardInput] = React.useState(false);

  // Formations
  const { formations } = useFormations({
    projectId: id || '',
    enabled: !!id && activeTab === 'formations'
  });

  // Assets
  const { state: assetsState, refreshAssets, deleteAsset, setSelectedAsset } = useAssets();
  const [selectedAsset, setSelectedAssetLocal] = React.useState<AssetRecord | null>(null);
  const [showAssetDrawer, setShowAssetDrawer] = React.useState(false);

  const projectAssets = React.useMemo(
    () => assetsState.assets.filter((a) => a.projectId === id),
    [assetsState.assets, id]
  );

  React.useEffect(() => {
    if (activeTab === 'assets' && id) refreshAssets({ projectId: id });
  }, [activeTab, id]);

  React.useEffect(() => {
    const fetchBoards = async () => {
      if (activeTab !== 'boards' || !id) return;
      setBoardsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/projects/${id}/boards`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) setBoards(data.boards);
        }
      } catch (error) {
        console.error('Error fetching boards:', error);
      } finally {
        setBoardsLoading(false);
      }
    };
    fetchBoards();
  }, [activeTab, id]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !id) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/projects/${id}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newBoardName.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.board) {
          setBoards((prev) => [...prev, data.board]);
          setNewBoardName('');
          setShowNewBoardInput(false);
        }
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  // Data fetching
  const project = React.useMemo(() => projects.find((p) => p.id === id), [projects, id]);
  const { data: tasks = [], isLoading: tasksLoading } = useTasksQuery(id);
  const createTask = useCreateTaskMutation(id || '');
  const updateTask = useUpdateTaskMutation(id || '');
  const deleteTask = useDeleteTaskMutation(id || '');
  const { onlineUsers } = useTaskRealtime(id, { disableNotifications: false });

  React.useEffect(() => { localStorage.setItem('taskViewMode', viewMode); }, [viewMode]);
  React.useEffect(() => { if (tabContentRef.current) tabContentRef.current.focus(); }, [activeTab]);

  // Handlers
  const handleCreateTask = () => { setSelectedTask(null); setIsCreateMode(true); setIsTaskModalOpen(true); };
  const handleTaskClick = (task: Task) => { setSelectedTask(task); setIsCreateMode(false); setIsTaskModalOpen(true); };

  const handleTaskSave = async (taskId: string | null, taskData: Partial<Task>) => {
    try {
      if (taskId) {
        await updateTask.mutateAsync({ taskId, updates: taskData });
      } else {
        if (!taskData.title) throw new Error('Task title is required');
        await createTask.mutateAsync({ ...taskData, title: taskData.title });
      }
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try { await deleteTask.mutateAsync(taskId); setIsTaskModalOpen(false); }
    catch (error) { console.error('Error deleting task:', error); }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try { await updateTask.mutateAsync({ taskId, updates }); }
    catch (error) { console.error('Error updating task:', error); }
  };

  // Loading state
  if (projectsLoading) {
    return (
      <DashboardLayout user={user || undefined} breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Loading...', path: '#' }]}>
        <ProjectDetailSkeleton />
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout user={user || undefined} breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Not Found', path: '#' }]}>
        <div className="flex items-center justify-center h-full" role="alert">
          <Card className="max-w-md w-full p-8 text-center">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Project Not Found</h2>
            <p className="text-neutral-600 mb-6" id="not-found-description">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button variant="primary" onClick={() => navigate('/projects')} icon={<ArrowLeft className="h-4 w-4" />} aria-label="Go back to projects list" aria-describedby="not-found-description">
              Back to Projects
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: project.name, path: `/projects/${project.id}` }]}
    >
      <div className="flex flex-col h-full">
        {/* Project Header */}
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="flex-shrink-0" icon={<ArrowLeft className="h-4 w-4" />} aria-label="Back to projects list" />
                <h1 className="text-2xl font-bold text-neutral-900 truncate" id="project-title">{project.name}</h1>
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
                      <div key={memberId} className="w-6 h-6 rounded-full bg-primary-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">{index + 1}</div>
                    ))}
                  </div>
                  <span>{project.members?.length || 0} members</span>
                </div>
                <div className="text-sm text-neutral-600" aria-label={`Project progress: ${project.progress} percent`}>
                  Progress: <span className="font-semibold text-neutral-900">{project.progress}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Project actions">
              <PresenceIndicators users={onlineUsers} showLabel />
              <Button
                variant={isProjectFocused(id || '') ? 'primary' : 'outline'}
                size="sm"
                icon={<Target className="h-4 w-4" />}
                onClick={() => { if (project) { setActiveProject(project.id); toast.success(`Now focused on "${project.name}"`); } }}
                aria-pressed={isProjectFocused(id || '')}
                aria-label={isProjectFocused(id || '') ? 'Project is focused' : 'Focus on this project'}
              >
                {isProjectFocused(id || '') ? 'Focused' : 'Focus'}
              </Button>
              <Button variant="outline" size="sm" icon={<Settings className="h-4 w-4" />} aria-label="Open project settings">Settings</Button>
              <Button variant="ghost" size="icon" icon={<MoreVertical className="h-4 w-4" />} aria-label="More project options" aria-haspopup="menu" />
            </div>
          </div>
        </header>

        {/* Quick Stats Bar */}
        <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span className="text-neutral-600 dark:text-neutral-400">Tasks:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {tasks.filter((t: Task) => t.status === 'completed').length}/{tasks.length}
              </span>
              <span className="text-neutral-400 dark:text-neutral-500 text-xs">completed</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <span className="text-neutral-600 dark:text-neutral-400">Progress:</span>
              <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${project.progress || 0}%` }} />
              </div>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{project.progress || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" aria-hidden="true" />
              <span className="text-neutral-600 dark:text-neutral-400">Files:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{project.files?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700" aria-label="Project sections">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
            <TabsList ref={tabListRef} className="w-full justify-start h-12 bg-transparent p-0 gap-1" role="tablist" aria-label="Project navigation tabs">
              <TabsTrigger value="overview" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'overview'} aria-controls="overview-panel" id="overview-tab">
                <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'tasks'} aria-controls="tasks-panel" id="tasks-tab" aria-label={`Tasks, ${tasks.length} items`}>
                <CheckSquare className="h-4 w-4 mr-2" aria-hidden="true" />Tasks<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{tasks.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="documents" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'documents'} aria-controls="documents-panel" id="documents-tab">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />Documents
              </TabsTrigger>
              <TabsTrigger value="files" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'files'} aria-controls="files-panel" id="files-tab" aria-label={`Files, ${project.files?.length || 0} items`}>
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />Files<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{project.files?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="assets" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'assets'} aria-controls="assets-panel" id="assets-tab" aria-label={`Assets, ${projectAssets.length} items`}>
                <Layers className="h-4 w-4 mr-2" aria-hidden="true" />Assets<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{projectAssets.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="boards" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'boards'} aria-controls="boards-panel" id="boards-tab" aria-label={`Boards, ${boards.length} items`}>
                <PenTool className="h-4 w-4 mr-2" aria-hidden="true" />Boards<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{boards.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="formations" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'formations'} aria-controls="formations-panel" id="formations-tab" aria-label={`Formations, ${formations.length} items`}>
                <Play className="h-4 w-4 mr-2" aria-hidden="true" />Formations<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{formations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="analytics" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'analytics'} aria-controls="analytics-panel" id="analytics-tab">
                <BarChart3 className="h-4 w-4 mr-2" aria-hidden="true" />Analytics
              </TabsTrigger>
              <TabsTrigger value="messages" className={cn('data-[state=active]:border-b-2 data-[state=active]:border-primary-600', 'rounded-none border-b-2 border-transparent h-full px-4')} role="tab" aria-selected={activeTab === 'messages'} aria-controls="messages-panel" id="messages-tab" aria-label={`Messages, ${messagesCount} conversations`}>
                <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />Messages<Badge variant="outline" size="sm" className="ml-2" aria-hidden="true">{messagesCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden" ref={tabContentRef} tabIndex={-1}>
          {activeTab === 'overview' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="overview-panel" aria-labelledby="overview-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.overview} tab</div>
              <ProjectOverviewTab project={project} />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="h-full" role="tabpanel" id="tasks-panel" aria-labelledby="tasks-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.tasks} tab</div>
              <TasksTabPanel
                id={id || ''}
                tasks={tasks}
                tasksLoading={tasksLoading}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onCreateTask={handleCreateTask}
                onTaskClick={handleTaskClick}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
              />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="h-full" role="tabpanel" id="documents-panel" aria-labelledby="documents-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.documents} tab</div>
              {activeDocumentId ? (
                <TiptapCollaborativeEditor projectId={project.id} documentId={activeDocumentId} onBack={() => setActiveDocumentId(null)} />
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  <DocumentList projectId={project.id} onOpenDocument={setActiveDocumentId} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="files-panel" aria-labelledby="files-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.files} tab</div>
              <ProjectFilesTab project={project} />
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="assets-panel" aria-labelledby="assets-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.assets} tab</div>
              <AssetsTabPanel
                projectAssets={projectAssets}
                loading={assetsState.loading}
                onSelectAsset={(asset) => { setSelectedAssetLocal(asset); setSelectedAsset(asset); setShowAssetDrawer(true); }}
              />
            </div>
          )}

          {activeTab === 'boards' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="boards-panel" aria-labelledby="boards-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.boards} tab</div>
              <BoardsTabPanel
                boards={boards}
                boardsLoading={boardsLoading}
                newBoardName={newBoardName}
                setNewBoardName={setNewBoardName}
                showNewBoardInput={showNewBoardInput}
                setShowNewBoardInput={setShowNewBoardInput}
                onCreateBoard={handleCreateBoard}
              />
            </div>
          )}

          {activeTab === 'formations' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="formations-panel" aria-labelledby="formations-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing formations tab</div>
              <FormationsTab projectId={id || ''} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="h-full overflow-y-auto p-6" role="tabpanel" id="analytics-panel" aria-labelledby="analytics-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.analytics} tab</div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProjectHealthDashboard projectId={id || ''} />
                </div>
                <div className="space-y-6">
                  <DeadlineRiskPanel projectId={id || ''} />
                  <TeamWorkloadPanel teamId={project.teamId || project.organizationId || ''} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="h-full" role="tabpanel" id="messages-panel" aria-labelledby="messages-tab" tabIndex={0}>
              <div role="status" aria-live="polite" className="sr-only">Showing {tabLabels.messages} tab</div>
              <ProjectMessagesTab project={project} />
            </div>
          )}
        </div>
      </div>

      <TaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projectId={id || ''}
        task={isCreateMode ? null : selectedTask}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        teamMembers={project.members?.map(id => ({ id, name: `Member ${id.slice(0, 4)}`, email: '' })) || []}
      />

      {showAssetDrawer && selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          onClose={() => { setShowAssetDrawer(false); setSelectedAssetLocal(null); }}
          onDelete={async (assetId) => { await deleteAsset(assetId); setShowAssetDrawer(false); setSelectedAssetLocal(null); }}
        />
      )}
    </DashboardLayout>
  );
};

export default ProjectDetail;
