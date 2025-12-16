/**
 * Performance Monitoring Types
 * Unified type definitions for all performance monitoring features
 */

// ============================================================================
// Core Metric Types
// ============================================================================

export type MetricCategory = 'navigation' | 'render' | 'interaction' | 'resource' | 'custom' | 'system';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: MetricCategory;
  metadata?: Record<string, unknown>;
}

export interface UserExperienceMetric {
  userId: string;
  sessionId: string;
  action: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Core Web Vitals
// ============================================================================

export interface CoreWebVitals {
  FCP: number;   // First Contentful Paint
  LCP: number;   // Largest Contentful Paint
  FID: number;   // First Input Delay
  CLS: number;   // Cumulative Layout Shift
  TTFB: number;  // Time to First Byte
  TTI: number;   // Time to Interactive
  TBT: number;   // Total Blocking Time
}

export interface UserVitals extends CoreWebVitals {
  routeLoadTime: number;
  componentMountTime: number;
}

// ============================================================================
// System Metrics
// ============================================================================

export interface SystemMetrics {
  memoryUsage: number;
  connectionSpeed: number;
  connectionType: string;
  batteryLevel?: number;
  batteryCharging?: boolean;
  timestamp: Date;
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
}

// ============================================================================
// Alerts
// ============================================================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCondition = 'greater_than' | 'less_than' | 'equals';

export interface AlertThreshold {
  metric: string;
  threshold: number;
  condition: AlertCondition;
  severity: AlertSeverity;
}

export interface Alert {
  metric: string;
  value: number;
  severity: AlertSeverity;
  timestamp: Date;
  message?: string;
}

// ============================================================================
// Reports
// ============================================================================

export interface PerformanceReport {
  sessionId: string;
  userId?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  connection: ConnectionInfo;
  vitals: Partial<UserVitals>;
  metrics: PerformanceMetric[];
  errors: ErrorEntry[];
  features: {
    used: string[];
    loadTimes: Record<string, number>;
  };
  timestamp: number;
}

export interface ErrorEntry {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

export interface PerformanceSummary {
  totalMetrics: number;
  totalUserActions: number;
  averagePerformance: Record<string, MetricSummary>;
  slowestOperations: PerformanceMetric[];
  errorRate: number;
  userExperience: {
    successRate: number;
    averageResponseTime: number;
  };
  performanceScore: number;
}

export interface MetricSummary {
  average: number;
  min: number;
  max: number;
  count: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface MonitoringConfig {
  enabled: boolean;
  reportingInterval: number;
  maxMetrics: number;
  maxUserMetrics: number;
  analyticsEndpoint?: string;
  alertEndpoint?: string;
  enableCoreWebVitals: boolean;
  enableResourceTiming: boolean;
  enableLongTasks: boolean;
  enableUserInteractions: boolean;
  enableErrorTracking: boolean;
}

export const DEFAULT_CONFIG: MonitoringConfig = {
  enabled: true,
  reportingInterval: 30000,
  maxMetrics: 1000,
  maxUserMetrics: 500,
  enableCoreWebVitals: true,
  enableResourceTiming: true,
  enableLongTasks: true,
  enableUserInteractions: true,
  enableErrorTracking: true,
};
