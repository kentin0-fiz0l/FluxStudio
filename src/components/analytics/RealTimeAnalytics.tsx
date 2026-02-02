import React, { useState, useEffect } from 'react';
import { Activity, Users, Clock, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface LiveMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: number;
  icon: React.ComponentType<any>;
  color: string;
}

export const RealTimeAnalytics: React.FC = () => {
  const [metrics, _setMetrics] = useState<LiveMetric[]>([
    { id: '1', label: 'Active Users', value: 42, unit: '', trend: 12, icon: Users, color: 'blue' },
    { id: '2', label: 'Files Processed', value: 156, unit: '', trend: 8, icon: Activity, color: 'green' },
    { id: '3', label: 'Avg Response Time', value: 245, unit: 'ms', trend: -5, icon: Clock, color: 'purple' },
    { id: '4', label: 'AI Operations', value: 89, unit: '/min', trend: 15, icon: Zap, color: 'orange' },
  ]);

  const [activityData, setActivityData] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: Math.floor(Math.random() * 100) + 50,
    }))
  );

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setActivityData((prev) => [
        ...prev.slice(1),
        { time: prev[prev.length - 1].time + 1, value: Math.floor(Math.random() * 100) + 50 },
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h2>
        <Badge className="ml-2 bg-green-100 text-green-700">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className={`w-5 h-5 text-${metric.color}-500`} />
                  <TrendingUp className={`w-4 h-4 ${metric.trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  {metric.unit}
                </div>
                <div className="text-sm text-gray-500 mt-1">{metric.label}</div>
                <div className={`text-xs mt-2 ${metric.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.trend > 0 ? '+' : ''}
                  {metric.trend}% from last hour
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Stream</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeAnalytics;
