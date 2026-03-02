import { User } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Task, TeamMember, DueDateFilter, SearchFilters } from '@/hooks/useTaskSearch';
import { getStatusDisplay, getPriorityDisplay, getDueDateDisplay } from './taskSearchUtils';

type ArrayFilterKeys = 'status' | 'priority' | 'assignedTo' | 'createdBy';

interface TaskSearchFilterPanelProps {
  filters: {
    status: Task['status'][];
    priority: Task['priority'][];
    assignedTo: string[];
    dueDate: DueDateFilter;
    createdBy: string[];
  };
  teamMembers: TeamMember[];
  toggleFilter: <K extends ArrayFilterKeys>(key: K, value: SearchFilters[K][number]) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilter: <K extends keyof SearchFilters>(key: K) => void;
}

export function TaskSearchFilterPanel({
  filters,
  teamMembers,
  toggleFilter,
  updateFilter,
  clearFilter,
}: TaskSearchFilterPanelProps) {
  return (
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
          {(['todo', 'in_progress', 'review', 'completed'] as Task['status'][]).map(status => {
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
                <Icon className="w-4 h-4" aria-hidden="true" />
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
                  <User className="w-4 h-4" aria-hidden="true" />
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
                <Icon className="w-4 h-4" aria-hidden="true" />
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
                  <User className="w-4 h-4" aria-hidden="true" />
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
