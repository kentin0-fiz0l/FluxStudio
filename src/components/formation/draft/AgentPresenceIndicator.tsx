/**
 * AgentPresenceIndicator - Shows the Formation Draft Agent as a collaborator
 *
 * Detects `user.id === 'system-formation-agent'` in the Yjs awareness state
 * and renders a bot icon with status text instead of a normal avatar.
 *
 * Date: 2026-02-21
 */

import React from 'react';
import { Bot, Loader2, Check, Pause, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

export const AGENT_USER_ID = 'system-formation-agent';

interface AgentPresenceIndicatorProps {
  agentStatus?: string;
  agentMessage?: string;
  className?: string;
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; pulse: boolean }> = {
  connecting: { icon: Loader2, color: 'text-yellow-500', pulse: true },
  generating: { icon: Bot, color: 'text-amber-500', pulse: true },
  placing: { icon: Bot, color: 'text-amber-500', pulse: true },
  smoothing: { icon: Bot, color: 'text-blue-500', pulse: true },
  done: { icon: Check, color: 'text-green-500', pulse: false },
  paused: { icon: Pause, color: 'text-gray-400', pulse: false },
  error: { icon: AlertCircle, color: 'text-red-500', pulse: false },
};

// ============================================================================
// Component
// ============================================================================

export function AgentPresenceIndicator({
  agentStatus = 'connecting',
  agentMessage = '',
  className = '',
}: AgentPresenceIndicatorProps) {
  const config = STATUS_CONFIG[agentStatus] || STATUS_CONFIG.connecting;
  const isAnimating = agentStatus === 'connecting' || agentStatus === 'generating' || agentStatus === 'placing' || agentStatus === 'smoothing';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`relative flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ${className}`}
          >
            <div className="relative">
              <div
                className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
              >
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              {config.pulse && (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
              )}
            </div>
            <span className={`text-xs font-medium ${config.color} max-w-[120px] truncate`}>
              {agentMessage || agentStatus}
            </span>
            {isAnimating && (
              <Loader2 className="w-3 h-3 text-amber-500 animate-spin flex-shrink-0" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-sm">
            <p className="font-medium">Draft Agent</p>
            <p className="text-xs text-gray-400">{agentMessage || 'AI Formation Generator'}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Check if a collaborator awareness state belongs to the formation draft agent
 */
export function isAgentCollaborator(userId: string): boolean {
  return userId === AGENT_USER_ID;
}
