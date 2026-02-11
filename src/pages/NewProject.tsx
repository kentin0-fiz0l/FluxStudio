/**
 * New Project Page - Dedicated page for creating a new project
 *
 * A focused, single-purpose page for project creation.
 * WCAG 2.1 Level A Compliant.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/templates';
import { Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useProjects, Project } from '../hooks/useProjects';
import { useTeams } from '../hooks/useTeams';
import { useOrganizations } from '../hooks/useOrganizations';
import { toast } from '../lib/toast';
import { ArrowLeft, Plus } from 'lucide-react';

export function NewProject() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const { teams } = useTeams();
  const { currentOrganization } = useOrganizations();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');
  const [nameTouched, setNameTouched] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'medium' as Project['priority'],
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    teamId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!form.name.trim()) {
      setFormError('Project name is required');
      toast.error('Project name is required');
      return;
    }

    if (form.name.trim().length < 3) {
      setFormError('Project name must be at least 3 characters');
      toast.error('Project name must be at least 3 characters');
      return;
    }

    if (form.dueDate && form.startDate > form.dueDate) {
      setFormError('Due date must be after start date');
      toast.error('Due date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProject = await createProject({
        name: form.name,
        description: form.description,
        priority: form.priority,
        startDate: form.startDate,
        dueDate: form.dueDate || undefined,
        teamId: form.teamId || undefined,
        organizationId: currentOrganization?.id,
        members: []
      });

      toast.success(`Project "${form.name}" created successfully!`);

      // Navigate to the new project
      if (newProject?.id) {
        navigate(`/projects/${newProject.id}`);
      } else {
        navigate('/projects');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      setFormError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[
        { label: 'Projects', path: '/projects' },
        { label: 'New Project' }
      ]}
      onLogout={logout}
    >
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="gap-2"
            aria-label="Back to projects"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
            <Plus className="w-6 h-6 text-primary-600" />
            Create New Project
          </h1>
          <p className="text-neutral-600 mt-1">
            Set up a new project to start collaborating with your team.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Project Name */}
            <div>
              <Input
                label="Project Name"
                value={form.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm(prev => ({ ...prev, name: value }));
                  setFormError('');
                  if (nameTouched) {
                    if (!value.trim()) {
                      setNameError('Project name is required');
                    } else if (value.trim().length < 3) {
                      setNameError('Name must be at least 3 characters');
                    } else {
                      setNameError('');
                    }
                  }
                }}
                onBlur={() => {
                  setNameTouched(true);
                  if (!form.name.trim()) {
                    setNameError('Project name is required');
                  } else if (form.name.trim().length < 3) {
                    setNameError('Name must be at least 3 characters');
                  } else {
                    setNameError('');
                  }
                }}
                placeholder="Enter project name"
                required
                aria-required="true"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : "name-hint"}
                autoFocus
              />
              {nameError ? (
                <p id="name-error" className="text-sm text-error-600 mt-1">
                  {nameError}
                </p>
              ) : (
                <p id="name-hint" className="text-xs text-neutral-500 mt-1">
                  {form.name.length}/3 minimum characters
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-neutral-700 mb-2">
                Description
              </label>
              <textarea
                id="project-description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Describe your project (optional)"
                rows={4}
              />
            </div>

            {/* Priority & Team */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="project-priority" className="block text-sm font-medium text-neutral-700 mb-2">
                  Priority
                </label>
                <select
                  id="project-priority"
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as Project['priority'] }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="project-team" className="block text-sm font-medium text-neutral-700 mb-2">
                  Team
                </label>
                <select
                  id="project-team"
                  value={form.teamId}
                  onChange={(e) => setForm(prev => ({ ...prev, teamId: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No Team (Personal)</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start Date"
                value={form.startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm(prev => ({ ...prev, startDate: value }));
                  setFormError('');
                  if (form.dueDate && value && new Date(form.dueDate) < new Date(value)) {
                    setDateError('Due date must be after start date');
                  } else {
                    setDateError('');
                  }
                }}
              />

              <div>
                <Input
                  type="date"
                  label="Due Date (Optional)"
                  value={form.dueDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(prev => ({ ...prev, dueDate: value }));
                    setFormError('');
                    if (value && form.startDate && new Date(value) < new Date(form.startDate)) {
                      setDateError('Due date must be after start date');
                    } else {
                      setDateError('');
                    }
                  }}
                  aria-invalid={!!dateError}
                />
                {dateError && (
                  <p className="text-sm text-error-600 mt-1">{dateError}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/projects')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.name.trim() || form.name.trim().length < 3 || !!dateError}
                loading={isSubmitting}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default NewProject;
