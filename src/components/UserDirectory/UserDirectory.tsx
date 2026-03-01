/**
 * UserDirectory - Thin shell component composing extracted sub-components
 */

import { Users, Grid3X3, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserDirectory } from '../../hooks/useUserDirectory';
import { UserDirectoryFilters } from './UserDirectoryFilters';
import { UserDirectoryList } from './UserDirectoryList';
import { UserDetailModal } from './UserDetailModal';
import type { UserDirectoryProps } from './user-directory-types';

export const UserDirectory: React.FC<UserDirectoryProps> = ({
  currentUserId = '1',
  onConnect,
  onMessage,
}) => {
  const {
    filteredUsers,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    showFilters,
    setShowFilters,
    selectedUser,
    showUserModal,
    openUserModal,
    closeUserModal,
    filters,
    filterOptions,
    toggleFilter,
    clearFilters,
    hasActiveFilters,
  } = useUserDirectory(currentUserId);

  const activeFilterCount = Object.values(filters).reduce(
    (count, filter) => count + (Array.isArray(filter) ? filter.length : filter ? 1 : 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" aria-hidden="true" />
                <span>User Directory</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Discover and connect with {filteredUsers.length} talented professionals
              </p>
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Grid3X3 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <List className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <UserDirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortValue={`${sortBy}-${sortDirection}`}
          onSortChange={(sort, direction) => {
            setSortBy(sort as typeof sortBy);
            setSortDirection(direction as typeof sortDirection);
          }}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          filterOptions={filterOptions}
          filters={filters}
          onToggleFilter={toggleFilter}
          onClearFilters={clearFilters}
        />

        <UserDirectoryList
          users={filteredUsers}
          viewMode={viewMode}
          searchQuery={searchQuery}
          hasActiveFilters={hasActiveFilters}
          onConnect={onConnect}
          onMessage={onMessage}
          onViewProfile={openUserModal}
          onClearSearch={() => {
            setSearchQuery('');
            clearFilters();
          }}
        />

        <UserDetailModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={closeUserModal}
          onConnect={onConnect}
          onMessage={onMessage}
        />
      </div>
    </div>
  );
};
