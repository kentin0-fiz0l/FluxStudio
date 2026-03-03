import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendsPanelProps {
  uploadTrend: { date: string; count: number }[];
}

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ uploadTrend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Trends</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={uploadTrend}>
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
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
