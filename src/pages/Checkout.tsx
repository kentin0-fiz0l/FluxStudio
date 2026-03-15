import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Shield, Check, ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import { PLANS, formatPrice } from '../config/plans';
import type { PlanId } from '../config/plans';
import { SaaSPricingTable } from '../components/payments/SaaSPricingTable';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get plan from URL params (set by SaaSPricingTable on /pricing)
  const planFromUrl = searchParams.get('plan') as PlanId | null;
  const intervalFromUrl = (searchParams.get('interval') as 'month' | 'year') || 'month';

  // If plan is specified and user is logged in, auto-start checkout
  useEffect(() => {
    if (planFromUrl && user && PLANS[planFromUrl] && planFromUrl !== 'free') {
      startCheckout(planFromUrl, intervalFromUrl);
    }
  }, [planFromUrl, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCheckout = async (planId: PlanId, interval: 'month' | 'year') => {
    if (loading) return;

    if (!user) {
      navigate(`/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${planId}&interval=${interval}`)}`);
      return;
    }

    const plan = PLANS[planId];
    if (!plan || planId === 'free') return;

    const priceId = interval === 'year' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) return;

    setLoading(true);
    setError('');

    try {
      const result = await apiService.post<{ url?: string }>('/payments/create-checkout-session', {
        priceId,
        mode: 'subscription',
        metadata: { planName: plan.name, planId, interval }
      });

      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  // Resolve the selected plan for the confirmation view
  const selectedPlan = planFromUrl && PLANS[planFromUrl] ? PLANS[planFromUrl] : null;
  const selectedPrice = selectedPlan
    ? intervalFromUrl === 'year' ? selectedPlan.priceYearly : selectedPlan.priceMonthly
    : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
            Back to pricing
          </button>

          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Shield className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" aria-hidden="true" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* If plan is pre-selected, show confirmation */}
        {selectedPlan && planFromUrl !== 'free' ? (
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-2">
              Upgrade to {selectedPlan.name}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              {selectedPlan.description}
            </p>

            <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 mb-6 text-left">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-lg font-semibold">{selectedPlan.name} Plan</span>
                <span className="text-2xl font-bold">{formatPrice(selectedPrice, intervalFromUrl)}</span>
              </div>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {!user && (
              <button
                onClick={() => navigate(`/login?callbackUrl=${encodeURIComponent(`/checkout?plan=${planFromUrl}&interval=${intervalFromUrl}`)}`)}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Sign in to continue
              </button>
            )}

            {user && !loading && error && (
              <button
                onClick={() => startCheckout(planFromUrl!, intervalFromUrl)}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Retry checkout
              </button>
            )}
          </div>
        ) : (
          /* No plan selected — show the full pricing table */
          <SaaSPricingTable />
        )}

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto px-4 py-12 mt-8 border-t border-neutral-200 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payment</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                256-bit SSL encryption. Your payment info is never stored on our servers.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2">Flexible Billing</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Pay monthly or yearly. Cancel anytime with no long-term commitment.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2">Instant Access</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Get immediate access to all plan features as soon as your subscription is active.
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 text-center shadow-xl">
            <Loader className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" aria-hidden="true" />
            <p className="font-medium">Preparing secure checkout...</p>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">You'll be redirected to Stripe</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;
