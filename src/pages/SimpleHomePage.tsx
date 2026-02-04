import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo3D } from '../components/Logo3D';
import { SkipLink } from '@/components/ui/SkipLink';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export function SimpleHomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: '🎨',
      title: 'Design Collaboration',
      description: 'Real-time collaborative design tools that keep your creative team in sync',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      icon: '📁',
      title: 'Smart File Management',
      description: 'Organize and share creative assets with intelligent version control',
      gradient: 'from-green-500 to-blue-500'
    },
    {
      icon: '👥',
      title: 'Team Communication',
      description: 'Integrated messaging and feedback tools built for creative workflows',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: '⚡',
      title: 'Workflow Automation',
      description: 'Streamline repetitive tasks and focus on what matters most - creating',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: '📊',
      title: 'Project Analytics',
      description: 'Track progress, deadlines, and team performance with visual insights',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level encryption and role-based access control for your peace of mind',
      gradient: 'from-red-500 to-pink-600'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Creative Director',
      company: 'Design Studio Co.',
      avatar: '👩‍🎨',
      quote: 'FluxStudio transformed how our team collaborates. We\'ve cut project turnaround time by 40%.'
    },
    {
      name: 'Michael Torres',
      role: 'Lead Designer',
      company: 'Bright Ideas Agency',
      avatar: '👨‍💼',
      quote: 'The real-time collaboration features are game-changing. It\'s like having the whole team in one room.'
    },
    {
      name: 'Emily Johnson',
      role: 'Project Manager',
      company: 'Creative Minds Inc.',
      avatar: '👩‍💻',
      quote: 'Finally, a platform that understands creative workflows. Our clients love the seamless review process.'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '50K+', label: 'Projects Created' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ];

  const useCases = [
    {
      title: 'For Design Teams',
      description: 'Collaborate on projects in real-time with version control and feedback tools',
      icon: '🎨'
    },
    {
      title: 'For Agencies',
      description: 'Manage multiple client projects with automated workflows and reporting',
      icon: '🏢'
    },
    {
      title: 'For Freelancers',
      description: 'Professional client portals and streamlined project delivery',
      icon: '💼'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Skip Navigation */}
      <SkipLink href="#main-content" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2" aria-label="FluxStudio home">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">
                  FluxStudio
                </div>
              </Link>
            </div>

            {/* Desktop Navigation (hidden on mobile) */}
            <div className="hidden lg:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-white transition-colors focus-visible-ring"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="text-gray-300 hover:text-white transition-colors focus-visible-ring"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="text-gray-300 hover:text-white transition-colors focus-visible-ring"
              >
                Pricing
              </a>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-300 hover:text-white transition-colors focus-visible-ring"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 rounded-full
                         font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300
                         focus-visible-ring"
              >
                Start Free Trial
              </button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <button
                  aria-label="Toggle navigation menu"
                  className="touch-target text-gray-300 hover:text-white transition-colors
                           flex items-center justify-center"
                >
                  <Menu className="w-6 h-6" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] bg-black/95 backdrop-blur-lg border-l border-white/10"
              >
                <div className="flex flex-col gap-6 mt-8">
                  <a
                    href="#features"
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target text-lg text-gray-300 hover:text-white transition-colors
                             focus-visible-ring"
                  >
                    Features
                  </a>
                  <a
                    href="#testimonials"
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target text-lg text-gray-300 hover:text-white transition-colors
                             focus-visible-ring"
                  >
                    Testimonials
                  </a>
                  <a
                    href="#pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="touch-target text-lg text-gray-300 hover:text-white transition-colors
                             focus-visible-ring"
                  >
                    Pricing
                  </a>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="touch-target text-lg text-left text-gray-300 hover:text-white
                             transition-colors focus-visible-ring"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/signup');
                    }}
                    className="touch-target bg-gradient-to-r from-blue-500 to-purple-600
                             px-6 py-3 rounded-full text-lg font-semibold hover:shadow-lg
                             hover:scale-105 transition-all duration-300 focus-visible-ring"
                  >
                    Start Free Trial
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main id="main-content" className="pt-20" tabIndex={-1}>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <Logo3D />
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Design in Motion
                <span className="block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                  Collaboration Elevated
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                The all-in-one creative platform for design teams to collaborate, manage projects,
                and deliver exceptional work faster than ever.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full
                           text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300
                           flex items-center justify-center"
                >
                  Start Free Trial
                  <span className="ml-2">→</span>
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto border-2 border-white/20 px-8 py-4 rounded-full
                           text-lg font-semibold hover:bg-white/10 transition-all duration-300
                           flex items-center justify-center"
                >
                  Watch Demo
                  <span className="ml-2">▶</span>
                </a>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gradient-to-b from-transparent to-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Everything You Need to Create
              </h2>
              <p className="text-xl text-gray-400">
                Powerful features designed for modern creative teams
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300
                           hover:scale-105 hover:shadow-2xl"
                >
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient}
                              flex items-center justify-center text-3xl mb-6
                              group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Built for Every Creative
              </h2>
              <p className="text-xl text-gray-400">
                Whether you're a team, agency, or freelancer
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg
                           rounded-2xl p-8 border border-white/10 hover:border-white/20
                           transition-all duration-300"
                >
                  <div className="text-5xl mb-4">{useCase.icon}</div>
                  <h3 className="text-2xl font-semibold mb-3">{useCase.title}</h3>
                  <p className="text-gray-400">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-gradient-to-b from-white/5 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Loved by Creative Teams
              </h2>
              <p className="text-xl text-gray-400">
                See what our users are saying
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10
                           hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center mb-6">
                    <div className="text-4xl mr-4">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold text-lg">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.role}</div>
                      <div className="text-sm text-blue-400">{testimonial.company}</div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gradient-to-b from-transparent to-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-400">
                Start free, scale as you grow
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Tier */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Free</h3>
                  <div className="text-4xl font-bold mb-2">$0</div>
                  <p className="text-gray-400 text-sm">Forever free</p>
                </div>
                <ul className="space-y-3 mb-8 text-gray-300">
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Up to 3 projects</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> 1 GB storage</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Basic collaboration</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Community support</li>
                </ul>
                <Link to="/signup" className="block w-full text-center border-2 border-white/20 py-3 rounded-full hover:bg-white/10 transition-all">Get Started</Link>
              </div>
              {/* Pro Tier */}
              <div className="bg-gradient-to-b from-blue-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-8 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-1 rounded-full text-sm font-semibold">Most Popular</div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Pro</h3>
                  <div className="text-4xl font-bold mb-2">$19<span className="text-lg font-normal text-gray-400">/mo</span></div>
                  <p className="text-gray-400 text-sm">Per user, billed annually</p>
                </div>
                <ul className="space-y-3 mb-8 text-gray-300">
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Unlimited projects</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> 100 GB storage</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Advanced collaboration</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Priority support</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Version history</li>
                </ul>
                <Link to="/signup" className="block w-full text-center bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-full hover:shadow-lg transition-all">Start Free Trial</Link>
              </div>
              {/* Enterprise Tier */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                  <div className="text-4xl font-bold mb-2">Custom</div>
                  <p className="text-gray-400 text-sm">Contact us for pricing</p>
                </div>
                <ul className="space-y-3 mb-8 text-gray-300">
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Everything in Pro</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Unlimited storage</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> SSO & SAML</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Dedicated support</li>
                  <li className="flex items-center"><span className="text-green-400 mr-2">✓</span> Custom integrations</li>
                </ul>
                <a href="mailto:sales@fluxstudio.art" className="block w-full text-center border-2 border-white/20 py-3 rounded-full hover:bg-white/10 transition-all">Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 backdrop-blur-lg
                          rounded-3xl p-12 border border-white/10">
              <h2 className="text-3xl sm:text-5xl font-bold mb-6">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join thousands of creative professionals who trust FluxStudio
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full
                           text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300
                           flex items-center justify-center"
                >
                  Start Your Free Trial
                  <span className="ml-2">→</span>
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto border-2 border-white/20 px-8 py-4 rounded-full
                           text-lg font-semibold hover:bg-white/10 transition-all duration-300
                           flex items-center justify-center"
                >
                  Sign In
                </Link>
              </div>
              <p className="text-sm text-gray-400 mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text mb-4">
                FluxStudio
              </div>
              <p className="text-gray-400 text-sm">
                Design in Motion. Collaboration Elevated.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 FluxStudio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
