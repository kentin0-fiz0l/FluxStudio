/**
 * UserCard - Individual user card for grid/list views
 */

import React from 'react';
import { LazyImage } from '@/components/LazyImage';
import {
  MapPin,
  MessageSquare,
  UserPlus,
  Eye,
  Building,
} from 'lucide-react';
import type { UserCardProps } from './user-directory-types';

export const UserCard = React.memo(function UserCard({ user, viewMode, onConnect, onMessage, onViewProfile }: UserCardProps) {
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
