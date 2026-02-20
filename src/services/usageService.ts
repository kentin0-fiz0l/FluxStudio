/**
 * Usage Service — Frontend usage fetching and limit checks
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

import { apiFetch } from '../utils/apiHelpers';
import type { PlanId } from '../config/plans';

export interface UsageData {
  projects: { current: number; limit: number };
  storage: { current: number; limit: number };
  aiCalls: { current: number; limit: number };
  collaborators: { current: number; limit: number };
}

export interface UsageResponse {
  success: boolean;
  usage: UsageData;
  plan: PlanId;
  period: { start: string; end: string };
}

export interface LimitsResponse {
  success: boolean;
  plan: PlanId;
  limits: {
    projects: number;
    storageBytes: number;
    aiCallsPerMonth: number;
    collaborators: number;
  };
}

export type UsageResource = 'projects' | 'storage' | 'aiCalls' | 'collaborators';

/**
 * Fetch current period usage for the authenticated user
 */
export async function fetchUsage(): Promise<UsageResponse> {
  const res = await apiFetch('/api/usage');
  if (!res.ok) throw new Error('Failed to fetch usage');
  return res.json();
}

/**
 * Fetch plan limits for the authenticated user
 */
export async function fetchLimits(): Promise<LimitsResponse> {
  const res = await apiFetch('/api/usage/limits');
  if (!res.ok) throw new Error('Failed to fetch limits');
  return res.json();
}

/**
 * Check if user is at or over the limit for a resource
 * Returns true if at limit (limit is -1 means unlimited, never at limit)
 */
export function isAtLimit(usage: UsageData, resource: UsageResource): boolean {
  const { current, limit } = usage[resource];
  if (limit === -1) return false;
  return current >= limit;
}

/**
 * Get usage percentage for progress bars (0-100)
 * Returns 0 for unlimited resources
 */
export function getUsagePercentage(usage: UsageData, resource: UsageResource): number {
  const { current, limit } = usage[resource];
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Get color class for usage percentage
 */
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-green-500';
}
