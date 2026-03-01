import { Activity } from 'lucide-react';

export function ActivityFeedEmptyState() {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <Activity size={32} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
      <p>No activity yet</p>
      <p className="text-sm">Activity will appear here as you work</p>
    </div>
  );
}
