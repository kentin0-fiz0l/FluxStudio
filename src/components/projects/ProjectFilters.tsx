import { Badge } from '../ui';
import {
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  Square,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export interface StatusOption {
  value: string;
  label: string;
  count: number;
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
}: ProjectFiltersProps) {
  return (
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
  );
}
