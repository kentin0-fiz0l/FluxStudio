import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Target,
  RefreshCw,
} from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export function RealTimeMetrics() {
  const { socket, isConnected } = useSocket();
  const [metrics, setMetrics] = useState<MetricData[]>([
    { label: 'Active Users', value: 24, change: 12, trend: 'up' },
    { label: 'Projects', value: 156, change: 8, trend: 'up' },
    { label: 'Tasks Completed', value: 342, change: -3, trend: 'down' },
    { label: 'Avg Response Time', value: 1.2, change: 5, trend: 'neutral' }
  ]);

  const [activityData, setActivityData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Activity',
        data: [65, 59, 80, 81, 56, 55, 40],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.4
      }
    ]
  });

  const [projectStatusData, setProjectStatusData] = useState({
    labels: ['Active', 'In Review', 'Completed', 'On Hold'],
    datasets: [
      {
        data: [12, 5, 25, 3],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(59, 130, 246)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2
      }
    ]
  });

  const [teamPerformanceData, _setTeamPerformanceData] = useState({
    labels: ['Design', 'Development', 'Marketing', 'Sales'],
    datasets: [
      {
        label: 'Tasks Completed',
        data: [42, 38, 35, 28],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2
      }
    ]
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      // Update with random variations
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: m.value + (Math.random() * 10 - 5),
        change: (Math.random() * 20 - 10)
      })));
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMetricsUpdate = (data: { metrics: Record<string, unknown> }) => {
      setMetrics(data.metrics as unknown as MetricData[]);
      setLastUpdate(new Date());
    };

    const handleActivityUpdate = (data: { activityData: number[] }) => {
      setActivityData(prev => ({
        ...prev,
        datasets: [{
          ...prev.datasets[0],
          data: data.activityData
        }]
      }));
    };

    const handleProjectsStatus = (data: { statusCounts: number[] }) => {
      setProjectStatusData(prev => ({
        ...prev,
        datasets: [{
          ...prev.datasets[0],
          data: data.statusCounts
        }]
      }));
    };

    socket.on('metrics:update', handleMetricsUpdate);
    socket.on('activity:update', handleActivityUpdate);
    socket.on('projects:status', handleProjectsStatus);

    return () => {
      socket.off('metrics:update', handleMetricsUpdate);
      socket.off('activity:update', handleActivityUpdate);
      socket.off('projects:status', handleProjectsStatus);
    };
  }, [socket, isConnected]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update time since last update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceUpdate(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Real-Time Metrics</h2>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Updated {timeSinceUpdate}s ago
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={isRefreshing}
            aria-label="Refresh metrics"
            aria-busy={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                {metric.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />
                ) : metric.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />
                ) : (
                  <Activity className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metric.value.toFixed(metric.label.includes('Time') ? 1 : 0)}
                </span>
                <Badge
                  variant={metric.change > 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity Trend</TabsTrigger>
          <TabsTrigger value="projects">Project Status</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" aria-hidden="true" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={activityData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" aria-hidden="true" />
                  Project Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut data={projectStatusData} options={doughnutOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectStatusData.labels.map((label, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {projectStatusData.datasets[0].data[index]} projects
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(projectStatusData.datasets[0].data[index] / 45) * 100}%`,
                            backgroundColor: projectStatusData.datasets[0].backgroundColor[index]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" aria-hidden="true" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={teamPerformanceData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
