/**
 * UserDirectoryFilters - Search, sort, and filter controls for User Directory
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface UserDirectoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortValue: string;
  onSortChange: (sortBy: string, direction: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  filterOptions: {
    roles: string[];
    locations: string[];
    organizations: string[];
  };
  filters: {
    roles: string[];
    locations: string[];
    organizations: string[];
    isOnline?: boolean;
  };
  onToggleFilter: (type: 'roles' | 'locations' | 'organizations' | 'skills' | 'isOnline', value: string | boolean) => void;
  onClearFilters: () => void;
}

export function UserDirectoryFilters({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortValue,
  onSortChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  activeFilterCount,
  filterOptions,
  filters,
  onToggleFilter,
  onClearFilters,
}: UserDirectoryFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, skills, organization..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sort and Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              value={sortValue}
              onChange={(e) => {
                const [sort, direction] = e.target.value.split('-');
                onSortChange(sort, direction);
              }}
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="joinDate-desc">Newest First</option>
              <option value="joinDate-asc">Oldest First</option>
              <option value="activity-desc">Most Active</option>
              <option value="connections-desc">Most Connected</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <button
            onClick={onToggleFilters}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
              hasActiveFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* View Mode Toggle (moved into header) */}
      <div className="flex items-center justify-end mt-4 lg:hidden">
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-2 rounded transition-colors',
              viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FilterCheckboxGroup
                label="Role"
                options={filterOptions.roles}
                selected={filters.roles}
                onToggle={(value) => onToggleFilter('roles', value)}
              />
              <FilterCheckboxGroup
                label="Location"
                options={filterOptions.locations}
                selected={filters.locations}
                onToggle={(value) => onToggleFilter('locations', value)}
              />
              <FilterCheckboxGroup
                label="Organization"
                options={filterOptions.organizations}
                selected={filters.organizations}
                onToggle={(value) => onToggleFilter('organizations', value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.isOnline === true}
                      onChange={() => onToggleFilter('isOnline', true)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Online now</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={onClearFilters} className="text-sm text-gray-600 hover:text-gray-800 underline">
                Clear all filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterCheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {options.map(option => (
          <label key={option} className="flex items-center">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
