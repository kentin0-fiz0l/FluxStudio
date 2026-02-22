import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Paintbrush,
  FolderOpen,
  Users,
  Zap,
  BarChart3,
  ShieldCheck,
  Menu,
  ArrowRight,
  Play,
  Check,
  Building2,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { Logo3D } from '@/components/Logo3D';
import { SkipLink } from '@/components/ui/SkipLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feature {
  icon: LucideIcon;
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
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
}

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    icon: Paintbrush,
    title: 'Design Collaboration',
    description:
      'Real-time collaborative design tools that keep your creative team in sync.',
  },
  {
    icon: FolderOpen,
    title: 'Smart File Management',
    description:
      'Organize and share creative assets with intelligent version control.',
  },
  {
    icon: Users,
    title: 'Team Communication',
    description:
      'Integrated messaging and feedback tools built for creative workflows.',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description:
      'Streamline repetitive tasks and focus on what matters most \u2014 creating.',
  },
  {
    icon: BarChart3,
    title: 'Project Analytics',
    description:
      'Track progress, deadlines, and team performance with visual insights.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    description:
      'Bank-level encryption and role-based access control for your peace of mind.',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Creative Director',
    company: 'Design Studio Co.',
    quote:
      "FluxStudio transformed how our team collaborates. We've cut project turnaround time by 40%.",
  },
  {
    name: 'Michael Torres',
    role: 'Lead Designer',
    company: 'Bright Ideas Agency',
    quote:
      "The real-time collaboration features are game-changing. It's like having the whole team in one room.",
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
    icon: Paintbrush,
    title: 'For Design Teams',
    subtitle: 'Create together, in real time',
    description:
      'Collaborate on projects in real-time with version control and feedback tools.',
    bullets: [
      'Live cursors and co-editing',
      'Branch-based version control',
      'In-context review threads',
    ],
  },
  {
    icon: Building2,
    title: 'For Agencies',
    subtitle: 'Scale without the chaos',
    description:
      'Manage multiple client projects with automated workflows and reporting.',
    bullets: [
      'Client-facing project portals',
      'Automated status reports',
      'Cross-project resource planning',
    ],
  },
  {
    icon: Briefcase,
    title: 'For Freelancers',
    subtitle: 'Look bigger than you are',
    description:
      'Professional client portals and streamlined project delivery.',
    bullets: [
      'Branded client experience',
      'Milestone-based delivery',
      'Integrated invoicing',
    ],
  },
];

const PRICING: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Forever free',
    features: [
      'Up to 3 projects',
      '1 GB storage',
      'Basic collaboration',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/signup',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    subtitle: 'Per user, billed annually',
    features: [
      'Unlimited projects',
      '100 GB storage',
      'Advanced collaboration',
      'Priority support',
      'Version history',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'Contact us for pricing',
    features: [
      'Everything in Pro',
      'Unlimited storage',
      'SSO & SAML',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@fluxstudio.art',
  },
];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
];

// ---------------------------------------------------------------------------
// Animation variants & helpers
// ---------------------------------------------------------------------------

const sectionReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const lineReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// Respect prefers-reduced-motion: if user prefers reduced motion,
// we collapse all animations to instant
function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
}

// ---------------------------------------------------------------------------
// Section Number Component
// ---------------------------------------------------------------------------

function SectionNumber({
  number,
  className = '',
}: {
  number: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`font-display text-[8rem] md:text-[12rem] lg:text-[16rem] font-black leading-none select-none pointer-events-none absolute opacity-[0.04] ${className}`}
    >
      {number}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Overline Label
// ---------------------------------------------------------------------------

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block font-sans text-xs font-semibold tracking-[0.1em] uppercase text-accent-500">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-moderate ${
        scrolled
          ? 'bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800/50'
          : 'bg-transparent'
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 focus-visible-ring"
            aria-label="FluxStudio home"
          >
            <span className="font-display text-xl font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 text-transparent bg-clip-text">
              FluxStudio
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-sans text-sm text-neutral-400 hover:text-neutral-50 transition-colors duration-fast focus-visible-ring"
              >
                {link.label}
              </a>
            ))}
            <div className="w-px h-5 bg-neutral-800" aria-hidden="true" />
            <button
              onClick={() => navigate('/login')}
              className="font-sans text-sm text-neutral-400 hover:text-neutral-50 transition-colors duration-fast focus-visible-ring"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="font-sans text-sm font-semibold bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-2 rounded-full text-white hover:shadow-primary-glow hover:scale-105 transition-all duration-normal focus-visible-ring"
            >
              Start Free Trial
            </button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button
                aria-label="Toggle navigation menu"
                className="touch-target text-neutral-400 hover:text-neutral-50 transition-colors flex items-center justify-center"
              >
                <Menu className="w-6 h-6" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] bg-neutral-950/95 backdrop-blur-lg border-l border-neutral-800"
            >
              <div className="flex flex-col gap-6 mt-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target font-sans text-lg text-neutral-300 hover:text-neutral-50 transition-colors focus-visible-ring"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-neutral-800" />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="touch-target font-sans text-lg text-left text-neutral-300 hover:text-neutral-50 transition-colors focus-visible-ring"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/signup');
                  }}
                  className="touch-target font-sans bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-3 rounded-full text-lg font-semibold text-white hover:shadow-primary-glow transition-all duration-normal focus-visible-ring"
                >
                  Start Free Trial
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------

export function Hero() {
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  const heroLines = ['Design in Motion.', 'Collaboration', 'Elevated.'];

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center bg-neutral-950 text-neutral-50 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background section number */}
      <SectionNumber number="01" className="top-8 right-4 lg:right-12" />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-secondary-900/10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-32 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Text */}
          <div className="lg:col-span-7 xl:col-span-7">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp}>
                <Overline>Creative Collaboration Platform</Overline>
              </motion.div>

              <h1
                id="hero-heading"
                className="mt-4 mb-6"
              >
                {heroLines.map((line, i) => (
                  <motion.span
                    key={i}
                    custom={i}
                    variants={prefersReduced ? undefined : lineReveal}
                    initial="hidden"
                    animate="visible"
                    className="block font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
                  >
                    {i === 0 ? (
                      line
                    ) : (
                      <span className="bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 text-transparent bg-clip-text">
                        {line}
                      </span>
                    )}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                variants={fadeUp}
                className="font-sans text-lg sm:text-xl text-neutral-400 max-w-xl mb-8 leading-relaxed"
              >
                The all-in-one creative platform for design teams to
                collaborate, manage projects, and deliver exceptional work
                faster than ever.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row gap-4 mb-12"
              >
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 font-sans font-semibold bg-gradient-to-r from-primary-500 to-secondary-500 px-8 py-4 rounded-full text-lg text-white hover:shadow-primary-glow hover:scale-[1.03] transition-all duration-normal focus-visible-ring"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <Link
                  to="/try"
                  className="inline-flex items-center justify-center gap-2 font-sans font-semibold border border-neutral-700 px-8 py-4 rounded-full text-lg text-neutral-300 hover:bg-neutral-800/60 hover:border-neutral-500 transition-all duration-normal focus-visible-ring"
                >
                  Try the Editor
                  <Play className="w-4 h-4" aria-hidden="true" />
                </Link>
              </motion.div>

              {/* Stats row */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-4 gap-6"
              >
                {STATS.map((stat) => (
                  <motion.div key={stat.label} variants={fadeUp}>
                    <div className="font-display text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 text-transparent bg-clip-text">
                      {stat.value}
                    </div>
                    <div className="font-sans text-sm text-neutral-500 mt-1">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Right: Logo3D with parallax */}
          <motion.div
            className="lg:col-span-5 xl:col-span-5 hidden lg:flex items-center justify-center"
            style={{ y: prefersReduced ? 0 : parallaxY }}
          >
            <div className="scale-110 xl:scale-125">
              <Logo3D variant="dark" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/40 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// FEATURES (Sticky left + scrolling right)
// ---------------------------------------------------------------------------

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative bg-neutral-50 text-neutral-900 overflow-hidden"
      aria-labelledby="features-heading"
    >
      <SectionNumber
        number="02"
        className="top-8 left-4 lg:left-12 text-neutral-900"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16">
          {/* Sticky left panel */}
          <div className="lg:col-span-5 py-20 lg:py-0">
            <div className="lg:sticky lg:top-32 lg:py-20">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={staggerContainer}
              >
                <motion.div variants={fadeRight}>
                  <Overline>Features</Overline>
                </motion.div>
                <motion.h2
                  variants={fadeRight}
                  id="features-heading"
                  className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 mb-6 leading-tight tracking-tight"
                >
                  Everything You Need to Create
                </motion.h2>
                <motion.p
                  variants={fadeRight}
                  className="font-sans text-lg text-neutral-500 leading-relaxed max-w-md"
                >
                  Powerful features designed for modern creative teams.
                  Each tool is crafted to remove friction from your
                  workflow.
                </motion.p>
                {/* Thin accent line */}
                <motion.div
                  variants={fadeRight}
                  className="mt-8 w-16 h-px bg-accent-500"
                  aria-hidden="true"
                />
              </motion.div>
            </div>
          </div>

          {/* Scrolling right panel */}
          <div className="lg:col-span-7 py-12 lg:py-20 space-y-8">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={fadeUp}
                  className="group relative bg-white rounded-2xl p-8 border border-neutral-200 hover:border-primary-300 hover:shadow-card-hover transition-all duration-normal"
                >
                  {/* Feature number */}
                  <span
                    className="absolute top-6 right-6 font-display text-sm font-bold text-neutral-300"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-normal">
                      <Icon
                        className="w-6 h-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-sans text-xl font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="font-sans text-neutral-500 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// USE CASES (Asymmetric alternating sections)
// ---------------------------------------------------------------------------

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="relative bg-neutral-950 text-neutral-50 py-24 lg:py-32 overflow-hidden"
      aria-labelledby="use-cases-heading"
    >
      <SectionNumber number="03" className="top-0 right-4 lg:right-12" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="max-w-2xl mb-20"
        >
          <motion.div variants={fadeUp}>
            <Overline>Use Cases</Overline>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            id="use-cases-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 mb-6 leading-tight tracking-tight"
          >
            Built for Every Creative
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="font-sans text-lg text-neutral-400 leading-relaxed"
          >
            Whether you're a team, agency, or freelancer &mdash; FluxStudio
            adapts to the way you work.
          </motion.p>
        </motion.div>

        {/* Alternating use case rows */}
        <div className="space-y-24 lg:space-y-32">
          {USE_CASES.map((useCase, index) => {
            const Icon = useCase.icon;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={useCase.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={sectionReveal}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center`}
              >
                {/* Visual / icon block */}
                <div
                  className={`lg:col-span-5 ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 flex items-center justify-center overflow-hidden">
                    {/* Large section number */}
                    <span
                      className="absolute top-4 left-6 font-display text-7xl font-black text-neutral-800 select-none pointer-events-none"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon
                      className="w-20 h-20 text-accent-500/60"
                      aria-hidden="true"
                      strokeWidth={1}
                    />
                  </div>
                </div>

                {/* Text block */}
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className={`lg:col-span-7 ${
                    isEven ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <motion.div variants={fadeUp}>
                    <Overline>{useCase.subtitle}</Overline>
                  </motion.div>
                  <motion.h3
                    variants={fadeUp}
                    className="font-display text-2xl sm:text-3xl font-bold mt-2 mb-4 tracking-tight"
                  >
                    {useCase.title}
                  </motion.h3>
                  <motion.p
                    variants={fadeUp}
                    className="font-sans text-lg text-neutral-400 leading-relaxed mb-6"
                  >
                    {useCase.description}
                  </motion.p>
                  <motion.ul
                    variants={staggerContainer}
                    className="space-y-3"
                  >
                    {useCase.bullets.map((bullet) => (
                      <motion.li
                        key={bullet}
                        variants={fadeUp}
                        className="flex items-center gap-3 font-sans text-neutral-300"
                      >
                        <ChevronRight
                          className="w-4 h-4 text-accent-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        {bullet}
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TESTIMONIALS (Horizontal scroll strip)
// ---------------------------------------------------------------------------

export function Testimonials() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft ?? 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft ?? 0);
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current.offsetLeft ?? 0);
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <section
      id="testimonials"
      className="relative bg-neutral-50 text-neutral-900 py-24 lg:py-32 overflow-hidden"
      aria-labelledby="testimonials-heading"
    >
      <SectionNumber
        number="04"
        className="top-0 left-4 lg:left-12 text-neutral-900"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 lg:mb-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp}>
            <Overline>Testimonials</Overline>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            id="testimonials-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 tracking-tight"
          >
            Loved by Creative Teams
          </motion.h2>
        </motion.div>
      </div>

      {/* Horizontal scrolling carousel */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className={`flex gap-6 overflow-x-auto pb-8 px-4 sm:px-6 lg:px-8 scrollbar-hide ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        role="region"
        aria-label="Testimonials carousel"
        tabIndex={0}
      >
        {/* Left spacer for offset */}
        <div className="flex-shrink-0 w-0 lg:w-[calc((100vw-80rem)/2)]" aria-hidden="true" />

        {TESTIMONIALS.map((testimonial) => (
          <motion.blockquote
            key={testimonial.name}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative flex-shrink-0 w-[85vw] sm:w-[60vw] md:w-[45vw] lg:w-[36rem] bg-white rounded-2xl p-8 lg:p-10 border border-neutral-200 scroll-snap-align-start"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Decorative quote mark */}
            <span
              className="absolute -top-2 left-6 font-handwriting text-8xl lg:text-9xl text-primary-100 leading-none select-none pointer-events-none"
              aria-hidden="true"
            >
              &ldquo;
            </span>

            <div className="relative z-10">
              <p className="font-sans text-lg lg:text-xl text-neutral-700 leading-relaxed mb-8 italic">
                {testimonial.quote}
              </p>

              <div className="flex items-center gap-4">
                {/* Avatar placeholder: initials */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-sans font-bold text-sm">
                  {testimonial.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <cite className="font-sans font-semibold text-neutral-900 not-italic block">
                    {testimonial.name}
                  </cite>
                  <span className="font-sans text-sm text-neutral-500">
                    {testimonial.role}, {testimonial.company}
                  </span>
                </div>
              </div>
            </div>
          </motion.blockquote>
        ))}

        {/* Right spacer */}
        <div className="flex-shrink-0 w-4" aria-hidden="true" />
      </div>

      {/* Scroll hint */}
      <p className="text-center font-sans text-sm text-neutral-400 mt-4 lg:hidden">
        Swipe to see more
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PRICING
// ---------------------------------------------------------------------------

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative bg-neutral-950 text-neutral-50 py-24 lg:py-32 overflow-hidden"
      aria-labelledby="pricing-heading"
    >
      <SectionNumber number="05" className="top-0 right-4 lg:right-12" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16 lg:mb-20"
        >
          <motion.div variants={fadeUp}>
            <Overline>Pricing</Overline>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            id="pricing-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 mb-4 tracking-tight"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="font-sans text-lg text-neutral-400"
          >
            Start free, scale as you grow
          </motion.p>
        </motion.div>

        {/* Pricing grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto"
        >
          {PRICING.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              className={`relative rounded-2xl p-8 border transition-all duration-normal ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-primary-900/30 to-secondary-900/20 border-primary-500/40 shadow-primary-glow'
                  : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-sans text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="text-center mb-8">
                <h3 className="font-sans text-lg font-semibold mb-3 text-neutral-300">
                  {tier.name}
                </h3>
                <div className="font-display text-4xl lg:text-5xl font-bold">
                  {tier.price}
                  {tier.period && (
                    <span className="font-sans text-lg font-normal text-neutral-500">
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="font-sans text-sm text-neutral-500 mt-2">
                  {tier.subtitle}
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 font-sans text-sm text-neutral-300"
                  >
                    <Check
                      className={`w-4 h-4 flex-shrink-0 ${
                        tier.highlighted
                          ? 'text-accent-400'
                          : 'text-neutral-600'
                      }`}
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.href.startsWith('mailto:') ? (
                <a
                  href={tier.href}
                  className="block w-full text-center font-sans font-semibold py-3 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-all duration-normal focus-visible-ring"
                >
                  {tier.cta}
                </a>
              ) : (
                <Link
                  to={tier.href}
                  className={`block w-full text-center font-sans font-semibold py-3 rounded-full transition-all duration-normal focus-visible-ring ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-primary-glow'
                      : 'border border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {tier.cta}
                </Link>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA + FOOTER
// ---------------------------------------------------------------------------

export function CTAFooter() {
  return (
    <section className="relative bg-neutral-950 text-neutral-50 overflow-hidden">
      {/* CTA Block */}
      <div className="relative py-24 lg:py-32">
        <SectionNumber number="06" className="top-0 left-4 lg:left-12" />

        {/* Animated gradient accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <Overline>Get Started</Overline>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mt-4 mb-6 leading-tight tracking-tight"
            >
              Ready to Transform
              <br />
              Your Workflow?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="font-sans text-lg text-neutral-400 mb-10 max-w-2xl mx-auto"
            >
              Join thousands of creative professionals who trust FluxStudio
              to bring their best work to life.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
            >
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 font-sans font-semibold bg-gradient-to-r from-primary-500 to-secondary-500 px-8 py-4 rounded-full text-lg text-white hover:shadow-primary-glow hover:scale-[1.03] transition-all duration-normal focus-visible-ring"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                to="/try"
                className="inline-flex items-center justify-center gap-2 font-sans font-semibold border border-neutral-700 px-8 py-4 rounded-full text-lg text-neutral-300 hover:bg-neutral-800/60 hover:border-neutral-500 transition-all duration-normal focus-visible-ring"
              >
                Try the Editor
                <Play className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="font-sans text-sm text-neutral-600"
            >
              No credit card required &middot; 14-day free trial &middot;
              Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div>
              <Link
                to="/"
                className="inline-block font-display text-lg font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 text-transparent bg-clip-text mb-3 focus-visible-ring"
                aria-label="FluxStudio home"
              >
                FluxStudio
              </Link>
              <p className="font-sans text-sm text-neutral-500 leading-relaxed">
                Design in Motion.
                <br />
                Collaboration Elevated.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-sans font-semibold text-sm text-neutral-300 mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Integrations', 'API'].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href={
                          item === 'Features'
                            ? '#features'
                            : item === 'Pricing'
                              ? '#pricing'
                              : '#'
                        }
                        className="font-sans text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-fast focus-visible-ring"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-sans font-semibold text-sm text-neutral-300 mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="font-sans text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-fast focus-visible-ring"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-sans font-semibold text-sm text-neutral-300 mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/privacy"
                    className="font-sans text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-fast focus-visible-ring"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="font-sans text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-fast focus-visible-ring"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="font-sans text-sm text-neutral-500 hover:text-neutral-200 transition-colors duration-fast focus-visible-ring"
                  >
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-neutral-800/60 pt-8 text-center">
            <p className="font-sans text-sm text-neutral-600">
              &copy; {new Date().getFullYear()} FluxStudio. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DEFAULT PAGE EXPORT
// ---------------------------------------------------------------------------

export default function EditorialLanding() {
  return (
    <div className="min-h-screen">
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
