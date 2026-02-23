/**
 * SystemHealth Component - Flux Studio Admin
 *
 * Displays system health status including API, database, cache, and other services.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Database,
  Cloud,
  HardDrive,
  Wifi,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type HealthStatus = 'healthy' | 'degraded' | 'down';

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  lastChecked: Date;
  details?: string;
}

interface SystemHealthProps {
  onRefresh?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

// Generate mock services - pure function for initial state
function generateMockServices(): ServiceHealth[] {
  return [
    {
      name: 'api',
      status: 'healthy',
      responseTime: 45,
      lastChecked: new Date(),
      details: 'All endpoints responding',
    },
    {
      name: 'database',
      status: 'healthy',
      responseTime: 12,
      lastChecked: new Date(),
      details: 'PostgreSQL running normally',
    },
    {
      name: 'cache',
      status: 'healthy',
      responseTime: 3,
      lastChecked: new Date(),
      details: 'Redis cache active',
    },
    {
      name: 'storage',
      status: 'healthy',
      responseTime: 89,
      lastChecked: new Date(),
      details: '2.4 TB available',
    },
    {
      name: 'websocket',
      status: 'healthy',
      responseTime: 8,
      lastChecked: new Date(),
      details: '143 active connections',
    },
  ];
}

export function SystemHealth({ onRefresh }: SystemHealthProps) {
  const { t } = useTranslation('admin');
  const [services, setServices] = useState<ServiceHealth[]>(generateMockServices);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uptime, setUptime] = useState<string>('99.97%');

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);

    // Simulate a slight delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setServices(generateMockServices());
    setUptime('99.97%');
    setIsRefreshing(false);
  }, []);

  // Set up periodic health checks
  useEffect(() => {
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleRefresh = () => {
    checkHealth();
    onRefresh?.();
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'degraded':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'down':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  const getServiceIcon = (name: string) => {
    switch (name) {
      case 'api':
        return <Server className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'cache':
        return <Cloud className="w-5 h-5" />;
      case 'storage':
        return <HardDrive className="w-5 h-5" />;
      case 'websocket':
        return <Wifi className="w-5 h-5" />;
      default:
        return <Server className="w-5 h-5" />;
    }
  };

  const overallStatus: HealthStatus = services.some((s) => s.status === 'down')
    ? 'down'
    : services.some((s) => s.status === 'degraded')
    ? 'degraded'
    : 'healthy';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('health.title', 'System Health')}
          </h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              overallStatus === 'healthy'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : overallStatus === 'degraded'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {t(`health.status.${overallStatus}`, overallStatus)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">{t('health.uptime', 'Uptime')}:</span> {uptime}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh health status"
            aria-busy={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.name}
            className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}
            role="status"
            aria-label={`${service.name}: ${service.status}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                {getServiceIcon(service.name)}
                <span className="font-medium">
                  {t(`health.services.${service.name}`, service.name)}
                </span>
              </div>
              {getStatusIcon(service.status)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {service.details}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>
                {service.responseTime !== undefined && `${service.responseTime}ms`}
              </span>
              <span>
                {t('health.lastChecked', 'Last checked')}:{' '}
                {service.lastChecked.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemHealth;
