import { Menu, X, User } from 'lucide-react';
import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { FluxLogo } from './FluxLogo';
import { useAuth } from '@/store/slices/authSlice';

// ForwardRef wrapper for React Router Link to fix Slot ref warnings
const ForwardedLink = forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => (
  <Link {...props} ref={ref} />
));
ForwardedLink.displayName = "ForwardedLink";

// ForwardRef wrapper for anchor elements to fix Slot ref warnings
const ForwardedAnchor = forwardRef<HTMLAnchorElement, React.ComponentProps<'a'>>((props, ref) => (
  <a {...props} ref={ref} />
));
ForwardedAnchor.displayName = "ForwardedAnchor";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const navigation = [
    { name: 'About', href: '#about' },
    { name: 'Create', href: '#services' },
    { name: 'Process', href: '#process' },
    { name: 'Concepts', href: '#concepts' },
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

          {/* Authentication & CTA Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 text-white">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">{user?.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-pink-400 transition-colors"
                  onClick={logout}
                >
                  Sign Out
                </Button>
                <Button className="btn-glass-gradient text-white font-semibold" asChild>
                  <ForwardedLink to="/dashboard" className="relative z-10">Dashboard</ForwardedLink>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-pink-400 transition-colors"
                  asChild
                >
                  <ForwardedLink to="/login">Sign In</ForwardedLink>
                </Button>
                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                  asChild
                >
                  <ForwardedLink to="/signup">Sign Up</ForwardedLink>
                </Button>
                <Button className="btn-glass-gradient text-white font-semibold" asChild>
                  <ForwardedAnchor href="#contact" className="relative z-10">Book a Consult</ForwardedAnchor>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="btn-glass-ghost text-off-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
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

              {/* Mobile Authentication Buttons */}
              <div className="pt-6 mt-4 border-t border-white/20 space-y-4">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-2 text-white py-3 px-4 bg-white/5 rounded-lg">
                      <User className="h-5 w-5 text-pink-400" aria-hidden="true" />
                      <span className="text-base font-medium">{user?.name}</span>
                    </div>
                    <Button
                      className="w-full btn-glass-gradient text-white font-semibold py-3 text-base"
                      asChild
                    >
                      <ForwardedLink to="/dashboard" onClick={() => setIsMenuOpen(false)} className="relative z-10">
                        Dashboard
                      </ForwardedLink>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-white hover:text-pink-400 transition-colors py-3 text-base border border-white/20 hover:border-pink-400/50"
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <Button
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 text-lg rounded-lg transition-all duration-200 transform hover:scale-105"
                        asChild
                      >
                        <ForwardedLink to="/signup" onClick={() => setIsMenuOpen(false)}>
                          Sign Up Free
                        </ForwardedLink>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full text-white hover:text-pink-400 transition-colors py-3 text-base border border-white/20 hover:border-pink-400/50"
                        asChild
                      >
                        <ForwardedLink to="/login" onClick={() => setIsMenuOpen(false)}>
                          Sign In
                        </ForwardedLink>
                      </Button>
                    </div>
                  </>
                )}
                <div className="pt-4 border-t border-white/10">
                  <Button className="w-full btn-glass-gradient text-white font-semibold py-3 text-base" asChild>
                    <ForwardedAnchor href="#contact" onClick={() => setIsMenuOpen(false)} className="relative z-10">
                      Book a Consult
                    </ForwardedAnchor>
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}