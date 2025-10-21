/**
 * Performance Monitor Component
 * Real-time performance metrics and monitoring dashboard
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Database,
  Wifi,
  HardDrive,
  Gauge,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Resource metrics
  jsHeapSize: number;
  usedJsHeapSize: number;
  totalJsHeapSize: number;

  // Network
  effectiveType: string;
  downlink: number;
  rtt: number;

  // Custom metrics
  renderTime: number;
  apiLatency: number;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  threshold?: { good: number; needsImprovement: number };
  description?: string;
}

function MetricCard({ title, value, unit, icon: Icon, threshold, description }: MetricCardProps) {
  const getStatus = (val: number) => {
    if (!threshold) return 'good';
    if (val <= threshold.good) return 'good';
    if (val <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const status = getStatus(numValue);

  const statusColors = {
    good: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    'needs-improvement': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    poor: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  };

  const statusIcons = {
    good: TrendingDown,
    'needs-improvement': Activity,
    poor: TrendingUp,
  };

  const StatusIcon = statusIcons[status];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <StatusIcon className={cn('h-3 w-3', statusColors[status])} />
        </div>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {typeof value === 'number' ? value.toFixed(0) : value}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <Badge variant="outline" className={cn('mt-2 text-xs', statusColors[status])}>
          {status === 'good' ? 'Good' : status === 'needs-improvement' ? 'Needs Work' : 'Poor'}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Enable performance monitoring in development or with flag
    const enableMonitoring =
      process.env.NODE_ENV === 'development' ||
      localStorage.getItem('performance_monitoring') === 'true';

    setIsVisible(enableMonitoring);

    if (!enableMonitoring) return;

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      // Get Core Web Vitals
      const lcpEntry = performance.getEntriesByType('largest-contentful-paint')[0] as any;
      const fidEntry = performance.getEntriesByType('first-input')[0] as any;
      const clsEntries = performance.getEntriesByType('layout-shift') as any[];

      const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      const lcp = lcpEntry?.renderTime || lcpEntry?.loadTime || 0;
      const fid = fidEntry?.processingStart - fidEntry?.startTime || 0;
      const cls = clsEntries
        .filter(entry => !entry.hadRecentInput)
        .reduce((sum, entry) => sum + entry.value, 0);

      const newMetrics: PerformanceMetrics = {
        // Core Web Vitals
        lcp: lcp,
        fid: fid,
        cls: cls,
        fcp: fcp,
        ttfb: navigation?.responseStart - navigation?.requestStart || 0,

        // Memory
        jsHeapSize: memory?.jsHeapSizeLimit || 0,
        usedJsHeapSize: memory?.usedJSHeapSize || 0,
        totalJsHeapSize: memory?.totalJSHeapSize || 0,

        // Network
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0,

        // Custom
        renderTime: performance.now(),
        apiLatency: 0, // Would be populated from actual API calls
      };

      setMetrics(newMetrics);
    };

    // Collect initial metrics
    collectMetrics();

    // Update metrics periodically
    const interval = setInterval(collectMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !metrics) return null;

  const memoryUsagePercent = metrics.jsHeapSize > 0
    ? (metrics.usedJsHeapSize / metrics.jsHeapSize) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Performance Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time performance metrics and Core Web Vitals
          </p>
        </div>

        <Badge variant="outline" className="gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Core Web Vitals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="LCP"
            value={metrics.lcp}
            unit="ms"
            icon={Zap}
            threshold={{ good: 2500, needsImprovement: 4000 }}
            description="Largest Contentful Paint"
          />
          <MetricCard
            title="FID"
            value={metrics.fid}
            unit="ms"
            icon={Clock}
            threshold={{ good: 100, needsImprovement: 300 }}
            description="First Input Delay"
          />
          <MetricCard
            title="CLS"
            value={metrics.cls}
            unit="score"
            icon={Activity}
            threshold={{ good: 0.1, needsImprovement: 0.25 }}
            description="Cumulative Layout Shift"
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Loading Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="FCP"
            value={metrics.fcp}
            unit="ms"
            icon={Zap}
            threshold={{ good: 1800, needsImprovement: 3000 }}
            description="First Contentful Paint"
          />
          <MetricCard
            title="TTFB"
            value={metrics.ttfb}
            unit="ms"
            icon={Wifi}
            threshold={{ good: 800, needsImprovement: 1800 }}
            description="Time to First Byte"
          />
          <MetricCard
            title="Page Load"
            value={metrics.renderTime}
            unit="ms"
            icon={Clock}
            threshold={{ good: 3000, needsImprovement: 5000 }}
            description="Total render time"
          />
        </div>
      </div>

      {/* Resource Usage */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Resource Usage</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              JavaScript Heap Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium">
                  {(metrics.usedJsHeapSize / 1024 / 1024).toFixed(1)} MB /
                  {(metrics.jsHeapSize / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <Progress value={memoryUsagePercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Used</p>
                <p className="font-medium">
                  {(metrics.usedJsHeapSize / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Limit</p>
                <p className="font-medium">
                  {(metrics.jsHeapSize / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Information */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Network</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Wifi className="h-4 w-4 text-muted-foreground mb-2" />
              <CardTitle className="text-sm">Connection Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">
                {metrics.effectiveType.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>

          <MetricCard
            title="Download Speed"
            value={metrics.downlink}
            unit="Mbps"
            icon={TrendingDown}
            description="Estimated bandwidth"
          />

          <MetricCard
            title="RTT"
            value={metrics.rtt}
            unit="ms"
            icon={Gauge}
            threshold={{ good: 100, needsImprovement: 300 }}
            description="Round Trip Time"
          />
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            Performance monitoring is enabled. To disable, run:{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              localStorage.removeItem('performance_monitoring')
            </code>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default PerformanceMonitor;
