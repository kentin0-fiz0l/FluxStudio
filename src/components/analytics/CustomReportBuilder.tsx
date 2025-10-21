import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Download,
  Share2,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  Save,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ReportWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text';
  title: string;
  config: any;
}

interface Report {
  id: string;
  name: string;
  description: string;
  widgets: ReportWidget[];
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
}

export const CustomReportBuilder: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      name: 'Weekly Performance Report',
      description: 'Team productivity and file management metrics',
      widgets: [],
      schedule: 'weekly',
      recipients: ['team@example.com'],
    },
  ]);

  const [selectedReport, setSelectedReport] = useState<string | null>(reports[0]?.id || null);

  const widgetTypes = [
    { type: 'metric', icon: TrendingUp, label: 'Metric Card', color: 'blue' },
    { type: 'chart', icon: BarChart3, label: 'Bar Chart', color: 'green' },
    { type: 'table', icon: FileText, label: 'Data Table', color: 'purple' },
    { type: 'text', icon: FileText, label: 'Text Block', color: 'gray' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Report Builder</h2>
          <p className="text-sm text-gray-500 mt-1">Create and schedule automated reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {widgetTypes.map((widget, index) => (
          <motion.div
            key={widget.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <widget.icon className={`w-8 h-8 mx-auto mb-3 text-${widget.color}-500`} />
                <h3 className="font-medium text-gray-900">{widget.label}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{report.schedule}</Badge>
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-1" />
                    Run Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReportBuilder;
