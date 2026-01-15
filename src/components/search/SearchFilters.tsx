/**
 * SearchFilters Component - Flux Studio
 *
 * Filter panel for search results with type, date, project, and other filters.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchResultType, SearchFilters as SearchFiltersType } from '../../services/searchService';
import {
  FolderKanban,
  File,
  CheckSquare,
  MessageSquare,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SearchFiltersProps {
  filters: Partial<SearchFiltersType>;
  facets: {
    types: Record<SearchResultType, number>;
    projects: { id: string; name: string; count: number }[];
  } | null;
  onFilterChange: (filters: Partial<SearchFiltersType>) => void;
  onToggleType: (type: SearchResultType) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchFilters({
  filters,
  facets,
  onFilterChange,
  onToggleType,
  onClearFilters,
  activeFilterCount,
}: SearchFiltersProps) {
  const { t } = useTranslation('common');
  const [expandedSections, setExpandedSections] = useState<string[]>(['types', 'projects']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const typeIcons: Record<SearchResultType, React.ReactNode> = {
    project: <FolderKanban className="w-4 h-4" />,
    file: <File className="w-4 h-4" />,
    task: <CheckSquare className="w-4 h-4" />,
    message: <MessageSquare className="w-4 h-4" />,
  };

  const typeLabels: Record<SearchResultType, string> = {
    project: t('search.types.project', 'Projects'),
    file: t('search.types.file', 'Files'),
    task: t('search.types.task', 'Tasks'),
    message: t('search.types.message', 'Messages'),
  };

  const isTypeSelected = (type: SearchResultType) =>
    filters.types?.includes(type) || false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {t('search.filters.title', 'Filters')}
          </span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            {t('search.filters.clear', 'Clear')}
          </button>
        )}
      </div>

      {/* Content Type Filters */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('types')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('search.filters.contentType', 'Content Type')}
          </span>
          {expandedSections.includes('types') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSections.includes('types') && (
          <div className="px-4 pb-3 space-y-1">
            {(['project', 'file', 'task', 'message'] as SearchResultType[]).map(type => (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                  isTypeSelected(type)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {typeIcons[type]}
                  <span className="text-sm">{typeLabels[type]}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {facets?.types[type] || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Project Filters */}
      {facets?.projects && facets.projects.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection('projects')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('search.filters.project', 'Project')}
            </span>
            {expandedSections.includes('projects') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.includes('projects') && (
            <div className="px-4 pb-3 space-y-1 max-h-48 overflow-y-auto">
              {facets.projects.map(project => {
                const isSelected = filters.projectIds?.includes(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      const currentIds = filters.projectIds || [];
                      const newIds = isSelected
                        ? currentIds.filter(id => id !== project.id)
                        : [...currentIds, project.id];
                      onFilterChange({ ...filters, projectIds: newIds });
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-sm truncate">{project.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {project.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('date')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('search.filters.dateRange', 'Date Range')}
          </span>
          {expandedSections.includes('date') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSections.includes('date') && (
          <div className="px-4 pb-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('search.filters.from', 'From')}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: e.target.value, end: filters.dateRange?.end || null },
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('search.filters.to', 'To')}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: filters.dateRange?.start || null, end: e.target.value },
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            {/* Quick date presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('search.filters.today', 'Today'), days: 0 },
                { label: t('search.filters.week', 'Week'), days: 7 },
                { label: t('search.filters.month', 'Month'), days: 30 },
                { label: t('search.filters.year', 'Year'), days: 365 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
                    onFilterChange({
                      ...filters,
                      dateRange: { start, end },
                    });
                  }}
                  className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchFilters;
