import { FileType, FileSource } from '../../contexts/FilesContext';
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

// Type filter options
const typeFilterOptions: { value: FileType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'text', label: 'Text/Code' },
  { value: 'archive', label: 'Archives' },
  { value: 'other', label: 'Other' },
];

// Source filter options
const sourceFilterOptions: { value: FileSource; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'upload', label: 'Uploads' },
  { value: 'connector', label: 'Connectors' },
  { value: 'generated', label: 'Generated' },
];

type ViewMode = 'grid' | 'list';

export interface FileFiltersProps {
  localSearch: string;
  onSearchChange: (value: string) => void;
  typeFilter: FileType | 'all';
  onTypeFilterChange: (value: FileType | 'all') => void;
  sourceFilter: FileSource;
  onSourceFilterChange: (value: FileSource) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FileFilters({
  localSearch,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  sourceFilter,
  onSourceFilterChange,
  viewMode,
  onViewModeChange,
}: FileFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={localSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Search files"
        />
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as FileType | 'all')}
        className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        aria-label="Filter by type"
      >
        {typeFilterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Source filter */}
      <select
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value as FileSource)}
        className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        aria-label="Filter by source"
      >
        {sourceFilterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* View toggle */}
      <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'p-2',
            viewMode === 'grid' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
          )}
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={cn(
            'p-2',
            viewMode === 'list' ? 'bg-neutral-100' : 'bg-white hover:bg-neutral-50'
          )}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <ListIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export interface FileStatsBarProps {
  total: number;
  search?: string;
  typeFilter: string;
  sourceFilter: string;
}

export function FileStatsBar({ total, search, typeFilter, sourceFilter }: FileStatsBarProps) {
  return (
    <div className="flex items-center gap-4 mb-4 text-sm text-neutral-600">
      <span>{total} file(s)</span>
      {search && <span>matching "{search}"</span>}
      {typeFilter !== 'all' && <span>• Type: {typeFilter}</span>}
      {sourceFilter !== 'all' && <span>• Source: {sourceFilter}</span>}
    </div>
  );
}

export interface FileErrorBarProps {
  error: string;
  onRetry: () => void;
}

export function FileErrorBar({ error, onRetry }: FileErrorBarProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
      <AlertCircle className="h-5 w-5 text-red-500" />
      <p className="text-sm text-red-700">{error}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export interface FileUploadProgressProps {
  uploadProgress: Record<string, number>;
}

export function FileUploadProgress({ uploadProgress }: FileUploadProgressProps) {
  const entries = Object.entries(uploadProgress);
  if (entries.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
        <div className="flex-1">
          <p className="text-sm font-medium text-primary-900">
            Uploading {entries.length} file(s)...
          </p>
          {entries.map(([filename, progress]) => (
            <div key={filename} className="mt-2">
              <div className="flex items-center justify-between text-xs text-primary-700 mb-1">
                <span className="truncate">{filename}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-primary-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
