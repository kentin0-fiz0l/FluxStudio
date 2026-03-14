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
import { BetaWaitlistForm } from '../../components/landing/BetaWaitlistForm';
import { SEOHead } from '../../components/SEOHead';

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
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SEOHead
        description="The creative collaboration platform where teams design, prototype, and ship together in real time. AI-assisted workflows, offline-first, and built for speed."
        canonicalUrl="https://fluxstudio.art"
        structuredData={LANDING_STRUCTURED_DATA}
      />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <BetaWaitlistForm />
        <ProductShowcase />
        <Features />
        <UseCases />
        <Testimonials />
        <Pricing />
        <CTAFooter />
      </main>
    </div>
  );
}
