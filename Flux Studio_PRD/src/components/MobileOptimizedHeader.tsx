import { Menu, X, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FluxLogo } from './FluxLogo';

export function MobileOptimizedHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for header appearance
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const navigation = [
    { name: 'Home', href: '#home', description: 'Welcome to Flux Studio' },
    { name: 'Work', href: '#work', description: 'Featured projects & showcases' },
    { name: 'Services', href: '#services', description: 'Design & consulting offerings' },
    { name: 'Process', href: '#process', description: 'How we create together' },
    { name: 'About', href: '#about', description: 'Meet the team' },
    { name: 'Contact', href: '#contact', description: 'Start your project' },
  ];

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    // Smooth scroll with offset for fixed header
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Header height + padding
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-black/90 backdrop-blur-lg border-b border-white/20 shadow-lg' 
            : 'bg-black/60 backdrop-blur-md border-b border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button 
                onClick={() => handleNavClick('#home')}
                className="block focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg"
                aria-label="Go to homepage"
              >
                <FluxLogo className="transition-all duration-300 hover:scale-105 active:scale-95" />
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-8" role="navigation">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="text-off-white hover:gradient-text transition-all duration-300 font-semibold text-sm tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-white/20 rounded px-2 py-1"
                  style={{ fontFamily: 'var(--font-navigation)' }}
                  aria-label={`Navigate to ${item.name}`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Desktop CTA Button */}
            <div className="hidden lg:block">
              <Button 
                className="btn-glass-gradient text-white font-semibold text-sm px-6 py-2 touch-manipulation" 
                onClick={() => handleNavClick('#contact')}
                aria-label="Start a new project"
              >
                Start Project
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="btn-glass-ghost text-off-white p-2 touch-manipulation"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* Sidebar */}
          <div 
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-out"
            style={{
              background: `
                linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%),
                rgba(10, 10, 10, 0.95)
              `,
              backdropFilter: 'blur(40px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: `
                -20px 0 80px rgba(0, 0, 0, 0.4),
                -4px 0 20px rgba(0, 0, 0, 0.2),
                inset 1px 0 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <FluxLogo className="scale-90" />
              <Button
                variant="ghost"
                size="sm"
                className="btn-glass-ghost text-off-white p-2"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col p-6 space-y-2" role="navigation">
              {navigation.map((item, index) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="group flex items-center justify-between p-4 rounded-lg transition-all duration-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 touch-manipulation"
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animation: 'mobile-nav-slide 0.4s ease-out forwards'
                  }}
                  aria-label={`Navigate to ${item.name}`}
                >
                  <div className="text-left">
                    <div 
                      className="text-off-white font-semibold text-lg tracking-wide group-hover:gradient-text transition-all duration-300"
                      style={{ fontFamily: 'var(--font-navigation)' }}
                    >
                      {item.name}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/80 transition-colors duration-300" />
                </button>
              ))}
            </nav>

            {/* CTA Section */}
            <div className="p-6 border-t border-white/10 mt-auto">
              <Button 
                className="btn-glass-submit w-full text-white font-semibold py-4 touch-manipulation" 
                onClick={() => handleNavClick('#contact')}
                aria-label="Start a new project"
              >
                Start Your Project
              </Button>
              <p className="text-white/60 text-sm text-center mt-3">
                Ready to create something extraordinary?
              </p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes mobile-nav-slide {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `
      }} />
    </>
  );
}