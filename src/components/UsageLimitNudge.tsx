/**
 * UsageLimitNudge — Non-intrusive upgrade nudge for approaching plan limits
 *
 * Shows a slim amber banner with a usage bar when a resource is >= 80% of its limit.
 * Dismissable per session (keyed by resource + date).
 * Does not render if the user is on a trial (TrialBanner handles that).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSubscription } from '@/hooks/auth/useSubscription';
import { eventTracker } from '@/services/analytics/eventTracking';

type UsageResource = 'projects' | 'storage' | 'aiCalls' | 'collaborators';

interface UsageLimitNudgeProps {
  resource: UsageResource;
}

const RESOURCE_LABELS: Record<UsageResource, { singular: string; unit: string; upgradeNote: string }> = {
  projects: { singular: 'project', unit: 'projects', upgradeNote: 'unlimited projects' },
  storage: { singular: 'storage', unit: 'MB of storage', upgradeNote: '10 GB of storage' },
  aiCalls: { singular: 'AI call', unit: 'AI calls this month', upgradeNote: '200/month' },
  collaborators: { singular: 'collaborator', unit: 'collaborators', upgradeNote: 'unlimited collaborators' },
};

function getDismissKey(resource: UsageResource): string {
  const today = new Date().toISOString().slice(0, 10);
  return `flux_nudge_dismissed_${resource}_${today}`;
}

export function UsageLimitNudge({ resource }: UsageLimitNudgeProps) {
  const { usage, trial, isApproachingLimit, isLoading } = useSubscription();
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(getDismissKey(resource)) === '1';
    } catch {
      return false;
    }
  });

  // Don't render while loading, if dismissed, if on trial, or if not approaching limit
  if (isLoading || dismissed || trial.isTrialing || !isApproachingLimit(resource)) {
    return null;
  }

  if (!usage) return null;

  const { current, limit } = usage[resource];
  const percentage = Math.min(Math.round((current / limit) * 100), 100);
  const labels = RESOURCE_LABELS[resource];

  // Track that nudge was shown
  eventTracker.trackEvent('usage_nudge_shown', { resource, current, limit, percentage });

  const handleUpgradeClick = () => {
    eventTracker.trackEvent('usage_nudge_clicked', { resource, current, limit });
    navigate('/pricing');
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(getDismissKey(resource), '1');
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-sm"
      role="status"
    >
      {/* Usage bar */}
      <div className="w-20 h-1.5 bg-amber-200 dark:bg-amber-800/50 rounded-full flex-shrink-0 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 100 ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Message */}
      <span className="text-amber-800 dark:text-amber-300 flex-1 min-w-0">
        You're using {current} of {limit} {labels.unit}.{' '}
        <button
          onClick={handleUpgradeClick}
          className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        >
          Upgrade to Pro
        </button>{' '}
        for {labels.upgradeNote}.
      </span>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/30 text-amber-600 dark:text-amber-400 transition-colors"
        aria-label="Dismiss usage notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
