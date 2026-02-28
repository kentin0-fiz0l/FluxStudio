import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp } from 'lucide-react';

interface QuickStatsCardProps {
  activeProjectCount: string;
  openConversationCount: string;
  recentActivityCount: number;
}

export function QuickStatsCard({
  activeProjectCount,
  openConversationCount,
  recentActivityCount,
}: QuickStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} aria-hidden="true" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Projects</span>
            <Badge>{activeProjectCount}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Open Conversations</span>
            <Badge>{openConversationCount}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Recent Activities</span>
            <Badge>{recentActivityCount}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
