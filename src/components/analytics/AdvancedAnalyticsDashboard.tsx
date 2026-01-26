/**
 * Advanced Analytics Dashboard
 * Provides comprehensive insights into design projects, team performance,
 * collaboration patterns, and business metrics
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  } from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Search,
  Download,
  RefreshCw,
  MessageSquare,
  FileText,
  CheckCircle,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface AnalyticsData {
  projectMetrics: ProjectMetrics;
  teamPerformance: TeamPerformance;
  collaborationInsights: CollaborationInsights;
  businessMetrics: BusinessMetrics;
  timeSeriesData: TimeSeriesData[];
  userEngagement: UserEngagement;
}

interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgCompletionTime: number;
  projectsByStatus: { name: string; value: number; color: string }[];
  projectsByType: { name: string; value: number }[];
}

interface TeamPerformance {
  totalMembers: number;
  activeMembers: number;
  avgProductivity: number;
  topPerformers: { name: string; score: number; avatar: string }[];
  skillDistribution: { skill: string; level: number; members: number }[];
  collaborationScore: number;
}

interface CollaborationInsights {
  totalMessages: number;
  avgResponseTime: number;
  meetingsCount: number;
  feedbackScore: number;
  communicationPatterns: { day: string; messages: number; meetings: number }[];
  topCollaborators: { name: string; interactions: number; avatar: string }[];
}

interface BusinessMetrics {
  revenue: number;
  clientSatisfaction: number;
  projectValue: number;
  profitMargin: number;
  clientRetention: number;
  newClients: number;
  trends: { metric: string; value: number; change: number; trend: 'up' | 'down' | 'stable' }[];
}

interface TimeSeriesData {
  date: string;
  projects: number;
  revenue: number;
  users: number;
  satisfaction: number;
}

interface UserEngagement {
  dailyActiveUsers: number;
  sessionDuration: number;
  featureUsage: { feature: string; usage: number; trend: number }[];
  userJourney: { step: string; users: number; conversion: number }[];
}

export function AdvancedAnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Mock data - in real implementation, this would come from API
  const mockData: AnalyticsData = useMemo(() => ({
    projectMetrics: {
      totalProjects: 156,
      activeProjects: 23,
      completedProjects: 133,
      avgCompletionTime: 18.5,
      projectsByStatus: [
        { name: 'Active', value: 23, color: '#6366f1' },
        { name: 'Completed', value: 133, color: '#10b981' },
        { name: 'On Hold', value: 8, color: '#f59e0b' },
        { name: 'Cancelled', value: 3, color: '#ef4444' },
      ],
      projectsByType: [
        { name: 'Web Design', value: 45 },
        { name: 'Mobile App', value: 32 },
        { name: 'Branding', value: 28 },
        { name: 'Print Design', value: 18 },
        { name: 'UI/UX', value: 33 },
      ],
    },
    teamPerformance: {
      totalMembers: 24,
      activeMembers: 18,
      avgProductivity: 87,
      topPerformers: [
        { name: 'Sarah Chen', score: 95, avatar: '/avatars/sarah.jpg' },
        { name: 'Mike Johnson', score: 92, avatar: '/avatars/mike.jpg' },
        { name: 'Emma Wilson', score: 89, avatar: '/avatars/emma.jpg' },
      ],
      skillDistribution: [
        { skill: 'UI/UX Design', level: 85, members: 12 },
        { skill: 'Frontend Dev', level: 78, members: 8 },
        { skill: 'Branding', level: 90, members: 6 },
        { skill: 'Motion Design', level: 72, members: 4 },
        { skill: 'Research', level: 82, members: 7 },
      ],
      collaborationScore: 8.4,
    },
    collaborationInsights: {
      totalMessages: 2847,
      avgResponseTime: 2.3,
      meetingsCount: 156,
      feedbackScore: 4.6,
      communicationPatterns: [
        { day: 'Mon', messages: 420, meetings: 25 },
        { day: 'Tue', messages: 380, meetings: 22 },
        { day: 'Wed', messages: 450, meetings: 28 },
        { day: 'Thu', messages: 410, meetings: 24 },
        { day: 'Fri', messages: 320, meetings: 18 },
      ],
      topCollaborators: [
        { name: 'Design Team', interactions: 1247, avatar: '/teams/design.jpg' },
        { name: 'Dev Team', interactions: 892, avatar: '/teams/dev.jpg' },
        { name: 'Product Team', interactions: 634, avatar: '/teams/product.jpg' },
      ],
    },
    businessMetrics: {
      revenue: 284750,
      clientSatisfaction: 4.7,
      projectValue: 12450,
      profitMargin: 34.2,
      clientRetention: 87,
      newClients: 12,
      trends: [
        { metric: 'Revenue', value: 284750, change: 12.5, trend: 'up' },
        { metric: 'Projects', value: 156, change: 8.2, trend: 'up' },
        { metric: 'Team Size', value: 24, change: 4.3, trend: 'up' },
        { metric: 'Efficiency', value: 87, change: -2.1, trend: 'down' },
      ],
    },
    timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      projects: Math.floor(Math.random() * 10) + 5,
      revenue: Math.floor(Math.random() * 5000) + 8000,
      users: Math.floor(Math.random() * 20) + 40,
      satisfaction: Math.random() * 1 + 4,
    })),
    userEngagement: {
      dailyActiveUsers: 142,
      sessionDuration: 28.5,
      featureUsage: [
        { feature: 'Project Creation', usage: 89, trend: 12 },
        { feature: 'File Upload', usage: 76, trend: 8 },
        { feature: 'Collaboration', usage: 65, trend: -3 },
        { feature: 'Comments', usage: 82, trend: 15 },
        { feature: 'Analytics', usage: 34, trend: 22 },
      ],
      userJourney: [
        { step: 'Sign Up', users: 1000, conversion: 100 },
        { step: 'First Project', users: 750, conversion: 75 },
        { step: 'Team Invite', users: 450, conversion: 60 },
        { step: 'First Upload', users: 380, conversion: 84 },
        { step: 'Active User', users: 280, conversion: 74 },
      ],
    },
  }), []);

  useEffect(() => {
    setData(mockData);
  }, [mockData]);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setData(mockData);
    setIsLoading(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your design operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search metrics, projects, or team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="design">Design Team</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="product">Product Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold">{data.projectMetrics.activeProjects}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                +{data.businessMetrics.trends[1].change}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(data.businessMetrics.revenue)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                +{data.businessMetrics.trends[0].change}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold">{data.teamPerformance.totalMembers}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {data.teamPerformance.activeMembers} active
              </Badge>
              <span className="text-xs text-muted-foreground">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client Satisfaction</p>
                <p className="text-3xl font-bold">{data.businessMetrics.clientSatisfaction}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Excellent
              </Badge>
              <span className="text-xs text-muted-foreground">rating</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Project completion over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="projects" stroke="#6366f1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Trends</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.businessMetrics.trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend.trend)}
                      <span className="text-sm font-medium">{trend.metric}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatNumber(trend.value)}</div>
                      <div className={`text-xs ${trend.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Productivity</CardTitle>
                <CardDescription>Average team performance score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Score</span>
                    <span className="text-sm font-medium">{data.teamPerformance.avgProductivity}%</span>
                  </div>
                  <Progress value={data.teamPerformance.avgProductivity} className="h-2" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Top Performers</div>
                  {data.teamPerformance.topPerformers.slice(0, 3).map((performer, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{performer.name}</span>
                      <Badge variant="outline">{performer.score}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Daily active users and session duration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Daily Active Users</span>
                      <span className="text-sm font-medium">{data.userEngagement.dailyActiveUsers}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Avg Session Duration</span>
                      <span className="text-sm font-medium">{data.userEngagement.sessionDuration}m</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Feature Usage</div>
                    {data.userEngagement.featureUsage.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{feature.feature}</span>
                        <div className="flex items-center gap-2">
                          <span>{feature.usage}%</span>
                          {feature.trend > 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>Current status of all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.projectMetrics.projectsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {data.projectMetrics.projectsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects by Type</CardTitle>
                <CardDescription>Distribution of project categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.projectMetrics.projectsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold">{data.projectMetrics.totalProjects}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{data.projectMetrics.completedProjects}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                    <p className="text-2xl font-bold">{data.projectMetrics.avgCompletionTime}d</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Additional tabs would be implemented similarly */}
        <TabsContent value="team">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Team Analytics</h3>
            <p className="text-muted-foreground">Detailed team performance metrics coming soon.</p>
          </div>
        </TabsContent>

        <TabsContent value="collaboration">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Collaboration Insights</h3>
            <p className="text-muted-foreground">Team collaboration patterns and communication analytics.</p>
          </div>
        </TabsContent>

        <TabsContent value="business">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Business Metrics</h3>
            <p className="text-muted-foreground">Revenue, profitability, and business growth analytics.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}