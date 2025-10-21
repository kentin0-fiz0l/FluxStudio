import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { FluxLogo } from './FluxLogo';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '#home' },
    { name: 'Work', href: '#work' },
    { name: 'Services', href: '#services' },
    { name: 'Process', href: '#process' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#home" className="block">
              <FluxLogo className="transition-all duration-300 hover:scale-105" />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-off-white hover:gradient-text transition-all duration-200 font-semibold text-sm tracking-wide uppercase"
                style={{ fontFamily: 'var(--font-navigation)' }}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button className="btn-glass-gradient text-white font-semibold" asChild>
              <a href="#contact" className="relative z-10">Start Project</a>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="btn-glass-ghost text-off-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-off-white hover:gradient-text transition-all duration-200 py-2 font-semibold text-sm tracking-wide uppercase"
                  style={{ fontFamily: 'var(--font-navigation)' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <Button className="btn-glass-gradient text-white font-semibold mt-4" asChild>
                <a href="#contact" onClick={() => setIsMenuOpen(false)} className="relative z-10">
                  Start Project
                </a>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}