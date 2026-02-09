import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Star, Sparkles } from 'lucide-react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  priceDetail?: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  ctaText: string;
  priceId?: string; // Stripe price ID
}

interface PricingTableProps {
  onSelectPlan: (tier: PricingTier) => void;
  loading?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    description: 'Perfect for getting started with visual design',
    price: '$1,000',
    priceDetail: 'starting price',
    features: [
      'Show concept development',
      'Visual identity design',
      'Theme development',
      'Basic revisions included',
      'Email support'
    ],
    icon: <Star className="w-6 h-6" />,
    ctaText: 'Get Started',
    priceId: 'price_foundation_starter'
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Comprehensive design packages for growing programs',
    price: '$2,500',
    priceDetail: 'average project',
    features: [
      'Everything in Foundation',
      'Storyboarding & visualization',
      'Uniform design coordination',
      'Props & scenic elements',
      'Design consultation hours',
      'Priority support'
    ],
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    ctaText: 'Most Popular',
    priceId: 'price_standard_project'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Full-service design for competitive programs',
    price: '$5,000',
    priceDetail: 'average project',
    features: [
      'Everything in Standard',
      'Drill & formation design',
      'Choreography integration',
      'Staging coordination',
      'Visual coaching sessions',
      'Staff training included',
      'Dedicated designer'
    ],
    icon: <Crown className="w-6 h-6" />,
    ctaText: 'Go Premium',
    priceId: 'price_premium_project'
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'White-glove service for championship contenders',
    price: '$12,000',
    priceDetail: 'full season',
    features: [
      'Everything in Premium',
      'Full season package',
      'Unlimited revisions',
      'Monthly support calls',
      'Competition prep sessions',
      'Mid-season redesign option',
      '24/7 priority support',
      'On-site consultation'
    ],
    icon: <Sparkles className="w-6 h-6" />,
    ctaText: 'Contact Sales',
    priceId: 'price_elite_season'
  }
];

export function PricingTable({ onSelectPlan, loading }: PricingTableProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSelect = (tier: PricingTier) => {
    setSelectedTier(tier.id);
    onSelectPlan(tier);
  };

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Choose the package that fits your program's needs. All packages include our collaborative platform access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl p-6 ${
                tier.popular
                  ? 'bg-gradient-to-b from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50'
                  : 'bg-white/5 border border-white/10'
              } ${
                selectedTier === tier.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                tier.popular
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-white/10 text-gray-300'
              }`}>
                {tier.icon}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{tier.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                {tier.priceDetail && (
                  <span className="text-gray-400 text-sm ml-2">{tier.priceDetail}</span>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(tier)}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && selectedTier === tier.id ? 'Processing...' : tier.ctaText}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            All prices in USD. Custom packages available for unique requirements.{' '}
            <a href="mailto:sales@fluxstudio.art" className="text-blue-400 hover:text-blue-300">
              Contact us
            </a>{' '}
            for enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingTable;
