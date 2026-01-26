/**
 * ProjectOverviewTab - Flux Studio
 *
 * Displays project overview information including description, metrics,
 * members, and recent activity.
 *
 * WCAG 2.1 Level A Compliant - Accessibility improvements include:
 * - ARIA labels for all metrics and cards
 * - Live regions for dynamic progress updates
 * - Semantic HTML structure with proper headings
 * - Screen reader friendly task counts
 * - Keyboard accessible interactive elements
 *
 * This is a simple placeholder that can be enhanced later with:
 * - Project timeline visualization
 * - Activity feed with real-time updates
 * - Quick actions (edit, archive, share)
 * - Related projects
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, TrendingUp, Map, Pencil, FileAudio, Box, ArrowRight, Wrench, MessageSquare, Send, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { useMessaging } from '@/hooks/useMessaging';
import { useUserTestMode } from '@/hooks/useUserTestMode';
import { useClarityState } from '@/hooks/useClarityState';
import { buildClarityAwareSummary, getReframingPrompt } from '@/services/clarityAwareSummary';
import { Conversation } from '@/types/messaging';

export interface ProjectOverviewTabProps {
  project: Project;
  className?: string;
}

export const ProjectOverviewTab = React.forwardRef<HTMLDivElement, ProjectOverviewTabProps>(
  ({ project, className }, ref) => {
    // Get messaging context for project conversation
    let projectConversation = null;
    let unreadCountValue = 0;
    try {
      const { conversations } = useMessaging();
      // Find conversation linked to this project
      projectConversation = conversations.find((c: Conversation) => c.projectId === project.id);
      unreadCountValue = projectConversation?.unreadCount || 0;
    } catch {
      // Context not available
    }

    // Clarity-aware summary (test mode only)
    const { isEnabled: isTestMode } = useUserTestMode();
    const { clarity } = useClarityState({ enabled: isTestMode });
    const [copiedPrompt, setCopiedPrompt] = React.useState(false);

    // Build clarity-aware summary when test mode is enabled
    const summaryResult = React.useMemo(() => {
      if (!isTestMode) {
        return {
          summary: project.description || 'No description provided.',
          variant: 'baseline' as const,
          wasModified: false,
        };
      }
      return buildClarityAwareSummary({
        clarity,
        baselineSummary: project.description || '',
        projectName: project.name,
        focusedProjectId: project.id,
      });
    }, [isTestMode, clarity, project.description, project.name, project.id]);

    // Handle copy reframing prompt (blocked state only)
    const handleCopyReframingPrompt = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(getReframingPrompt());
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      } catch {
        // Clipboard not available
      }
    }, []);

    // Format date for display
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Status badge variant mapping
    const statusVariants = {
      planning: 'info',
      in_progress: 'warning',
      on_hold: 'default',
      completed: 'success',
      cancelled: 'error',
    } as const;

    // Priority badge variant mapping
    const priorityVariants = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'error',
    } as const;

    return (
      <div ref={ref} className={cn('space-y-6', className)} role="region" aria-label="Project overview">
        {/* Project Description */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" id="project-description-heading">Project Description</CardTitle>
              {/* Show reframing prompt button only in test mode when blocked */}
              {isTestMode && clarity === 'blocked' && (
                <button
                  onClick={handleCopyReframingPrompt}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                    'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100',
                    'dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800',
                    'transition-colors'
                  )}
                  title="Copy a prompt to help clarify project intent"
                  aria-label="Copy reframing prompt"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy prompt</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed" aria-labelledby="project-description-heading">
              {summaryResult.summary}
            </p>
            {/* Subtle indicator when summary was reframed (test mode only) */}
            {isTestMode && summaryResult.wasModified && (
              <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500 italic">
                {summaryResult.variant === 'intent_first' && '(Reframed for orientation)'}
                {summaryResult.variant === 'reframe_blocked' && '(Reframed for clarity)'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <section aria-labelledby="key-metrics-heading">
          <h2 id="key-metrics-heading" className="sr-only">Key Project Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-2" id="status-label">Status</p>
                    <Badge variant={statusVariants[project.status]} size="md" dot>
                      <span className="sr-only">Project status: </span>
                      {project.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <TrendingUp className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            {/* Priority */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-2" id="priority-label">Priority</p>
                    <Badge variant={priorityVariants[project.priority]} size="md">
                      <span className="sr-only">Project priority: </span>
                      {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                    </Badge>
                  </div>
                  <Clock className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            {/* Start Date */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-2" id="start-date-label">Start Date</p>
                    <p className="text-base font-semibold text-neutral-900" aria-labelledby="start-date-label">
                      {formatDate(project.startDate)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            {/* Due Date */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 font-medium mb-2" id="due-date-label">Due Date</p>
                    <p className="text-base font-semibold text-neutral-900" aria-labelledby="due-date-label">
                      {project.dueDate ? formatDate(project.dueDate) : 'Not set'}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-neutral-300" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" id="progress-heading">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div role="group" aria-labelledby="progress-heading">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-600 font-medium" id="progress-label">Overall Progress</span>
                <span className="text-neutral-900 font-semibold" aria-labelledby="progress-label">{project.progress}%</span>
              </div>
              <div
                className="h-3 bg-neutral-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={project.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Project progress: ${project.progress} percent`}
              >
                <div
                  className={cn(
                    'h-full transition-all duration-500 rounded-full',
                    project.progress < 30 && 'bg-error-500',
                    project.progress >= 30 && project.progress < 70 && 'bg-warning-500',
                    project.progress >= 70 && 'bg-success-500'
                  )}
                  style={{ width: `${project.progress}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Task Summary */}
            <div className="grid grid-cols-3 gap-4 pt-2" role="group" aria-label="Task summary">
              <div className="text-center p-3 bg-neutral-50 rounded-lg">
                <p className="text-2xl font-bold text-neutral-900" aria-label={`${project.tasks?.filter((t) => t.status === 'todo').length || 0} tasks to do`}>
                  {project.tasks?.filter((t) => t.status === 'todo').length || 0}
                </p>
                <p className="text-xs text-neutral-600 mt-1" aria-hidden="true">To Do</p>
              </div>
              <div className="text-center p-3 bg-warning-50 rounded-lg">
                <p className="text-2xl font-bold text-warning-700" aria-label={`${project.tasks?.filter((t) => t.status === 'in_progress').length || 0} tasks in progress`}>
                  {project.tasks?.filter((t) => t.status === 'in_progress').length || 0}
                </p>
                <p className="text-xs text-neutral-600 mt-1" aria-hidden="true">In Progress</p>
              </div>
              <div className="text-center p-3 bg-success-50 rounded-lg">
                <p className="text-2xl font-bold text-success-700" aria-label={`${project.tasks?.filter((t) => t.status === 'completed').length || 0} tasks completed`}>
                  {project.tasks?.filter((t) => t.status === 'completed').length || 0}
                </p>
                <p className="text-xs text-neutral-600 mt-1" aria-hidden="true">Completed</p>
              </div>
            </div>

            {/* Live region for progress updates */}
            <div role="status" aria-live="polite" className="sr-only">
              Project is {project.progress}% complete with {project.tasks?.filter((t) => t.status === 'completed').length || 0} of {project.tasks?.length || 0} tasks finished
            </div>
          </CardContent>
        </Card>

        {/* Project Conversation Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2" id="conversation-heading">
                <MessageSquare className="h-5 w-5 text-primary-600" aria-hidden="true" />
                Team Discussion
              </CardTitle>
              {unreadCountValue > 0 && (
                <Badge variant="solidError" size="sm" aria-label={`${unreadCountValue} unread messages`}>
                  {unreadCountValue > 99 ? '99+' : unreadCount} new
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 mb-4">
              Communicate with your team about this project. All conversations are linked to this project for easy reference.
            </p>

            {/* Quick conversation preview */}
            {projectConversation?.lastMessage && (
              <div className="p-3 bg-neutral-50 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" aria-hidden="true">
                    {(projectConversation.lastMessage as any)?.author?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {(projectConversation.lastMessage as any)?.author?.name || 'Team Member'}
                    </p>
                    <p className="text-sm text-neutral-600 truncate">
                      {(projectConversation.lastMessage as any)?.content || 'No recent messages'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {(projectConversation.lastMessage as any)?.createdAt
                        ? formatDate((projectConversation.lastMessage as any).createdAt)
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Link
                to={projectConversation ? `/messages?conversationId=${projectConversation.id}` : `/messages?projectId=${project.id}`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  fullWidth
                  icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
                  aria-label="Open project conversation"
                >
                  Open Conversation
                </Button>
              </Link>
              <Link
                to={projectConversation ? `/messages?conversationId=${projectConversation.id}&compose=true` : `/messages?projectId=${project.id}&compose=true`}
              >
                <Button
                  variant="primary"
                  icon={<Send className="h-4 w-4" aria-hidden="true" />}
                  aria-label="Send a new message to project team"
                >
                  New Message
                </Button>
              </Link>
            </div>

            {/* Live region for new message notifications */}
            {unreadCountValue > 0 && (
              <div role="status" aria-live="polite" className="sr-only">
                You have {unreadCountValue} unread message{unreadCountValue !== 1 ? 's' : ''} in this project's conversation
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tools Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2" id="tools-heading">
                <Wrench className="h-5 w-5 text-primary-600" aria-hidden="true" />
                Tools
              </CardTitle>
              <Badge variant="outline" size="sm">
                Available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 mb-4">
              Launch specialized tools to work on this project.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* MetMap Tool */}
              <Link
                to={`/tools?projectId=${project.id}&tool=metmap`}
                className="group flex flex-col p-4 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Map className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-neutral-900 group-hover:text-primary-700">MetMap</h4>
                    <p className="text-xs text-neutral-500">Visual Designer</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-600 transition-colors" aria-hidden="true" />
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Create and edit visual formations and show designs
                </p>
              </Link>

              {/* Drill Writer Tool (Coming Soon) */}
              <div className="flex flex-col p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Pencil className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-neutral-700">Drill Writer</h4>
                    <p className="text-xs text-neutral-400">Coming Soon</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Write drill movements and coordinate charts
                </p>
              </div>

              {/* Audio Sync Tool (Coming Soon) */}
              <div className="flex flex-col p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <FileAudio className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-neutral-700">Audio Sync</h4>
                    <p className="text-xs text-neutral-400">Coming Soon</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sync movements and cues with audio tracks
                </p>
              </div>

              {/* 3D Preview Tool (Coming Soon) */}
              <div className="flex flex-col p-4 rounded-lg border border-neutral-200 bg-neutral-50/50 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <Box className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-neutral-700">3D Preview</h4>
                    <p className="text-xs text-neutral-400">Coming Soon</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Preview your show in 3D from any angle
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" id="team-members-heading">Team Members</CardTitle>
              <Badge variant="outline" size="sm" aria-label={`${project.members?.length || 0} team members`}>
                <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                <span aria-hidden="true">{project.members?.length || 0}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {project.members && project.members.length > 0 ? (
              <ul className="space-y-2" role="list" aria-labelledby="team-members-heading">
                {project.members.map((memberId, index) => (
                  <li
                    key={memberId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold" aria-hidden="true">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">Member {memberId}</p>
                      <p className="text-xs text-neutral-500">Team Member</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-8" role="status">
                No team members assigned yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" id="recent-activity-heading">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3" role="list" aria-labelledby="recent-activity-heading">
              {/* Placeholder activity items */}
              <li className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50">
                <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-900">Project created</p>
                  <time className="text-xs text-neutral-500 mt-1 block" dateTime={project.createdAt}>
                    {formatDate(project.createdAt)}
                  </time>
                </div>
              </li>
              {project.tasks && project.tasks.length > 0 && (
                <li className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50">
                  <div className="w-2 h-2 rounded-full bg-success-600 mt-1.5 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-900">
                      {project.tasks.filter((t) => t.status === 'completed').length} tasks completed
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">Recent progress</p>
                  </div>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }
);

ProjectOverviewTab.displayName = 'ProjectOverviewTab';
