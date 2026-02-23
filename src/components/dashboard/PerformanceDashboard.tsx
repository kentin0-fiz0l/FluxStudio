import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  message_throughput: number;
  api_response_time: number;
  database_connections: number;
  database_query_time: number;
  database_slow_queries: number;
  error_rate: number;
}

interface DatabaseMetrics {
  table_name: string;
  size_mb: number;
  query_count: number;
  avg_query_time: number;
  index_usage: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const { socket } = useWebSocket('/performance');

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(false);
        setRetrying(false);
      });
      socket.on('disconnect', () => {
        setIsConnected(false);
        setConnectionError(true);
      });
      socket.on('connect_error', () => {
        setConnectionError(true);
        setRetrying(false);
      });

      socket.on('system_metrics', (data: SystemMetrics) => {
        setCurrentMetrics(data);
        setMetrics(prev => [...prev.slice(-29), data]); // Keep last 30 data points
      });

      socket.on('database_metrics', (data: DatabaseMetrics[]) => {
        setDatabaseMetrics(data);
      });

      // Request initial data
      socket.emit('request_metrics');

      // Set up periodic updates
      const interval = setInterval(() => {
        socket.emit('request_metrics');
      }, 5000);

      return () => {
        clearInterval(interval);
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('system_metrics');
        socket.off('database_metrics');
      };
    }
  }, [socket]);

  const handleRetry = useCallback(() => {
    if (socket) {
      setRetrying(true);
      socket.connect();
      socket.emit('request_metrics');
    }
  }, [socket]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.warning) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">FluxStudio Performance Dashboard</h1>
        <Badge variant={isConnected ? 'primary' : 'error'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {/* Connection error banner */}
      {connectionError && !isConnected && (
        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Connection lost</p>
              <p className="text-xs text-red-600 dark:text-red-500">Real-time metrics are unavailable. Showing last known data.</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Reconnecting...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.cpu_usage.toFixed(1)}%</div>
            <Progress
              value={currentMetrics?.cpu_usage || 0}
              className={`mt-2 ${getStatusColor(currentMetrics?.cpu_usage || 0, { good: 50, warning: 80 })}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.memory_usage.toFixed(1)}%</div>
            <Progress
              value={currentMetrics?.memory_usage || 0}
              className={`mt-2 ${getStatusColor(currentMetrics?.memory_usage || 0, { good: 60, warning: 85 })}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.active_connections || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">WebSocket + HTTP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.api_response_time || 0}ms</div>
            <Progress
              value={Math.min((currentMetrics?.api_response_time || 0) / 500 * 100, 100)}
              className={`mt-2 ${getStatusColor(currentMetrics?.api_response_time || 0, { good: 100, warning: 300 })}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Database Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database Query Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.database_query_time || 0}ms</div>
            <Progress
              value={Math.min((currentMetrics?.database_query_time || 0) / 1000 * 100, 100)}
              className={`mt-2 ${getStatusColor(currentMetrics?.database_query_time || 0, { good: 100, warning: 500 })}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.database_slow_queries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 1 minute</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMetrics?.database_connections || 0}/20</div>
            <Progress
              value={(currentMetrics?.database_connections || 0) / 20 * 100}
              className={`mt-2 ${getStatusColor((currentMetrics?.database_connections || 0) / 20 * 100, { good: 50, warning: 80 })}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Metrics */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Performance</TabsTrigger>
          <TabsTrigger value="database">Database Metrics</TabsTrigger>
          <TabsTrigger value="messaging">Messaging Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU & Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip labelFormatter={formatTimestamp} />
                    <Line type="monotone" dataKey="cpu_usage" stroke="#8884d8" name="CPU %" />
                    <Line type="monotone" dataKey="memory_usage" stroke="#82ca9d" name="Memory %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip labelFormatter={formatTimestamp} />
                    <Line type="monotone" dataKey="api_response_time" stroke="#ff7300" name="Response Time (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Table Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={databaseMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="table_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="size_mb" fill="#8884d8" name="Size (MB)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={databaseMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="table_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_query_time" fill="#82ca9d" name="Avg Query Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Performance Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                  <YAxis />
                  <Tooltip labelFormatter={formatTimestamp} />
                  <Line type="monotone" dataKey="database_query_time" stroke="#ff7300" name="Query Time (ms)" />
                  <Line type="monotone" dataKey="database_slow_queries" stroke="#ff0000" name="Slow Queries" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Connection Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMetrics?.database_connections || 0}</div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">20</div>
                  <p className="text-sm text-muted-foreground">Pool Size</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {((currentMetrics?.database_connections || 0) / 20 * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Pool Utilization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Message Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip labelFormatter={formatTimestamp} />
                    <Line type="monotone" dataKey="message_throughput" stroke="#ff7300" name="Messages/min" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
                    <YAxis />
                    <Tooltip labelFormatter={formatTimestamp} />
                    <Line type="monotone" dataKey="active_connections" stroke="#8884d8" name="Active Connections" />
                    <Line type="monotone" dataKey="error_rate" stroke="#ff0000" name="Error Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;