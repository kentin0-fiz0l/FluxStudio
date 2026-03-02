/**
 * Task Search Component - Flux Studio
 *
 * Comprehensive search and filtering interface for task management.
 * Features full-text search, multi-select filters, sorting, keyboard shortcuts,
 * and URL state synchronization.
 *
 * WCAG 2.1 Level A Compliant
 */

import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  User,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useTaskSearch, Task, TeamMember, SortOption } from '@/hooks/useTaskSearch';
import { getStatusDisplay, getPriorityDisplay, getDueDateDisplay, getSortDisplay } from './taskSearchUtils';
import { TaskSearchFilterPanel } from './TaskSearchFilterPanel';

export interface TaskSearchProps {
  tasks: Task[];
  onFilteredTasks: (filteredTasks: Task[]) => void;
  teamMembers: TeamMember[];
  currentUserId: string;
  syncWithURL?: boolean;
  showPresets?: boolean;
  compact?: boolean;
  className?: string;
}

export const TaskSearch: React.FC<TaskSearchProps> = ({
  tasks,
  onFilteredTasks,
  teamMembers,
  currentUserId,
  syncWithURL = true,
  showPresets = true,
  compact = false,
  className,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);

  const {
    filteredTasks,
    filters,
    updateFilter,
    toggleFilter,
    clearAllFilters,
    clearFilter,
    activeFilterCount,
    resultCount,
    hasActiveFilters,
    applyPreset,
  } = useTaskSearch(tasks, teamMembers, currentUserId, {
    syncWithURL,
    debounceDelay: 300,
    initialSort: 'recent',
  });

  useEffect(() => {
    onFilteredTasks(filteredTasks);
  }, [filteredTasks, onFilteredTasks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderFilterBadge = (label: string, onRemove: () => void) => (
    <Badge variant="solidPrimary" size="sm" className="gap-1 pr-1">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-primary-700 p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-white"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>
    </Badge>
  );

  const renderPresets = () => {
    if (!showPresets) return null;
    const presets = [
      { key: 'my-tasks' as const, label: 'My Tasks', icon: User },
      { key: 'overdue' as const, label: 'Overdue', icon: AlertCircle },
      { key: 'high-priority' as const, label: 'High Priority', icon: Sparkles },
      { key: 'in_progress' as const, label: 'In Progress', icon: Clock },
    ];
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-neutral-600">Quick filters:</span>
        {presets.map(({ key, label, icon: Icon }) => (
          <Button key={key} variant="outline" size="sm" onClick={() => applyPreset(key)} className="h-8 gap-1.5">
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)} role="search" aria-label="Task search and filters">
      {/* Search Bar & Controls */}
      <div className={cn('flex items-center gap-2', compact ? 'flex-col sm:flex-row' : 'flex-wrap')}>
        <div className={cn('relative', compact ? 'w-full sm:flex-1' : 'flex-1 min-w-[280px]')}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            placeholder="Search tasks... (⌘K)"
            className="w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-base focus:outline-none focus:ring-3 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            aria-label="Search tasks by title or description"
          />
          {filters.query && (
            <button
              onClick={() => updateFilter('query', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'md'}
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          icon={<Filter className={compact ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden="true" />}
          iconRight={isFilterPanelOpen ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          aria-expanded={isFilterPanelOpen}
          aria-controls="filter-panel"
          className={cn(compact && 'w-full sm:w-auto')}
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="solidPrimary" size="sm" className="ml-1">{activeFilterCount}</Badge>
          )}
        </Button>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as SortOption)}
          className={cn(
            'px-4 py-2.5 border border-neutral-300 rounded-lg bg-white text-base font-medium focus:outline-none focus:ring-3 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer',
            compact && 'w-full sm:w-auto'
          )}
          aria-label="Sort tasks by"
        >
          <option value="recent">Recent</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="due-date">Due Date</option>
          <option value="priority">Priority</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Preset Filters */}
      {showPresets && !compact && renderPresets()}

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap" role="region" aria-label="Active filters" aria-live="polite">
          <span className="text-sm text-neutral-600 font-medium">Active:</span>
          {filters.status.map(status => {
            const display = getStatusDisplay(status);
            return renderFilterBadge(display.label, () => toggleFilter('status', status));
          })}
          {filters.priority.map(priority => {
            const display = getPriorityDisplay(priority);
            return renderFilterBadge(display.label, () => toggleFilter('priority', priority));
          })}
          {filters.assignedTo.map(userId => {
            const member = teamMembers.find(m => m.id === userId);
            return renderFilterBadge(member?.name || userId, () => toggleFilter('assignedTo', userId));
          })}
          {filters.dueDate && renderFilterBadge(
            getDueDateDisplay(filters.dueDate)?.label || '',
            () => updateFilter('dueDate', null)
          )}
          {filters.createdBy.map(userId => {
            const member = teamMembers.find(m => m.id === userId);
            return renderFilterBadge(`By: ${member?.name || userId}`, () => toggleFilter('createdBy', userId));
          })}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs" aria-label="Clear all filters">
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <TaskSearchFilterPanel
          filters={filters}
          teamMembers={teamMembers}
          toggleFilter={toggleFilter}
          updateFilter={updateFilter}
          clearFilter={clearFilter}
        />
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-neutral-600" role="status" aria-live="polite" aria-atomic="true">
        <p>
          <span className="font-semibold text-neutral-900">{resultCount}</span>
          {' '}{resultCount === 1 ? 'task' : 'tasks'} found
          {hasActiveFilters && ` (filtered from ${tasks.length})`}
        </p>
        <p className="text-neutral-500">
          Sorted by: <span className="font-medium text-neutral-700">{getSortDisplay(filters.sortBy)}</span>
        </p>
      </div>
    </div>
  );
};
