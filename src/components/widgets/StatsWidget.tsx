import React from 'react';
import { useStatsData } from '../../hooks/useRealTimeData';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { WidgetProps } from './types';
import {
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  FolderOpen,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  delay: number;
}

function StatItem({ icon: Icon, label, value, color, delay }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">
            {value}
          </p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function StatsWidget(props: WidgetProps) {
  const { data: stats, isLoading, error, lastUpdated, refresh } = useStatsData();

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Overview Stats',
        description: 'Key metrics at a glance',
      }}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            {error ? (
              <span title={`Error: ${error}`}>
                <WifiOff className="h-3 w-3 text-red-400" />
              </span>
            ) : (
              <span title={`Last updated: ${lastUpdated?.toLocaleTimeString()}`}>
                <Wifi className="h-3 w-3 text-green-400" />
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh stats"
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <BarChart3 className="h-4 w-4 text-green-400" />
        </div>
      }
    >
      {/* Loading State — skeleton cards */}
      {isLoading && !stats && (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 w-9 h-9" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-16 bg-white/10 rounded" />
                  <div className="h-3 w-24 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          ))}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-28 bg-white/10 rounded" />
              <div className="h-4 w-10 bg-white/10 rounded" />
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !stats && (
        <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
          <WifiOff className="h-8 w-8 text-red-400 mb-2" aria-hidden="true" />
          <p className="text-red-400 text-sm font-medium">Connection Error</p>
          <p className="text-gray-400 text-xs mb-3">{error}</p>
          <Button
            size="sm"
            onClick={refresh}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats Content */}
      {(!error || stats) && (
        <div className="space-y-3">
          {stats ? (
            <div className="grid grid-cols-1 gap-3">
              <StatItem
                icon={FolderOpen}
                label="Total Projects"
                value={stats.totalProjects}
                color="bg-blue-500/20 text-blue-400"
                delay={0}
              />

              <StatItem
                icon={TrendingUp}
                label="Active Projects"
                value={stats.activeProjects}
                color="bg-green-500/20 text-green-400"
                delay={0.1}
              />

              <StatItem
                icon={CheckCircle}
                label="Completed This Month"
                value={stats.completedThisMonth}
                color="bg-purple-500/20 text-purple-400"
                delay={0.2}
              />

              <StatItem
                icon={Users}
                label="Team Members"
                value={stats.teamMembers}
                color="bg-orange-500/20 text-orange-400"
                delay={0.3}
              />

              {/* Progress Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">Average Progress</span>
                  <span className="text-sm text-white">{stats.avgProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.avgProgress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </motion.div>

              {/* Recent Activity Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{stats.recentActivity}</p>
                    <p className="text-xs text-gray-400">Recent activities today</p>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-8 w-8 text-gray-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No data available</h3>
              <p className="text-gray-400 text-sm">
                Stats will appear here once you start working on projects
              </p>
            </div>
          )}

          {/* Subtle loading indicator for updates */}
          {isLoading && stats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-2"
            >
              <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse" />
              <div className="ml-2 text-xs text-gray-400">Updating stats...</div>
            </motion.div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}