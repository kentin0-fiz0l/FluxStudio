import { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { UsageBar } from '../components/payments/UsageBar';
import { fetchUsage } from '../services/usageService';
import { getPlan } from '../config/plans';
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
  const [planId, setPlanId] = useState<PlanId>('free');

  useEffect(() => {
    if (!user) {
      navigate('/login?callbackUrl=/billing');
      return;
    }
    fetchSubscriptionStatus();
    fetchUsage()
      .then((data) => {
        setUsage(data.usage);
        setPlanId(data.plan);
      })
      .catch(() => { /* usage fetch is best-effort */ });
  }, [user, navigate]);

  const fetchSubscriptionStatus = async () => {
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
  };

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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Billing & Subscription</h1>
              <p className="text-gray-400 mt-1">Manage your subscription and payment methods</p>
            </div>
            <button
              onClick={fetchSubscriptionStatus}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-300 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Plan & Usage */}
        {usage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Current Plan</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 uppercase tracking-wide">
                  {getPlan(planId).name}
                </span>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
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
          className="bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Subscription Status</h2>
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
                  <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      Current period ends:{' '}
                      {formatDate(subscription.subscription?.currentPeriodEnd || '')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-400">No active subscription</p>
                  <button
                    onClick={() => navigate('/checkout')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                  >
                    View Plans
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              {subscription?.hasSubscription ? (
                <Check className="w-7 h-7 text-green-400" />
              ) : (
                <CreditCard className="w-7 h-7 text-gray-400" />
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
            className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
          >
            <h2 className="text-lg font-semibold mb-4">Manage Subscription</h2>
            <p className="text-gray-400 text-sm mb-6">
              Update your payment method, view invoices, or cancel your subscription through the
              Stripe Customer Portal.
            </p>

            <button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Opening portal...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
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
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Payment Methods</h2>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {subscription?.hasSubscription
              ? 'Manage your payment methods through the Stripe Customer Portal.'
              : 'Add a payment method when you subscribe to a plan.'}
          </p>

          {subscription?.hasSubscription && (
            <button
              onClick={openCustomerPortal}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
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
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Invoice History</h2>
            <Receipt className="w-5 h-5 text-gray-400" />
          </div>

          {subscription?.hasSubscription ? (
            <>
              <p className="text-gray-400 text-sm mb-4">
                View and download your past invoices through the Stripe Customer Portal.
              </p>
              <button
                onClick={openCustomerPortal}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                View invoices
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              No invoices yet. Subscribe to a plan to get started.
            </p>
          )}
        </motion.div>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center py-8 border-t border-white/10"
        >
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Payments secured by Stripe. Your data is encrypted and protected.</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default Billing;
