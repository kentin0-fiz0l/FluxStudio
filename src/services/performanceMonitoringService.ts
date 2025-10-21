/**
 * Performance Monitoring Service
 * Monitor and track messaging system performance metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  context?: Record<string, any>;
}

interface UserExperienceMetric {
  userId: string;
  sessionId: string;
  action: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SystemMetrics {
  messagesSent: number;
  messagesReceived: number;
  activeConnections: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  timestamp: Date;
}

interface AlertThreshold {
  metric: string;
  threshold: number;
  condition: 'greater_than' | 'less_than' | 'equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private userMetrics: UserExperienceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alertThresholds: AlertThreshold[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.initializePerformanceObservers();
    this.setupDefaultAlerts();
    this.startSystemMetricsCollection();
  }

  /**
   * Initialize Web Performance API observers
   */
  private initializePerformanceObservers(): void {
    if (typeof window === 'undefined') return;

    // Measure navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('navigation', entry.duration, {
            type: entry.entryType,
            name: entry.name
          });
        }
      });

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Measure resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('resource_load', entry.duration, {
            name: entry.name,
            type: entry.initiatorType,
            size: (entry as any).transferSize
          });
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }

      // Measure long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('long_task', entry.duration, {
            startTime: entry.startTime
          });

          // Alert on long tasks
          if (entry.duration > 50) {
            this.triggerAlert('long_task', entry.duration, 'high');
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  /**
   * Setup default performance alert thresholds
   */
  private setupDefaultAlerts(): void {
    this.alertThresholds = [
      {
        metric: 'message_send_time',
        threshold: 1000,
        condition: 'greater_than',
        severity: 'medium'
      },
      {
        metric: 'websocket_latency',
        threshold: 500,
        condition: 'greater_than',
        severity: 'high'
      },
      {
        metric: 'error_rate',
        threshold: 5,
        condition: 'greater_than',
        severity: 'critical'
      },
      {
        metric: 'memory_usage',
        threshold: 90,
        condition: 'greater_than',
        severity: 'high'
      },
      {
        metric: 'cache_hit_rate',
        threshold: 70,
        condition: 'less_than',
        severity: 'medium'
      }
    ];
  }

  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      context
    };

    this.metrics.push(metric);

    // Check against alert thresholds
    this.checkAlertThresholds(name, value);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send to analytics if configured
    this.sendToAnalytics(metric);
  }

  /**
   * Record user experience metric
   */
  recordUserMetric(
    userId: string,
    sessionId: string,
    action: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const userMetric: UserExperienceMetric = {
      userId,
      sessionId,
      action,
      duration,
      success,
      timestamp: new Date(),
      metadata
    };

    this.userMetrics.push(userMetric);

    // Keep only last 500 user metrics
    if (this.userMetrics.length > 500) {
      this.userMetrics = this.userMetrics.slice(-500);
    }
  }

  /**
   * Time a function execution
   */
  timeFunction<T>(name: string, fn: () => T, context?: Record<string, any>): T {
    const startTime = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - startTime;

      this.recordMetric(name, duration, { ...context, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...context, success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Time an async function execution
   */
  async timeAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordMetric(name, duration, { ...context, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...context, success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Measure WebSocket latency
   */
  measureWebSocketLatency(socket: WebSocket): void {
    const startTime = Date.now();

    const pingMessage = JSON.stringify({
      type: 'ping',
      timestamp: startTime
    });

    socket.send(pingMessage);

    const handlePong = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong' && data.timestamp === startTime) {
          const latency = Date.now() - startTime;
          this.recordMetric('websocket_latency', latency);
          socket.removeEventListener('message', handlePong);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    socket.addEventListener('message', handlePong);

    // Cleanup after 5 seconds
    setTimeout(() => {
      socket.removeEventListener('message', handlePong);
    }, 5000);
  }

  /**
   * Measure page load performance
   */
  measurePageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.navigationStart);
          this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart);
          this.recordMetric('first_byte_time', navigation.responseStart - navigation.navigationStart);
        }

        // Measure Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('largest_contentful_paint', lastEntry.startTime);
        });

        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
          console.warn('LCP observer not supported:', error);
        }

        // Measure First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('first_input_delay', entry.processingStart - entry.startTime);
          }
        });

        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (error) {
          console.warn('FID observer not supported:', error);
        }
      }, 100);
    });
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    if (typeof window === 'undefined') return;

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory_usage', memoryUsage);
    }

    // Connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordMetric('connection_speed', connection.downlink || 0, {
        effectiveType: connection.effectiveType,
        rtt: connection.rtt
      });
    }

    // Battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.recordMetric('battery_level', battery.level * 100, {
          charging: battery.charging
        });
      });
    }
  }

  /**
   * Check metric against alert thresholds
   */
  private checkAlertThresholds(metricName: string, value: number): void {
    const threshold = this.alertThresholds.find(t => t.metric === metricName);
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

  /**
   * Trigger performance alert
   */
  private triggerAlert(metric: string, value: number, severity: string): void {
    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${metric} = ${value}`);

    // Send to monitoring service
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          severity,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        console.error('Failed to send alert:', error);
      });
    }
  }

  /**
   * Send metric to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Send to Google Analytics, Mixpanel, or other analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        custom_parameter: metric.name,
        value: metric.value
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange: number = 3600000): any {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRange);

    const recentMetrics = this.metrics.filter(m => m.timestamp > startTime);
    const recentUserMetrics = this.userMetrics.filter(m => m.timestamp > startTime);

    const summary = {
      totalMetrics: recentMetrics.length,
      totalUserActions: recentUserMetrics.length,
      averagePerformance: {},
      slowestOperations: [],
      errorRate: 0,
      userExperience: {
        successRate: 0,
        averageResponseTime: 0
      }
    };

    // Calculate averages by metric name
    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) groups[metric.name] = [];
      groups[metric.name].push(metric.value);
      return groups;
    }, {} as Record<string, number[]>);

    Object.keys(metricGroups).forEach(name => {
      const values = metricGroups[name];
      summary.averagePerformance[name] = {
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });

    // Calculate user experience metrics
    if (recentUserMetrics.length > 0) {
      const successful = recentUserMetrics.filter(m => m.success);
      summary.userExperience.successRate = (successful.length / recentUserMetrics.length) * 100;
      summary.userExperience.averageResponseTime =
        recentUserMetrics.reduce((sum, m) => sum + m.duration, 0) / recentUserMetrics.length;
    }

    return summary;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'name', 'value', 'context'];
      const rows = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.name,
        m.value.toString(),
        JSON.stringify(m.context || {})
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify({
      metrics: this.metrics,
      userMetrics: this.userMetrics,
      systemMetrics: this.systemMetrics,
      generatedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.userMetrics = [];
    this.systemMetrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get current monitoring status
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.clearMetrics();
  }
}

// Singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

export type {
  PerformanceMetric,
  UserExperienceMetric,
  SystemMetrics,
  AlertThreshold
};

export default performanceMonitoringService;