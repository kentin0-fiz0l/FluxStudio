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
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

export interface ProjectOverviewTabProps {
  project: Project;
  className?: string;
}

export const ProjectOverviewTab = React.forwardRef<HTMLDivElement, ProjectOverviewTabProps>(
  ({ project, className }, ref) => {
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
            <CardTitle className="text-lg" id="project-description-heading">Project Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-700 leading-relaxed" aria-labelledby="project-description-heading">
              {project.description || 'No description provided.'}
            </p>
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
