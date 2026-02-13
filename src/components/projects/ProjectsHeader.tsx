import React from 'react';
import { Button } from '../ui';
import { Target, Plus } from 'lucide-react';

export interface ProjectsHeaderProps {
  onCreateProject: () => void;
  createButtonRef?: React.Ref<HTMLButtonElement>;
}

export function ProjectsHeader({ onCreateProject, createButtonRef }: ProjectsHeaderProps) {
  return (
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
        onClick={onCreateProject}
        icon={<Plus className="w-4 h-4" aria-hidden="true" />}
        aria-label="Create new project"
        aria-describedby="projects-description"
      >
        New Project
      </Button>
    </div>
  );
}
