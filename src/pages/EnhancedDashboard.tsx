import React from 'react';
import { DashboardShell } from '../components/DashboardShell';
import { RealTimeMetrics } from '../components/dashboard/RealTimeMetrics';
import { NotificationCenter } from '../components/dashboard/NotificationCenter';
import { CustomizableWidgets } from '../components/dashboard/CustomizableWidgets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  Grid3x3,
  Sparkles
} from 'lucide-react';

export function EnhancedDashboard() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardShell>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              {getGreeting()}, {user?.name}!
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your projects today
            </p>
          </div>

          {/* Notification Center */}
          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="widgets" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">Widgets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Quick overview combining widgets and some metrics */}
            <CustomizableWidgets />
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <RealTimeMetrics />
          </TabsContent>

          <TabsContent value="widgets" className="mt-6">
            <CustomizableWidgets />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
