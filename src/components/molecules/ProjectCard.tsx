/**
 * ProjectCard Molecule - Flux Design Language
 *
 * A reusable project card component for displaying project information.
 * Supports thumbnails, progress indicators, team avatars, and actions.
 *
 * @example
 * <ProjectCard
 *   project={{ name: 'Website Redesign', status: 'active', progress: 65 }}
 *   showActions
 * />
 */

import * as React from 'react';
import { Calendar, Users, MoreVertical, ExternalLink, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';

export interface ProjectCardProject {
  id?: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived' | 'on-hold';
  progress?: number;
  thumbnail?: string;
  dueDate?: Date | string;
  teamSize?: number;
  teamAvatars?: string[];
  tags?: string[];
  owner?: string;
}

export interface ProjectCardProps {
  /**
   * Project data
   */
  project: ProjectCardProject;

  /**
   * Show action buttons
   */
  showActions?: boolean;

  /**
   * Show progress bar
   */
  showProgress?: boolean;

  /**
   * Show team avatars
   */
  showTeam?: boolean;

  /**
   * Show tags
   */
  showTags?: boolean;

  /**
   * Click callback
   */
  onClick?: (project: ProjectCardProject) => void;

  /**
   * Edit callback
   */
  onEdit?: (project: ProjectCardProject) => void;

  /**
   * View callback
   */
  onView?: (project: ProjectCardProject) => void;

  /**
   * More options callback
   */
  onMoreOptions?: (project: ProjectCardProject) => void;

  /**
   * Focus callback for "Project Focus Mode"
   */
  onFocus?: (project: ProjectCardProject) => void;

  /**
   * Whether this project is currently focused
   */
  isFocused?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Variant
   */
  variant?: 'default' | 'compact' | 'detailed';
}

export const ProjectCard = React.forwardRef<HTMLDivElement, ProjectCardProps>(
  (
    {
      project,
      showActions = false,
      showProgress = true,
      showTeam = true,
      showTags = true,
      onClick,
      onEdit,
      onView,
      onMoreOptions,
      onFocus,
      isFocused = false,
      className,
      variant = 'default',
    },
    ref
  ) => {
    // Status badge variant mapping
    const statusVariants = {
      active: 'success',
      completed: 'solidSuccess',
      archived: 'default',
      'on-hold': 'warning',
    } as const;

    // Status label mapping
    const statusLabels = {
      active: 'Active',
      completed: 'Completed',
      archived: 'Archived',
      'on-hold': 'On Hold',
    };

    return (
      <Card
        ref={ref}
        interactive={!!onClick}
        onClick={() => onClick?.(project)}
        className={cn('group transition-all', className)}
        variant="default"
      >
        {/* Thumbnail (if provided) */}
        {project.thumbnail && variant !== 'compact' && (
          <div className="relative aspect-video bg-neutral-100 rounded-t-lg overflow-hidden -m-6 mb-4">
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              <Badge variant={statusVariants[project.status]} size="sm" dot>
                {statusLabels[project.status]}
              </Badge>
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(variant === 'compact' && 'text-base')}>
                {project.name}
              </CardTitle>
              {project.description && variant !== 'compact' && (
                <CardDescription className="mt-1.5">
                  {project.description}
                </CardDescription>
              )}
            </div>

            {/* Status badge (when no thumbnail) */}
            {!project.thumbnail && (
              <Badge variant={statusVariants[project.status]} size="sm" dot>
                {statusLabels[project.status]}
              </Badge>
            )}

            {/* More options */}
            {onMoreOptions && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreOptions(project);
                }}
                className="flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        {variant !== 'compact' && (
          <CardContent className="space-y-4">
            {/* Progress bar */}
            {showProgress && project.progress !== undefined && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600 font-medium">Progress</span>
                  <span className="text-neutral-900 font-semibold">{project.progress}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all rounded-full',
                      project.progress < 30 && 'bg-error-500',
                      project.progress >= 30 && project.progress < 70 && 'bg-warning-500',
                      project.progress >= 70 && 'bg-success-500'
                    )}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Meta information */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              {/* Due date */}
              {project.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatRelativeTime(project.dueDate)}</span>
                </div>
              )}

              {/* Team size */}
              {showTeam && project.teamSize && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{project.teamSize} members</span>
                </div>
              )}
            </div>

            {/* Team avatars */}
            {showTeam && project.teamAvatars && project.teamAvatars.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {project.teamAvatars.slice(0, 4).map((avatar, index) => (
                    <img
                      key={index}
                      src={avatar}
                      alt={`Team member ${index + 1}`}
                      className="w-8 h-8 rounded-full border-2 border-white"
                    />
                  ))}
                  {project.teamAvatars.length > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-700">
                      +{project.teamAvatars.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {showTags && project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" size="sm">
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 3 && (
                  <Badge variant="outline" size="sm">
                    +{project.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        )}

        {/* Actions */}
        {showActions && (onEdit || onView || onFocus) && (
          <CardFooter className="pt-4 gap-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onView(project);
                }}
                fullWidth={variant === 'compact'}
              >
                View
              </Button>
            )}
            {onFocus && (
              <Button
                variant={isFocused ? 'primary' : 'outline'}
                size="sm"
                icon={<Target className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(project);
                }}
                fullWidth={variant === 'compact'}
                aria-pressed={isFocused}
                aria-label={isFocused ? 'Currently focused project' : 'Focus on this project'}
              >
                {isFocused ? 'Focused' : 'Focus'}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                fullWidth={variant === 'compact'}
              >
                Edit Project
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    );
  }
);

ProjectCard.displayName = 'ProjectCard';
