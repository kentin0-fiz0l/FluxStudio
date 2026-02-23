/**
 * Helper components for ProjectOverview page
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Folder,
  ChevronRight,
  HelpCircle,
  Activity,
  Target,
  Zap,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { cn } from '@/lib/utils';
import type { PulseTone, ClarityState } from './types';

// ============================================================================
// SectionHeader
// ============================================================================

export const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  action?: { label: string; href: string };
}> = ({ title, icon, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    {action && (
      <Link
        to={action.href}
        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
      >
        {action.label}
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    )}
  </div>
);

// ============================================================================
// EmptySection
// ============================================================================

export const EmptySection: React.FC<{
  message: string;
  icon?: React.ReactNode;
}> = ({ message, icon }) => (
  <div className="py-8 text-center text-gray-400">
    {icon && <div className="mb-2">{icon}</div>}
    <p className="text-sm">{message}</p>
  </div>
);

// ============================================================================
// SectionSkeleton
// ============================================================================

export const SectionSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
  </div>
);

// ============================================================================
// SnapshotPulseIndicator
// ============================================================================

export const SnapshotPulseIndicator: React.FC<{
  pulse: PulseTone;
  clarity: ClarityState;
}> = ({ pulse, clarity }) => {
  const pulseConfig = {
    calm: { icon: Activity, label: 'Steady pace', color: 'text-green-600' },
    neutral: { icon: Activity, label: 'Active', color: 'text-blue-600' },
    intense: { icon: Zap, label: 'High activity', color: 'text-orange-600' },
  };

  const clarityConfig = {
    focused: { icon: Target, label: 'Clear direction', color: 'text-green-600' },
    mixed: { icon: Target, label: 'Mixed signals', color: 'text-yellow-600' },
    uncertain: { icon: HelpCircle, label: 'Needs clarity', color: 'text-orange-600' },
  };

  const pulseInfo = pulseConfig[pulse];
  const clarityInfo = clarityConfig[clarity];
  const PulseIcon = pulseInfo.icon;
  const ClarityIcon = clarityInfo.icon;

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <PulseIcon className={cn('w-3.5 h-3.5', pulseInfo.color)} />
        <span>{pulseInfo.label}</span>
      </div>
      <span className="text-gray-300">|</span>
      <div className="flex items-center gap-1.5">
        <ClarityIcon className={cn('w-3.5 h-3.5', clarityInfo.color)} />
        <span>{clarityInfo.label}</span>
      </div>
    </div>
  );
};

// ============================================================================
// ProjectNotFound
// ============================================================================

export const ProjectNotFound: React.FC<{ projectId: string }> = ({ projectId: _projectId }) => (
  <DashboardLayout>
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-screen">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Project Not Found
        </h1>
        <p className="text-gray-500 mb-6">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Folder className="w-5 h-5" aria-hidden="true" />
          View All Projects
        </Link>
      </div>
    </div>
  </DashboardLayout>
);
