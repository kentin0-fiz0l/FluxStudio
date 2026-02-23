import React, { useState } from 'react';
import { Bell, Check, Info, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'ai';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
}

export const SmartNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const now = Date.now();
    return [
      {
        id: '1',
        type: 'ai',
        title: 'AI Analysis Complete',
        message: '15 files have been analyzed and tagged',
        timestamp: new Date(now),
        read: false,
        actionable: true,
      },
      {
        id: '2',
        type: 'success',
        title: 'Upload Successful',
        message: 'Your files have been uploaded successfully',
        timestamp: new Date(now - 300000),
        read: false,
      },
    ];
  });

  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Sparkles className="w-5 h-5 text-purple-500" aria-hidden="true" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" aria-hidden="true" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{notification.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {notification.timestamp.toLocaleTimeString()}
                        </span>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartNotifications;
