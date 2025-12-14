/**
 * ProjectContextBar - Global Project Focus Indicator
 *
 * Displays a persistent bar when a project is focused, showing which project
 * the user is working on and providing quick actions to navigate or exit focus.
 *
 * Features:
 * - Shows project name with focus indicator
 * - Quick actions: View Project, Switch Project, Exit Focus
 * - Project Pulse indicator and panel access
 * - Sticky positioning below TopBar
 * - Accessible with keyboard navigation
 *
 * FluxStudio principle: "Projects are the home for everything"
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Target, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { useActiveProject } from '@/contexts/ActiveProjectContext';
import { PulseIndicator } from '@/components/pulse/PulseIndicator';
import { PulsePanel } from '@/components/pulse/PulsePanel';
import { cn } from '@/lib/utils';

export interface ProjectContextBarProps {
  className?: string;
}

export function ProjectContextBar({ className }: ProjectContextBarProps) {
  const { activeProject, clearActiveProject, hasFocus } = useActiveProject();
  const [isPulseOpen, setIsPulseOpen] = React.useState(false);

  // Don't render if no project is focused
  if (!hasFocus || !activeProject) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-40 w-full border-b border-primary-200 bg-primary-50',
          'px-4 py-2 flex items-center justify-between gap-4',
          'dark:bg-primary-950 dark:border-primary-800',
          className
        )}
        role="banner"
        aria-label={`Focused on project: ${activeProject.name}`}
      >
        {/* Left: Focus indicator + Project name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <Target className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium whitespace-nowrap">Working on:</span>
          </div>
          <span
            className="text-sm font-semibold text-primary-900 dark:text-primary-100 truncate"
            title={activeProject.name}
          >
            {activeProject.name}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Pulse Indicator - shows activity and attention items */}
          <PulseIndicator
            onClick={() => setIsPulseOpen(!isPulseOpen)}
            isOpen={isPulseOpen}
            variant="badge"
          />

          {/* View Project */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 dark:text-primary-300 dark:hover:text-primary-100 dark:hover:bg-primary-900"
          >
            <Link to={`/projects/${activeProject.id}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">View Project</span>
              <span className="sm:hidden">View</span>
            </Link>
          </Button>

          {/* Exit Focus */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveProject}
            className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 dark:text-primary-300 dark:hover:text-primary-100 dark:hover:bg-primary-900"
            aria-label="Exit project focus mode"
          >
            <X className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">Exit Focus</span>
            <span className="sm:hidden sr-only">Exit</span>
          </Button>
        </div>
      </div>

      {/* Pulse Panel - overlay when open */}
      <PulsePanel
        isOpen={isPulseOpen}
        onClose={() => setIsPulseOpen(false)}
        position="overlay"
      />
    </>
  );
}

export default ProjectContextBar;
