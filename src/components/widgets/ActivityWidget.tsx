// React import not needed with JSX transform
import { useActivityData } from '../../hooks/useRealTimeData';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { WidgetProps } from './types';
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  FileText,
  MessageSquare,
  Upload,
  Settings,
  Clock,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  description: string;
  user: string;
  timestamp: Date;
}

export function ActivityWidget(props: WidgetProps) {
  const { data: activities, isLoading, error, lastUpdated, refresh } = useActivityData();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_update':
        return <Settings className="h-3 w-3" aria-hidden="true" />;
      case 'file_upload':
        return <Upload className="h-3 w-3" aria-hidden="true" />;
      case 'comment_added':
        return <MessageSquare className="h-3 w-3" aria-hidden="true" />;
      case 'status_change':
        return <Activity className="h-3 w-3" aria-hidden="true" />;
      default:
        return <FileText className="h-3 w-3" aria-hidden="true" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'project_update':
        return 'bg-blue-500/20 text-blue-400';
      case 'file_upload':
        return 'bg-green-500/20 text-green-400';
      case 'comment_added':
        return 'bg-purple-500/20 text-purple-400';
      case 'status_change':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const dateObj = timestamp instanceof Date ? timestamp : new Date(timestamp);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Recent Activity',
        description: 'Latest updates from your projects',
      }}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1" title={error ? `Error: ${error}` : `Last updated: ${lastUpdated && lastUpdated instanceof Date && !isNaN(lastUpdated.getTime()) ? lastUpdated.toLocaleTimeString() : 'Never'}`}>
            {error ? (
              <WifiOff className="h-3 w-3 text-red-400" aria-hidden="true" />
            ) : (
              <Wifi className="h-3 w-3 text-green-400" aria-hidden="true" />
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>

          <Activity className="h-4 w-4 text-blue-400" aria-hidden="true" />
        </div>
      }
    >
      {/* Loading State */}
      {isLoading && (!activities || activities.length === 0) && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-white/50" aria-hidden="true" />
          <span className="ml-2 text-white/70">Loading activity...</span>
        </div>
      )}

      {/* Error State */}
      {error && (!activities || activities.length === 0) && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <WifiOff className="h-8 w-8 text-red-400 mb-2" aria-hidden="true" />
          <p className="text-red-400 text-sm font-medium">Connection Error</p>
          <p className="text-gray-400 text-xs mb-3">{error}</p>
          <Button
            size="sm"
            onClick={refresh}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Activity List */}
      {(!error || (activities && activities.length > 0)) && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activities && activities.length > 0 ? (
              activities.slice(0, 5).map((activity: ActivityItem, index: number) => (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Activity Icon */}
                    <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white text-sm truncate">
                          {activity.title}
                        </h4>
                        <Badge className="text-xs bg-white/10 text-white/70 border-white/20">
                          {activity.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                        {activity.description}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden="true" />
                          <span>{activity.user}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          <span>{formatTimeAgo(new Date(activity.timestamp))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-gray-500 mb-3" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white mb-2">No recent activity</h3>
                <p className="text-gray-400 text-sm">
                  Activity will appear here as your team works on projects
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Subtle loading indicator for updates */}
          {isLoading && activities && activities.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-2"
            >
              <div className="h-1 w-1 bg-blue-400 rounded-full animate-pulse" />
              <div className="ml-2 text-xs text-gray-400">Checking for updates...</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          View All Activity
        </Button>
      </div>
    </BaseWidget>
  );
}