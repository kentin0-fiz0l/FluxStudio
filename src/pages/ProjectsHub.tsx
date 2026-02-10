/**
 * ProjectsHub - The Primary Landing Page (3-Zone Layout)
 *
 * This is where users land after login. Projects are the primary focus.
 *
 * Zone 1 (10%): Welcome hero - orientation, not action
 * Zone 2 (60%): Projects - the main job
 * Zone 3 (30%): Activity stream - context, collapsible
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Folder,
  Users,
  Sparkles,
  LayoutGrid,
  List,
  MessageSquare,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/molecules';
import { ProjectCardSkeleton } from '@/components/loading/LoadingStates';
import { UniversalEmptyState, emptyStateConfigs } from '@/components/ui/UniversalEmptyState';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type ViewMode = 'grid' | 'list';

export function ProjectsHub() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { projects, loading } = useProjects();
  const { data: activitiesData, isLoading: activitiesLoading } = useDashboardActivities({ limit: 10 });

  // View state
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activityExpanded, setActivityExpanded] = useState(false);


  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  // Current timestamp for deadline calculations (captured once on mount)
  const [now] = useState(() => Date.now());

  // Real activity data from API
  const recentActivity = useMemo(() => {
    if (!activitiesData?.activities) return [];
    return activitiesData.activities.map((activity) => ({
      id: activity.id,
      action: activity.description || `${activity.user?.name || 'Someone'} ${activity.action}`,
      project: activity.projectName || activity.entityTitle || 'Project',
      time: activity.timestamp
        ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
        : 'Recently',
      type: activity.type,
    }));
  }, [activitiesData]);

  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Projects' }]}
      onLogout={logout}
      showSearch={false}
    >
      <div className="p-6 space-y-6">
        {/* ZONE 1: Welcome Hero (10%) - Compact, Welcoming */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {projects.length > 0
                ? `You have ${projects.length} active project${projects.length !== 1 ? 's' : ''}`
                : 'Create your first project to get started'}
            </p>
          </div>
          <Button onClick={handleCreateProject} className="gap-2" aria-label="Create new project">
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Project
          </Button>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ZONE 2: Projects (60% on desktop, 100% on mobile) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
                <Input
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-10"
                  aria-label="Search projects"
                  type="search"
                />
              </div>
              <div
                className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1"
                role="group"
                aria-label="View mode"
              >
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8"
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8"
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Projects Grid/List */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : 'space-y-3'
                  )}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : filteredProjects.length > 0 ? (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : 'space-y-3'
                  )}
                >
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProjectCard
                        project={{
                          id: project.id,
                          name: project.name,
                          description: project.description || '',
                          status: 'active',
                          progress: project.progress || 0,
                          dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
                          teamSize: project.members?.length || 1,
                          teamAvatars: [],
                          tags: (project as any).tags || [],
                        }}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                        showProgress
                        showTeam
                        showTags
                        onView={() => navigate(`/projects/${project.id}`)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : searchTerm ? (
                <Card>
                  <CardContent className="p-0">
                    <UniversalEmptyState
                      icon={Search}
                      title="No projects found"
                      description={`No projects match "${searchTerm}". Try a different search.`}
                      illustration="search"
                      primaryAction={{
                        label: 'Clear Search',
                        onClick: () => setSearchTerm(''),
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <UniversalEmptyState
                      icon={Folder}
                      {...emptyStateConfigs.projects}
                      primaryAction={{
                        label: 'Create Project',
                        icon: <Plus className="w-4 h-4" />,
                        onClick: handleCreateProject,
                      }}
                      secondaryAction={{
                        label: 'Browse Templates',
                        onClick: () => navigate('/projects/new?templates=true'),
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>
          </div>

          {/* ZONE 3: Activity Stream (30% - Collapsible on mobile) */}
          <div className="space-y-4">
            {/* Activity Card */}
            <Card>
              <CardHeader className="pb-3">
                <button
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="flex items-center justify-between w-full"
                  aria-expanded={activityExpanded}
                  aria-controls="activity-content"
                >
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    Recent Activity
                  </CardTitle>
                  <div className="lg:hidden" aria-hidden="true">
                    {activityExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {(activityExpanded || window.innerWidth >= 1024) && (
                  <motion.div
                    id="activity-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden lg:!h-auto lg:!opacity-100"
                  >
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {activitiesLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="w-2 h-2 rounded-full mt-1.5 bg-neutral-200 dark:bg-neutral-700" />
                                <div className="flex-1 space-y-1">
                                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : recentActivity.length > 0 ? (
                          recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start gap-3 text-sm"
                            >
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                                  activity.type === 'file' && 'bg-blue-500',
                                  activity.type === 'comment' && 'bg-green-500',
                                  activity.type === 'member' && 'bg-purple-500',
                                  activity.type === 'task' && 'bg-amber-500',
                                  activity.type === 'project' && 'bg-indigo-500',
                                  activity.type === 'formation' && 'bg-pink-500',
                                  activity.type === 'message' && 'bg-cyan-500',
                                  !['file', 'comment', 'member', 'task', 'project', 'formation', 'message'].includes(activity.type) && 'bg-neutral-400'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-neutral-900 dark:text-white">
                                  {activity.action}
                                </p>
                                <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                                  {activity.project} · {activity.time}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-neutral-500 text-center py-4">
                            No recent activity yet. Start creating projects to see updates here!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-secondary-600" aria-hidden="true" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <nav className="space-y-2" aria-label="Quick actions">
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={handleCreateProject}
                  >
                    <Plus className="w-4 h-4 mr-3 text-primary-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">New Project</p>
                      <p className="text-xs text-neutral-500">
                        Start from scratch or template
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare className="w-4 h-4 mr-3 text-green-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">Messages</p>
                      <p className="text-xs text-neutral-500">
                        Chat with your team
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start h-auto py-3"
                    onClick={() => navigate('/organization')}
                  >
                    <Users className="w-4 h-4 mr-3 text-purple-600" aria-hidden="true" />
                    <div className="text-left">
                      <p className="font-medium">Team & Organization</p>
                      <p className="text-xs text-neutral-500">
                        Manage members and settings
                      </p>
                    </div>
                  </Button>
                </nav>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            {projects.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4 text-warning-600" aria-hidden="true" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {projects
                      .filter((p) => p.dueDate)
                      .sort(
                        (a, b) =>
                          new Date(a.dueDate!).getTime() -
                          new Date(b.dueDate!).getTime()
                      )
                      .slice(0, 3)
                      .map((project) => {
                        const dueDate = new Date(project.dueDate!);
                        const daysUntil = Math.ceil(
                          (dueDate.getTime() - now) / (1000 * 60 * 60 * 24)
                        );
                        const isOverdue = daysUntil < 0;
                        const isUrgent = daysUntil <= 7 && daysUntil >= 0;

                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                {project.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {dueDate.toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant={
                                isOverdue
                                  ? 'destructive'
                                  : isUrgent
                                  ? 'warning'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {isOverdue
                                ? 'Overdue'
                                : daysUntil === 0
                                ? 'Today'
                                : `${daysUntil} days`}
                            </Badge>
                          </div>
                        );
                      })}
                    {projects.filter((p) => p.dueDate).length === 0 && (
                      <p className="text-sm text-neutral-500 text-center py-2">
                        No upcoming deadlines
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProjectsHub;
