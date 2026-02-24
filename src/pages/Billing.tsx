import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard,
  ExternalLink,
  Check,
  AlertCircle,
  Loader,
  RefreshCw,
  Receipt,
  Calendar,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth } from '@/store/slices/authSlice';
import { DashboardLayout } from '../components/templates';
import { UsageBar } from '../components/payments/UsageBar';
import { fetchUsage } from '../services/usageService';
import { getPlan } from '../config/plans';
import { Skeleton } from '../components/ui/skeleton';
import type { UsageData } from '../services/usageService';
import type { PlanId } from '../config/plans';

const API_URL = import.meta.env.VITE_API_URL || 'https://fluxstudio.art';

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelledAt: string | null;
  } | null;
  canTrial: boolean;
}

export function Billing() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState(false);
  const [planId, setPlanId] = useState<PlanId>('free');

  const loadUsage = () => {
    setUsageError(false);
    fetchUsage()
      .then((data) => {
        setUsage(data.usage);
        setPlanId(data.plan);
      })
      .catch(() => { setUsageError(true); });
  };

  const fetchSubscriptionStatus = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/payments/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user) {
      navigate('/login?callbackUrl=/billing');
      return;
    }
    fetchSubscriptionStatus();
    loadUsage();
  }, [user, navigate, fetchSubscriptionStatus]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/payments/create-portal-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/billing`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20';
      case 'trialing':
        return 'text-blue-400 bg-blue-500/20';
      case 'past_due':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'canceled':
      case 'cancelled':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[{ label: 'Billing' }]}
        onLogout={() => {}}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-7 w-56 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="w-9 h-9 rounded-lg" />
          </div>
          {/* Usage card skeleton */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
          {/* Subscription card skeleton */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-7 w-20 rounded-full mb-3" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Billing' }]}
      onLogout={() => {}}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Billing & Subscription</h1>
            <p className="text-neutral-500 mt-1">Manage your subscription and payment methods</p>
          </div>
          <button
            onClick={fetchSubscriptionStatus}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" aria-hidden="true" />
            <p className="text-red-600 dark:text-red-400 text-sm flex-1">{error}</p>
            <button
              onClick={fetchSubscriptionStatus}
              className="ml-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-500 hover:text-red-700 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Usage error fallback */}
        {usageError && !usage && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Current Plan</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Usage data is temporarily unavailable.</p>
              </div>
              <button
                onClick={loadUsage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Current Plan & Usage */}
        {usage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Current Plan</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                  {getPlan(planId).name}
                </span>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
              >
                Change Plan
              </button>
            </div>
            <div className="space-y-4">
              <UsageBar label="Projects" current={usage.projects.current} limit={usage.projects.limit} />
              <UsageBar label="Storage" current={usage.storage.current} limit={usage.storage.limit} unit="storage" />
              <UsageBar label="AI Calls" current={usage.aiCalls.current} limit={usage.aiCalls.limit} />
              <UsageBar label="Collaborators" current={usage.collaborators.current} limit={usage.collaborators.limit} />
            </div>
          </motion.div>
        )}

        {/* Subscription Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Subscription Status</h2>
              {subscription?.hasSubscription ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        subscription.subscription?.status || ''
                      )}`}
                    >
                      {subscription.subscription?.status === 'active'
                        ? 'Active'
                        : subscription.subscription?.status}
                    </span>
                    {subscription.subscription?.cancelledAt && (
                      <span className="text-yellow-400 text-sm">
                        Cancels on {formatDate(subscription.subscription.currentPeriodEnd)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                    <span>
                      Current period ends:{' '}
                      {formatDate(subscription.subscription?.currentPeriodEnd || '')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-neutral-500 dark:text-neutral-400">No active subscription</p>
                  <button
                    onClick={() => navigate('/checkout')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                  >
                    View Plans
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              {subscription?.hasSubscription ? (
                <Check className="w-7 h-7 text-green-400" aria-hidden="true" />
              ) : (
                <CreditCard className="w-7 h-7 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Manage Subscription Card */}
        {subscription?.hasSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Manage Subscription</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
              Update your payment method, view invoices, or cancel your subscription through the
              Stripe Customer Portal.
            </p>

            <button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-100 dark:bg-neutral-700 rounded-xl font-medium text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Opening portal...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" aria-hidden="true" />
                  Open Billing Portal
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Payment Methods Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Payment Methods</h2>
            <CreditCard className="w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
          </div>

          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
            {subscription?.hasSubscription
              ? 'Manage your payment methods through the Stripe Customer Portal.'
              : 'Add a payment method when you subscribe to a plan.'}
          </p>

          {subscription?.hasSubscription && (
            <button
              onClick={openCustomerPortal}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
            >
              Update payment method
            </button>
          )}
        </motion.div>

        {/* Invoice History Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 sm:p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Invoice History</h2>
            <Receipt className="w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
          </div>

          {subscription?.hasSubscription ? (
            <>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                View and download your past invoices through the Stripe Customer Portal.
              </p>
              <button
                onClick={openCustomerPortal}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
              >
                View invoices
              </button>
            </>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              No invoices yet. Subscribe to a plan to get started.
            </p>
          )}
        </motion.div>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center py-8 border-t border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm">
            <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span>Payments secured by Stripe. Your data is encrypted and protected.</span>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default Billing;
