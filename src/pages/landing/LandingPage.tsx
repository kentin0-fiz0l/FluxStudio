/**
 * FluxStudio Landing Page - Synthesized from 3 design variants
 *
 * Cherry-picked best sections:
 * - Header:       Editorial  (gradient logo, clean spacing)
 * - Hero:         Editorial  (asymmetric, section numbers, Logo3D)
 * - Features:     Bold       (bento grid, glassmorphism, varied cards)
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Features />
        <UseCases />
        <Testimonials />
        <Pricing />
        <CTAFooter />
      </main>
    </div>
  );
}
