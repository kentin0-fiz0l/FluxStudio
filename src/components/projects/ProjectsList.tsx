import React from 'react';
import { ProjectCard } from '../molecules';
import { Target, FolderOpen } from 'lucide-react';
import { EmptyState, emptyStateConfigs } from '../common/EmptyState';
import { Project } from '../../hooks/useProjects';

type ViewMode = 'grid' | 'list';
type CardStatus = 'active' | 'completed' | 'archived' | 'on-hold';

const mapProjectStatus = (status: Project['status']): CardStatus => {
  const statusMap: Record<Project['status'], CardStatus> = {
    planning: 'active',
    in_progress: 'active',
    on_hold: 'on-hold',
    completed: 'completed',
    cancelled: 'archived',
  };
  return statusMap[status];
};

export interface ProjectsListProps {
  projects: Project[];
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  searchTerm: string;
  statusFilter: string;
  selectedProjects: Set<string>;
  onSelectProject: (projectId: string, selected: boolean) => void;
  onViewProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onFocusProject: (project: Project) => void;
  isProjectFocused: (projectId: string) => boolean;
  onCreateProject: () => void;
  projectListRef?: React.Ref<HTMLDivElement>;
}

export function ProjectsList({
  projects,
  loading,
  error,
  viewMode,
  searchTerm,
  statusFilter,
  selectedProjects,
  onSelectProject,
  onViewProject,
  onEditProject,
  onFocusProject,
  isProjectFocused,
  onCreateProject,
  projectListRef,
}: ProjectsListProps) {
  if (loading) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" aria-hidden="true"></div>
        <p className="text-neutral-600">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert" aria-live="assertive">
        <p className="text-error-600">Error loading projects: {error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    if (searchTerm || statusFilter !== 'all') {
      return (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Projects Found</h3>
          <p className="text-neutral-600 mb-6">Try adjusting your search or filters</p>
        </div>
      );
    }

    return (
      <EmptyState
        icon={FolderOpen}
        title={emptyStateConfigs.projects.title}
        description={emptyStateConfigs.projects.description}
        primaryCtaLabel={emptyStateConfigs.projects.primaryCtaLabel}
        onPrimaryCta={onCreateProject}
        learnMoreItems={emptyStateConfigs.projects.learnMoreItems as unknown as string[]}
      />
    );
  }

  return (
    <div
      ref={projectListRef}
      tabIndex={-1}
      id="project-list"
      role="region"
      aria-label={`${projects.length} project${projects.length !== 1 ? 's' : ''} found`}
      aria-live="polite"
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }
    >
      {projects.map((project) => (
        <div key={project.id} className="relative group">
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={selectedProjects.has(project.id)}
              onChange={(e) => onSelectProject(project.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
              aria-label={`Select ${project.name}`}
            />
          </div>

          <ProjectCard
            project={{ ...project, status: mapProjectStatus(project.status) }}
            variant={viewMode === 'list' ? 'compact' : 'default'}
            showActions
            showProgress
            showTeam
            showTags
            onView={() => onViewProject(project)}
            onEdit={() => onEditProject(project)}
            onFocus={() => onFocusProject(project)}
            isFocused={isProjectFocused(project.id)}
          />
        </div>
      ))}
    </div>
  );
}
