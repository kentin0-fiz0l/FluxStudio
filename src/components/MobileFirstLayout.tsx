import { ReactNode, useEffect, useState } from 'react';
import { useResponsive, useReducedMotion } from './PerformanceOptimizer';

interface MobileFirstLayoutProps {
  children: ReactNode;
}

export function MobileFirstLayout({ children }: MobileFirstLayoutProps) {
  const { isMobile, isTablet, width } = useResponsive();
  const prefersReducedMotion = useReducedMotion();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Apply mobile-first CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    // Set responsive spacing
    if (isMobile) {
      root.style.setProperty('--section-padding', '4rem 1rem');
      root.style.setProperty('--container-padding', '1rem');
      root.style.setProperty('--touch-target-size', '44px');
      root.style.setProperty('--font-scale', '0.9');
    } else if (isTablet) {
      root.style.setProperty('--section-padding', '5rem 2rem');
      root.style.setProperty('--container-padding', '1.5rem');
      root.style.setProperty('--touch-target-size', '40px');
      root.style.setProperty('--font-scale', '1');
    } else {
      root.style.setProperty('--section-padding', '6rem 2rem');
      root.style.setProperty('--container-padding', '2rem');
      root.style.setProperty('--touch-target-size', '32px');
      root.style.setProperty('--font-scale', '1');
    }

    // Handle reduced motion
    if (prefersReducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
    } else {
      root.style.setProperty('--animation-duration', '1s');
      root.style.setProperty('--transition-duration', '0.3s');
    }
  }, [isMobile, isTablet, prefersReducedMotion]);

  return (
    <div 
      className={`
        mobile-first-layout
        ${isMobile ? 'is-mobile' : ''}
        ${isTablet ? 'is-tablet' : ''}
        ${prefersReducedMotion ? 'reduced-motion' : ''}
        ${!isOnline ? 'is-offline' : ''}
      `}
      data-width={width}
    >
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500/90 backdrop-blur-sm text-white text-center py-2 text-sm">
          You're currently offline. Some features may be limited.
        </div>
      )}

      {/* Main Content */}
      <div className="relative min-h-screen">
        {children}
      </div>

      {/* Mobile-First CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Mobile-First Base Styles */
        .mobile-first-layout {
          --header-height: 56px;
          --safe-area-top: env(safe-area-inset-top, 0);
          --safe-area-bottom: env(safe-area-inset-bottom, 0);
          --safe-area-left: env(safe-area-inset-left, 0);
          --safe-area-right: env(safe-area-inset-right, 0);
        }

        .mobile-first-layout.is-mobile {
          --header-height: 56px;
        }

        .mobile-first-layout.is-tablet {
          --header-height: 64px;
        }

        /* Touch-friendly interactions */
        .mobile-first-layout button,
        .mobile-first-layout a,
        .mobile-first-layout [role="button"] {
          min-height: var(--touch-target-size);
          min-width: var(--touch-target-size);
        }

        /* Improved text readability on mobile */
        .mobile-first-layout.is-mobile {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        /* Prevent horizontal scrolling */
        .mobile-first-layout {
          overflow-x: hidden;
        }

        /* Safe area handling for devices with notches */
        .mobile-first-layout .safe-area-top {
          padding-top: var(--safe-area-top);
        }

        .mobile-first-layout .safe-area-bottom {
          padding-bottom: var(--safe-area-bottom);
        }

        .mobile-first-layout .safe-area-left {
          padding-left: var(--safe-area-left);
        }

        .mobile-first-layout .safe-area-right {
          padding-right: var(--safe-area-right);
        }

        /* Enhanced tap target areas for mobile */
        .mobile-first-layout.is-mobile a,
        .mobile-first-layout.is-mobile button {
          padding: 0.75rem;
          margin: 0.25rem;
        }

        /* Reduced animations for accessibility */
        .mobile-first-layout.reduced-motion * {
          animation-duration: var(--animation-duration) !important;
          animation-iteration-count: 1 !important;
          transition-duration: var(--transition-duration) !important;
        }

        /* Mobile-optimized scrollbars */
        .mobile-first-layout.is-mobile ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .mobile-first-layout.is-mobile ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }

        .mobile-first-layout.is-mobile ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        /* Focus management for mobile */
        .mobile-first-layout.is-mobile *:focus {
          outline: 2px solid rgba(255, 255, 255, 0.4);
          outline-offset: 2px;
        }

        /* Smooth scrolling */
        .mobile-first-layout {
          scroll-behavior: smooth;
        }

        .mobile-first-layout.reduced-motion {
          scroll-behavior: auto;
        }

        /* Mobile section spacing */
        .mobile-first-layout.is-mobile section {
          padding: var(--section-padding);
        }

        .mobile-first-layout.is-mobile .container {
          padding-left: var(--container-padding);
          padding-right: var(--container-padding);
        }

        /* Offline styles */
        .mobile-first-layout.is-offline .bg-ink {
          background-color: #1a1a1a;
          background-image: none;
        }

        .mobile-first-layout.is-offline [class*="animate-"],
        .mobile-first-layout.is-offline canvas {
          display: none;
        }

        /* Performance optimizations */
        .mobile-first-layout * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* GPU acceleration for smooth scrolling */
        .mobile-first-layout {
          -webkit-overflow-scrolling: touch;
          will-change: scroll-position;
        }

        /* Mobile typography scaling */
        .mobile-first-layout.is-mobile {
          font-size: calc(1rem * var(--font-scale));
        }

        /* Touch callout prevention for UI elements */
        .mobile-first-layout button,
        .mobile-first-layout .btn-glass-gradient,
        .mobile-first-layout .btn-glass-outline,
        .mobile-first-layout [role="button"] {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        /* Loading shimmer animation for mobile */
        @keyframes loading-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Mobile-optimized glassmorphic effects */
        .mobile-first-layout.is-mobile .btn-glass-gradient,
        .mobile-first-layout.is-mobile .btn-glass-outline {
          backdrop-filter: blur(20px) saturate(1.5);
          -webkit-backdrop-filter: blur(20px) saturate(1.5);
        }

        /* Reduced background complexity on mobile for performance */
        .mobile-first-layout.is-mobile .bg-ink {
          background-image: 
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
        }
        `
      }} />
    </div>
  );
}