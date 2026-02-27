import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  Palette,
  FolderOpen,
  Users,
  Zap,
  BarChart3,
  Shield,
  Menu,
  ArrowRight,
  Play,
  Check,
  Star,
  Paintbrush,
  Building2,
  Briefcase,
  Twitter,
  Github,
  Linkedin,
  Youtube,
} from 'lucide-react';
import { Logo3D } from '@/components/Logo3D';
import { FEATURE_ANIMATIONS } from '@/components/landing/FeatureVideos';
import { SkipLink } from '@/components/ui/SkipLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  glow: string;
  span?: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  stars: number;
  accent: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface UseCase {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  accent: string;
}

interface PricingTier {
  name: string;
  price: string;
  period?: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    icon: Palette,
    title: 'Design Collaboration',
    description: 'Real-time collaborative design tools that keep your creative team in sync',
    gradient: 'from-primary-500 to-secondary-500',
    glow: 'shadow-primary-glow',
    span: 'md:col-span-2',
  },
  {
    icon: FolderOpen,
    title: 'Smart File Management',
    description: 'Organize and share creative assets with intelligent version control',
    gradient: 'from-accent-500 to-primary-500',
    glow: 'shadow-accent-glow',
  },
  {
    icon: Users,
    title: 'Team Communication',
    description: 'Integrated messaging and feedback tools built for creative workflows',
    gradient: 'from-secondary-500 to-primary-400',
    glow: 'shadow-primary-glow',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Streamline repetitive tasks and focus on what matters most - creating',
    gradient: 'from-warning-400 to-error-500',
    glow: 'shadow-primary-glow',
  },
  {
    icon: BarChart3,
    title: 'Project Analytics',
    description: 'Track progress, deadlines, and team performance with visual insights',
    gradient: 'from-accent-400 to-primary-600',
    glow: 'shadow-accent-glow',
    span: 'md:col-span-2',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and role-based access control for your peace of mind',
    gradient: 'from-error-500 to-secondary-600',
    glow: 'shadow-primary-glow',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'Creative Director',
    company: 'Design Studio Co.',
    quote:
      "FluxStudio transformed how our team collaborates. We've cut project turnaround time by 40%.",
    stars: 5,
    accent: 'border-primary-500',
  },
  {
    name: 'Michael Torres',
    role: 'Lead Designer',
    company: 'Bright Ideas Agency',
    quote:
      "The real-time collaboration features are game-changing. It's like having the whole team in one room.",
    stars: 5,
    accent: 'border-secondary-500',
  },
  {
    name: 'Emily Johnson',
    role: 'Project Manager',
    company: 'Creative Minds Inc.',
    quote:
      'Finally, a platform that understands creative workflows. Our clients love the seamless review process.',
    stars: 5,
    accent: 'border-accent-500',
  },
];

const STATS: Stat[] = [
  { value: 10, suffix: 'K+', label: 'Active Users' },
  { value: 50, suffix: 'K+', label: 'Projects Created' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
  { value: 24, suffix: '/7', label: 'Support' },
];

const USE_CASES: UseCase[] = [
  {
    icon: Paintbrush,
    title: 'For Design Teams',
    description: 'Collaborate on projects in real-time with version control and feedback tools',
    gradient: 'from-primary-600 via-primary-500 to-secondary-500',
    accent: 'text-primary-400',
  },
  {
    icon: Building2,
    title: 'For Agencies',
    description: 'Manage multiple client projects with automated workflows and reporting',
    gradient: 'from-secondary-600 via-secondary-500 to-accent-500',
    accent: 'text-secondary-400',
  },
  {
    icon: Briefcase,
    title: 'For Freelancers',
    description: 'Professional client portals and streamlined project delivery',
    gradient: 'from-accent-600 via-accent-500 to-primary-500',
    accent: 'text-accent-400',
  },
];

const PRICING: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Forever free',
    features: ['Up to 3 projects', '1 GB storage', 'Basic collaboration', 'Community support'],
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
    popular: true,
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
// Animation Variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ---------------------------------------------------------------------------
// Utility: Animated Counter
// ---------------------------------------------------------------------------

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, motionVal, value]);

  useEffect(() => {
    const unsubscribe = springVal.on('change', (latest) => {
      if (value % 1 !== 0) {
        setDisplay(latest.toFixed(1));
      } else {
        setDisplay(Math.round(latest).toString());
      }
    });
    return unsubscribe;
  }, [springVal, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 100], ['rgba(10,10,10,0)', 'rgba(10,10,10,0.85)']);
  const headerBlur = useTransform(scrollY, [0, 100], ['blur(0px)', 'blur(16px)']);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/0 transition-[border-color] duration-500"
      style={{
        backgroundColor: headerBg as unknown as string,
        backdropFilter: headerBlur as unknown as string,
        WebkitBackdropFilter: headerBlur as unknown as string,
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 focus-visible-ring rounded-md"
            aria-label="FluxStudio home"
          >
            <span className="text-2xl font-black font-display bg-gradient-to-r from-primary-400 via-secondary-500 to-accent-400 bg-clip-text text-transparent tracking-tight">
              FLUXSTUDIO
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-neutral-400 hover:text-white font-sans text-sm tracking-wide transition-colors duration-200 focus-visible-ring rounded-md"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="text-neutral-400 hover:text-white font-sans text-sm tracking-wide transition-colors duration-200 focus-visible-ring rounded-md"
            >
              Login
            </button>
            <motion.button
              onClick={() => navigate('/signup')}
              className="relative bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-6 py-2.5 rounded-full font-sans font-semibold text-sm text-white focus-visible-ring"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              Start Free Trial
            </motion.button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button
                aria-label="Toggle navigation menu"
                className="touch-target text-neutral-300 hover:text-white transition-colors flex items-center justify-center focus-visible-ring rounded-md"
              >
                <Menu className="w-6 h-6" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] bg-neutral-950/95 backdrop-blur-xl border-l border-white/10"
            >
              <div className="flex flex-col gap-6 mt-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target text-lg font-sans text-neutral-300 hover:text-white transition-colors focus-visible-ring rounded-md"
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="touch-target text-lg text-left font-sans text-neutral-300 hover:text-white transition-colors focus-visible-ring rounded-md"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/signup');
                  }}
                  className="touch-target bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-6 py-3 rounded-full text-lg font-sans font-semibold text-white focus-visible-ring"
                >
                  Start Free Trial
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: bgY }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary-900/60 via-neutral-950 to-secondary-900/40"
          style={{
            backgroundSize: '400% 400%',
            animation: 'gradientShift 12s ease-in-out infinite',
          }}
        />
        {/* Radial glows */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent-500/5 blur-[100px]" />
      </motion.div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 w-full"
        style={{ opacity }}
      >
        <div className="text-center">
          {/* Logo3D */}
          <motion.div
            className="mb-10 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.1 }}
          >
            <Logo3D />
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="font-display font-black tracking-tight mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.3 }}
          >
            <span className="block text-5xl sm:text-7xl lg:text-8xl xl:text-9xl text-white leading-none">
              Design in
            </span>
            <span className="block text-5xl sm:text-7xl lg:text-8xl xl:text-9xl bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 bg-clip-text text-transparent leading-none mt-2">
              Motion
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl lg:text-2xl text-neutral-300 font-sans max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.5 }}
          >
            The all-in-one creative platform for design teams to collaborate, manage projects, and
            deliver exceptional work faster than ever.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.65 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99,102,241,0.35)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-10 py-4 rounded-full text-lg font-sans font-semibold text-white flex items-center justify-center gap-2 focus-visible-ring backdrop-blur-sm bg-white/5 border border-white/10"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <a
                href="#features"
                className="w-full sm:w-auto backdrop-blur-xl bg-white/5 border border-white/10 px-10 py-4 rounded-full text-lg font-sans font-semibold text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-colors focus-visible-ring"
              >
                Watch Demo
                <Play className="w-5 h-5" aria-hidden="true" />
              </a>
            </motion.div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            className="inline-flex flex-wrap justify-center gap-6 sm:gap-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-8 py-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.8 }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center min-w-[80px]">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs sm:text-sm font-sans text-neutral-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* CSS keyframes for gradient shift */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features (Bento Grid)
// ---------------------------------------------------------------------------

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={sectionReveal}
        >
          <p className="font-sans text-sm font-semibold uppercase tracking-widest text-accent-400 mb-4">
            Features
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Everything You Need to Create
          </h2>
          <p className="text-lg sm:text-xl text-neutral-400 font-sans max-w-2xl mx-auto">
            Powerful features designed for modern creative teams
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            const FeatureAnimation = FEATURE_ANIMATIONS[feature.title];
            return (
              <motion.div
                key={feature.title}
                className={`group relative backdrop-blur-xl bg-white/[0.04] rounded-2xl p-8 lg:p-10 border border-white/[0.08] overflow-hidden ${feature.span ?? ''}`}
                variants={itemVariants}
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 0 40px rgba(99,102,241,0.12)',
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Glow on hover */}
                <div
                  className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 blur-[60px] group-hover:opacity-20 transition-opacity duration-500`}
                  aria-hidden="true"
                />

                {/* Animated micro-demo */}
                {FeatureAnimation && (
                  <div aria-hidden="true">
                    <FeatureAnimation />
                  </div>
                )}

                <div className="flex items-center gap-4 mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-neutral-400 font-sans leading-relaxed group-hover:text-neutral-300 transition-colors duration-300">
                  {feature.description}
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
// Use Cases
// ---------------------------------------------------------------------------

export function UseCases() {
  return (
    <section id="use-cases" className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={sectionReveal}
        >
          <p className="font-sans text-sm font-semibold uppercase tracking-widest text-secondary-400 mb-4">
            Use Cases
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Built for Every Creative
          </h2>
          <p className="text-lg sm:text-xl text-neutral-400 font-sans max-w-2xl mx-auto">
            Whether you&apos;re a team, agency, or freelancer
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {USE_CASES.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={useCase.title}
                className="group relative rounded-2xl overflow-hidden min-h-[320px] flex flex-col justify-end"
                variants={itemVariants}
                whileHover={{
                  scale: 1.03,
                  boxShadow: '0 0 50px rgba(99,102,241,0.15)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${useCase.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-500`}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" aria-hidden="true" />
                <div className="absolute inset-0 border border-white/[0.08] rounded-2xl group-hover:border-white/[0.15] transition-colors duration-300" aria-hidden="true" />

                <div className="relative p-8 lg:p-10">
                  <div className={`${useCase.accent} mb-4`}>
                    <Icon className="w-10 h-10" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-neutral-400 font-sans leading-relaxed">
                    {useCase.description}
                  </p>
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
// Testimonials
// ---------------------------------------------------------------------------

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-24 lg:py-32 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={sectionReveal}
        >
          <p className="font-sans text-sm font-semibold uppercase tracking-widest text-primary-400 mb-4">
            Testimonials
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Loved by Creative Teams
          </h2>
          <p className="text-lg sm:text-xl text-neutral-400 font-sans max-w-2xl mx-auto">
            See what our users are saying
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              className={`group relative backdrop-blur-xl bg-white/[0.04] rounded-2xl p-8 lg:p-10 border-l-4 ${t.accent} border border-l-4 border-white/[0.08] overflow-hidden`}
              variants={itemVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 0 30px rgba(99,102,241,0.1)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6" aria-label={`${t.stars} out of 5 stars`}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-warning-400 fill-warning-400"
                    aria-hidden="true"
                  />
                ))}
              </div>

              <blockquote className="text-neutral-200 font-sans text-lg leading-relaxed mb-8 italic">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div>
                <div className="font-display font-semibold text-white text-lg">{t.name}</div>
                <div className="text-sm font-sans text-neutral-400">{t.role}</div>
                <div className="text-sm font-sans text-primary-400">{t.company}</div>
              </div>
            </motion.div>
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
    <section id="pricing" className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16 lg:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={sectionReveal}
        >
          <p className="font-sans text-sm font-semibold uppercase tracking-widest text-accent-400 mb-4">
            Pricing
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg sm:text-xl text-neutral-400 font-sans max-w-2xl mx-auto">
            Start free, scale as you grow
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-start"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {PRICING.map((tier) => {
            const isPopular = tier.popular;
            const isExternal = tier.href.startsWith('mailto:');

            return (
              <motion.div
                key={tier.name}
                className={`group relative backdrop-blur-xl rounded-2xl p-8 lg:p-10 border overflow-hidden ${
                  isPopular
                    ? 'bg-gradient-to-b from-primary-500/10 via-secondary-500/10 to-transparent border-primary-500/30 md:scale-105 md:-my-4 shadow-2xl'
                    : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]'
                } transition-all duration-300`}
                variants={itemVariants}
                whileHover={{
                  scale: isPopular ? 1.07 : 1.03,
                  boxShadow: isPopular
                    ? '0 0 60px rgba(99,102,241,0.25)'
                    : '0 0 30px rgba(99,102,241,0.1)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2">
                    <div
                      className="bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-5 py-1.5 rounded-b-xl text-xs font-sans font-bold uppercase tracking-wider text-white"
                      style={{
                        boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                      }}
                    >
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="font-display text-xl font-semibold text-white mb-3">
                    {tier.name}
                  </h3>
                  <div className="font-display text-5xl font-bold text-white mb-1">
                    {tier.price}
                    {tier.period && (
                      <span className="text-lg font-sans font-normal text-neutral-400">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-sans text-neutral-500">{tier.subtitle}</p>
                </div>

                <ul className="space-y-3 mb-8" role="list">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-neutral-300 font-sans">
                      <Check
                        className="w-5 h-5 text-success-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isExternal ? (
                  <a
                    href={tier.href}
                    className={`block w-full text-center py-3.5 rounded-full font-sans font-semibold transition-all duration-300 focus-visible-ring ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white hover:shadow-lg'
                        : 'border border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    to={tier.href}
                    className={`block w-full text-center py-3.5 rounded-full font-sans font-semibold transition-all duration-300 focus-visible-ring ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 text-white hover:shadow-lg'
                        : 'border border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                )}
              </motion.div>
            );
          })}
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
    <>
      {/* CTA Banner */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/40 via-secondary-900/40 to-accent-900/40" aria-hidden="true" />
        <div className="absolute inset-0 bg-neutral-950/60" aria-hidden="true" />

        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={sectionReveal}
        >
          <h2 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight mb-6">
            Ready to Transform
            <span className="block bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 bg-clip-text text-transparent">
              Your Workflow?
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-neutral-300 font-sans max-w-2xl mx-auto mb-10">
            Join thousands of creative professionals who trust FluxStudio
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <motion.div
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(99,102,241,0.35)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-10 py-4 rounded-full text-lg font-sans font-semibold text-white flex items-center justify-center gap-2 focus-visible-ring"
                style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                to="/login"
                className="w-full sm:w-auto backdrop-blur-xl bg-white/5 border border-white/10 px-10 py-4 rounded-full text-lg font-sans font-semibold text-white flex items-center justify-center hover:bg-white/10 transition-colors focus-visible-ring"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
          <p className="text-sm font-sans text-neutral-500">
            No credit card required &middot; 14-day free trial &middot; Cancel anytime
          </p>
        </motion.div>

        <style>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.2); }
            50% { box-shadow: 0 0 40px rgba(99,102,241,0.4); }
          }
        `}</style>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-16 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="font-display text-2xl font-black bg-gradient-to-r from-primary-400 via-secondary-500 to-accent-400 bg-clip-text text-transparent mb-3 tracking-tight">
                FLUXSTUDIO
              </div>
              <p className="text-neutral-500 font-sans text-sm leading-relaxed max-w-xs mb-6">
                Design in Motion. Collaboration Elevated.
              </p>
              {/* Social */}
              <div className="flex gap-4">
                {[
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Github, label: 'GitHub' },
                  { icon: Linkedin, label: 'LinkedIn' },
                  { icon: Youtube, label: 'YouTube' },
                ].map(({ icon: SIcon, label }) => (
                  <a
                    key={label}
                    href="#"
                    className="text-neutral-600 hover:text-white transition-colors focus-visible-ring rounded-md p-1"
                    aria-label={label}
                  >
                    <SIcon className="w-5 h-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-3 text-neutral-500 text-sm font-sans" role="list">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-3 text-neutral-500 text-sm font-sans" role="list">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul className="space-y-3 text-neutral-500 text-sm font-sans" role="list">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 text-center text-neutral-600 text-sm font-sans">
            <p>&copy; 2026 FluxStudio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Default Page Export
// ---------------------------------------------------------------------------

export default function BoldLanding() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
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
