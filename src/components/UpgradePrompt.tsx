/**
 * UpgradePrompt — Shows when a user hits a free tier limit or tries a gated feature.
 *
 * Renders inline or as a modal overlay depending on the `variant` prop.
 */

import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Tier } from '@/hooks/auth/useSubscription';

interface UpgradePromptProps {
  /** The feature the user tried to access */
  feature: string;
  /** The tier required to unlock the feature */
  requiredTier: Tier;
  /** Display variant */
  variant?: 'inline' | 'banner';
  /** Optional custom message */
  message?: string;
  /** Optional callback when dismissed */
  onDismiss?: () => void;
}

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

export function UpgradePrompt({
  feature,
  requiredTier,
  variant = 'inline',
  message,
  onDismiss,
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const defaultMessage = `This feature requires a ${TIER_LABELS[requiredTier]} plan or higher.`;

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {message || defaultMessage}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upgrade to unlock {feature.replace(/_/g, ' ')} and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 px-2 py-1"
            >
              Dismiss
            </button>
          )}
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Upgrade to {TIER_LABELS[requiredTier]}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // Inline variant — compact
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-md px-3 py-2">
      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
      <span>{message || defaultMessage}</span>
      <button
        onClick={() => navigate('/pricing')}
        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium whitespace-nowrap"
      >
        Upgrade
      </button>
    </div>
  );
}

export default UpgradePrompt;
