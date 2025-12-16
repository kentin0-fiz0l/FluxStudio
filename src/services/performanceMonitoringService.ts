/**
 * Performance Monitoring Service
 *
 * @deprecated Use `import { performanceMonitoring } from './monitoring'` instead.
 * This file re-exports from the consolidated monitoring module for backward compatibility.
 * @see DEBT-006
 */

// Re-export from consolidated module
export {
  performanceMonitoringService,
  performanceMonitoring,
  PerformanceMonitoringService,
} from './monitoring';

export type {
  PerformanceMetric,
  UserExperienceMetric,
  AlertThreshold,
} from './monitoring';

// Default export
export { performanceMonitoringService as default } from './monitoring';
