/**
 * useProjectAnalytics — TanStack Query hooks for project analytics data.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 */

import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

interface HealthBreakdownItem {
  score: number;
  weight: number;
  detail: string;
}

export interface ProjectHealth {
  projectId: string;
  score: number;
  completionScore: number;
  velocityScore: number;
  momentumScore: number;
  overdueScore: number;
  breakdown: {
    completion: HealthBreakdownItem;
    velocity: HealthBreakdownItem;
    momentum: HealthBreakdownItem;
    overdue: HealthBreakdownItem;
  };
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    blocked: number;
    overdue: number;
  };
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  completed: number;
}

export interface BurndownData {
  projectId: string;
  totalTasks: number;
  burndown: BurndownPoint[];
}

export interface VelocityData {
  projectId: string;
  weeklyVelocity: number[];
  avgCycleTimeDays: number;
  estimationAccuracy: number;
  remainingTasks: number;
  forecast: {
    projectedWeeks: number | null;
    projectedDate: string | null;
    riskLevel: string;
    avgVelocity: number;
  };
}

export interface RiskData {
  projectId: string;
  forecast: {
    projectedWeeks: number | null;
    projectedDate: string | null;
    riskLevel: string;
    avgVelocity: number;
  };
  dueDate: string | null;
  remainingTasks: number;
  atRiskTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    estimatedHours: number;
    assignedTo: string | null;
    riskType: 'overdue' | 'due-soon' | 'normal';
    daysOverdue: number;
  }[];
  healthHistory: { date: string; score: number }[];
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Analytics fetch failed (${res.status})`);
  return res.json();
}

export function useProjectHealth(projectId: string | undefined) {
  const { token } = useAuth();
  return useQuery<ProjectHealth>({
    queryKey: ['analytics', 'health', projectId],
    queryFn: () => fetchJson<ProjectHealth>(
      getApiUrl(`/api/analytics/project/${projectId}/health`),
      token!
    ),
    enabled: !!projectId && !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useProjectBurndown(projectId: string | undefined) {
  const { token } = useAuth();
  return useQuery<BurndownData>({
    queryKey: ['analytics', 'burndown', projectId],
    queryFn: () => fetchJson<BurndownData>(
      getApiUrl(`/api/analytics/project/${projectId}/burndown`),
      token!
    ),
    enabled: !!projectId && !!token,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function useProjectVelocity(projectId: string | undefined) {
  const { token } = useAuth();
  return useQuery<VelocityData>({
    queryKey: ['analytics', 'velocity', projectId],
    queryFn: () => fetchJson<VelocityData>(
      getApiUrl(`/api/analytics/project/${projectId}/velocity`),
      token!
    ),
    enabled: !!projectId && !!token,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function useProjectRisks(projectId: string | undefined) {
  const { token } = useAuth();
  return useQuery<RiskData>({
    queryKey: ['analytics', 'risks', projectId],
    queryFn: () => fetchJson<RiskData>(
      getApiUrl(`/api/analytics/project/${projectId}/risks`),
      token!
    ),
    enabled: !!projectId && !!token,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
