/**
 * ResumeCard - Resume working context with one click
 *
 * Shows the user's last working context for the active project
 * and provides a one-click resume button to restore it.
 *
 * Part of Work Momentum: "Pick up exactly where you left off."
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, FileText, MessageSquare, Image, Layout, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useWorkingContext } from '@/store';
import type { LastEntity } from '@/store';
import { IntentNoteInline } from './IntentNoteInline';

export interface ResumeCardProps {
  /** Callback when user resumes (to close panel, etc.) */
  onResume?: () => void;
  /** Callback when user dismisses the card */
  onDismiss?: () => void;
  /** Custom className */
  className?: string;
  /** Compact mode (for smaller spaces) */
  compact?: boolean;
}

/**
 * Get human-readable description of last entity.
 */
function getEntityDescription(entity: LastEntity): { text: string; icon: React.ReactNode } | null {
  if (entity.conversationId) {
    return {
      text: entity.messageId ? 'message in conversation' : 'conversation',
      icon: <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />,
    };
  }
  if (entity.fileId) {
    return { text: 'file', icon: <FileText className="h-3.5 w-3.5" aria-hidden="true" /> };
  }
  if (entity.assetId) {
    return { text: 'asset', icon: <Image className="h-3.5 w-3.5" aria-hidden="true" /> };
  }
  if (entity.boardId) {
    return { text: 'design board', icon: <Layout className="h-3.5 w-3.5" aria-hidden="true" /> };
  }
  return null;
}

/**
 * Get human-readable route name.
 */
function getRouteName(route: string): string {
  if (route.startsWith('/messages')) return 'Messages';
  if (route.startsWith('/boards/')) return 'Design Board';
  if (route.startsWith('/file')) return 'Files';
  if (route.startsWith('/assets')) return 'Assets';
  if (route.startsWith('/tools/metmap')) return 'MetMap';
  if (route.startsWith('/tools/files')) return 'Files Tool';
  if (route.startsWith('/tools/assets')) return 'Assets Tool';
  if (route.startsWith('/tools')) return 'Tools';
  if (route.startsWith('/projects/')) return 'Project';
  return 'Your work';
}

/**
 * Format time since last seen.
 */
function formatTimeSince(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function ResumeCard({
  onResume,
  onDismiss,
  className,
  compact = false,
}: ResumeCardProps) {
  const navigate = useNavigate();
  const { workingContext, hasResumableContext, clearWorkingContext } = useWorkingContext();

  // Don't render if no resumable context
  if (!hasResumableContext || !workingContext) {
    return null;
  }

  const routeName = getRouteName(workingContext.lastRoute);
  const entityInfo = getEntityDescription(workingContext.lastEntity);
  const timeSince = formatTimeSince(workingContext.lastSeenAt);

  const handleResume = () => {
    navigate(workingContext.lastRoute);
    onResume?.();
  };

  const handleDismiss = () => {
    clearWorkingContext();
    onDismiss?.();
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'bg-amber-50 dark:bg-amber-900/20',
          'border-b border-amber-200 dark:border-amber-800',
          className
        )}
      >
        <Play className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <button
          onClick={handleResume}
          className="flex-1 text-left text-sm text-amber-700 dark:text-amber-300 hover:underline"
        >
          Resume: {routeName}
        </button>
        <button
          onClick={handleDismiss}
          className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
          aria-label="Dismiss resume suggestion"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'px-4 py-3',
        'bg-gradient-to-r from-amber-50 to-orange-50',
        'dark:from-amber-900/20 dark:to-orange-900/20',
        'border-b border-amber-200 dark:border-amber-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Play className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Pick up where you left off</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-0.5"
          aria-label="Dismiss resume suggestion"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Context info */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">{routeName}</span>
          {entityInfo && (
            <>
              <span className="text-amber-500">·</span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                {entityInfo.icon}
                {entityInfo.text}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{timeSince}</span>
        </div>
      </div>

      {/* Intent note (if any) */}
      {workingContext.intentNote && (
        <div className="mb-3 p-2 bg-white/50 dark:bg-black/20 rounded text-sm text-amber-800 dark:text-amber-200 italic">
          "{workingContext.intentNote}"
        </div>
      )}

      {/* Resume button */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleResume}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
      >
        <Play className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Resume
      </Button>

      {/* Intent note input */}
      <IntentNoteInline className="mt-2" />
    </div>
  );
}

export default ResumeCard;
