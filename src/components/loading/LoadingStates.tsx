/**
 * Loading States and Skeleton Screens
 * Barrel file — re-exports all skeleton components for backward compatibility
 */

import { cn } from '../../lib/utils';
import { DashboardSkeleton } from './DashboardSkeleton';
import { WorkflowSkeleton } from './WorkflowSkeleton';
import { MessagingSkeleton } from './MessagingSkeleton';
import { NotificationSkeleton } from './NotificationSkeleton';
import { CollaborationSkeleton } from './CollaborationSkeleton';
import { ProjectDetailSkeleton } from './ProjectSkeletons';
import { FormationEditorSkeleton, SettingsSkeleton } from './FeatureSkeletons';

export { DashboardSkeleton } from './DashboardSkeleton';
export { WorkflowSkeleton } from './WorkflowSkeleton';
export { MessagingSkeleton } from './MessagingSkeleton';
export { NotificationSkeleton } from './NotificationSkeleton';
export { CollaborationSkeleton } from './CollaborationSkeleton';
export { ProjectCardSkeleton, ProjectDetailSkeleton } from './ProjectSkeletons';
export { ChartSkeleton, MetricCardSkeleton, TableSkeleton, ActivityFeedSkeleton } from './DataSkeletons';
export { FormationEditorSkeleton, SettingsSkeleton, WidgetSkeleton } from './FeatureSkeletons';

interface LoadingScreenProps {
  type: 'dashboard' | 'workflow' | 'messaging' | 'notification' | 'collaboration' | 'projectDetail' | 'formationEditor' | 'settings';
  className?: string;
}

export function LoadingScreen({ type, className }: LoadingScreenProps) {
  const components = {
    dashboard: DashboardSkeleton,
    workflow: WorkflowSkeleton,
    messaging: MessagingSkeleton,
    notification: NotificationSkeleton,
    collaboration: CollaborationSkeleton,
    projectDetail: ProjectDetailSkeleton,
    formationEditor: FormationEditorSkeleton,
    settings: SettingsSkeleton,
  };

  const Component = components[type];

  return (
    <div className={cn(className)}>
      <Component />
    </div>
  );
}

export default LoadingScreen;
