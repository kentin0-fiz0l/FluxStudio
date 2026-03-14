/**
 * FeatureGate — Declarative feature gating wrapper
 *
 * Phase 4: Wraps any feature that requires a minimum subscription tier.
 * Renders children if user has access, otherwise renders an upgrade prompt.
 *
 * @example
 * <FeatureGate feature="ai_drill_writing">
 *   <AIChatPanel />
 * </FeatureGate>
 */

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { ArrowRight, Lock } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';

interface FeatureGateProps {
  /** Feature key from FEATURE_TIERS (e.g., 'ai_drill_writing', 'realtime_collaboration') */
  feature: string;
  /** Content to render when user has access */
  children: ReactNode;
  /** Optional custom fallback. If not provided, renders default upgrade prompt. */
  fallback?: ReactNode;
  /** If true, renders nothing instead of upgrade prompt when user lacks access */
  hide?: boolean;
}

export function FeatureGate({ feature, children, fallback, hide = false }: FeatureGateProps) {
  const { canUseFeature, getRequiredTier, isLoading } = useSubscription();

  // Don't flash upgrade prompt while loading
  if (isLoading) return null;

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (hide) return null;

  if (fallback) {
    return <>{fallback}</>;
  }

  return <FeatureGateUpgradePrompt feature={feature} requiredTier={getRequiredTier(feature)} />;
}

/** Default upgrade prompt shown when user lacks access */
function FeatureGateUpgradePrompt({ feature, requiredTier }: { feature: string; requiredTier: string | null }) {
  const navigate = useNavigate();

  const featureLabels: Record<string, string> = {
    ai_drill_writing: 'AI Drill Writing',
    ai_show_critic: 'AI Show Critic',
    ai_design_analysis: 'AI Design Analysis',
    realtime_collaboration: 'Real-time Collaboration',
    collaborator_invite: 'Invite Collaborators',
    export_video: 'Video Export',
    export_pyware: 'Pyware Export',
    api_access: 'API Access',
    priority_support: 'Priority Support',
    custom_branding: 'Custom Branding',
    sso_authentication: 'SSO Authentication',
  };

  const label = featureLabels[feature] || feature.replace(/_/g, ' ');
  const tierName = requiredTier === 'team' ? 'Team' : 'Pro';

  const handleClick = () => {
    eventTracker.trackEvent('upgrade_prompt_clicked', { feature, requiredTier });
    navigate('/pricing');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        {label}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm">
        This feature requires a {tierName} plan or higher. Upgrade to unlock {label.toLowerCase()} and more.
      </p>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all"
      >
        Upgrade to {tierName}
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
