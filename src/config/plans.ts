/**
 * SaaS Subscription Plan Definitions
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 *
 * Stripe price IDs are read from environment variables:
 *   VITE_STRIPE_PRICE_PRO_MONTHLY
 *   VITE_STRIPE_PRICE_PRO_YEARLY
 *   VITE_STRIPE_PRICE_TEAM_MONTHLY
 *   VITE_STRIPE_PRICE_TEAM_YEARLY
 */

export type PlanId = 'free' | 'pro' | 'team';

export interface PlanLimits {
  projects: number;        // -1 = unlimited
  storageBytes: number;    // -1 = unlimited
  aiCallsPerMonth: number; // -1 = unlimited
  collaborators: number;   // -1 = unlimited
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;    // in cents (0 = free)
  priceYearly: number;     // in cents (0 = free)
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'For individuals getting started',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      projects: 3,
      storageBytes: 500 * 1024 * 1024, // 500 MB
      aiCallsPerMonth: 10,
      collaborators: 1,
    },
    features: [
      'Up to 3 projects',
      '500 MB storage',
      '10 AI assistant calls/month',
      'Basic templates',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For professionals and power users',
    priceMonthly: 1200,  // $12/mo
    priceYearly: 12000,  // $120/yr ($10/mo, 2 months free)
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    limits: {
      projects: -1,
      storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      aiCallsPerMonth: 100,
      collaborators: 10,
    },
    features: [
      'Unlimited projects',
      '10 GB storage',
      '100 AI assistant calls/month',
      'All templates + AI generation',
      'Plugin marketplace',
      'Priority support',
      'Advanced analytics',
    ],
    popular: true,
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'For teams that collaborate',
    priceMonthly: 2900,  // $29/seat/mo
    priceYearly: 29000,  // $290/seat/yr ($24.17/mo, 2 months free)
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
    limits: {
      projects: -1,
      storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      aiCallsPerMonth: -1,
      collaborators: -1,
    },
    features: [
      'Everything in Pro',
      'Unlimited collaborators',
      '100 GB storage',
      'Unlimited AI calls',
      'Team workspaces',
      'Admin console',
      'SSO (coming soon)',
      'Dedicated support',
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'team'];

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLANS[planId]?.limits ?? PLANS.free.limits;
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId] ?? PLANS.free;
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function formatStorage(bytes: number): string {
  if (bytes === -1) return 'Unlimited';
  if (bytes >= 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${bytes} bytes`;
}

export function formatPrice(cents: number, interval: 'month' | 'year' = 'month'): string {
  if (cents === 0) return 'Free';
  const dollars = cents / 100;
  return `$${dollars}/${interval === 'month' ? 'mo' : 'yr'}`;
}
