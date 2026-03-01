import { ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';
import type { ActivityItem } from './activity-feed-types';
import { getActivityIcon, getActivityColor, formatTimeAgo } from './activity-feed-utils';

interface ActivityFeedItemProps {
  activity: ActivityItem;
}

export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClasses = getActivityColor(activity.type);

  return (
    <div className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      {/* Activity Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        colorClasses
      )}>
        <Icon size={16} aria-hidden="true" />
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {activity.title}
          </h4>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(activity.timestamp)}
            </span>
            {activity.actionable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={activity.actionable.action}
              >
                <ExternalLink size={10} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {activity.description}
        </p>

        {/* User and Metadata */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={activity.user.avatar} />
              <AvatarFallback className="text-xs">
                {activity.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {activity.user.name}
            </span>
            {activity.user.role && (
              <Badge variant="outline" className="text-xs">
                {activity.user.role}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activity.metadata?.priority && (
              <Badge
                variant={activity.metadata.priority === 'high' || activity.metadata.priority === 'critical' ? 'error' : 'secondary'}
                className="text-xs"
              >
                {activity.metadata.priority}
              </Badge>
            )}
            {activity.metadata?.attachmentCount && activity.metadata.attachmentCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {activity.metadata.attachmentCount} files
              </Badge>
            )}
          </div>
        </div>

        {/* Tags */}
        {activity.metadata?.tags && activity.metadata.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {(activity.metadata.tags || []).slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
