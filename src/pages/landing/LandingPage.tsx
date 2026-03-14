/**
 * FluxStudio Landing Page - Synthesized from 3 design variants
 *
 * Cherry-picked best sections:
 * - Header:       Editorial  (gradient logo, clean spacing)
 * - Hero:         Editorial  (asymmetric, section numbers, animated product demo)
 * - Showcase:     Custom     (tabbed product demos: collab, AI, project mgmt)
 * - Features:     Bold       (bento grid, glassmorphism, animated micro-demos)
 * - Use Cases:    Editorial  (asymmetric alternating, numbered)
 * - Testimonials: Editorial  (decorative quotes, light bg contrast)
 * - Pricing:      Minimalist (comparison table, data-driven)
 * - CTA + Footer: Editorial  (combined, section number, gradient accent)
 */

// Re-export selected sections from each variant
export { Header } from './EditorialLanding';
export { Hero } from './EditorialLanding';
export { Features } from './BoldLanding';
export { UseCases } from './EditorialLanding';
export { Testimonials } from './EditorialLanding';
export { Pricing } from './MinimalistLanding';
export { CTAFooter } from './EditorialLanding';

// Import for composed page
import { Header } from './EditorialLanding';
import { Hero } from './EditorialLanding';
import { Features } from './BoldLanding';
import { UseCases } from './EditorialLanding';
import { Testimonials } from './EditorialLanding';
import { Pricing } from './MinimalistLanding';
import { CTAFooter } from './EditorialLanding';
import { ProductShowcase } from '../../components/landing/ProductShowcase';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { SEOHead } from '../../components/SEOHead';
import { eventTracker } from '@/services/analytics/eventTracking';

const LANDING_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Flux Studio',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description:
    'The formation design platform for marching bands, drum corps, and dance teams. AI-assisted drill writing, real-time collaboration, 3D fly-through, and audio sync.',
  url: 'https://fluxstudio.art',
  screenshot: 'https://fluxstudio.art/api/og-image.png',
  featureList: 'Formation Editor, AI Drill Writing, 3D Fly-Through, Audio Sync, Real-Time Collaboration, Dot Book Export, Pyware Import',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: '1 project, 5 formations, basic export',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19',
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
      description: 'Unlimited projects, AI features, collaboration up to 5 users',
    },
    {
      '@type': 'Offer',
      name: 'Team',
      price: '49',
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
      description: 'Everything in Pro + 25 users, priority support, API access',
    },
  ],
};

// Animated formation dots for the AI demo preview
const DEMO_DOTS = [
  { x: 50, y: 20, color: '#ef4444', delay: 0 },
  { x: 30, y: 35, color: '#f97316', delay: 0.1 },
  { x: 70, y: 35, color: '#eab308', delay: 0.15 },
  { x: 15, y: 55, color: '#22c55e', delay: 0.25 },
  { x: 85, y: 55, color: '#3b82f6', delay: 0.3 },
  { x: 25, y: 70, color: '#8b5cf6', delay: 0.35 },
  { x: 75, y: 70, color: '#ec4899', delay: 0.4 },
  { x: 50, y: 80, color: '#14b8a6', delay: 0.2 },
  { x: 40, y: 50, color: '#f43f5e', delay: 0.45 },
  { x: 60, y: 50, color: '#06b6d4', delay: 0.5 },
];

function AIDemoSection() {
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();

  const handleTryClick = () => {
    eventTracker.trackEvent('landing_cta_click', {
      prompt: inputValue,
      section: 'ai_demo',
      destination: '/try',
    });
    navigate(`/try?prompt=${encodeURIComponent(inputValue)}&utm_source=landing&utm_content=ai_demo`);
  };

  return (
    <section className="py-24 px-4 bg-neutral-900">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Describe your formation. AI creates it.
        </h2>
        <p className="text-lg text-neutral-400 mb-10 max-w-2xl mx-auto">
          FluxStudio's AI drill writer turns plain English into precise formations.
          No competitor has this.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-12">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) handleTryClick();
            }}
            placeholder="A 48-performer company front that transitions to a pinwheel..."
            className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleTryClick}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap"
          >
            Try it free
          </button>
        </div>

        {/* Animated formation dot preview */}
        <div className="relative w-48 h-48 mx-auto" aria-hidden="true">
          {DEMO_DOTS.map((dot, i) => (
            <span
              key={i}
              className="absolute w-3 h-3 rounded-full animate-pulse"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                backgroundColor: dot.color,
                animationDelay: `${dot.delay}s`,
                animationDuration: '2s',
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 8px ${dot.color}60`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Social Proof Section — verifiable facts only
// ---------------------------------------------------------------------------

const CAPABILITY_STATS = [
  { value: 27, suffix: '+', label: 'Formation Templates' },
  { value: 9, suffix: '', label: 'Activity Types' },
  { value: 0, suffix: '', label: 'AI-Powered Drill Design', isFeature: true },
  { value: 0, suffix: '', label: 'Free to Start', isFeature: true },
] as const;

const USE_CASE_BADGES = [
  'Marching Band',
  'Drum Corps',
  'Color Guard',
  'Dance Team',
  'Winter Guard',
  'Indoor Drumline',
  'Cheerleading',
  'Pep Band',
  'Drill Team',
];

function useCountUp(target: number, isVisible: boolean, duration = 1200) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current || target === 0) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isVisible, target, duration]);

  return count;
}

function AnimatedStat({
  value,
  suffix,
  label,
  isFeature,
  isVisible,
}: {
  value: number;
  suffix: string;
  label: string;
  isFeature?: boolean;
  isVisible: boolean;
}) {
  const animatedValue = useCountUp(value, isVisible);

  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        {isFeature ? label : `${animatedValue}${suffix}`}
      </span>
      {!isFeature && (
        <span className="text-sm text-neutral-400">{label}</span>
      )}
    </div>
  );
}

function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 px-4 bg-neutral-950 border-y border-neutral-800/50"
    >
      <div className="max-w-5xl mx-auto">
        {/* Stats bar */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {CAPABILITY_STATS.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              isFeature={'isFeature' in stat ? stat.isFeature : false}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* Use case badges */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
            Built for
          </p>
          <div
            className={`flex flex-wrap justify-center gap-2 transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {USE_CASE_BADGES.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/60 border border-neutral-700/50 rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyCtaBar({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Desktop only, not dismissed, hero out of view
  if (dismissed || !visible) return null;

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-300">
            Try FluxStudio Free
          </span>
          <Link
            to="/try?utm_source=landing&utm_content=sticky"
            onClick={() => eventTracker.trackEvent('landing_cta_click', { section: 'sticky', destination: '/try' })}
            className="px-4 py-1.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
          >
            Open Editor
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <SEOHead
        description="The creative collaboration platform where teams design, prototype, and ship together in real time. AI-assisted workflows, offline-first, and built for speed."
        canonicalUrl="https://fluxstudio.art"
        structuredData={LANDING_STRUCTURED_DATA}
      />
      <StickyCtaBar heroRef={heroRef} />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section ref={heroRef}>
          <Hero />
        </section>
        <section className="py-16 px-4 text-center">
          <Link
            to="/try?utm_source=landing&utm_content=hero"
            onClick={() => eventTracker.trackEvent('landing_cta_click', { destination: '/try', section: 'hero' })}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20"
          >
            Start designing your show for free
          </Link>
        </section>
        <ProductShowcase />
        <Features />
        {/* AI Demo Section */}
        <AIDemoSection />
        <SocialProofSection />
        <UseCases />
        <Testimonials />
        <Pricing />
        <CTAFooter />
      </main>
    </div>
  );
}
