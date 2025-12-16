/**
 * Unified Performance Monitoring Service
 *
 * Consolidates all performance monitoring functionality:
 * - Core Web Vitals (FCP, LCP, FID, CLS, TTFB)
 * - Navigation and resource timing
 * - Component performance tracking
 * - User experience metrics
 * - System metrics and alerts
 *
 * @see DEBT-006: Consolidate duplicate performance monitoring services
 */

import {
  PerformanceMetric,
  UserExperienceMetric,
  UserVitals,
  PerformanceReport,
  PerformanceSummary,
  AlertThreshold,
  AlertSeverity,
  ConnectionInfo,
  MonitoringConfig,
  DEFAULT_CONFIG,
  MetricCategory,
} from './types';

export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private userMetrics: UserExperienceMetric[] = [];
  private vitals: Partial<UserVitals> = {};
  private sessionId: string;
  private config: MonitoringConfig;

  private observers: Map<string, PerformanceObserver> = new Map();
  private featureUsage = new Set<string>();
  private componentLoadTimes = new Map<string, number>();
  private alertThresholds: AlertThreshold[] = [];
  private reportingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.setupDefaultAlerts();

    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeMonitoring(): void {
    if (!this.config.enabled) return;

    if (this.config.enableCoreWebVitals) {
      this.measureCoreWebVitals();
    }

    this.measureNavigationTiming();

    if (this.config.enableResourceTiming) {
      this.measureResourceTiming();
    }

    if (this.config.enableLongTasks) {
      this.measureLongTasks();
    }

    if (this.config.enableUserInteractions) {
      this.trackUserInteractions();
    }

    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    this.startPeriodicReporting();
  }

  private setupDefaultAlerts(): void {
    this.alertThresholds = [
      { metric: 'LCP', threshold: 4000, condition: 'greater_than', severity: 'high' },
      { metric: 'FID', threshold: 300, condition: 'greater_than', severity: 'high' },
      { metric: 'CLS', threshold: 0.25, condition: 'greater_than', severity: 'medium' },
      { metric: 'long_task', threshold: 100, condition: 'greater_than', severity: 'medium' },
      { metric: 'memory_usage', threshold: 90, condition: 'greater_than', severity: 'high' },
      { metric: 'websocket_latency', threshold: 500, condition: 'greater_than', severity: 'high' },
    ];
  }

  // ============================================================================
  // Core Web Vitals
  // ============================================================================

  private measureCoreWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    this.createObserver('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.vitals.LCP = lastEntry.startTime;
      this.addMetric('LCP', lastEntry.startTime, 'navigation', {
        element: (lastEntry as PerformanceEntry & { element?: Element }).element?.tagName,
      });
    });

    // First Contentful Paint
    this.createObserver('paint', (entries) => {
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.vitals.FCP = entry.startTime;
          this.addMetric('FCP', entry.startTime, 'navigation');
        }
      });
    });

    // First Input Delay
    this.createObserver('first-input', (entries) => {
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        this.vitals.FID = fid;
        this.addMetric('FID', fid, 'interaction', { eventType: fidEntry.name });
      });
    });

    // Cumulative Layout Shift
    this.measureCumulativeLayoutShift();
  }

  private measureCumulativeLayoutShift(): void {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];

    this.createObserver('layout-shift', (entries) => {
      entries.forEach((entry) => {
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };

        if (!layoutShiftEntry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            lastSessionEntry &&
            firstSessionEntry &&
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
  }

  // ============================================================================
  // Navigation & Resource Timing
  // ============================================================================

  private measureNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;

        if (navigation) {
          this.vitals.TTFB = navigation.responseStart - navigation.requestStart;
          this.addMetric('TTFB', this.vitals.TTFB, 'navigation');

          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          this.addMetric('page_load_time', pageLoadTime, 'navigation');

          this.vitals.TTI = navigation.domInteractive - navigation.fetchStart;
          this.addMetric('TTI', this.vitals.TTI, 'navigation');

          this.addMetric(
            'dom_content_loaded',
            navigation.domContentLoadedEventEnd - navigation.navigationStart,
            'navigation'
          );
        }
      }, 0);
    });
  }

  private measureResourceTiming(): void {
    this.createObserver('resource', (entries) => {
      entries.forEach((entry) => {
        const resourceEntry = entry as PerformanceResourceTiming;
        this.addMetric('resource_load', resourceEntry.duration, 'resource', {
          name: resourceEntry.name,
          type: this.getResourceType(resourceEntry.name),
          size: resourceEntry.transferSize,
          cached: resourceEntry.transferSize === 0,
        });
      });
    });
  }

  private measureLongTasks(): void {
    this.createObserver('longtask', (entries) => {
      entries.forEach((entry) => {
        this.addMetric('long_task', entry.duration, 'interaction', {
          startTime: entry.startTime,
        });
      });
    });
  }

  // ============================================================================
  // User Interactions
  // ============================================================================

  private trackUserInteractions(): void {
    const events = ['click', 'keydown', 'scroll'];

    events.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (event) => {
          const startTime = performance.now();

          requestAnimationFrame(() => {
            const responseTime = performance.now() - startTime;
            this.addMetric('interaction_response', responseTime, 'interaction', {
              type: eventType,
              target: (event.target as Element)?.tagName,
            });
          });
        },
        { passive: true }
      );
    });
  }

  // ============================================================================
  // Error Tracking
  // ============================================================================

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.addMetric('js_error', 1, 'custom', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addMetric('promise_rejection', 1, 'custom', {
        reason: event.reason?.toString(),
      });
    });
  }

  // ============================================================================
  // Metric Recording
  // ============================================================================

  addMetric(
    name: string,
    value: number,
    category: MetricCategory,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata,
    };

    this.metrics.push(metric);

    // Check alerts
    this.checkAlertThresholds(name, value);

    // Limit stored metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-Math.floor(this.config.maxMetrics / 2));
    }
  }

  recordUserMetric(
    userId: string,
    sessionId: string,
    action: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.enabled) return;

    const userMetric: UserExperienceMetric = {
      userId,
      sessionId,
      action,
      duration,
      success,
      timestamp: new Date(),
      metadata,
    };

    this.userMetrics.push(userMetric);

    if (this.userMetrics.length > this.config.maxUserMetrics) {
      this.userMetrics = this.userMetrics.slice(-Math.floor(this.config.maxUserMetrics / 2));
    }
  }

  // ============================================================================
  // Feature & Component Tracking
  // ============================================================================

  trackFeatureUsage(featureName: string, loadTime?: number): void {
    this.featureUsage.add(featureName);

    if (loadTime !== undefined) {
      this.componentLoadTimes.set(featureName, loadTime);
      this.addMetric('feature_load_time', loadTime, 'custom', { feature: featureName });
    }

    this.addMetric('feature_usage', 1, 'custom', { feature: featureName });
  }

  trackRouteChange(route: string, loadTime: number): void {
    this.vitals.routeLoadTime = loadTime;
    this.addMetric('route_change', loadTime, 'navigation', { route });
  }

  trackComponentMount(componentName: string, mountTime: number): void {
    this.componentLoadTimes.set(componentName, mountTime);
    this.addMetric('component_mount', mountTime, 'render', { component: componentName });
  }

  // ============================================================================
  // Timing Utilities
  // ============================================================================

  timeFunction<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, 'custom', { ...context, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, 'custom', {
        ...context,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async timeAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, 'custom', { ...context, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, 'custom', {
        ...context,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  measureWebSocketLatency(socket: WebSocket): void {
    const startTime = Date.now();
    const pingMessage = JSON.stringify({ type: 'ping', timestamp: startTime });

    socket.send(pingMessage);

    const handlePong = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong' && data.timestamp === startTime) {
          const latency = Date.now() - startTime;
          this.addMetric('websocket_latency', latency, 'interaction');
          socket.removeEventListener('message', handlePong);
        }
      } catch {
        // Ignore parsing errors
      }
    };

    socket.addEventListener('message', handlePong);
    setTimeout(() => socket.removeEventListener('message', handlePong), 5000);
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.push(threshold);
  }

  private checkAlertThresholds(metricName: string, value: number): void {
    const threshold = this.alertThresholds.find((t) => t.metric === metricName);
    if (!threshold) return;

    let triggered = false;

    switch (threshold.condition) {
      case 'greater_than':
        triggered = value > threshold.threshold;
        break;
      case 'less_than':
        triggered = value < threshold.threshold;
        break;
      case 'equals':
        triggered = value === threshold.threshold;
        break;
    }

    if (triggered) {
      this.triggerAlert(metricName, value, threshold.severity);
    }
  }

  private triggerAlert(metric: string, value: number, severity: AlertSeverity): void {
    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${metric} = ${value}`);

    if (this.config.alertEndpoint && typeof fetch !== 'undefined') {
      fetch(this.config.alertEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          severity,
          timestamp: new Date().toISOString(),
        }),
      }).catch((error) => {
        console.error('Failed to send alert:', error);
      });
    }
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  getPerformanceReport(): PerformanceReport {
    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: this.getConnectionInfo(),
      vitals: { ...this.vitals },
      metrics: [...this.metrics],
      errors: [],
      features: {
        used: Array.from(this.featureUsage),
        loadTimes: Object.fromEntries(this.componentLoadTimes),
      },
      timestamp: Date.now(),
    };
  }

  getPerformanceSummary(timeRangeMs = 3600000): PerformanceSummary {
    const cutoff = Date.now() - timeRangeMs;
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);
    const recentUserMetrics = this.userMetrics.filter(
      (m) => m.timestamp.getTime() > cutoff
    );

    const summary: PerformanceSummary = {
      totalMetrics: recentMetrics.length,
      totalUserActions: recentUserMetrics.length,
      averagePerformance: {},
      slowestOperations: [],
      errorRate: 0,
      userExperience: {
        successRate: 0,
        averageResponseTime: 0,
      },
      performanceScore: this.getPerformanceScore(),
    };

    // Group by metric name
    const groups = recentMetrics.reduce(
      (acc, m) => {
        if (!acc[m.name]) acc[m.name] = [];
        acc[m.name].push(m.value);
        return acc;
      },
      {} as Record<string, number[]>
    );

    Object.entries(groups).forEach(([name, values]) => {
      summary.averagePerformance[name] = {
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    });

    // User experience
    if (recentUserMetrics.length > 0) {
      const successful = recentUserMetrics.filter((m) => m.success);
      summary.userExperience.successRate =
        (successful.length / recentUserMetrics.length) * 100;
      summary.userExperience.averageResponseTime =
        recentUserMetrics.reduce((sum, m) => sum + m.duration, 0) /
        recentUserMetrics.length;
    }

    return summary;
  }

  getPerformanceScore(): number {
    const { FCP, LCP, FID, CLS, TTFB } = this.vitals;

    if (!FCP || !LCP) return 0;

    let score = 100;

    // FCP scoring
    if (FCP > 3000) score -= 20;
    else if (FCP > 1800) score -= 10;

    // LCP scoring
    if (LCP > 4000) score -= 25;
    else if (LCP > 2500) score -= 15;

    // FID scoring
    if (FID && FID > 300) score -= 20;
    else if (FID && FID > 100) score -= 10;

    // CLS scoring
    if (CLS && CLS > 0.25) score -= 20;
    else if (CLS && CLS > 0.1) score -= 10;

    // TTFB scoring
    if (TTFB && TTFB > 500) score -= 15;
    else if (TTFB && TTFB > 200) score -= 5;

    return Math.max(0, score);
  }

  async sendReport(): Promise<void> {
    const report = this.getPerformanceReport();
    const endpoint = this.config.analyticsEndpoint || '/api/analytics/performance';

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  private startPeriodicReporting(): void {
    this.reportingInterval = setInterval(() => {
      this.sendReport();
    }, this.config.reportingInterval);

    // Send on page unload
    window.addEventListener('beforeunload', () => {
      if (navigator.sendBeacon) {
        const report = JSON.stringify(this.getPerformanceReport());
        navigator.sendBeacon(
          this.config.analyticsEndpoint || '/api/analytics/performance',
          report
        );
      }
    });

    // Send on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendReport();
      }
    });
  }

  // ============================================================================
  // Export
  // ============================================================================

  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'name', 'value', 'category', 'metadata'];
      const rows = this.metrics.map((m) => [
        new Date(m.timestamp).toISOString(),
        m.name,
        m.value.toString(),
        m.category,
        JSON.stringify(m.metadata || {}),
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    return JSON.stringify(
      {
        metrics: this.metrics,
        userMetrics: this.userMetrics,
        vitals: this.vitals,
        sessionId: this.sessionId,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private createObserver(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`Performance observer for ${entryType} not supported`);
    }
  }

  private getConnectionInfo(): ConnectionInfo {
    const connection =
      (navigator as Navigator & { connection?: NetworkInformation }).connection ||
      (navigator as Navigator & { mozConnection?: NetworkInformation }).mozConnection ||
      (navigator as Navigator & { webkitConnection?: NetworkInformation }).webkitConnection;

    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('.woff')) return 'font';
    return 'other';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // ============================================================================
  // Control
  // ============================================================================

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.userMetrics = [];
  }

  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.clearMetrics();
  }
}

// Type augmentation for Network Information API
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}
