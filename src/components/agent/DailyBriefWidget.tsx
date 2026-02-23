/**
 * DailyBriefWidget - Dashboard Widget for AI Daily Brief
 *
 * Shows:
 * - Quick summary of project activity
 * - Number of changes, new assets, messages
 * - "Ask Agent" button to open full panel
 *
 * Date: 2026-02-06
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FolderGit2,
  MessageSquare,
  Image,
  Bell,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useDailyBrief, useAgentPanel } from '@/hooks/useAgent';
import { cn } from '@/lib/utils';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('p-1.5 rounded-lg', color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

interface DailyBriefWidgetProps {
  className?: string;
}

export function DailyBriefWidget({ className }: DailyBriefWidgetProps) {
  const { brief, isLoading, error, refetch } = useDailyBrief();
  const { open } = useAgentPanel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-xl p-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Daily Brief</h3>
            <p className="text-xs text-slate-500">AI-powered summary</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh brief"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Stats Grid */}
      {brief?.stats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatItem
            icon={<FolderGit2 className="w-4 h-4 text-blue-400" aria-hidden="true" />}
            label="Project Updates"
            value={brief.stats.projectUpdates}
            color="bg-blue-500/20"
          />
          <StatItem
            icon={<MessageSquare className="w-4 h-4 text-green-400" aria-hidden="true" />}
            label="New Messages"
            value={brief.stats.newMessages}
            color="bg-green-500/20"
          />
          <StatItem
            icon={<Image className="w-4 h-4 text-purple-400" aria-hidden="true" />}
            label="New Assets"
            value={brief.stats.newAssets}
            color="bg-purple-500/20"
          />
          <StatItem
            icon={<Bell className="w-4 h-4 text-amber-400" aria-hidden="true" />}
            label="Notifications"
            value={brief.stats.notifications}
            color="bg-amber-500/20"
          />
        </div>
      )}

      {/* Brief Summary */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-400 py-4 text-center">
          Failed to load brief. Click refresh to try again.
        </div>
      ) : brief?.brief ? (
        <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
            {brief.brief}
          </p>
          {brief.generatedAt && (
            <p className="text-xs text-slate-500 mt-2">
              Generated {new Date(brief.generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500 py-4 text-center">
          No activity in the last 24 hours.
        </div>
      )}

      {/* Active Projects */}
      {brief?.activeProjectCount !== undefined && brief.activeProjectCount > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
          <span>{brief.activeProjectCount} active project{brief.activeProjectCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Ask Agent Button */}
      <button
        onClick={open}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-lg',
          'bg-indigo-600 hover:bg-indigo-500 text-white font-medium',
          'transition-colors'
        )}
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        Ask AI Assistant
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export default DailyBriefWidget;
