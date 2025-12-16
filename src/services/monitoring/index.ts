/**
 * Performance Monitoring Module
 *
 * Unified performance monitoring for FluxStudio.
 *
 * @example
 * // Track a feature
 * performanceMonitoring.trackFeatureUsage('editor');
 *
 * // Time a function
 * const result = performanceMonitoring.timeFunction('api-call', () => fetchData());
 *
 * // Use React hook
 * function MyComponent() {
 *   usePerformanceTracking('MyComponent');
 *   return <div>...</div>;
 * }
 *
 * @see DEBT-006: Consolidate duplicate performance monitoring services
 */

import React from 'react';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';

// Export the service class
export { PerformanceMonitoringService } from './PerformanceMonitoringService';

// Export all types
export type {
  PerformanceMetric,
  UserExperienceMetric,
  UserVitals,
  CoreWebVitals,
  PerformanceReport,
  PerformanceSummary,
  AlertThreshold,
  AlertSeverity,
  AlertCondition,
  Alert,
  SystemMetrics,
  ConnectionInfo,
  MetricCategory,
  MetricSummary,
  ErrorEntry,
  MonitoringConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';

// Create singleton instance
const performanceMonitoring = new PerformanceMonitoringService();

// Export singleton
export { performanceMonitoring };

// Alias for backward compatibility with performanceMonitoringService imports
export const performanceMonitoringService = performanceMonitoring;

// Default export
export default performanceMonitoring;

// ============================================================================
// React Integration
// ============================================================================

/**
 * React hook for component performance tracking
 *
 * @example
 * function MyComponent() {
 *   usePerformanceTracking('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function usePerformanceTracking(componentName: string): void {
  React.useEffect(() => {
    const startTime = performance.now();

    performanceMonitoring.trackFeatureUsage(componentName);

    return () => {
      const mountTime = performance.now() - startTime;
      performanceMonitoring.trackComponentMount(componentName, mountTime);
    };
  }, [componentName]);
}

/**
 * HOC for automatic performance tracking
 *
 * @example
 * const TrackedComponent = withPerformanceTracking(MyComponent);
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const displayName =
    componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    usePerformanceTracking(displayName);
    return React.createElement(WrappedComponent, props);
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`;

  return PerformanceTrackedComponent;
}

/**
 * Hook for tracking route changes
 *
 * @example
 * function App() {
 *   const location = useLocation();
 *   useRouteTracking(location.pathname);
 *   return <Routes>...</Routes>;
 * }
 */
export function useRouteTracking(route: string): void {
  const startTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (startTimeRef.current !== null) {
      const loadTime = performance.now() - startTimeRef.current;
      performanceMonitoring.trackRouteChange(route, loadTime);
    }
    startTimeRef.current = performance.now();
  }, [route]);
}

/**
 * Hook for getting performance score
 */
export function usePerformanceScore(): number {
  const [score, setScore] = React.useState(0);

  React.useEffect(() => {
    // Initial score
    setScore(performanceMonitoring.getPerformanceScore());

    // Update periodically
    const interval = setInterval(() => {
      setScore(performanceMonitoring.getPerformanceScore());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return score;
}
