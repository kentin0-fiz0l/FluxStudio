import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Paintbrush,
  FolderOpen,
  Users,
  Zap,
  BarChart3,
  Shield,
  Palette,
  Building2,
  Briefcase,
  Menu,
  ArrowRight,
  Check,
  Minus,
} from 'lucide-react';
import { Logo3D } from '@/components/Logo3D';
import { SkipLink } from '@/components/ui/SkipLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
}

interface Stat {
  value: string;
  label: string;
}

interface UseCase {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface PricingRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    icon: Paintbrush,
    title: 'Design Collaboration',
    description: 'Real-time collaborative design tools that keep your creative team in sync',
  },
  {
    icon: FolderOpen,
    title: 'Smart File Management',
    description: 'Organize and share creative assets with intelligent version control',
  },
  {
    icon: Users,
    title: 'Team Communication',
    description: 'Integrated messaging and feedback tools built for creative workflows',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Streamline repetitive tasks and focus on what matters most -- creating',
  },
  {
    icon: BarChart3,
    title: 'Project Analytics',
    description: 'Track progress, deadlines, and team performance with visual insights',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and role-based access control for your peace of mind',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Creative Director',
    company: 'Design Studio Co.',
    quote:
      'FluxStudio transformed how our team collaborates. We\'ve cut project turnaround time by 40%.',
  },
  {
    name: 'Michael Torres',
    role: 'Lead Designer',
    company: 'Bright Ideas Agency',
    quote:
      'The real-time collaboration features are game-changing. It\'s like having the whole team in one room.',
  },
  {
    name: 'Emily Johnson',
    role: 'Project Manager',
    company: 'Creative Minds Inc.',
    quote:
      'Finally, a platform that understands creative workflows. Our clients love the seamless review process.',
  },
];

const STATS: Stat[] = [
  { value: '10K+', label: 'Active Users' },
  { value: '50K+', label: 'Projects Created' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

const USE_CASES: UseCase[] = [
  {
    icon: Palette,
    title: 'For Design Teams',
    description: 'Collaborate on projects in real-time with version control and feedback tools',
  },
  {
    icon: Building2,
    title: 'For Agencies',
    description: 'Manage multiple client projects with automated workflows and reporting',
  },
  {
    icon: Briefcase,
    title: 'For Freelancers',
    description: 'Professional client portals and streamlined project delivery',
  },
];

const PRICING_ROWS: PricingRow[] = [
  { label: 'Projects', free: 'Up to 3', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Storage', free: '1 GB', pro: '100 GB', enterprise: 'Unlimited' },
  { label: 'Collaboration', free: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
  { label: 'Version History', free: false, pro: true, enterprise: true },
  { label: 'Priority Support', free: false, pro: true, enterprise: true },
  { label: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { label: 'Dedicated Support', free: false, pro: false, enterprise: true },
  { label: 'Custom Integrations', free: false, pro: false, enterprise: true },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 90, damping: 18 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const viewportConfig = { once: true, margin: '-80px' as const };

// ---------------------------------------------------------------------------
// Utility: render boolean/string cell in pricing table
// ---------------------------------------------------------------------------

function PricingCell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <span className="font-sans text-sm text-neutral-600">{value}</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-accent-500 mx-auto" aria-label="Included" />
  ) : (
    <Minus className="w-4 h-4 text-neutral-300 mx-auto" aria-label="Not included" />
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-50/80 backdrop-blur-md border-b border-neutral-200">
      <nav
        className="max-w-7xl mx-auto px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="font-display text-lg tracking-widest uppercase text-neutral-950 focus-visible-ring"
            aria-label="FluxStudio home"
          >
            FluxStudio
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-sans text-sm tracking-wide text-neutral-500 hover:text-neutral-950 transition-colors duration-200 focus-visible-ring"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="font-sans text-sm tracking-wide text-neutral-500 hover:text-neutral-950 transition-colors duration-200 focus-visible-ring"
            >
              Login
            </button>
            <Link
              to="/signup"
              className="font-sans text-sm font-semibold tracking-wide bg-accent-500 text-white px-5 py-2 hover:bg-accent-600 transition-colors duration-200 focus-visible-ring"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button
                aria-label="Toggle navigation menu"
                className="touch-target text-neutral-700 hover:text-neutral-950 transition-colors flex items-center justify-center"
              >
                <Menu className="w-6 h-6" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] bg-neutral-50/95 backdrop-blur-lg border-l border-neutral-200"
            >
              <div className="flex flex-col gap-6 mt-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target font-sans text-lg text-neutral-600 hover:text-neutral-950 transition-colors focus-visible-ring"
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="touch-target font-sans text-lg text-left text-neutral-600 hover:text-neutral-950 transition-colors focus-visible-ring"
                >
                  Login
                </button>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="touch-target font-sans text-lg font-semibold bg-accent-500 text-white text-center px-6 py-3 hover:bg-accent-600 transition-colors focus-visible-ring"
                >
                  Start Free Trial
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function Hero() {
  return (
    <section className="pt-32 pb-24 sm:pt-40 sm:pb-32 lg:pt-48 lg:pb-40 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} className="mb-12 flex justify-center">
            <Logo3D variant="light" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-widest uppercase text-neutral-950 leading-none"
          >
            Design in Motion
          </motion.h1>

          {/* Accent line */}
          <motion.div
            variants={fadeUp}
            className="w-16 h-0.5 bg-accent-500 mx-auto mt-6 mb-6"
          />

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            className="font-sans text-lg sm:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed"
          >
            The all-in-one creative platform for design teams to collaborate,
            manage projects, and deliver exceptional work faster than ever.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            <Link
              to="/signup"
              className="w-full sm:w-auto font-sans text-sm font-semibold tracking-wide bg-accent-500 text-white px-8 py-3.5 hover:bg-accent-600 transition-colors duration-200 flex items-center justify-center gap-2 focus-visible-ring"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto font-sans text-sm font-semibold tracking-wide border border-neutral-300 text-neutral-700 px-8 py-3.5 hover:border-neutral-950 hover:text-neutral-950 transition-colors duration-200 flex items-center justify-center focus-visible-ring"
            >
              Learn More
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            className="mt-20 flex flex-wrap justify-center divide-x divide-neutral-200"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="px-6 sm:px-10 py-2">
                <div className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wider text-neutral-950">
                  {stat.value}
                </div>
                <div className="font-sans text-xs tracking-widest uppercase text-neutral-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export function Features() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32 lg:py-40 bg-white border-t border-neutral-200"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Section heading */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="mb-16 lg:mb-24"
        >
          <motion.p
            variants={fadeUp}
            className="font-sans text-xs tracking-widest uppercase text-accent-500 mb-3"
          >
            Capabilities
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-widest uppercase text-neutral-950"
          >
            Everything You Need
          </motion.h2>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:[&>*:nth-child(odd)]:border-r md:divide-x-0"
        >
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const isOdd = i % 2 === 0;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className={`py-10 ${isOdd ? 'md:pr-12' : 'md:pl-12'} ${
                  i < FEATURES.length - 2 ? 'md:border-b md:border-neutral-100' : ''
                } ${i < FEATURES.length - 1 ? 'border-neutral-100' : 'border-transparent'}`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-neutral-200 text-neutral-400">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm tracking-widest uppercase text-neutral-950 mb-2">
                      {feature.title}
                    </h3>
                    <p className="font-sans text-sm text-neutral-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Use Cases
// ---------------------------------------------------------------------------

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="py-24 sm:py-32 lg:py-40 bg-neutral-50 border-t border-neutral-200"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="mb-16 lg:mb-24"
        >
          <motion.p
            variants={fadeUp}
            className="font-sans text-xs tracking-widest uppercase text-accent-500 mb-3"
          >
            Use Cases
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-widest uppercase text-neutral-950"
          >
            Built for Every Creative
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-neutral-200"
        >
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.title}
                variants={fadeUp}
                className="py-10 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0"
              >
                <Icon
                  className="w-6 h-6 text-accent-500 mb-6"
                  aria-hidden="true"
                />
                <h3 className="font-display text-sm tracking-widest uppercase text-neutral-950 mb-3">
                  {uc.title}
                </h3>
                <p className="font-sans text-sm text-neutral-500 leading-relaxed">
                  {uc.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-24 sm:py-32 lg:py-40 bg-white border-t border-neutral-200"
    >
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="mb-16 lg:mb-24"
        >
          <motion.p
            variants={fadeUp}
            className="font-sans text-xs tracking-widest uppercase text-accent-500 mb-3"
          >
            Testimonials
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-widest uppercase text-neutral-950"
          >
            Loved by Creatives
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="space-y-0 divide-y divide-neutral-100"
        >
          {TESTIMONIALS.map((t) => (
            <motion.blockquote
              key={t.name}
              variants={fadeUp}
              className="py-10"
            >
              <p className="font-sans text-lg sm:text-xl text-neutral-700 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-4 font-sans text-sm text-neutral-400">
                &mdash;&nbsp;{t.name}, {t.role}, {t.company}
              </footer>
            </motion.blockquote>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 lg:py-40 bg-neutral-50 border-t border-neutral-200"
    >
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="mb-16 lg:mb-24"
        >
          <motion.p
            variants={fadeUp}
            className="font-sans text-xs tracking-widest uppercase text-accent-500 mb-3"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-widest uppercase text-neutral-950"
          >
            Simple, Transparent
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeUp}
          className="overflow-x-auto"
        >
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="border-b-2 border-neutral-950">
                <th className="font-sans text-xs tracking-widest uppercase text-neutral-400 pb-4 pr-4 w-1/4">
                  &nbsp;
                </th>
                <th className="font-display text-sm tracking-widest uppercase text-neutral-950 pb-4 px-4 text-center w-1/4">
                  Free
                  <div className="font-sans text-2xl font-bold tracking-normal mt-1">$0</div>
                  <div className="font-sans text-xs font-normal text-neutral-400 tracking-normal">
                    Forever free
                  </div>
                </th>
                <th className="font-display text-sm tracking-widest uppercase text-neutral-950 pb-4 px-4 text-center w-1/4 relative">
                  <span className="inline-block bg-accent-500 text-white font-sans text-[10px] tracking-widest uppercase px-2 py-0.5 mb-2">
                    Popular
                  </span>
                  <br />
                  Pro
                  <div className="font-sans text-2xl font-bold tracking-normal mt-1">
                    $19<span className="text-sm font-normal text-neutral-400">/mo</span>
                  </div>
                  <div className="font-sans text-xs font-normal text-neutral-400 tracking-normal">
                    Per user, billed annually
                  </div>
                </th>
                <th className="font-display text-sm tracking-widest uppercase text-neutral-950 pb-4 pl-4 text-center w-1/4">
                  Enterprise
                  <div className="font-sans text-2xl font-bold tracking-normal mt-1">Custom</div>
                  <div className="font-sans text-xs font-normal text-neutral-400 tracking-normal">
                    Contact us
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-neutral-200 last:border-b-0"
                >
                  <td className="font-sans text-sm text-neutral-700 py-4 pr-4">
                    {row.label}
                  </td>
                  <td className="text-center py-4 px-4">
                    <PricingCell value={row.free} />
                  </td>
                  <td className="text-center py-4 px-4">
                    <PricingCell value={row.pro} />
                  </td>
                  <td className="text-center py-4 pl-4">
                    <PricingCell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td className="py-6" />
                <td className="text-center py-6 px-4">
                  <Link
                    to="/signup"
                    className="inline-block font-sans text-sm font-semibold tracking-wide border border-neutral-300 text-neutral-700 px-6 py-2.5 hover:border-neutral-950 hover:text-neutral-950 transition-colors duration-200 focus-visible-ring"
                  >
                    Get Started
                  </Link>
                </td>
                <td className="text-center py-6 px-4">
                  <Link
                    to="/signup"
                    className="inline-block font-sans text-sm font-semibold tracking-wide bg-accent-500 text-white px-6 py-2.5 hover:bg-accent-600 transition-colors duration-200 focus-visible-ring"
                  >
                    Start Free Trial
                  </Link>
                </td>
                <td className="text-center py-6 pl-4">
                  <a
                    href="mailto:sales@fluxstudio.art"
                    className="inline-block font-sans text-sm font-semibold tracking-wide border border-neutral-300 text-neutral-700 px-6 py-2.5 hover:border-neutral-950 hover:text-neutral-950 transition-colors duration-200 focus-visible-ring"
                  >
                    Contact Sales
                  </a>
                </td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA Footer
// ---------------------------------------------------------------------------

export function CTAFooter() {
  return (
    <section className="bg-neutral-950 border-t border-neutral-800">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl lg:text-6xl font-bold tracking-widest uppercase text-neutral-50 leading-tight"
          >
            Ready to Transform
            <br />
            Your Workflow?
          </motion.h2>

          <motion.div
            variants={fadeUp}
            className="w-12 h-0.5 bg-accent-500 mx-auto mt-8 mb-8"
          />

          <motion.p
            variants={fadeUp}
            className="font-sans text-neutral-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Join thousands of creative professionals who trust FluxStudio
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="w-full sm:w-auto font-sans text-sm font-semibold tracking-wide bg-accent-500 text-white px-8 py-3.5 hover:bg-accent-600 transition-colors duration-200 flex items-center justify-center gap-2 focus-visible-ring"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto font-sans text-sm font-semibold tracking-wide border border-neutral-700 text-neutral-300 px-8 py-3.5 hover:border-neutral-50 hover:text-neutral-50 transition-colors duration-200 flex items-center justify-center focus-visible-ring"
            >
              Sign In
            </Link>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="font-sans text-xs text-neutral-600 mt-8 tracking-wide"
          >
            No credit card required &middot; 14-day free trial &middot; Cancel
            anytime
          </motion.p>
        </motion.div>
      </div>

      {/* Minimal footer */}
      <footer className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-sans text-xs text-neutral-600 tracking-wide">
              &copy; 2026 FluxStudio. All rights reserved.
            </p>
            <nav aria-label="Footer navigation" className="flex gap-6">
              <Link
                to="/privacy"
                className="font-sans text-xs text-neutral-600 hover:text-neutral-300 transition-colors focus-visible-ring"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="font-sans text-xs text-neutral-600 hover:text-neutral-300 transition-colors focus-visible-ring"
              >
                Terms
              </Link>
              <a
                href="mailto:hello@fluxstudio.art"
                className="font-sans text-xs text-neutral-600 hover:text-neutral-300 transition-colors focus-visible-ring"
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Composed Page
// ---------------------------------------------------------------------------

export default function MinimalistLanding() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 font-sans">
      <SkipLink href="#main-content" />
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
