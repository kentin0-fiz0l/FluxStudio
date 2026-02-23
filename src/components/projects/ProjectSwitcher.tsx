/**
 * ProjectSwitcher Component
 *
 * A dropdown component for switching between projects.
 * Displayed in the navigation sidebar for quick project context changes.
 *
 * Features:
 * - Shows current project name
 * - Searchable project list
 * - "Create project" entry
 * - Responsive (works on mobile)
 * - Instant state update on selection
 *
 * Usage:
 * <ProjectSwitcher />
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Search,
  Plus,
  Briefcase,
  Check,
  X,
  FolderOpen,
} from 'lucide-react';
import { useProjectContext } from '@/store';
import type { Project as ProjectSummary } from '@/store';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ProjectSwitcherProps {
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusDot: React.FC<{ status: ProjectSummary['status'] }> = ({ status }) => {
  const colors: Record<ProjectSummary['status'], string> = {
    planning: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    on_hold: 'bg-neutral-400',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
  };

  return (
    <span
      className={cn('w-2 h-2 rounded-full flex-shrink-0', colors[status])}
      aria-label={`Status: ${status.replace('_', ' ')}`}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  collapsed = false,
  className,
}) => {
  const navigate = useNavigate();
  const projectContext = useProjectContext();

  // Handle case when ProjectProvider is not available
  const currentProject = projectContext?.currentProject;
  const projects = projectContext?.projects || [];
  const isLoading = projectContext?.isLoading ?? true;
  const switchProject = projectContext?.switchProject;
  const clearProject = projectContext?.clearProject;

  // Show placeholder if context is not available yet
  const contextUnavailable = !projectContext;

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Filter projects based on search
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery.trim()) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle project selection - navigate to project overview (command center)
  const handleSelectProject = (project: ProjectSummary) => {
    switchProject?.(project.id);
    setIsOpen(false);
    setSearchQuery('');
    // Navigate to project overview as the default landing page
    navigate(`/projects/${project.id}/overview`);
  };

  // Handle create project
  const handleCreateProject = () => {
    setIsOpen(false);
    setSearchQuery('');
    navigate('/projects?action=create');
  };

  // Handle clear project (go to global view)
  const handleClearProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearProject?.();
    setIsOpen(false);
  };

  // Show loading placeholder if context is unavailable
  if (contextUnavailable) {
    if (collapsed) {
      return (
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center mx-auto',
            'bg-neutral-800 animate-pulse',
            className
          )}
        >
          <Briefcase className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className={cn('relative', className)}>
        <div
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
            'bg-neutral-800 border border-neutral-700 animate-pulse'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-neutral-700 rounded mb-1" />
            <div className="h-3 w-16 bg-neutral-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Collapsed state - just show icon
  if (collapsed) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center mx-auto',
          'bg-neutral-800 hover:bg-neutral-700 transition-colors',
          currentProject ? 'ring-2 ring-primary-500' : '',
          className
        )}
        title={currentProject?.name || 'Select project'}
        aria-label={currentProject?.name || 'Select project'}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Briefcase className="h-5 w-5 text-neutral-300" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
          'bg-neutral-800 hover:bg-neutral-700 transition-colors',
          'border border-neutral-700',
          isOpen && 'ring-2 ring-primary-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select project"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          currentProject ? 'bg-primary-600' : 'bg-neutral-700'
        )}>
          {currentProject ? (
            <span className="text-white font-semibold text-sm">
              {currentProject.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <FolderOpen className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {currentProject?.name || 'Select Project'}
          </p>
          {currentProject && (
            <p className="text-xs text-neutral-400 truncate">
              {currentProject.status.replace('_', ' ')}
            </p>
          )}
          {!currentProject && (
            <p className="text-xs text-neutral-500">
              No project selected
            </p>
          )}
        </div>

        {currentProject && (
          <button
            onClick={handleClearProject}
            className="p-1 rounded hover:bg-neutral-600 transition-colors"
            aria-label="Clear project selection"
          >
            <X className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </button>
        )}

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-4 w-4 text-neutral-400 transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-neutral-800 rounded-lg border border-neutral-700 shadow-xl',
            'max-h-[400px] overflow-hidden flex flex-col'
          )}
          role="listbox"
          aria-label="Projects"
        >
          {/* Search */}
          <div className="p-2 border-b border-neutral-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className={cn(
                  'w-full pl-9 pr-3 py-2 rounded-md',
                  'bg-neutral-900 border border-neutral-700',
                  'text-sm text-white placeholder-neutral-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
                aria-label="Search projects"
              />
            </div>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-4 text-center">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-neutral-400 mt-2">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-neutral-400">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = currentProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5',
                      'hover:bg-neutral-700 transition-colors text-left',
                      isSelected && 'bg-neutral-700'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <StatusDot status={project.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-neutral-400 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary-400 flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Create Project */}
          <div className="border-t border-neutral-700 p-2">
            <button
              onClick={handleCreateProject}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md',
                'hover:bg-neutral-700 transition-colors'
              )}
            >
              <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-primary-400">
                Create New Project
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSwitcher;
