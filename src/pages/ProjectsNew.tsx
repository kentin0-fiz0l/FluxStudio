/**
 * Projects Page - Redesigned with Flux Design Language
 *
 * Modern project management interface using the new component library.
 * WCAG 2.1 Level A Compliant - Accessibility improvements include:
 * - Full keyboard navigation support
 * - ARIA labels and live regions
 * - Focus management and trapping in modals
 * - Skip links for screen readers
 * - User-facing error feedback
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { ProjectCard, SearchBar } from '../components/molecules';
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useProjects, Project } from '../hooks/useProjects';
import { useTeams } from '../hooks/useTeams';
import { useOrganizations } from '../hooks/useOrganizations';
import { useConnectors } from '../contexts/ConnectorsContext';
import { useActiveProject } from '../contexts/ActiveProjectContext';
import { toast } from '../lib/toast';
import {
  Plus,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Target,
  X,
  Link2,
  FileText,
  FolderOpen
} from 'lucide-react';
import { EmptyState, emptyStateConfigs } from '../components/common/EmptyState';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | Project['status'];

export function ProjectsNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, error, createProject } = useProjects();
  const { teams } = useTeams();
  const { currentOrganization } = useOrganizations();
  const { activeProject, setActiveProject, isProjectFocused } = useActiveProject();

  // Try to get connectors context for file linking
  let linkFileToProject: ((fileId: string, projectId: string) => Promise<void>) | undefined;
  let importedFiles: { id: string; name: string }[] = [];
  try {
    const connectorsContext = useConnectors();
    linkFileToProject = connectorsContext.linkFileToProject;
    importedFiles = connectorsContext.state.importedFiles;
  } catch {
    // Connectors context not available
  }

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [showLinkFileModal, setShowLinkFileModal] = useState(false);
  const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    priority: 'medium' as Project['priority'],
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    teamId: ''
  });

  // Refs for focus management
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const modalFirstInputRef = useRef<HTMLInputElement>(null);
  const projectListRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Focus management: Focus first input when modal opens
  useEffect(() => {
    if (showCreateModal && modalFirstInputRef.current) {
      // Delay to ensure modal is rendered
      setTimeout(() => {
        modalFirstInputRef.current?.focus();
      }, 100);
    }
  }, [showCreateModal]);

  // Handle linkFile query parameter from Connectors page
  useEffect(() => {
    const linkFileParam = searchParams.get('linkFile');
    if (linkFileParam && linkFileToProject) {
      setLinkingFileId(linkFileParam);
      setShowLinkFileModal(true);
      // Clear the search param
      searchParams.delete('linkFile');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, linkFileToProject, setSearchParams]);

  // Handle linking file to project
  const handleLinkFileToProject = async (projectId: string) => {
    if (!linkingFileId || !linkFileToProject) return;

    setIsLinking(true);
    try {
      await linkFileToProject(linkingFileId, projectId);
      const linkedFile = importedFiles.find(f => f.id === linkingFileId);
      toast.success(`File "${linkedFile?.name || 'file'}" linked to project successfully!`);
      setShowLinkFileModal(false);
      setLinkingFileId(null);
    } catch (error) {
      toast.error('Failed to link file to project');
      console.error('Error linking file:', error);
    } finally {
      setIsLinking(false);
    }
  };

  // Filtered and searched projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchTerm]);

  // Status filter options
  const statusOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All Projects', count: projects.length },
    { value: 'planning', label: 'Planning', count: projects.filter(p => p.status === 'planning').length },
    { value: 'in_progress', label: 'In Progress', count: projects.filter(p => p.status === 'in_progress').length },
    { value: 'on_hold', label: 'On Hold', count: projects.filter(p => p.status === 'on_hold').length },
    { value: 'completed', label: 'Completed', count: projects.filter(p => p.status === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: projects.filter(p => p.status === 'cancelled').length }
  ];

  // Handlers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!createForm.name.trim()) {
      setFormError('Project name is required');
      toast.error('Project name is required');
      return;
    }

    if (createForm.name.trim().length < 3) {
      setFormError('Project name must be at least 3 characters');
      toast.error('Project name must be at least 3 characters');
      return;
    }

    if (createForm.dueDate && createForm.startDate > createForm.dueDate) {
      setFormError('Due date must be after start date');
      toast.error('Due date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProject({
        name: createForm.name,
        description: createForm.description,
        priority: createForm.priority,
        startDate: createForm.startDate,
        dueDate: createForm.dueDate || undefined,
        teamId: createForm.teamId || undefined,
        organizationId: currentOrganization?.id,
        members: []
      });

      // Success feedback
      toast.success(`Project "${createForm.name}" created successfully!`);

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        teamId: ''
      });
      setFormError('');

      // Return focus to create button
      setTimeout(() => {
        createButtonRef.current?.focus();
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      setFormError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setFormError('');
    // Return focus to create button
    setTimeout(() => {
      createButtonRef.current?.focus();
    }, 100);
  };

  // Keyboard handler for modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleModalClose();
    }
  };

  // Skip link handler
  const handleSkipToContent = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    mainContentRef.current?.focus();
  };

  const handleSkipToProjects = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    projectListRef.current?.focus();
  };

  const handleProjectView = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleProjectEdit = (project: Project) => {
    // TODO: Implement edit functionality
    console.log('Edit project:', project.id);
  };

  const handleProjectFocus = (project: Project) => {
    setActiveProject({ id: project.id, name: project.name });
    toast.success(`Now focused on "${project.name}"`);
  };

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'Projects' }]}
      onSearch={setSearchTerm}
      onLogout={logout}
    >
      {/* Skip Links for Screen Readers */}
      <div className="sr-only">
        <a
          href="#main-content"
          onClick={handleSkipToContent}
          onKeyDown={(e) => e.key === 'Enter' && handleSkipToContent(e)}
          className="focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>
        <a
          href="#project-list"
          onClick={handleSkipToProjects}
          onKeyDown={(e) => e.key === 'Enter' && handleSkipToProjects(e)}
          className="focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
        >
          Skip to project list
        </a>
      </div>

      <div className="p-6 space-y-6" ref={mainContentRef} tabIndex={-1} id="main-content">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-primary-600" aria-hidden="true" />
              Projects
            </h1>
            <p className="text-neutral-600 mt-1" id="projects-description">
              Manage and track your team projects
            </p>
          </div>
          <Button
            ref={createButtonRef}
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" aria-hidden="true" />}
            aria-label="Create new project"
            aria-describedby="projects-description"
          >
            New Project
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Filters */}
          <div
            className="flex items-center gap-2 flex-wrap"
            role="group"
            aria-label="Filter projects by status"
          >
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setStatusFilter(option.value);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                aria-pressed={statusFilter === option.value}
                aria-label={`Filter by ${option.label}, ${option.count} projects`}
              >
                {option.label}
                <Badge
                  variant={statusFilter === option.value ? 'solidPrimary' : 'default'}
                  size="sm"
                  className="ml-2"
                  aria-hidden="true"
                >
                  {option.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div
            className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1"
            role="group"
            aria-label="Toggle view mode"
          >
            <button
              onClick={() => setViewMode('grid')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setViewMode('grid');
                }
              }}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setViewMode('list');
                }
              }}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <ListIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {loading ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" aria-hidden="true"></div>
            <p className="text-neutral-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12" role="alert" aria-live="assertive">
            <p className="text-error-600">Error loading projects: {error}</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          searchTerm || statusFilter !== 'all' ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">No Projects Found</h3>
              <p className="text-neutral-600 mb-6">Try adjusting your search or filters</p>
            </div>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title={emptyStateConfigs.projects.title}
              description={emptyStateConfigs.projects.description}
              primaryCtaLabel={emptyStateConfigs.projects.primaryCtaLabel}
              onPrimaryCta={() => setShowCreateModal(true)}
              learnMoreItems={emptyStateConfigs.projects.learnMoreItems as unknown as string[]}
            />
          )
        ) : (
          <div
            ref={projectListRef}
            tabIndex={-1}
            id="project-list"
            role="region"
            aria-label={`${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} found`}
            aria-live="polite"
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                variant={viewMode === 'list' ? 'compact' : 'default'}
                showActions
                showProgress
                showTeam
                showTags
                onView={() => handleProjectView(project)}
                onEdit={() => handleProjectEdit(project)}
                onFocus={() => handleProjectFocus(project)}
                isFocused={isProjectFocused(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleModalClose}>
        <DialogContent
          onKeyDown={handleModalKeyDown}
          aria-labelledby="create-project-title"
          aria-describedby="create-project-description"
          role="dialog"
          aria-modal="true"
        >
          <DialogHeader>
            <DialogTitle id="create-project-title">Create New Project</DialogTitle>
            <p id="create-project-description" className="sr-only">
              Fill out the form below to create a new project. Project name is required.
            </p>
          </DialogHeader>

          {/* Error Alert */}
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2"
            >
              <X className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-error-700">{formError}</p>
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4" noValidate>
            <Input
              ref={modalFirstInputRef}
              label="Project Name"
              value={createForm.name}
              onChange={(e) => {
                setCreateForm(prev => ({ ...prev, name: e.target.value }));
                setFormError('');
              }}
              placeholder="Enter project name"
              required
              aria-required="true"
              aria-invalid={!!formError && !createForm.name.trim()}
              aria-describedby={formError && !createForm.name.trim() ? "name-error" : undefined}
              autoComplete="off"
            />
            {formError && !createForm.name.trim() && (
              <p id="name-error" className="text-sm text-error-600 -mt-2">
                {formError}
              </p>
            )}

            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-neutral-700 mb-2">
                Description
              </label>
              <textarea
                id="project-description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Enter project description (optional)"
                rows={3}
                aria-label="Project description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="project-priority" className="block text-sm font-medium text-neutral-700 mb-2">
                  Priority
                </label>
                <select
                  id="project-priority"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value as Project['priority'] }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Project priority level"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label htmlFor="project-team" className="block text-sm font-medium text-neutral-700 mb-2">
                  Team
                </label>
                <select
                  id="project-team"
                  value={createForm.teamId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, teamId: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Assign project to team"
                >
                  <option value="">No Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start Date"
                value={createForm.startDate}
                onChange={(e) => {
                  setCreateForm(prev => ({ ...prev, startDate: e.target.value }));
                  setFormError('');
                }}
                aria-label="Project start date"
                aria-required="true"
              />

              <Input
                type="date"
                label="Due Date"
                value={createForm.dueDate}
                onChange={(e) => {
                  setCreateForm(prev => ({ ...prev, dueDate: e.target.value }));
                  setFormError('');
                }}
                aria-label="Project due date (optional)"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleModalClose}
                disabled={isSubmitting}
                aria-label="Cancel and close dialog"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !createForm.name.trim()}
                loading={isSubmitting}
                aria-label={isSubmitting ? 'Creating project, please wait' : 'Create new project'}
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link File to Project Modal */}
      <Dialog open={showLinkFileModal} onOpenChange={(open) => {
        if (!open) {
          setShowLinkFileModal(false);
          setLinkingFileId(null);
        }
      }}>
        <DialogContent
          aria-labelledby="link-file-title"
          aria-describedby="link-file-description"
          role="dialog"
          aria-modal="true"
        >
          <DialogHeader>
            <DialogTitle id="link-file-title" className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary-600" aria-hidden="true" />
              Link File to Project
            </DialogTitle>
            <p id="link-file-description" className="text-sm text-neutral-600 mt-1">
              Select a project to link the imported file to.
            </p>
          </DialogHeader>

          {/* File info */}
          {linkingFileId && (
            <div className="p-3 bg-neutral-50 rounded-lg flex items-center gap-3">
              <FileText className="w-5 h-5 text-neutral-400" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">
                {importedFiles.find(f => f.id === linkingFileId)?.name || 'Selected file'}
              </span>
            </div>
          )}

          {/* Project selection */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-neutral-200 mx-auto mb-3" aria-hidden="true" />
                <p className="text-neutral-600 mb-4">No projects available</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLinkFileModal(false);
                    setShowCreateModal(true);
                  }}
                >
                  Create a Project First
                </Button>
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleLinkFileToProject(project.id)}
                  disabled={isLinking}
                  className="w-full p-3 text-left rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{project.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {project.status.replace('_', ' ')} • {project.priority} priority
                      </p>
                    </div>
                    <Badge variant={project.status === 'in_progress' ? 'info' : 'default'} size="sm">
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button
              variant="ghost"
              onClick={() => {
                setShowLinkFileModal(false);
                setLinkingFileId(null);
              }}
              disabled={isLinking}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default ProjectsNew;
