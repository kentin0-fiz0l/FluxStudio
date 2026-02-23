/**
 * Print History Component
 * Phase 2.5: Database Integration
 *
 * Displays historical print jobs with project linking,
 * status tracking, and detailed information.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Folder,
  RefreshCw,
  Filter,
} from 'lucide-react';
import type { PrintJobHistoryItem, PrintJobStatus } from '../../types/printing';

interface PrintHistoryProps {
  limit?: number;
  className?: string;
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format date to readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge variant and icon
 */
function getStatusInfo(status: PrintJobStatus): {
  variant: 'success' | 'error' | 'secondary' | 'default';
  icon: React.ReactNode;
  label: string;
} {
  switch (status) {
    case 'completed':
      return {
        variant: 'success',
        icon: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
        label: 'Completed',
      };
    case 'failed':
      return {
        variant: 'error',
        icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
        label: 'Failed',
      };
    case 'canceled':
      return {
        variant: 'secondary',
        icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
        label: 'Canceled',
      };
    default:
      return {
        variant: 'default',
        icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
        label: status,
      };
  }
}

export default function PrintHistory({ limit = 20, className = '' }: PrintHistoryProps) {
  const [history, setHistory] = useState<PrintJobHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use filter endpoint if project is selected
      const endpoint = selectedProjectId !== 'all'
        ? `/api/printing/jobs/history/filter?project_id=${selectedProjectId}&limit=${limit}`
        : `/api/printing/jobs/history?limit=${limit}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch print history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch print history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects?.map((p: Record<string, unknown>) => ({
          id: p.id,
          title: p.title
        })) || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchHistory();

    // Refresh every 60 seconds
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [limit, selectedProjectId]);

  if (isLoading && history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Print History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full ml-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-18 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Print History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" role="alert" aria-live="polite">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" aria-hidden="true" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={fetchHistory} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Print History</CardTitle>
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger className="w-48">
                  <Filter className="w-3 h-3 mr-2" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="w-3 h-3" aria-hidden="true" />
                        {project.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={fetchHistory}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>No print history yet</p>
            <p className="text-xs mt-1">Completed prints will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {history.map((job) => {
              const statusInfo = getStatusInfo(job.status);

              return (
                <div
                  key={job.id}
                  className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{job.fileName}</div>
                      {job.project_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <Folder className="w-3 h-3" aria-hidden="true" />
                          <span className="truncate">{job.project_name}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1 ml-2">
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Duration</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                        {formatDuration(job.duration_seconds)}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Completed</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                        {job.completedAt ? formatDate(job.completedAt) : 'N/A'}
                      </div>
                    </div>

                    {job.materialType && (
                      <div className="col-span-2">
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Material</div>
                        <div className="mt-0.5">
                          {job.materialType}
                          {job.materialColor && ` (${job.materialColor})`}
                          {job.materialUsed && ` - ${job.materialUsed.toFixed(1)}g`}
                        </div>
                      </div>
                    )}

                    {job.errorMessage && (
                      <div className="col-span-2">
                        <div className="text-red-600 dark:text-red-400 text-xs mb-1">Error</div>
                        <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {job.errorMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Indicator (if not 100%) */}
                  {job.progress < 100 && job.status !== 'completed' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{job.progress.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show More Button */}
        {history.length >= limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" disabled>
              Showing {limit} most recent jobs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
