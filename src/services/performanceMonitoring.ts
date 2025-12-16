/**
 * Performance Monitoring Service
 *
 * @deprecated Use `import { performanceMonitoring } from './monitoring'` instead.
 * This file re-exports from the consolidated monitoring module for backward compatibility.
 * @see DEBT-006
 */

// Re-export everything from the consolidated module
export {
  performanceMonitoring,
  PerformanceMonitoringService,
  usePerformanceTracking,
  withPerformanceTracking,
  useRouteTracking,
  usePerformanceScore,
} from './monitoring';

export type {
  PerformanceMetric,
  UserExperienceMetric,
  UserVitals,
  PerformanceReport,
  PerformanceSummary,
  AlertThreshold,
} from './monitoring';

// Default export
export { performanceMonitoring as default } from './monitoring';
