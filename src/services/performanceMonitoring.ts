/**
 * Performance Monitoring Service
 * Tracks application performance metrics and user experience
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'render' | 'interaction' | 'resource' | 'custom';
  metadata?: Record<string, any>;
}

export interface UserVitals {
  // Core Web Vitals
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte

  // Custom metrics
  TTI: number; // Time to Interactive
  TBT: number; // Total Blocking Time

  // Route-specific
  routeLoadTime: number;
  componentMountTime: number;
}

export interface PerformanceReport {
  sessionId: string;
  userId?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  vitals: UserVitals;
  metrics: PerformanceMetric[];
  errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
  }>;
  features: {
    used: string[];
    loadTimes: Record<string, number>;
  };
  timestamp: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private vitals: Partial<UserVitals> = {};
  private sessionId: string;
  private observer: PerformanceObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private isMonitoring = false;
  private featureUsage = new Set<string>();
  private componentLoadTimes = new Map<string, number>();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    this.isMonitoring = true;

    // Core Web Vitals
    this.measureCoreWebVitals();

    // Navigation timing
    this.measureNavigationTiming();

    // Resource timing
    this.measureResourceTiming();

    // First Input Delay
    this.measureFirstInputDelay();

    // Cumulative Layout Shift
    this.measureCumulativeLayoutShift();

    // Custom metrics
    this.measureTimeToInteractive();

    // Component performance
    this.setupComponentMonitoring();

    // User interactions
    this.trackUserInteractions();

    // Error tracking
    this.setupErrorTracking();

    // Periodic reporting
    this.startPeriodicReporting();
  }

  /**
   * Measure Core Web Vitals
   */
  private measureCoreWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      this.vitals.LCP = lastEntry.startTime;
      this.addMetric('LCP', lastEntry.startTime, 'navigation', {
        element: (lastEntry as any).element?.tagName
      });
    });

    try {
      this.observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observation not supported');
    }

    // First Contentful Paint
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.vitals.FCP = entry.startTime;
          this.addMetric('FCP', entry.startTime, 'navigation');
        }
      });
    });

    try {
      this.observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observation not supported');
    }
  }

  /**
   * Measure navigation timing
   */
  private measureNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          // Time to First Byte
          this.vitals.TTFB = navigation.responseStart - navigation.requestStart;
          this.addMetric('TTFB', this.vitals.TTFB, 'navigation');

          // Page Load Time
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          this.addMetric('page-load-time', pageLoadTime, 'navigation');

          // DNS Lookup Time
          const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
          this.addMetric('dns-lookup-time', dnsTime, 'navigation');

          // Connection Time
          const connectionTime = navigation.connectEnd - navigation.connectStart;
          this.addMetric('connection-time', connectionTime, 'navigation');
        }
      }, 0);
    });
  }

  /**
   * Measure resource timing
   */
  private measureResourceTiming() {
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;

        this.addMetric('resource-load-time', resourceEntry.duration, 'resource', {
          name: resourceEntry.name,
          type: this.getResourceType(resourceEntry.name),
          size: resourceEntry.transferSize,
          cached: resourceEntry.transferSize === 0
        });
      });
    });

    try {
      this.observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('Resource timing observation not supported');
    }
  }

  /**
   * Measure First Input Delay
   */
  private measureFirstInputDelay() {
    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const fidEntry = entry as any;
        this.vitals.FID = fidEntry.processingStart - fidEntry.startTime;
        this.addMetric('FID', this.vitals.FID, 'interaction', {
          eventType: fidEntry.name
        });
      });
    });

    try {
      this.observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observation not supported');
    }
  }

  /**
   * Measure Cumulative Layout Shift
   */
  private measureCumulativeLayoutShift() {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];

    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const layoutShiftEntry = entry as any;

        if (!layoutShiftEntry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += layoutShiftEntry.value;
            sessionEntries.push(layoutShiftEntry);
          } else {
            sessionValue = layoutShiftEntry.value;
            sessionEntries = [layoutShiftEntry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            this.vitals.CLS = clsValue;
            this.addMetric('CLS', clsValue, 'render');
          }
        }
      });
    });

    try {
      this.observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observation not supported');
    }
  }

  /**
   * Measure Time to Interactive
   */
  private measureTimeToInteractive() {
    window.addEventListener('load', () => {
      // Simplified TTI calculation
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        // Use domInteractive as a proxy for TTI
        this.vitals.TTI = navigation.domInteractive - navigation.fetchStart;
        this.addMetric('TTI', this.vitals.TTI, 'navigation');
      }
    });
  }

  /**
   * Setup component monitoring
   */
  private setupComponentMonitoring() {
    // Track React component mount times
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      devtools.onCommitFiberRoot = (id: any, root: any) => {
        const commitTime = performance.now();
        this.addMetric('react-commit', commitTime, 'render', {
          rootId: id
        });
      };
    }
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions() {
    const interactionEvents = ['click', 'keydown', 'scroll'];

    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        const startTime = performance.now();

        // Use RAF to measure interaction response time
        requestAnimationFrame(() => {
          const responseTime = performance.now() - startTime;
          this.addMetric('interaction-response', responseTime, 'interaction', {
            type: eventType,
            target: (event.target as Element)?.tagName
          });
        });
      }, { passive: true });
    });
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.addMetric('js-error', 1, 'custom', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addMetric('promise-rejection', 1, 'custom', {
        reason: event.reason?.toString()
      });
    });
  }

  /**
   * Add a performance metric
   */
  addMetric(name: string, value: number, category: PerformanceMetric['category'], metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, loadTime?: number) {
    this.featureUsage.add(featureName);

    if (loadTime !== undefined) {
      this.componentLoadTimes.set(featureName, loadTime);
      this.addMetric('feature-load-time', loadTime, 'custom', {
        feature: featureName
      });
    }

    this.addMetric('feature-usage', 1, 'custom', {
      feature: featureName
    });
  }

  /**
   * Track route changes
   */
  trackRouteChange(route: string, loadTime: number) {
    this.vitals.routeLoadTime = loadTime;
    this.addMetric('route-change', loadTime, 'navigation', {
      route
    });
  }

  /**
   * Track component mount time
   */
  trackComponentMount(componentName: string, mountTime: number) {
    this.componentLoadTimes.set(componentName, mountTime);
    this.addMetric('component-mount', mountTime, 'render', {
      component: componentName
    });
  }

  /**
   * Get current performance report
   */
  getPerformanceReport(): PerformanceReport {
    const connection = this.getConnectionInfo();

    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection,
      vitals: this.vitals as UserVitals,
      metrics: [...this.metrics],
      errors: [], // Would be populated by error boundary
      features: {
        used: Array.from(this.featureUsage),
        loadTimes: Object.fromEntries(this.componentLoadTimes)
      },
      timestamp: Date.now()
    };
  }

  /**
   * Send performance report
   */
  async sendReport() {
    const report = this.getPerformanceReport();

    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    // Send report every 30 seconds
    setInterval(() => {
      this.sendReport();
    }, 30000);

    // Send report on page unload
    window.addEventListener('beforeunload', () => {
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        const report = JSON.stringify(this.getPerformanceReport());
        navigator.sendBeacon('/api/analytics/performance', report);
      }
    });

    // Send report on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendReport();
      }
    });
  }

  /**
   * Get connection information
   */
  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('.woff')) return 'font';
    return 'other';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance score
   */
  getPerformanceScore(): number {
    const { FCP, LCP, FID, CLS, TTFB } = this.vitals;

    if (!FCP || !LCP) return 0;

    // Simplified scoring based on Core Web Vitals thresholds
    let score = 100;

    // FCP scoring (good: <1.8s, needs improvement: 1.8-3s, poor: >3s)
    if (FCP > 3000) score -= 20;
    else if (FCP > 1800) score -= 10;

    // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
    if (LCP > 4000) score -= 25;
    else if (LCP > 2500) score -= 15;

    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (FID && FID > 300) score -= 20;
    else if (FID && FID > 100) score -= 10;

    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (CLS && CLS > 0.25) score -= 20;
    else if (CLS && CLS > 0.1) score -= 10;

    // TTFB scoring (good: <200ms, needs improvement: 200-500ms, poor: >500ms)
    if (TTFB && TTFB > 500) score -= 15;
    else if (TTFB && TTFB > 200) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    this.observer?.disconnect();
    this.intersectionObserver?.disconnect();
  }
}

// Export singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();

    performanceMonitoring.trackFeatureUsage(componentName);

    return () => {
      const mountTime = performance.now() - startTime;
      performanceMonitoring.trackComponentMount(componentName, mountTime);
    };
  }, [componentName]);
}

// HOC for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;

  return function PerformanceTrackedComponent(props: P) {
    usePerformanceTracking(displayName);
    return React.createElement(WrappedComponent, props);
  };
}