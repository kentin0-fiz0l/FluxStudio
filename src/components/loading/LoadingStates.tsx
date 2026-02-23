/**
 * Loading States and Skeleton Screens
 * Improved perceived performance with progressive loading
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton, SkeletonCard } from '../ui/skeleton';
import { cn } from '../../lib/utils';

export function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-6" role="status" aria-busy="true" aria-label="Loading dashboard">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton animation="shimmer" className="h-8 w-80" />
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-6 w-16" />
            <Skeleton animation="shimmer" className="h-6 w-20" />
            <Skeleton animation="shimmer" className="h-6 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton animation="shimmer" className="h-10 w-32" />
          <Skeleton animation="shimmer" className="h-10 w-28" />
        </div>
      </div>

      {/* Contextual Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-l-4 border-l-neutral-200 dark:border-l-neutral-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton animation="shimmer" className="w-5 h-5 rounded" />
                  <Skeleton animation="shimmer" className="h-4 w-24" />
                </div>
                <Skeleton animation="shimmer" className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton animation="shimmer" className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Tabs Skeleton */}
            <div className="flex space-x-2">
              {['Activity', 'Workflows', 'AI Assistant', 'Stats'].map((tab) => (
                <Skeleton key={tab} animation="shimmer" className="h-10 w-20" />
              ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton animation="shimmer" className="h-4 w-48" />
                        <Skeleton animation="shimmer" className="h-3 w-16" />
                      </div>
                      <Skeleton animation="shimmer" className="h-3 w-full" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton animation="shimmer" className="w-5 h-5 rounded-full" />
                          <Skeleton animation="shimmer" className="h-3 w-20" />
                        </div>
                        <Skeleton animation="shimmer" className="h-6 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <Skeleton animation="shimmer" className="h-5 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton animation="shimmer" className="h-4 w-20" />
                        <Skeleton animation="shimmer" className="h-5 w-8" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WorkflowSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading workflows">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton animation="shimmer" className="h-8 w-48" />
          <Skeleton animation="shimmer" className="h-4 w-80" />
        </div>
        <Skeleton animation="shimmer" className="h-10 w-32" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton animation="shimmer" className="h-10 flex-1" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} animation="shimmer" className="h-8 w-20" />
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} animation="shimmer" contentLines={2} showFooter />
        ))}
      </div>
    </div>
  );
}

export function MessagingSkeleton() {
  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden" role="status" aria-busy="true" aria-label="Loading messages">
      {/* Sidebar */}
      <div className="w-80 border-r bg-neutral-50 dark:bg-neutral-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton animation="shimmer" className="h-6 w-24" />
          <Skeleton animation="shimmer" variant="circular" size="sm" />
        </div>
        <Skeleton animation="shimmer" className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton animation="shimmer" variant="avatar" size="md" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Skeleton animation="shimmer" className="h-4 w-20" />
                  <Skeleton animation="shimmer" className="h-3 w-8" />
                </div>
                <Skeleton animation="shimmer" className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton animation="shimmer" variant="avatar" size="sm" />
              <div className="space-y-1">
                <Skeleton animation="shimmer" className="h-4 w-32" />
                <Skeleton animation="shimmer" className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(
              "flex gap-3",
              i % 2 === 0 ? "flex-row-reverse" : ""
            )}>
              <Skeleton animation="shimmer" variant="avatar" size="sm" />
              <div className={cn(
                "max-w-xs space-y-1",
                i % 2 === 0 ? "items-end" : "items-start"
              )}>
                <Skeleton animation="shimmer" className="h-3 w-16" />
                <Skeleton animation="shimmer" className={cn(
                  "h-8 rounded-lg",
                  i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-32" : "w-56"
                )} />
                <Skeleton animation="shimmer" className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
            <Skeleton animation="shimmer" className="h-10 flex-1" />
            <Skeleton animation="shimmer" className="h-10 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <Card className="w-full max-w-96 max-h-[600px]" role="status" aria-busy="true" aria-label="Loading notifications">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="w-5 h-5" />
            <Skeleton animation="shimmer" className="h-5 w-24" />
            <Skeleton animation="shimmer" className="h-5 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-8 w-8" />
            <Skeleton animation="shimmer" className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {['All', 'Unread', 'Actionable'].map((filter) => (
            <Skeleton key={filter} animation="shimmer" className="h-7 w-16" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex gap-3">
                <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <Skeleton animation="shimmer" className="h-4 w-48" />
                    <Skeleton animation="shimmer" variant="circular" className="w-2 h-2" />
                  </div>
                  <Skeleton animation="shimmer" className="h-3 w-full" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton animation="shimmer" className="h-3 w-12" />
                      <Skeleton animation="shimmer" className="h-3 w-16" />
                    </div>
                    <Skeleton animation="shimmer" className="h-6 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CollaborationSkeleton() {
  return (
    <div className="absolute top-4 right-4" role="status" aria-busy="true" aria-label="Loading collaboration panel">
      <Card className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" className="w-4 h-4" />
              <Skeleton animation="shimmer" className="h-4 w-32" />
            </div>
            <Skeleton animation="shimmer" className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Skeleton animation="shimmer" variant="avatar" size="sm" />
                    <Skeleton animation="shimmer" className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton animation="shimmer" className="h-3 w-20" />
                    <Skeleton animation="shimmer" className="h-2 w-16" />
                  </div>
                </div>
                <Skeleton animation="shimmer" className="h-5 w-12" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <Skeleton animation="shimmer" className="h-8 flex-1" />
            <Skeleton animation="shimmer" className="h-8 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Project Card Skeleton - For project list loading
 */
export function ProjectCardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading project">
      <SkeletonCard animation="shimmer" showHeader showFooter contentLines={2} />
    </div>
  );
}

/**
 * Activity Feed Skeleton - For activity list loading
 */
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading activity feed">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton animation="shimmer" className="h-4 w-3/4" />
              <Skeleton animation="shimmer" className="h-3 w-12" />
            </div>
            <Skeleton animation="shimmer" className="h-3 w-full" />
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" variant="avatar" size="sm" className="w-5 h-5" />
              <Skeleton animation="shimmer" className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Project Detail Skeleton - For project detail page loading
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col h-full" role="status" aria-busy="true" aria-label="Loading project details">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-neutral-900 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-7 w-64" />
            </div>
            <div className="flex items-center gap-3 ml-12">
              <Skeleton animation="shimmer" className="h-6 w-20 rounded-full" />
              <Skeleton animation="shimmer" className="h-6 w-28 rounded-full" />
              <Skeleton animation="shimmer" className="h-6 w-24" />
              <Skeleton animation="shimmer" className="h-6 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-9 w-20" />
            <Skeleton animation="shimmer" className="h-9 w-24" />
            <Skeleton animation="shimmer" className="h-9 w-9" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="border-b px-6 py-2">
        <div className="flex gap-1">
          {['Overview', 'Tasks', 'Documents', 'Files', 'Assets', 'Boards', 'Messages'].map((tab) => (
            <Skeleton key={tab} animation="shimmer" className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton animation="shimmer" className="h-6 w-48" />
        <Skeleton animation="shimmer" className="h-4 w-full" />
        <Skeleton animation="shimmer" className="h-4 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} animation="shimmer" contentLines={3} showFooter />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Chart Skeleton - For dashboard charts
 */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton animation="shimmer" className="h-5 w-32" />
        <Skeleton animation="shimmer" className="h-8 w-24" />
      </div>
      <Skeleton animation="shimmer" className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

/**
 * Metric Card Skeleton - For stat cards
 */
export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton animation="shimmer" className="h-4 w-20" />
            <Skeleton animation="shimmer" className="h-8 w-16" />
          </div>
          <Skeleton animation="shimmer" className="h-12 w-12 rounded-lg" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton animation="shimmer" className="h-4 w-12" />
          <Skeleton animation="shimmer" className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Table Skeleton - For table loading states
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} animation="shimmer" className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} animation="shimmer" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LoadingScreenProps {
  type: 'dashboard' | 'workflow' | 'messaging' | 'notification' | 'collaboration' | 'projectDetail' | 'formationEditor' | 'settings';
  className?: string;
}

/**
 * Formation Editor Skeleton — canvas + toolbar + timeline
 */
export function FormationEditorSkeleton() {
  return (
    <div className="flex flex-col h-full" role="status" aria-busy="true" aria-label="Loading formation editor">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-700">
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <div className="flex-1" />
        <Skeleton animation="shimmer" className="h-8 w-24 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-20 rounded" />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-800">
        {/* Grid lines hint */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Skeleton animation="shimmer" className="h-32 w-32 rounded-lg mx-auto" />
            <Skeleton animation="shimmer" className="h-4 w-40 mx-auto" />
          </div>
        </div>
        {/* Fake performer dots */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            animation="shimmer"
            className="absolute w-6 h-6 rounded-full"
            style={{
              top: `${20 + i * 12}%`,
              left: `${15 + i * 14}%`,
            }}
          />
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="h-16 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3 px-4">
        <Skeleton animation="shimmer" className="h-8 w-8 rounded-full" />
        <Skeleton animation="shimmer" className="h-2 flex-1 rounded-full" />
        <Skeleton animation="shimmer" className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * Settings Skeleton — form sections with toggles and inputs
 */
export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6" role="status" aria-busy="true" aria-label="Loading settings">
      {/* Profile section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton animation="shimmer" className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton animation="shimmer" className="h-4 w-48" />
              <Skeleton animation="shimmer" className="h-3 w-32" />
            </div>
          </div>
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Notifications section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton animation="shimmer" className="h-4 w-36" />
                <Skeleton animation="shimmer" className="h-3 w-56" />
              </div>
              <Skeleton animation="shimmer" className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
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
