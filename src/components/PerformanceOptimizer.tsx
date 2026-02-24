import { useEffect, useState, ReactNode } from 'react';

interface PerformanceOptimizerProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function PerformanceOptimizer({ 
  children, 
  threshold = 0.1, 
  rootMargin = '100px' 
}: PerformanceOptimizerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin]);

  return (
    <div ref={setRef} className="performance-optimized">
      {isVisible ? children : <div className="min-h-[200px] bg-transparent" />}
    </div>
  );
}

// Hook for respecting user motion preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Component to conditionally render animations
interface AnimationWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function AnimationWrapper({ 
  children, 
  fallback, 
  className = '' 
}: AnimationWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className={`reduced-motion ${className}`}>
        {fallback || children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

// Hook for responsive design
export function useResponsive() {
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

// Component for touch-optimized buttons
interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function TouchButton({ 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  'aria-label': ariaLabel
}: TouchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        touch-manipulation 
        min-h-[44px] 
        min-w-[44px] 
        active:scale-95 
        transition-transform 
        duration-150 
        focus:outline-none 
        focus:ring-2 
        focus:ring-white/20 
        focus:ring-offset-2 
        focus:ring-offset-black
        disabled:opacity-50 
        disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
    </button>
  );
}

// Hook for managing scroll position
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: 0,
    y: 0,
    direction: 'up' as 'up' | 'down'
  });

  useEffect(() => {
    let previousY = 0;
    
    const updatePosition = () => {
      const currentY = window.pageYOffset;
      const direction = currentY > previousY ? 'down' : 'up';
      
      setScrollPosition({
        x: window.pageXOffset,
        y: currentY,
        direction
      });
      
      previousY = currentY > 0 ? currentY : 0;
    };

    const throttledUpdatePosition = throttle(updatePosition, 16); // ~60fps
    
    window.addEventListener('scroll', throttledUpdatePosition);
    
    return () => window.removeEventListener('scroll', throttledUpdatePosition);
  }, []);

  return scrollPosition;
}

// Utility function for throttling
function throttle(
  func: () => void,
  delay: number
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return () => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func();
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func();
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

// Component for optimized images with lazy loading
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  width, 
  height, 
  priority = false 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (priority || !ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(ref);
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, priority]);

  return (
    <div 
      ref={setRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-white/5 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
            backgroundSize: '200% 100%',
            animation: 'loading-shimmer 1.5s infinite'
          }}
        />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}