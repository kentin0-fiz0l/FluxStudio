import * as React from 'react';

interface PluginEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PluginEmptyState({ icon, title, description, action }: PluginEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-neutral-300 dark:text-neutral-600 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{description}</p>
      {action}
    </div>
  );
}
