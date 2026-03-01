import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Archive,
  Clock,
  Eye,
} from 'lucide-react';
import type { NotificationItemProps } from './types';
import type { NotificationAction } from '../../../types/messaging';
import { NotificationIcon, PriorityIndicator, formatTimeAgo } from './NotificationHelpers';

export function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  onSnooze,
  onExecuteAction,
  onDismiss
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [_expanded, _setExpanded] = useState(false);

  const handleAction = (action: NotificationAction) => {
    onExecuteAction(notification.id, action.id, action.data);
  };

  const handleSnooze = () => {
    const until = new Date();
    until.setHours(until.getHours() + 1); // Snooze for 1 hour
    onSnooze(notification.id, until);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`relative group border-b border-gray-100 dark:border-neutral-800 last:border-b-0 ${
        !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-neutral-900'
      } hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => setShowActions(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowActions(false); }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority indicator */}
          <PriorityIndicator priority={notification.priority} />

          {/* Avatar/Icon */}
          <div className="w-8 h-8 bg-gray-100 dark:bg-neutral-700 rounded-full flex items-center justify-center flex-shrink-0">
            {notification.avatar ? (
              <img
                src={notification.avatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <NotificationIcon type={notification.type} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium text-gray-900 dark:text-neutral-100 ${
                    !notification.isRead ? 'font-semibold' : ''
                  }`}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1 line-clamp-2">
                  {notification.message}
                </p>

                {notification.summary && notification.summary !== notification.title && (
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    {notification.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-neutral-500">
                  <span>{formatTimeAgo(notification.createdAt)}</span>
                  {notification.metadata?.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{notification.metadata.category}</span>
                    </>
                  )}
                  {notification.groupCount && notification.groupCount > 1 && (
                    <>
                      <span>•</span>
                      <span>{notification.groupCount} items</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400 dark:text-neutral-500">
                  {formatTimeAgo(notification.createdAt)}
                </span>

                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 ml-2"
                    >
                      {!notification.isRead && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="p-2 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Eye size={14} aria-hidden="true" />
                        </button>
                      )}

                      <button
                        onClick={handleSnooze}
                        className="p-2 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors rounded"
                        title="Snooze for 1 hour"
                        aria-label="Snooze for 1 hour"
                      >
                        <Clock size={14} aria-hidden="true" />
                      </button>

                      <button
                        onClick={() => onArchive(notification.id)}
                        className="p-2 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded"
                        title="Archive"
                        aria-label="Archive"
                      >
                        <Archive size={14} aria-hidden="true" />
                      </button>

                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="p-2 sm:p-1 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
                        title="Dismiss"
                        aria-label="Dismiss"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.variant === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Thumbnail */}
            {notification.thumbnail && (
              <div className="mt-3">
                <img
                  src={notification.thumbnail}
                  alt=""
                  className="w-24 h-16 object-cover rounded-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
