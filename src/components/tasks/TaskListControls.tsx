/**
 * TaskListControls Component
 * Filter toggle, clear filters, and create task button controls
 */

import React from 'react';
import { Filter, X, Plus } from 'lucide-react';
import { Button, Badge } from '../ui';

interface TaskListControlsProps {
  showFilters: boolean;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onTaskCreate: () => void;
}

export const TaskListControls: React.FC<TaskListControlsProps> = ({
  showFilters,
  hasActiveFilters,
  activeFilterCount,
  onToggleFilters,
  onClearFilters,
  onTaskCreate,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          icon={<Filter className="w-4 h-4" />}
          aria-expanded={showFilters}
          aria-label="Toggle filters"
        >
          Filters
          {hasActiveFilters && (
            <Badge variant="solidPrimary" size="sm" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            icon={<X className="w-4 h-4" />}
            aria-label="Clear all filters"
          >
            Clear
          </Button>
        )}
      </div>

      <Button
        onClick={onTaskCreate}
        icon={<Plus className="w-4 h-4" />}
        aria-label="Create new task"
      >
        New Task
      </Button>
    </div>
  );
};
