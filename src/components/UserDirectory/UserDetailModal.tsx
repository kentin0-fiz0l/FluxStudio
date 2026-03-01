/**
 * UserDetailModal - Full profile modal for user details
 */

import { motion } from 'framer-motion';
import { LazyImage } from '@/components/LazyImage';
import {
  MapPin,
  Mail,
  MessageSquare,
  UserPlus,
  X,
  Calendar,
  Building,
} from 'lucide-react';
import type { UserDetailModalProps } from './user-directory-types';

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
