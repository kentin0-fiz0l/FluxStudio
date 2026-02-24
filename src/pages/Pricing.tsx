/**
 * Pricing Page — Public page showing SaaS subscription plans
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { SaaSPricingTable } from '../components/payments/SaaSPricingTable';
import { useAuth } from '@/store/slices/authSlice';
import { fetchLimits } from '../services/usageService';
import type { PlanId } from '../config/plans';

const FAQ_ITEMS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes, you can upgrade or downgrade at any time. When upgrading, you get immediate access to higher limits. When downgrading, changes take effect at the end of your billing period.',
  },
  {
    q: 'What happens if I exceed my limits?',
    a: 'You will see an upgrade prompt when you reach a limit. Your existing projects and data are never affected — you just cannot create new resources beyond your limit until you upgrade.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'The Free plan lets you explore FluxStudio with no time limit. When you are ready for more, upgrade to Pro or Team and get full access immediately.',
  },
  {
    q: 'How does team pricing work?',
    a: 'Team plans are priced per seat. Each team member needs a seat. You can add or remove seats at any time and billing adjusts automatically.',
  },
];

export function Pricing() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanId | undefined>();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchLimits()
        .then((data) => setCurrentPlan(data.plan))
        .catch(() => setCurrentPlan('free'));
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={user ? '/projects' : '/'}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pricing</h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">
                Choose the plan that fits your creative workflow
              </p>
            </div>
          </div>
          {!user && (
            <Link
              to="/login"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Pricing Table */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <SaaSPricingTable currentPlan={currentPlan} />

        {/* FAQ */}
        <section className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3" role="region" aria-label="Frequently asked questions">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
              >
                <button
                  id={`faq-trigger-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const next = (i + 1) % FAQ_ITEMS.length;
                      document.getElementById(`faq-trigger-${next}`)?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prev = (i - 1 + FAQ_ITEMS.length) % FAQ_ITEMS.length;
                      document.getElementById(`faq-trigger-${prev}`)?.focus();
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      document.getElementById('faq-trigger-0')?.focus();
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      document.getElementById(`faq-trigger-${FAQ_ITEMS.length - 1}`)?.focus();
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-panel-${i}`}
                >
                  {item.q}
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
                {openFaq === i && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                    className="px-4 pb-3 text-sm text-neutral-600 dark:text-neutral-400"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Pricing;
