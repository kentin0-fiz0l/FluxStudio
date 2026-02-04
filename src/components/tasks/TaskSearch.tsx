/**
 * Task Search Component - Flux Studio
 *
 * Comprehensive search and filtering interface for task management.
 * Features full-text search, multi-select filters, sorting, keyboard shortcuts,
 * and URL state synchronization.
 *
 * WCAG 2.1 Level A Compliant - Includes:
 * - Keyboard shortcuts (Cmd+K / Ctrl+K to focus search)
 * - Full keyboard navigation
 * - ARIA labels and live regions
 * - Focus management
 *
 * @example
 * <TaskSearch
 *   tasks={tasks}
 *   onFilteredTasks={handleFilteredTasks}
 *   teamMembers={teamMembers}
 *   currentUserId={currentUser.id}
 * />
 */

import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useTaskSearch, Task, TeamMember, DueDateFilter, SortOption } from '@/hooks/useTaskSearch';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TaskSearchProps {
  /**
   * Array of tasks to search and filter
   */
  tasks: Task[];

  /**
   * Callback when filtered tasks change
   */
  onFilteredTasks: (filteredTasks: Task[]) => void;

  /**
   * Team members for assignee filter
   */
  teamMembers: TeamMember[];

  /**
   * Current user ID for "My tasks" preset
   */
  currentUserId: string;

  /**
   * Enable URL state synchronization
   */
  syncWithURL?: boolean;

  /**
   * Show preset filters
   */
  showPresets?: boolean;

  /**
   * Compact mode (smaller UI)
   */
  compact?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get status display configuration
 */
const getStatusDisplay = (status: Task['status']) => {
  const config = {
    todo: {
      label: 'To Do',
      variant: 'default' as const,
      icon: Circle,
    },
    in_progress: {
      label: 'In Progress',
      variant: 'info' as const,
      icon: Clock,
    },
    review: {
      label: 'Review',
      variant: 'warning' as const,
      icon: Eye,
    },
    completed: {
      label: 'Completed',
      variant: 'success' as const,
      icon: CheckCircle2,
    },
  };
  return config[status];
};

/**
 * Get priority display configuration
 */
const getPriorityDisplay = (priority: Task['priority']) => {
  const config = {
    low: { label: 'Low', variant: 'default' as const },
    medium: { label: 'Medium', variant: 'info' as const },
    high: { label: 'High', variant: 'warning' as const },
    critical: { label: 'Critical', variant: 'error' as const },
  };
  return config[priority];
};

/**
 * Get due date filter display
 */
const getDueDateDisplay = (filter: DueDateFilter) => {
  const config = {
    overdue: { label: 'Overdue', icon: AlertCircle },
    today: { label: 'Today', icon: Calendar },
    'this-week': { label: 'This Week', icon: Calendar },
    'this-month': { label: 'This Month', icon: Calendar },
    'no-date': { label: 'No Date', icon: X },
  };
  return filter ? config[filter] : null;
};

/**
 * Get sort option display
 */
const getSortDisplay = (sort: SortOption) => {
  const config = {
    recent: 'Recent',
    'title-asc': 'Title A-Z',
    'title-desc': 'Title Z-A',
    'due-date': 'Due Date',
    priority: 'Priority',
    status: 'Status',
  };
  return config[sort];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================

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

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Notify parent of filtered tasks changes
  useEffect(() => {
    onFilteredTasks(filteredTasks);
  }, [filteredTasks, onFilteredTasks]);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search
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

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render filter badge with remove button
   */
  const renderFilterBadge = (label: string, onRemove: () => void) => (
    <Badge
      variant="solidPrimary"
      size="sm"
      className="gap-1 pr-1"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-primary-700 p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-white"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );

  /**
   * Render preset filter buttons
   */
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
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(key)}
            className="h-8 gap-1.5"
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn('space-y-4', className)} role="search" aria-label="Task search and filters">
      {/* Search Bar & Controls */}
      <div className={cn('flex items-center gap-2', compact ? 'flex-col sm:flex-row' : 'flex-wrap')}>
        {/* Search Input */}
        <div className={cn('relative', compact ? 'w-full sm:flex-1' : 'flex-1 min-w-[280px]')}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
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
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size={compact ? 'sm' : 'md'}
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          icon={<Filter className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
          iconRight={isFilterPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          aria-expanded={isFilterPanelOpen}
          aria-controls="filter-panel"
          className={cn(compact && 'w-full sm:w-auto')}
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="solidPrimary" size="sm" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Sort Dropdown */}
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
        <div
          className="flex items-center gap-2 flex-wrap"
          role="region"
          aria-label="Active filters"
          aria-live="polite"
        >
          <span className="text-sm text-neutral-600 font-medium">Active:</span>

          {/* Status badges */}
          {filters.status.map(status => {
            const display = getStatusDisplay(status);
            return renderFilterBadge(
              display.label,
              () => toggleFilter('status', status)
            );
          })}

          {/* Priority badges */}
          {filters.priority.map(priority => {
            const display = getPriorityDisplay(priority);
            return renderFilterBadge(
              display.label,
              () => toggleFilter('priority', priority)
            );
          })}

          {/* Assignee badges */}
          {filters.assignedTo.map(userId => {
            const member = teamMembers.find(m => m.id === userId);
            return renderFilterBadge(
              member?.name || userId,
              () => toggleFilter('assignedTo', userId)
            );
          })}

          {/* Due date badge */}
          {filters.dueDate && renderFilterBadge(
            getDueDateDisplay(filters.dueDate)?.label || '',
            () => updateFilter('dueDate', null)
          )}

          {/* Created by badges */}
          {filters.createdBy.map(userId => {
            const member = teamMembers.find(m => m.id === userId);
            return renderFilterBadge(
              `By: ${member?.name || userId}`,
              () => toggleFilter('createdBy', userId)
            );
          })}

          {/* Clear all button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
            aria-label="Clear all filters"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div
          id="filter-panel"
          className="p-5 bg-white rounded-lg border border-neutral-200 shadow-sm space-y-5"
          role="region"
          aria-label="Filter options"
        >
          {/* Status Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-neutral-700">
                Status
              </label>
              {filters.status.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('status')}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['todo', 'in-progress', 'review', 'completed'] as Task['status'][]).map(status => {
                const { label, icon: Icon } = getStatusDisplay(status);
                const isActive = filters.status.includes(status);

                return (
                  <button
                    key={status}
                    onClick={() => toggleFilter('status', status)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2',
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    )}
                    aria-pressed={isActive}
                    aria-label={`Filter by ${label} status`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-neutral-700">
                Priority
              </label>
              {filters.priority.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('priority')}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high', 'critical'] as Task['priority'][]).map(priority => {
                const { label } = getPriorityDisplay(priority);
                const isActive = filters.priority.includes(priority);

                return (
                  <button
                    key={priority}
                    onClick={() => toggleFilter('priority', priority)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all border-2',
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    )}
                    aria-pressed={isActive}
                    aria-label={`Filter by ${label} priority`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignee Filter */}
          {teamMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-neutral-700">
                  Assigned To
                </label>
                {filters.assignedTo.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('assignedTo')}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => {
                  const isActive = filters.assignedTo.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleFilter('assignedTo', member.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2',
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                      )}
                      aria-pressed={isActive}
                      aria-label={`Filter by assignee ${member.name}`}
                    >
                      <User className="w-4 h-4" />
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Date Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-neutral-700">
                Due Date
              </label>
              {filters.dueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('dueDate')}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['overdue', 'today', 'this-week', 'this-month', 'no-date'] as DueDateFilter[]).map(filter => {
                const display = getDueDateDisplay(filter);
                if (!display) return null;

                const isActive = filters.dueDate === filter;
                const Icon = display.icon;

                return (
                  <button
                    key={filter}
                    onClick={() => updateFilter('dueDate', isActive ? null : filter)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2',
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                    )}
                    aria-pressed={isActive}
                    aria-label={`Filter by ${display.label}`}
                  >
                    <Icon className="w-4 h-4" />
                    {display.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Created By Filter */}
          {teamMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-neutral-700">
                  Created By
                </label>
                {filters.createdBy.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('createdBy')}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => {
                  const isActive = filters.createdBy.includes(member.id);

                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleFilter('createdBy', member.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2',
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50'
                      )}
                      aria-pressed={isActive}
                      aria-label={`Filter by creator ${member.name}`}
                    >
                      <User className="w-4 h-4" />
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div
        className="flex items-center justify-between text-sm text-neutral-600"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
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
