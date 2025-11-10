/**
 * ProjectPrintStats Component
 * Phase 3D: Project Integration
 *
 * Displays comprehensive 3D printing statistics for a specific project,
 * including success rates, material usage, and print history.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import {
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  TrendingUp,
  AlertCircle,
  FileText,
  Weight,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrintStats {
  project_id: string;
  total_prints: number;
  successful_prints: number;
  failed_prints: number;
  canceled_prints: number;
  in_progress_prints: number;
  total_material_grams: number;
  total_print_time_minutes: number;
  average_print_time_minutes: number;
  unique_files_printed: number;
  most_printed_file: string | null;
  most_printed_file_count: number;
  last_print_date: string | null;
  first_print_date: string | null;
  success_rate: number;
  failure_rate: number;
}

interface ProjectPrintStatsProps {
  projectId: string;
  className?: string;
  showDetailedView?: boolean;
}

/**
 * Format time in minutes to human-readable format
 */
function formatTime(minutes: number): string {
  if (!minutes || minutes === 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

/**
 * Format weight in grams
 */
function formatWeight(grams: number): string {
  if (!grams || grams === 0) return '0g';

  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }

  return `${Math.round(grams)}g`;
}

/**
 * Format date to relative time
 */
function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString();
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  trend,
  className,
}) => (
  <div className={cn('bg-white border border-neutral-200 rounded-lg p-4', className)}>
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
        {icon}
      </div>
      {trend && (
        <div className={cn(
          'text-xs font-medium px-2 py-1 rounded',
          trend === 'up' && 'text-green-700 bg-green-50',
          trend === 'down' && 'text-red-700 bg-red-50',
          trend === 'neutral' && 'text-gray-700 bg-gray-50'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
        </div>
      )}
    </div>
    <div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-sm text-neutral-600 mt-0.5">{label}</div>
      {subValue && (
        <div className="text-xs text-neutral-500 mt-1">{subValue}</div>
      )}
    </div>
  </div>
);

export default function ProjectPrintStats({
  projectId,
  className = '',
  showDetailedView = false,
}: ProjectPrintStatsProps) {
  const [stats, setStats] = useState<PrintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/printing/projects/${projectId}/stats/detailed`);

        if (!response.ok) {
          throw new Error('Failed to fetch project print statistics');
        }

        const data = await response.json();

        // Handle case where no stats exist yet
        if (data.message === 'No printing activity for this project yet') {
          setStats({
            project_id: projectId,
            total_prints: 0,
            successful_prints: 0,
            failed_prints: 0,
            canceled_prints: 0,
            in_progress_prints: 0,
            total_material_grams: 0,
            total_print_time_minutes: 0,
            average_print_time_minutes: 0,
            unique_files_printed: 0,
            most_printed_file: null,
            most_printed_file_count: 0,
            last_print_date: null,
            first_print_date: null,
            success_rate: 0,
            failure_rate: 0,
          });
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch print stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            3D Printing Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            3D Printing Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No stats available
  if (!stats || stats.total_prints === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            3D Printing Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Printer className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-1">No printing activity yet</p>
            <p className="text-sm text-gray-500">
              Start printing to see statistics for this project
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.href = '/printing'}
            >
              Go to Printing
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = stats.total_prints > 0
    ? Math.round((stats.successful_prints / stats.total_prints) * 100)
    : 0;

  const getTrend = (rate: number): 'up' | 'down' | 'neutral' => {
    if (rate >= 80) return 'up';
    if (rate <= 50) return 'down';
    return 'neutral';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            3D Printing Statistics
          </CardTitle>
          {stats.last_print_date && (
            <Badge variant="outline" className="text-xs">
              Last print: {formatRelativeDate(stats.last_print_date)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Total Prints"
            value={stats.total_prints}
            subValue={`${stats.unique_files_printed} unique files`}
          />

          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Success Rate"
            value={`${successRate}%`}
            subValue={`${stats.successful_prints} completed`}
            trend={getTrend(successRate)}
          />

          <StatCard
            icon={<Weight className="h-5 w-5" />}
            label="Material Used"
            value={formatWeight(stats.total_material_grams)}
            subValue={`${stats.total_prints > 0 ? formatWeight(stats.total_material_grams / stats.total_prints) : '0g'} avg`}
          />

          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Print Time"
            value={formatTime(stats.total_print_time_minutes)}
            subValue={`${formatTime(stats.average_print_time_minutes)} avg`}
          />
        </div>

        {/* Success/Failure Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Print Status Distribution</span>
            <span className="text-xs text-gray-500">
              {stats.in_progress_prints > 0 && `${stats.in_progress_prints} in progress`}
            </span>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
            {stats.successful_prints > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(stats.successful_prints / stats.total_prints) * 100}%` }}
              >
                {stats.successful_prints}
              </div>
            )}
            {stats.failed_prints > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(stats.failed_prints / stats.total_prints) * 100}%` }}
              >
                {stats.failed_prints}
              </div>
            )}
            {stats.canceled_prints > 0 && (
              <div
                className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${(stats.canceled_prints / stats.total_prints) * 100}%` }}
              >
                {stats.canceled_prints}
              </div>
            )}
            {stats.in_progress_prints > 0 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium animate-pulse"
                style={{ width: `${(stats.in_progress_prints / stats.total_prints) * 100}%` }}
              >
                {stats.in_progress_prints}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Successful</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Failed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded" />
              <span>Canceled</span>
            </div>
            {stats.in_progress_prints > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>In Progress</span>
              </div>
            )}
          </div>
        </div>

        {/* Most Printed File */}
        {stats.most_printed_file && showDetailedView && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FileText className="h-4 w-4" />
                  Most Printed File
                </div>
                <div className="font-medium text-gray-900">
                  {stats.most_printed_file}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Printed {stats.most_printed_file_count} times
                </div>
              </div>
              <Badge variant="outline" size="sm">
                Popular
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-500">
            {stats.first_print_date && (
              <span>Active since {formatRelativeDate(stats.first_print_date)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/printing'}
            >
              View Printer
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.href = `/projects/${projectId}/prints`}
            >
              Print History
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}