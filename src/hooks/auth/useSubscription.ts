/**
 * useSubscription Hook
 *
 * Fetches and caches the current user's subscription tier, usage limits,
 * and provides helpers for feature gating on the frontend.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';

export type Tier = 'free' | 'pro' | 'team';

interface UsageData {
  projects: { current: number; limit: number };
  storage: { current: number; limit: number };
  aiCalls: { current: number; limit: number };
  collaborators: { current: number; limit: number };
}

interface TrialInfo {
  isTrialing: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
  canStartTrial: boolean;
}

interface SubscriptionState {
  tier: Tier;
  usage: UsageData | null;
  isLoading: boolean;
  error: string | null;
  hasSubscription: boolean;
  trial: TrialInfo;
}

const TIER_LEVELS: Record<Tier, number> = { free: 0, pro: 1, team: 2 };

/**
 * Feature-to-tier mapping (mirrors backend FEATURE_TIERS in middleware/requireTier.js).
 * Keep in sync with backend definitions.
 */
const FEATURE_TIERS: Record<string, Tier> = {
  ai_drill_writing: 'pro',
  ai_show_critic: 'pro',
  ai_design_analysis: 'pro',
  realtime_collaboration: 'pro',
  collaborator_invite: 'pro',
  export_video: 'pro',
  import_pyware: 'pro',
  api_access: 'team',
  priority_support: 'team',
  custom_branding: 'team',
  sso_authentication: 'team',
};

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    usage: null,
    isLoading: true,
    error: null,
    hasSubscription: false,
    trial: { isTrialing: false, trialEndsAt: null, daysRemaining: 0, canStartTrial: true },
  });

  // Fetch subscription and usage data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [subResponse, usageResponse] = await Promise.allSettled([
          apiService.getSubscription(),
          apiService.getPlanUsage(),
        ]);

        if (cancelled) return;

        let tier: Tier = 'free';
        let hasSubscription = false;
        let trial: TrialInfo = { isTrialing: false, trialEndsAt: null, daysRemaining: 0, canStartTrial: true };

        if (subResponse.status === 'fulfilled' && subResponse.value) {
          const sub = subResponse.value as {
            hasSubscription?: boolean;
            canTrial?: boolean;
            subscription?: { status?: string; trialEndsAt?: string; daysRemaining?: number };
          };
          hasSubscription = !!sub.hasSubscription;
          trial.canStartTrial = sub.canTrial !== false;

          if (sub.subscription?.status === 'trialing') {
            trial.isTrialing = true;
            trial.trialEndsAt = sub.subscription.trialEndsAt ?? null;
            trial.daysRemaining = sub.subscription.daysRemaining ?? 0;
          }
        }

        // Usage response includes the plan
        let usage: UsageData | null = null;
        if (usageResponse.status === 'fulfilled' && usageResponse.value) {
          const data = usageResponse.value as { plan?: string; usage?: UsageData };
          if (data.plan && TIER_LEVELS[data.plan as Tier] !== undefined) {
            tier = data.plan as Tier;
          }
          if (data.usage) {
            usage = data.usage;
          }
        }

        setState({
          tier,
          usage,
          isLoading: false,
          error: null,
          hasSubscription,
          trial,
        });
      } catch (err) {
        if (cancelled) return;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load subscription',
        }));
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  /**
   * Check if the user's current tier allows a specific feature.
   */
  const canUseFeature = useCallback((feature: string): boolean => {
    const requiredTier = FEATURE_TIERS[feature];
    if (!requiredTier) return true; // Unknown feature = not gated
    return (TIER_LEVELS[state.tier] ?? 0) >= TIER_LEVELS[requiredTier];
  }, [state.tier]);

  /**
   * Check if the user's current tier meets a minimum tier requirement.
   */
  const hasTier = useCallback((minimumTier: Tier): boolean => {
    return (TIER_LEVELS[state.tier] ?? 0) >= TIER_LEVELS[minimumTier];
  }, [state.tier]);

  /**
   * Get the required tier for a feature (for display in upgrade prompts).
   */
  const getRequiredTier = useCallback((feature: string): Tier | null => {
    return FEATURE_TIERS[feature] ?? null;
  }, []);

  /**
   * Check if a usage resource is at or over its limit.
   */
  const isAtLimit = useCallback((resource: keyof UsageData): boolean => {
    if (!state.usage) return false;
    const { current, limit } = state.usage[resource];
    if (limit === -1) return false; // unlimited
    return current >= limit;
  }, [state.usage]);

  /**
   * Check if a usage resource is approaching its limit (>= 80%).
   * Returns false for unlimited resources (limit === -1).
   */
  const isApproachingLimit = useCallback((resource: keyof UsageData): boolean => {
    if (!state.usage) return false;
    const { current, limit } = state.usage[resource];
    if (limit === -1) return false; // unlimited
    if (limit === 0) return false;
    return current >= limit * 0.8;
  }, [state.usage]);

  return useMemo(() => ({
    ...state,
    canUseFeature,
    hasTier,
    getRequiredTier,
    isAtLimit,
    isApproachingLimit,
  }), [state, canUseFeature, hasTier, getRequiredTier, isAtLimit, isApproachingLimit]);
}
