import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface KPI {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'on-track' | 'at-risk' | 'critical';
}

export const KPITracker: React.FC = () => {
  const [kpis] = useState<KPI[]>([
    {
      id: '1',
      name: 'User Engagement',
      current: 87,
      target: 90,
      unit: '%',
      trend: 'up',
      status: 'on-track',
    },
    {
      id: '2',
      name: 'File Processing Speed',
      current: 2.3,
      target: 2.0,
      unit: 's',
      trend: 'down',
      status: 'at-risk',
    },
    {
      id: '3',
      name: 'AI Accuracy',
      current: 91,
      target: 85,
      unit: '%',
      trend: 'up',
      status: 'on-track',
    },
    {
      id: '4',
      name: 'Storage Efficiency',
      current: 73,
      target: 80,
      unit: '%',
      trend: 'stable',
      status: 'at-risk',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-700';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-700';
      case 'critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900">KPI Tracker</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{kpi.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">
                        {kpi.current}
                        {kpi.unit}
                      </span>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <Badge className={getStatusColor(kpi.status)}>{kpi.status}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Target: {kpi.target}{kpi.unit}</span>
                    <span className="font-medium">
                      {Math.round((kpi.current / kpi.target) * 100)}%
                    </span>
                  </div>
                  <Progress value={(kpi.current / kpi.target) * 100} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default KPITracker;
