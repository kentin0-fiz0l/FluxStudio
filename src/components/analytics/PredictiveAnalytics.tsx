import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Brain,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

// Types
interface PredictiveMetrics {
  trend: 'up' | 'down' | 'stable';
  currentValue: number;
  predictedValue: number;
  confidence: number; // 0-1
  changePercent: number;
  timeframe: string;
}

interface Prediction {
  id: string;
  metric: string;
  category: string;
  current: number;
  predicted: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
  timeframe: '7d' | '30d' | '90d';
}

interface HistoricalData {
  date: string;
  actual: number;
  predicted?: number;
  upper?: number;
  lower?: number;
}

interface PredictiveAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d';
  categories?: string[];
  onPredictionClick?: (prediction: Prediction) => void;
}

// Mock predictive data
const mockPredictions: Prediction[] = [
  {
    id: '1',
    metric: 'File Uploads',
    category: 'activity',
    current: 248,
    predicted: 310,
    confidence: 0.87,
    impact: 'high',
    trend: 'up',
    recommendation: 'Consider increasing storage capacity by 25%',
    timeframe: '30d',
  },
  {
    id: '2',
    metric: 'Team Collaboration',
    category: 'engagement',
    current: 156,
    predicted: 189,
    confidence: 0.82,
    impact: 'medium',
    trend: 'up',
    recommendation: 'Collaboration features showing strong adoption',
    timeframe: '30d',
  },
  {
    id: '3',
    metric: 'AI Analysis Usage',
    category: 'ai',
    current: 186,
    predicted: 245,
    confidence: 0.91,
    impact: 'high',
    trend: 'up',
    recommendation: 'AI features driving high engagement, expand capabilities',
    timeframe: '30d',
  },
  {
    id: '4',
    metric: 'Storage Usage (GB)',
    category: 'resources',
    current: 45.2,
    predicted: 62.8,
    confidence: 0.79,
    impact: 'medium',
    trend: 'up',
    recommendation: 'Monitor storage growth, upgrade plan if needed',
    timeframe: '30d',
  },
  {
    id: '5',
    metric: 'Active Users',
    category: 'users',
    current: 42,
    predicted: 38,
    confidence: 0.73,
    impact: 'high',
    trend: 'down',
    recommendation: 'User engagement declining, implement retention strategies',
    timeframe: '30d',
  },
  {
    id: '6',
    metric: 'API Requests',
    category: 'technical',
    current: 12400,
    predicted: 15800,
    confidence: 0.85,
    impact: 'medium',
    trend: 'up',
    recommendation: 'API usage growing steadily, ensure rate limits are adequate',
    timeframe: '30d',
  },
];

const historicalDataTemplate = (baseValue: number, trend: 'up' | 'down' | 'stable') => {
  const data: HistoricalData[] = [];
  let value = baseValue;
  const trendMultiplier = trend === 'up' ? 1.08 : trend === 'down' ? 0.95 : 1.0;

  // Historical data (30 days)
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    value = value * (0.95 + Math.random() * 0.1);

    data.push({
      date: dateStr,
      actual: Math.round(value),
    });
  }

  // Future predictions (next 30 days)
  let predictedValue = value;
  for (let i = 1; i <= 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

    predictedValue = predictedValue * trendMultiplier;
    const variance = predictedValue * 0.1;

    data.push({
      date: dateStr,
      predicted: Math.round(predictedValue),
      upper: Math.round(predictedValue + variance),
      lower: Math.round(predictedValue - variance),
    });
  }

  return data;
};

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  timeRange = '30d',
  categories = ['all'],
  onPredictionClick,
}) => {
  const [predictions] = useState<Prediction[]>(mockPredictions);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter predictions by category
  const filteredPredictions = useMemo(() => {
    if (categories.includes('all')) return predictions;
    return predictions.filter((p) => categories.includes(p.category));
  }, [predictions, categories]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalPredictions = filteredPredictions.length;
    const highImpact = filteredPredictions.filter((p) => p.impact === 'high').length;
    const avgConfidence =
      filteredPredictions.reduce((sum, p) => sum + p.confidence, 0) /
      totalPredictions;
    const upwardTrends = filteredPredictions.filter((p) => p.trend === 'up').length;
    const downwardTrends = filteredPredictions.filter((p) => p.trend === 'down').length;

    return {
      totalPredictions,
      highImpact,
      avgConfidence,
      upwardTrends,
      downwardTrends,
    };
  }, [filteredPredictions]);

  // Get historical data for selected metric
  const historicalData = useMemo(() => {
    const selected = filteredPredictions.find((p) => p.id === selectedMetric);
    if (!selected) {
      // Default to first prediction
      const first = filteredPredictions[0];
      return historicalDataTemplate(first?.current || 100, first?.trend || 'stable');
    }
    return historicalDataTemplate(selected.current, selected.trend);
  }, [selectedMetric, filteredPredictions]);

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  // Get impact color
  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    if (impact === 'high') return 'bg-red-100 text-red-700 border-red-300';
    if (impact === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            Predictive Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered predictions and trend forecasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-6 h-6 opacity-80" />
            <Badge className="bg-white/20 text-white">AI</Badge>
          </div>
          <div className="text-2xl font-bold">{summaryMetrics.totalPredictions}</div>
          <div className="text-sm opacity-80">Active Predictions</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-red-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 opacity-80" />
            <Badge className="bg-white/20 text-white">High</Badge>
          </div>
          <div className="text-2xl font-bold">{summaryMetrics.highImpact}</div>
          <div className="text-sm opacity-80">High Impact Items</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-green-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 opacity-80" />
            <Badge className="bg-white/20 text-white">Trends</Badge>
          </div>
          <div className="text-2xl font-bold">{summaryMetrics.upwardTrends}</div>
          <div className="text-sm opacity-80">Upward Trends</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-blue-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-6 h-6 opacity-80" />
            <Badge className="bg-white/20 text-white">Avg</Badge>
          </div>
          <div className="text-2xl font-bold">
            {Math.round(summaryMetrics.avgConfidence * 100)}%
          </div>
          <div className="text-sm opacity-80">Confidence Score</div>
        </motion.div>
      </div>

      {/* Main Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-blue-500" />
              Forecast Visualization
            </span>
            <select
              value={selectedMetric || ''}
              onChange={(e) => setSelectedMetric(e.target.value || null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select Metric</option>
              {filteredPredictions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.metric}
                </option>
              ))}
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                stroke="#E5E7EB"
              />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#E5E7EB" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <ReferenceLine
                x={historicalData[30]?.date}
                stroke="#9CA3AF"
                strokeDasharray="3 3"
                label={{ value: 'Today', position: 'top', fill: '#6B7280' }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Historical"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorPredicted)"
                name="Predicted"
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="#D1D5DB"
                strokeWidth={1}
                fill="none"
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="#D1D5DB"
                strokeWidth={1}
                fill="none"
                name="Lower Bound"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Predictions Grid/List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI Predictions ({filteredPredictions.length})
        </h3>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredPredictions.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedMetric(prediction.id);
                    onPredictionClick?.(prediction);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {prediction.metric}
                        </h4>
                        <p className="text-xs text-gray-500 capitalize">
                          {prediction.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(prediction.trend)}
                        <Badge className={getImpactColor(prediction.impact)}>
                          {prediction.impact}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Current</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatNumber(prediction.current)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Predicted</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatNumber(prediction.predicted)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Confidence</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${prediction.confidence * 100}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                          className="bg-purple-500 h-2 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-700">
                          {prediction.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {prediction.timeframe}
                      </span>
                      <span className="flex items-center gap-1">
                        {prediction.trend === 'up' ? (
                          <>
                            +
                            {Math.round(
                              ((prediction.predicted - prediction.current) /
                                prediction.current) *
                                100
                            )}
                            %
                          </>
                        ) : prediction.trend === 'down' ? (
                          <>
                            {Math.round(
                              ((prediction.predicted - prediction.current) /
                                prediction.current) *
                                100
                            )}
                            %
                          </>
                        ) : (
                          'Stable'
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPredictions.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedMetric(prediction.id);
                    onPredictionClick?.(prediction);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {getTrendIcon(prediction.trend)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {prediction.metric}
                          </h4>
                          <Badge className={getImpactColor(prediction.impact)}>
                            {prediction.impact}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {prediction.recommendation}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm text-gray-500 mb-1">
                          {formatNumber(prediction.current)} →{' '}
                          {formatNumber(prediction.predicted)}
                        </div>
                        <div className="text-xs text-purple-600">
                          {Math.round(prediction.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
