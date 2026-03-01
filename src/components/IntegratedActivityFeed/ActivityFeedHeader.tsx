import { Activity, Filter } from 'lucide-react';
import { CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { ActivityFilter } from './activity-feed-types';

interface FilterOption {
  value: ActivityFilter;
  label: string;
  count: number;
}

interface ActivityFeedHeaderProps {
  filter: ActivityFilter;
  setFilter: (filter: ActivityFilter) => void;
  showOnlyMyActivity: boolean;
  setShowOnlyMyActivity: (show: boolean) => void;
  filterOptions: FilterOption[];
}

export function ActivityFeedHeader({
  filter,
  setFilter,
  showOnlyMyActivity,
  setShowOnlyMyActivity,
  filterOptions,
}: ActivityFeedHeaderProps) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity size={20} aria-hidden="true" />
          Activity Feed
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={showOnlyMyActivity ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowOnlyMyActivity(!showOnlyMyActivity)}
          >
            My Activity
          </Button>
          <Button variant="outline" size="sm">
            <Filter size={14} className="mr-1" aria-hidden="true" />
            Filter
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 mt-3">
        {filterOptions.map(option => (
          <Button
            key={option.value}
            variant={filter === option.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter(option.value)}
            className="text-xs h-7"
          >
            {option.label}
            {option.count > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {option.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </CardHeader>
  );
}
