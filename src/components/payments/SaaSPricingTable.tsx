/**
 * SaaS Pricing Table — Plan comparison with monthly/yearly toggle
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, formatPrice, formatStorage, isUnlimited } from '../../config/plans';
import type { PlanId } from '../../config/plans';

interface SaaSPricingTableProps {
  currentPlan?: PlanId;
}

export function SaaSPricingTable({ currentPlan }: SaaSPricingTableProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const navigate = useNavigate();

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === 'free') return;
    if (planId === currentPlan) return;
    // Navigate to checkout with plan info
    navigate(`/checkout?plan=${planId}&interval=${interval}`);
  };

  return (
    <div className="space-y-8">
      {/* Interval Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${interval === 'month' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setInterval(prev => prev === 'month' ? 'year' : 'month')}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-200 dark:bg-neutral-700 transition-colors"
          role="switch"
          aria-checked={interval === 'year'}
          aria-label="Toggle yearly billing"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              interval === 'year' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${interval === 'year' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
          Yearly
        </span>
        {interval === 'year' && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
            2 months free
          </span>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          const isPopular = plan.popular;
          const price = interval === 'month' ? plan.priceMonthly : plan.priceYearly;

          return (
            <div
              key={planId}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isPopular
                  ? 'border-primary-500 dark:border-primary-400 shadow-lg shadow-primary-500/10'
                  : 'border-neutral-200 dark:border-neutral-700'
              } bg-white dark:bg-neutral-800`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {plan.description}
              </p>

              {/* Price */}
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {formatPrice(price, interval)}
                </span>
                {planId === 'team' && price > 0 && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">
                    per seat
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(planId)}
                disabled={isCurrent || planId === 'free'}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                  isCurrent
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 cursor-default'
                    : planId === 'free'
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-default'
                    : isPopular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900'
                }`}
              >
                {isCurrent ? 'Current Plan' : planId === 'free' ? 'Free Forever' : 'Upgrade'}
              </button>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Limits Summary */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                <LimitRow label="Projects" value={plan.limits.projects} />
                <LimitRow label="Storage" value={formatStorage(plan.limits.storageBytes)} isFormatted />
                <LimitRow label="AI Calls" value={plan.limits.aiCallsPerMonth} suffix="/mo" />
                <LimitRow label="Collaborators" value={plan.limits.collaborators} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LimitRow({ label, value, suffix = '', isFormatted = false }: {
  label: string;
  value: number | string;
  suffix?: string;
  isFormatted?: boolean;
}) {
  const display = isFormatted
    ? value
    : typeof value === 'number' && isUnlimited(value)
    ? 'Unlimited'
    : `${value}${suffix}`;

  return (
    <div className="flex justify-between text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-700 dark:text-neutral-300">{display}</span>
    </div>
  );
}
