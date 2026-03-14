/**
 * TrialBanner — Shows trial countdown in DashboardLayout header
 *
 * Phase 4: Displays amber/red banner with days remaining and upgrade CTA.
 * Only renders when user is on an active trial.
 */

import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function TrialBanner() {
  const { trial } = useSubscription();
  const navigate = useNavigate();

  if (!trial.isTrialing) return null;

  const isUrgent = trial.daysRemaining <= 3;
  const dayLabel = trial.daysRemaining === 1 ? 'day' : 'days';

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-sm ${
        isUrgent
          ? 'bg-red-500/10 border-b border-red-500/20 text-red-400'
          : 'bg-amber-500/10 border-b border-amber-500/20 text-amber-400'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        ) : (
          <Sparkles className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        )}
        <span>
          {isUrgent
            ? `Your Pro trial ends in ${trial.daysRemaining} ${dayLabel}!`
            : `Pro trial: ${trial.daysRemaining} ${dayLabel} remaining`}
          {' '}
          {isUrgent
            ? 'Upgrade now to keep your Pro features.'
            : 'Enjoying Pro features? Save 2 months with annual billing.'}
        </span>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className={`flex-shrink-0 px-3 py-1 rounded-md font-medium text-xs transition-colors ${
          isUrgent
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-amber-500 text-white hover:bg-amber-600'
        }`}
      >
        Upgrade now
      </button>
    </div>
  );
}
