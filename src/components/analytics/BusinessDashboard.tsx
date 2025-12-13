import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  Award,
  Clock,
  FileText,
  MessageSquare,
  Star,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePickerWithRange } from '../ui/date-picker';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

interface AnalyticsData {
  revenue: {
    total: number;
    monthly: Array<{ month: string; amount: number; projects: number }>;
    byServiceTier: Array<{ tier: string; amount: number; percentage: number }>;
    byServiceCategory: Array<{ category: string; amount: number; count: number }>;
    growth: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    completion_rate: number;
    avg_duration: number;
    byStatus: Array<{ status: string; count: number; percentage: number }>;
    byEnsembleType: Array<{ type: string; count: number; revenue: number }>;
    timeline_performance: Array<{ month: string; onTime: number; late: number; early: number }>;
  };
  clients: {
    total: number;
    new_this_month: number;
    retention_rate: number;
    satisfaction_score: number;
    byType: Array<{ type: string; count: number; revenue: number }>;
    topClients: Array<{ name: string; projects: number; revenue: number; lastProject: string }>;
  };
  performance: {
    avg_project_value: number;
    revenue_per_client: number;
    project_efficiency: number;
    client_acquisition_cost: number;
    monthly_recurring_revenue: number;
    churn_rate: number;
  };
  portfolio: {
    total_views: number;
    total_likes: number;
    engagement_rate: number;
    top_items: Array<{ title: string; views: number; likes: number; shares: number }>;
    monthly_engagement: Array<{ month: string; views: number; engagement: number }>;
  };
  team: {
    utilization_rate: number;
    avg_hours_per_project: number;
    capacity_planning: Array<{ month: string; capacity: number; demand: number; utilization: number }>;
    skill_demand: Array<{ skill: string; demand: number; availability: number }>;
  };
}

interface BusinessDashboardProps {
  data: AnalyticsData;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const timeRanges = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last year', value: '1y' },
  { label: 'All time', value: 'all' }
];

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1'
};

export function BusinessDashboard({
  data,
  dateRange,
  onDateRangeChange,
  onExport,
  onRefresh,
  isLoading = false
}: BusinessDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Calculate key metrics
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  // Key Performance Indicators
  const kpis = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data.revenue.total),
      change: data.revenue.growth,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Active Projects',
      value: data.projects.active.toString(),
      change: 0.12, // Would come from data
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Total Clients',
      value: data.clients.total.toString(),
      change: data.clients.new_this_month / data.clients.total,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Completion Rate',
      value: formatPercentage(data.projects.completion_rate),
      change: 0.08, // Would come from data
      icon: Target,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
          <p className="text-gray-600">Track your design business performance and growth</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => onExport?.('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const GrowthIcon = getGrowthIcon(kpi.change);

          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg bg-gray-100', kpi.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{kpi.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-1 text-sm', getGrowthColor(kpi.change))}>
                      <GrowthIcon className="h-4 w-4" />
                      <span>{formatPercentage(Math.abs(kpi.change))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue and project count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'amount' ? formatCurrency(value as number) : value,
                    name === 'amount' ? 'Revenue' : 'Projects'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Current project distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.projects.byStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ status, percentage }) => `${status} (${(percentage * 100).toFixed(0)}%)`}
                >
                  {data.projects.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Tier Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service Tier</CardTitle>
            <CardDescription>Performance across different service tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenue.byServiceTier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill={COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline Performance</CardTitle>
            <CardDescription>On-time vs late project delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.projects.timeline_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" stackId="a" fill={COLORS.secondary} name="On Time" />
                <Bar dataKey="late" stackId="a" fill={COLORS.danger} name="Late" />
                <Bar dataKey="early" stackId="a" fill={COLORS.accent} name="Early" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <CardDescription>Highest value clients by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.clients.topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{client.name}</h4>
                      <p className="text-sm text-gray-600">{client.projects} projects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(client.revenue)}</p>
                    <p className="text-sm text-gray-600">{client.lastProject}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Key Performance Metrics</CardTitle>
            <CardDescription>Important business health indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Average Project Value</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.performance.avg_project_value)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Revenue per Client</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.performance.revenue_per_client)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Project Efficiency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(data.performance.project_efficiency)}
                  </span>
                </div>
                <Progress value={data.performance.project_efficiency * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Client Retention</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(data.clients.retention_rate)}
                  </span>
                </div>
                <Progress value={data.clients.retention_rate * 100} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Monthly Recurring Revenue</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(data.performance.monthly_recurring_revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Client Satisfaction</span>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-lg font-bold text-gray-900">
                    {data.clients.satisfaction_score.toFixed(1)}/5.0
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Engagement</CardTitle>
            <CardDescription>Public portfolio performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{data.portfolio.total_views.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Views</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{data.portfolio.total_likes.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Likes</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatPercentage(data.portfolio.engagement_rate)}</div>
                  <div className="text-sm text-gray-600">Engagement</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Performing Items</h4>
                <div className="space-y-2">
                  {data.portfolio.top_items.map((item, index) => (
                    <div key={item.title} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {item.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {item.likes}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Team Utilization</CardTitle>
            <CardDescription>Resource planning and capacity analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Utilization</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(data.team.utilization_rate)}
                  </span>
                </div>
                <Progress
                  value={data.team.utilization_rate * 100}
                  className={cn(
                    'h-3',
                    data.team.utilization_rate > 0.9 ? 'text-red-500' :
                    data.team.utilization_rate > 0.75 ? 'text-yellow-500' : 'text-green-500'
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Avg Hours per Project</span>
                <span className="text-lg font-bold text-gray-900">
                  {data.team.avg_hours_per_project}h
                </span>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Skill Demand vs Availability</h4>
                <div className="space-y-3">
                  {data.team.skill_demand.map((skill) => (
                    <div key={skill.skill} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{skill.skill}</span>
                        <span className="text-gray-600">{skill.demand}/{skill.availability}</span>
                      </div>
                      <div className="relative">
                        <Progress value={(skill.availability / skill.demand) * 100} className="h-2" />
                        {skill.demand > skill.availability && (
                          <Badge className="absolute -top-1 -right-1 bg-red-500 text-xs">
                            Gap
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Planning Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Planning</CardTitle>
          <CardDescription>Team capacity vs demand over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.team.capacity_planning}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="capacity"
                stroke={COLORS.primary}
                strokeWidth={2}
                name="Capacity"
              />
              <Line
                type="monotone"
                dataKey="demand"
                stroke={COLORS.danger}
                strokeWidth={2}
                name="Demand"
              />
              <Line
                type="monotone"
                dataKey="utilization"
                stroke={COLORS.secondary}
                strokeWidth={2}
                name="Utilization %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Action Items & Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights & Recommendations</CardTitle>
          <CardDescription>AI-powered insights to grow your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900">Revenue Growth</h4>
              </div>
              <p className="text-sm text-green-800">
                Your premium tier services are driving strong growth. Consider expanding premium offerings.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">Timeline Optimization</h4>
              </div>
              <p className="text-sm text-yellow-800">
                Some projects are running late. Consider adjusting timelines or adding buffer time.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Client Acquisition</h4>
              </div>
              <p className="text-sm text-blue-800">
                High school market shows strong demand. Focus marketing efforts on this segment.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Portfolio Impact</h4>
              </div>
              <p className="text-sm text-purple-800">
                Your portfolio engagement is driving new inquiries. Keep showcasing recent work.
              </p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium text-orange-900">Capacity Planning</h4>
              </div>
              <p className="text-sm text-orange-800">
                You're approaching maximum capacity. Consider hiring or raising prices.
              </p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-900">Client Retention</h4>
              </div>
              <p className="text-sm text-red-800">
                Follow up with past clients for repeat business. Your retention rate could improve.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default BusinessDashboard;
