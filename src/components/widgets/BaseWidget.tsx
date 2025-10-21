import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  MoreVertical,
  RefreshCw,
  Settings,
  Trash2,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { WidgetProps } from './types';
import { cn } from '../ui/utils';

interface BaseWidgetProps extends WidgetProps {
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  className?: string;
  headerAction?: React.ReactNode;
}

export function BaseWidget({
  config,
  children,
  isLoading = false,
  error,
  className,
  headerAction,
  onRefresh,
  onConfigChange,
  onRemove,
}: BaseWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      overview: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      projects: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      collaboration: 'bg-green-500/20 text-green-400 border-green-500/30',
      analytics: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      tools: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      notifications: 'bg-red-500/20 text-red-400 border-red-500/30',
      organizations: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      files: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      messages: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
    return colors[category as keyof typeof colors] || colors.overview;
  };

  return (
    <Card
      className={cn(
        'backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10',
        isExpanded && 'fixed inset-4 z-50 bg-background/95',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="widget-drag-handle cursor-move p-1 hover:bg-white/10 rounded transition-colors">
              <GripVertical className="h-4 w-4 text-white/50" />
            </div>
            <CardTitle className="text-white text-lg">{config.title}</CardTitle>
            <Badge className={getCategoryColor(config.category)}>
              {config.category}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {headerAction}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? (
                    <>
                      <Minimize2 className="mr-2 h-4 w-4" />
                      Minimize
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Expand
                    </>
                  )}
                </DropdownMenuItem>
                {onConfigChange && (
                  <DropdownMenuItem onClick={() => {/* Open settings modal */}}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onRemove && (
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Widget
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {config.description && (
          <CardDescription className="text-gray-400">
            {config.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="flex items-center justify-center p-8 text-red-400">
            <div className="text-center">
              <p className="mb-2">Error loading widget</p>
              <p className="text-sm text-gray-400">{error}</p>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2 text-white/70">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}