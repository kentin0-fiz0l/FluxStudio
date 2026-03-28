import { Badge } from '../ui';
import {
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  Square,
  X,
  CalendarDays,
  Users,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export interface StatusOption {
  value: string;
  label: string;
  count: number;
}

export interface TeamMemberOption {
  id: string;
  name: string;
}

export interface ProjectFiltersProps {
  statusOptions: StatusOption[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  filteredCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  // Advanced filter props
  teamMembers?: TeamMemberOption[];
  teamFilter?: string[];
  onTeamFilterChange?: (value: string[]) => void;
  dateRange?: { from?: Date; to?: Date };
  onDateRangeChange?: (range: { from?: Date; to?: Date }) => void;
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function ProjectFilters({
  statusOptions,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  selectionMode,
  onToggleSelectionMode,
  filteredCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  teamMembers = [],
  teamFilter = [],
  onTeamFilterChange,
  dateRange = {},
  onDateRangeChange,
  onClearAllFilters,
  hasActiveFilters = false,
}: ProjectFiltersProps) {
  return (
    <div className="space-y-3">
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
              onClick={() => onStatusFilterChange(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onStatusFilterChange(option.value);
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

        <div className="flex items-center gap-3">
          {/* Team Member Dropdown */}
          {teamMembers.length > 0 && onTeamFilterChange && (
            <select
              value={teamFilter.length === 1 ? teamFilter[0] : ''}
              onChange={(e) => onTeamFilterChange(e.target.value ? [e.target.value] : [])}
              className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300"
              aria-label="Filter by team member"
            >
              <option value="">
                <Users className="w-3 h-3 inline mr-1" /> All members
              </option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}

          {/* Date Range */}
          {onDateRangeChange && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })}
                className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-2 text-neutral-700 dark:text-neutral-300 w-[130px]"
                aria-label="Start date"
              />
              <span className="text-neutral-400 text-xs">to</span>
              <input
                type="date"
                value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })}
                className="text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-2 text-neutral-700 dark:text-neutral-300 w-[130px]"
                aria-label="End date"
              />
            </div>
          )}

          {/* Selection Mode Toggle */}
          <button
            onClick={onToggleSelectionMode}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectionMode
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
            aria-pressed={selectionMode}
            aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            {selectionMode ? (
              <CheckSquare className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Square className="w-4 h-4" aria-hidden="true" />
            )}
            {selectionMode ? 'Cancel' : 'Select'}
          </button>

          {/* Select All */}
          {selectionMode && filteredCount > 0 && (
            <button
              onClick={() => {
                if (selectedCount === filteredCount) {
                  onDeselectAll();
                } else {
                  onSelectAll();
                }
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedCount === filteredCount ? 'Deselect all' : 'Select all'}
            </button>
          )}

          {/* View Mode Toggle */}
          <div
            className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1"
            role="group"
            aria-label="Toggle view mode"
          >
            <button
              onClick={() => onViewModeChange('grid')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewModeChange('grid');
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
              onClick={() => onViewModeChange('list')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewModeChange('list');
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
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {teamFilter.map((t) => {
            const member = teamMembers.find((m) => m.id === t);
            return (
              <Badge key={t} variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
                <Users className="w-3 h-3" />
                {member?.name || t}
                <button
                  onClick={() => onTeamFilterChange?.(teamFilter.filter((v) => v !== t))}
                  className="ml-1 hover:text-red-500"
                  aria-label={`Remove ${member?.name || t} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          {dateRange.from && (
            <Badge variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
              <CalendarDays className="w-3 h-3" />
              From {dateRange.from.toLocaleDateString()}
              <button
                onClick={() => onDateRangeChange?.({ ...dateRange, from: undefined })}
                className="ml-1 hover:text-red-500"
                aria-label="Remove start date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {dateRange.to && (
            <Badge variant="default" size="sm" className="gap-1 pl-2 pr-1 py-1">
              <CalendarDays className="w-3 h-3" />
              To {dateRange.to.toLocaleDateString()}
              <button
                onClick={() => onDateRangeChange?.({ ...dateRange, to: undefined })}
                className="ml-1 hover:text-red-500"
                aria-label="Remove end date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {onClearAllFilters && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
