/**
 * NoProjectSelected Component
 *
 * Empty state shown when a page requires a project context
 * but no project is currently selected.
 *
 * Provides a CTA to select or create a project.
 *
 * Usage:
 * const { currentProject, isLoading } = useProjectContext();
 * if (!currentProject && !isLoading) {
 *   return <NoProjectSelected />;
 * }
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, ArrowRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useProjectContextOptional, ProjectSummary } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface NoProjectSelectedProps {
  /** Title for the empty state */
  title?: string;
  /** Description text */
  description?: string;
  /** Show recent projects for quick selection */
  showRecentProjects?: boolean;
  /** Maximum recent projects to show */
  maxRecentProjects?: number;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const NoProjectSelected: React.FC<NoProjectSelectedProps> = ({
  title = 'No Project Selected',
  description = 'Select a project to see content scoped to that project, or create a new one to get started.',
  showRecentProjects = true,
  maxRecentProjects = 3,
  className,
}) => {
  const navigate = useNavigate();
  const context = useProjectContextOptional();

  // Handle case when provider is not available
  const projects = context?.projects ?? [];
  const switchProject = context?.switchProject;
  const isLoading = context?.isLoading ?? true;

  // Get recent projects (last N by most recent activity - for now just first N)
  const recentProjects = React.useMemo(
    () => projects.slice(0, maxRecentProjects),
    [projects, maxRecentProjects]
  );

  const handleSelectProject = (project: ProjectSummary) => {
    switchProject?.(project.id);
  };

  const handleCreateProject = () => {
    navigate('/projects?action=create');
  };

  const handleViewAllProjects = () => {
    navigate('/projects');
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center py-16 px-4', className)}>
      <Card className="max-w-lg w-full p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6">
          <FolderOpen className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          {description}
        </p>

        {/* Recent Projects */}
        {showRecentProjects && recentProjects.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Quick Select
            </p>
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                    'bg-neutral-50 dark:bg-neutral-800',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                    'border border-neutral-200 dark:border-neutral-700',
                    'transition-colors text-left'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white truncate">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={handleCreateProject}
            icon={<Plus className="h-4 w-4" />}
          >
            Create Project
          </Button>
          <Button
            variant="outline"
            onClick={handleViewAllProjects}
          >
            View All Projects
          </Button>
        </div>

        {/* No Projects Fallback */}
        {projects.length === 0 && (
          <p className="text-sm text-neutral-500 mt-4">
            You don't have any projects yet. Create your first project to get started!
          </p>
        )}
      </Card>
    </div>
  );
};

export default NoProjectSelected;
