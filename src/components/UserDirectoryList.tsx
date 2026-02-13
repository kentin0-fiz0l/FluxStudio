/**
 * UserDirectoryList - User cards (grid/list view) and detail modal for User Directory
 */

import { motion } from 'framer-motion';
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
        <Users className="w-24 h-24 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">No users found</h3>
        <p className="text-gray-600 mb-4">
          {searchQuery || hasActiveFilters
            ? 'Try adjusting your search or filters'
            : 'No users available at the moment'}
        </p>
        {(searchQuery || hasActiveFilters) && (
          <button
            onClick={onClearSearch}
            className="text-blue-600 hover:text-blue-700 underline"
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

function UserCard({ user, viewMode, onConnect, onMessage, onViewProfile }: UserCardProps) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-600">{user.title}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
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
            <button onClick={onViewProfile} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={onMessage} className="p-2 text-blue-400 hover:text-blue-600 transition-colors">
              <MessageSquare className="w-4 h-4" />
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-medium text-lg">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            )}
          </div>
          {user.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-1">{user.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{user.title}</p>

        <div className="space-y-1 text-xs text-gray-500 mb-4">
          {user.organization && (
            <div className="flex items-center justify-center space-x-1">
              <Building className="w-3 h-3" />
              <span>{user.organization}</span>
            </div>
          )}
          {user.location && (
            <div className="flex items-center justify-center space-x-1">
              <MapPin className="w-3 h-3" />
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
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {skill}
                </span>
              ))}
              {user.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{user.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={onViewProfile}
            className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            View Profile
          </button>
          <button onClick={onMessage} className="p-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={onConnect} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Header */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white font-medium text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-3 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-lg text-gray-600">{user.title}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                {user.organization && (
                  <span className="flex items-center space-x-1">
                    <Building className="w-4 h-4" />
                    <span>{user.organization}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </span>
                )}
                {user.joinedAt && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              {user.mutualConnections && (
                <p className="text-sm text-blue-600 mt-1">
                  {user.mutualConnections} mutual connections
                </p>
              )}
            </div>
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Skills & Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => onConnect?.(user.id)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Connect</span>
            </button>
            <button
              onClick={() => onMessage?.(user.id)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
