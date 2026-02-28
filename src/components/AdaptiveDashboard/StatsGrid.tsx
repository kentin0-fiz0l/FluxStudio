import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sparkles, Plus, MessageSquare, Zap } from 'lucide-react';
import { STATS_DATA, AUTOMATION_INSIGHTS } from './dashboard-constants';

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS_DATA.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-gray-600 mt-1">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AutomationInsightsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap size={20} aria-hidden="true" />
          Automation Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {AUTOMATION_INSIGHTS.map((insight) => (
            <div key={insight.label} className={`p-3 ${insight.bgColor} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{insight.label}</span>
                <Badge variant="secondary">{insight.badge}</Badge>
              </div>
              <div className={`w-full ${insight.barBg} rounded-full h-2`}>
                <div
                  className={`${insight.barFg} h-2 rounded-full`}
                  style={{ width: `${insight.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Sparkles size={48} className="mx-auto text-gray-400 mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to Flux Studio
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your creative workspace is ready. Start by creating a project or joining a conversation.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button>
            <Plus size={16} className="mr-2" aria-hidden="true" />
            Create Project
          </Button>
          <Button variant="outline">
            <MessageSquare size={16} className="mr-2" aria-hidden="true" />
            Start Conversation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
