/**
 * Upgrade Prompt — Inline prompt shown when user hits a plan limit
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

interface UpgradePromptProps {
  resource: string;
  current: number;
  limit: number;
  planName?: string;
}

export function UpgradePrompt({ resource, current, limit, planName = 'Free' }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-5 text-center space-y-3">
      <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 dark:bg-amber-800/30 rounded-full">
        <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
        {resource} limit reached
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        You&apos;ve reached the limit of {limit} {resource.toLowerCase()} on the {planName} plan
        ({current}/{limit} used). Upgrade to get more.
      </p>
      <button
        onClick={() => navigate('/pricing')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Upgrade Plan
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
