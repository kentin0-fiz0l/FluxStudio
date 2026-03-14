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
    description: 'Get started with formation design',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      projects: 2,
      storageBytes: 250 * 1024 * 1024, // 250 MB
      aiCallsPerMonth: 5,
      collaborators: 1,
    },
    features: [
      '2 projects',
      '5 AI drill writing calls/month',
      '250 MB storage',
      'Basic export (PNG)',
      'Basic templates',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For drill writers and band directors',
    priceMonthly: 1900,  // $19/mo
    priceYearly: 19000,  // $190/yr (~$15.83/mo, 2 months free)
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    limits: {
      projects: -1,
      storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      aiCallsPerMonth: 200,
      collaborators: 5,
    },
    features: [
      'Unlimited projects & formations',
      '200 AI drill writing calls/month',
      'Real-time collaboration (up to 5 users)',
      'All export formats (PDF, Pyware, Dot Book)',
      'Audio sync & playback',
      'Advanced templates & 3D preview',
      'Priority support',
    ],
    popular: true,
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'For programs and organizations',
    priceMonthly: 4900,  // $49/mo
    priceYearly: 49000,  // $490/yr (~$40.83/mo, 2 months free)
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
    limits: {
      projects: -1,
      storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      aiCallsPerMonth: -1,
      collaborators: 25,
    },
    features: [
      'Everything in Pro',
      'Up to 25 collaborators',
      '100 GB storage',
      'Unlimited AI calls',
      'Rehearsal mode & section dashboards',
      'API access',
      'Admin console & SSO (coming soon)',
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
