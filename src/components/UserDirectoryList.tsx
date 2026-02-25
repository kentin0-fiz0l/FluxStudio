/**
 * UserDirectoryList - User cards (grid/list view) and detail modal for User Directory
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LazyImage } from '@/components/LazyImage';
import {
  Users,
  MapPin,
  Mail,
  MessageSquare,
  UserPlus,
  Eye,
  X,
  Calendar,
  Building,
} from 'lucide-react';
import { UserSearchResult } from './search/UserSearch';
import { cn } from '../lib/utils';

// ============================================================================
// UserDirectoryList
// ============================================================================

interface UserDirectoryListProps {
  users: UserSearchResult[];
  viewMode: 'grid' | 'list';
  searchQuery: string;
  hasActiveFilters: boolean;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onViewProfile: (user: UserSearchResult) => void;
  onClearSearch: () => void;
}

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

// ============================================================================
// UserCard
// ============================================================================

interface UserCardProps {
  user: UserSearchResult;
  viewMode: 'grid' | 'list';
  onConnect: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
}

const UserCard = React.memo(function UserCard({ user, viewMode, onConnect, onMessage, onViewProfile }: UserCardProps) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <LazyImage src={user.avatar} alt={user.name} width={48} height={48} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.title}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-3 h-3" aria-hidden="true" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    <span>{user.location}</span>
                  </span>
                )}
                {user.mutualConnections && (
                  <span>{user.mutualConnections} mutual connections</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onViewProfile} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={`View ${user.name}'s profile`}>
              <Eye className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={onMessage} className="p-2 text-blue-400 hover:text-blue-600 transition-colors" aria-label={`Message ${user.name}`}>
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={onConnect} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            {user.avatar ? (
              <LazyImage src={user.avatar} alt={user.name} width={64} height={64} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-medium text-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            )}
          </div>
          {user.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          )}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{user.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{user.title}</p>

        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
          {user.organization && (
            <div className="flex items-center justify-center space-x-1">
              <Building className="w-3 h-3" aria-hidden="true" />
              <span>{user.organization}</span>
            </div>
          )}
          {user.location && (
            <div className="flex items-center justify-center space-x-1">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              <span>{user.location}</span>
            </div>
          )}
          {user.mutualConnections && (
            <div>{user.mutualConnections} mutual connections</div>
          )}
        </div>

        {user.skills && user.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1 justify-center">
              {user.skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                  {skill}
                </span>
              ))}
              {user.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full">
                  +{user.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={onViewProfile}
            className="flex-1 px-3 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            View Profile
          </button>
          <button onClick={onMessage} className="p-2 text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" aria-label={`Message ${user.name}`}>
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          </button>
          <button onClick={onConnect} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" aria-label={`Connect with ${user.name}`}>
            <UserPlus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// UserDetailModal
// ============================================================================

interface UserDetailModalProps {
  user: UserSearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export function UserDetailModal({ user, isOpen, onClose, onConnect, onMessage }: UserDetailModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">User Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close user profile">
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Header */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <LazyImage src={user.avatar} alt={user.name} width={80} height={80} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-3 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">{user.title}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-4 h-4" aria-hidden="true" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span>{user.location}</span>
                  </span>
                )}
                {user.joinedAt && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              {user.mutualConnections && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {user.mutualConnections} mutual connections
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Skills & Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm rounded-full border border-blue-200 dark:border-blue-800">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onConnect?.(user.id)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>Connect</span>
            </button>
            <button
              onClick={() => onMessage?.(user.id)}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
