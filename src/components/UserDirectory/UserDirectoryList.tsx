/**
 * UserDirectoryList - User cards container with empty state
 */

import { Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserCard } from './UserCard';
import type { UserDirectoryListProps } from './user-directory-types';

export function UserDirectoryList({
  users,
  viewMode,
  searchQuery,
  hasActiveFilters,
  onConnect,
  onMessage,
  onViewProfile,
  onClearSearch,
}: UserDirectoryListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No users found</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {searchQuery || hasActiveFilters
            ? 'Try adjusting your search or filters'
            : 'No users available at the moment'}
        </p>
        {(searchQuery || hasActiveFilters) && (
          <button
            onClick={onClearSearch}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
          >
            Clear search and filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      )}
    >
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          viewMode={viewMode}
          onConnect={() => onConnect?.(user.id)}
          onMessage={() => onMessage?.(user.id)}
          onViewProfile={() => onViewProfile(user)}
        />
      ))}
    </div>
  );
}
