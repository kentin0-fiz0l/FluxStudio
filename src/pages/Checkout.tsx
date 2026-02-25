import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Shield, Check, ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import { PricingTable } from '../components/payments/PricingTable';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';

export function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setSelectedPlan] = useState<string | null>(null);

  // Get plan from URL params if present
  const planFromUrl = searchParams.get('plan');

  useEffect(() => {
    if (planFromUrl) {
      setSelectedPlan(planFromUrl);
    }
  }, [planFromUrl]);

  const handleSelectPlan = async (tier: { id: string; priceId?: string; name: string }) => {
    if (!user) {
      navigate(`/login?callbackUrl=${encodeURIComponent('/checkout?plan=' + tier.id)}`);
      return;
    }

    if (tier.id === 'elite') {
      // Elite tier requires contacting sales
      window.location.href = 'mailto:sales@fluxstudio.art?subject=Elite%20Package%20Inquiry';
      return;
    }

    setLoading(true);
    setError('');
    setSelectedPlan(tier.id);

    try {
      const result = await apiService.post<{ url?: string }>('/payments/create-checkout-session', {
        priceId: tier.priceId || `price_${tier.id}`,
        mode: 'payment',
        metadata: { planName: tier.name }
      });

      // Redirect to Stripe Checkout
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
            Back
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="w-4 h-4 text-green-400" aria-hidden="true" />
            <span>Secure checkout powered by Stripe</span>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" aria-hidden="true" />
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

      {/* Main Content */}
      <main>
        <PricingTable onSelectPlan={handleSelectPlan} loading={loading} />

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto px-4 py-12 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-white mb-2">Secure Payment</h3>
              <p className="text-gray-400 text-sm">
                256-bit SSL encryption. Your payment info is never stored on our servers.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-white mb-2">Flexible Payment</h3>
              <p className="text-gray-400 text-sm">
                Pay with credit card, debit card, or bank transfer. Payment plans available.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-purple-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-white mb-2">Satisfaction Guaranteed</h3>
              <p className="text-gray-400 text-sm">
                Not happy with the design? We'll work with you until you love it.
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" aria-hidden="true" />
            <p className="text-white font-medium">Preparing secure checkout...</p>
            <p className="text-gray-400 text-sm mt-2">You'll be redirected to Stripe</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;
