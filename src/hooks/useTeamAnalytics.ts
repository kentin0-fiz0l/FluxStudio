/**
 * useTeamAnalytics — TanStack Query hook for team workload data.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 */

import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

export interface TeamMemberWorkload {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  status: 'balanced' | 'overloaded' | 'idle';
  activeTasks: number;
  estimatedHoursRemaining: number;
  overdueTasks: number;
  tasksByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  completedTasks: number;
  blockedTasks: number;
}

export interface Bottleneck {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
  daysOverdue: number;
}

export interface TeamWorkloadData {
  teamId: string;
  members: TeamMemberWorkload[];
  bottlenecks: Bottleneck[];
}

export function useTeamWorkload(teamId: string | undefined) {
  const { token } = useAuth();
  return useQuery<TeamWorkloadData>({
    queryKey: ['analytics', 'workload', teamId],
    queryFn: async () => {
      const res = await fetch(
        getApiUrl(`/api/analytics/team/${teamId}/workload`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Workload fetch failed (${res.status})`);
      return res.json();
    },
    enabled: !!teamId && !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
