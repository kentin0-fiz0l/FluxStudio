/**
 * UsageDashboard — Plan usage overview with progress bars and upgrade CTAs
 *
 * Phase 4: Shows users their resource consumption against plan limits.
 * 80%+ triggers amber warning, 100% triggers red with upgrade button.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ArrowRight, Loader2 } from 'lucide-react';
import { UsageBar } from '@/components/payments/UsageBar';
import { fetchUsage } from '@/services/usageService';
import type { UsageResponse } from '@/services/usageService';
import { PLANS } from '@/config/plans';
import type { PlanId } from '@/config/plans';

export default function UsageDashboard() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" aria-hidden="true" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-400">
        Failed to load usage data. Please try again.
      </div>
    );
  }

  const { usage, plan, period } = data;
  const planDef = PLANS[plan as PlanId] || PLANS.free;

  // Calculate percentages for warning checks
  const getPercent = (current: number, limit: number) =>
    limit <= 0 ? (limit === -1 ? 0 : 100) : Math.min(100, Math.round((current / limit) * 100));

  const hasWarning = [
    getPercent(usage.projects.current, usage.projects.limit),
    getPercent(usage.storage.current, usage.storage.limit),
    getPercent(usage.aiCalls.current, usage.aiCalls.limit),
    getPercent(usage.collaborators.current, usage.collaborators.limit),
  ].some((p) => p >= 80);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-500" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Usage</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {planDef.name} plan — {period.start} to {period.end}
            </p>
          </div>
        </div>
        {plan === 'free' && (
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Upgrade
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Warning banner */}
      {hasWarning && plan !== 'team' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You're approaching your plan limits. Upgrade to get more resources and unlock Pro features.
          </p>
        </div>
      )}

      {/* Usage bars */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 space-y-6">
        <UsageBar
          label="Projects"
          current={usage.projects.current}
          limit={usage.projects.limit}
        />
        <UsageBar
          label="Storage"
          current={usage.storage.current}
          limit={usage.storage.limit}
          unit="storage"
        />
        <UsageBar
          label="AI Calls (this month)"
          current={usage.aiCalls.current}
          limit={usage.aiCalls.limit}
        />
        <UsageBar
          label="Collaborators"
          current={usage.collaborators.current}
          limit={usage.collaborators.limit}
        />
      </div>

      {/* Plan comparison hint */}
      {plan === 'free' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Get more with Pro
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-neutral-500 dark:text-neutral-400">Unlimited projects</div>
            <div className="text-neutral-500 dark:text-neutral-400">200 AI calls/month</div>
            <div className="text-neutral-500 dark:text-neutral-400">10 GB storage</div>
            <div className="text-neutral-500 dark:text-neutral-400">5 collaborators</div>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="mt-4 w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            View pricing
          </button>
        </div>
      )}
    </div>
  );
}
