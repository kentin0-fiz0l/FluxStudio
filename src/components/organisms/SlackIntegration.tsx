/**
 * SlackIntegration Component
 * Slack-specific integration with multi-workspace support
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Hash, Loader2, RefreshCw, Users } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { Button } from '@/components/ui/button';
import type { Integration, SlackIntegration as SlackIntegrationType, SlackWorkspace } from '@/types/integrations';
import { integrationService } from '@/services/integrationService';

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
}

export function SlackIntegration() {
  const [integration, setIntegration] = useState<SlackIntegrationType | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  const loadSlackChannels = async (teamId?: string) => {
    setIsLoadingChannels(true);
    setChannelsError(null);

    try {
      const slackChannels = await integrationService.getSlackChannels(teamId);
      setChannels(slackChannels);
    } catch (error: any) {
      console.error('Failed to load Slack channels:', error);
      setChannelsError(error.message || 'Failed to load Slack channels');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleSuccess = async (integrationData: Integration) => {
    const slackIntegration = integrationData as SlackIntegrationType;
    setIntegration(slackIntegration);

    // Auto-select first workspace
    if (slackIntegration.metadata?.workspaces?.length > 0) {
      const firstWorkspace = slackIntegration.metadata.workspaces[0];
      setSelectedWorkspace(firstWorkspace.teamId);
      loadSlackChannels(firstWorkspace.teamId);
    }
  };

  const handleWorkspaceSelect = (teamId: string) => {
    setSelectedWorkspace(teamId);
    loadSlackChannels(teamId);
  };

  const workspaces = integration?.metadata?.workspaces || [];
  const selectedWorkspaceData = workspaces.find(w => w.teamId === selectedWorkspace);

  return (
    <IntegrationCard
      provider="slack"
      onSuccess={handleSuccess}
    >
      {/* Workspaces Section (only shown when connected) */}
      {workspaces.length > 0 && (
        <div className="space-y-3">
          {/* Workspace selector (if multiple workspaces) */}
          {workspaces.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Workspaces ({workspaces.length})
              </h4>
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.teamId}
                    onClick={() => handleWorkspaceSelect(workspace.teamId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedWorkspace === workspace.teamId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-600'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent'
                    }`}
                  >
                    {workspace.teamIcon ? (
                      <img
                        src={workspace.teamIcon}
                        alt={workspace.teamName}
                        className="w-10 h-10 rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-secondary-100 dark:bg-secondary-900/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {workspace.teamName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {workspace.teamDomain}.slack.com
                      </p>
                    </div>
                    {workspace.lastUsed && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Last used {new Date(workspace.lastUsed).toLocaleDateString()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single workspace display */}
          {workspaces.length === 1 && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              {workspaces[0].teamIcon ? (
                <img
                  src={workspaces[0].teamIcon}
                  alt={workspaces[0].teamName}
                  className="w-10 h-10 rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-secondary-100 dark:bg-secondary-900/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {workspaces[0].teamName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {workspaces[0].teamDomain}.slack.com
                </p>
              </div>
            </div>
          )}

          {/* Channels Section */}
          {selectedWorkspaceData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Channels
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadSlackChannels(selectedWorkspace || undefined)}
                  disabled={isLoadingChannels}
                  icon={<RefreshCw className={`h-4 w-4 ${isLoadingChannels ? 'animate-spin' : ''}`} />}
                  aria-label="Refresh Slack channels"
                >
                  Refresh
                </Button>
              </div>

              {isLoadingChannels && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              )}

              {channelsError && (
                <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded text-sm text-error-700 dark:text-error-300">
                  {channelsError}
                </div>
              )}

              {!isLoadingChannels && !channelsError && channels.length === 0 && (
                <div className="text-center py-8 text-sm text-neutral-500">
                  <Hash className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
                  <p>No channels found</p>
                  <p className="text-xs mt-1">Join channels in Slack to see them here</p>
                </div>
              )}

              {!isLoadingChannels && !channelsError && channels.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {channels.slice(0, 10).map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded text-sm"
                    >
                      <Hash className="h-4 w-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                      <span className="flex-1 text-neutral-900 dark:text-neutral-100 truncate">
                        {channel.name}
                      </span>
                      {channel.is_private && (
                        <span className="text-xs text-neutral-500 bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded">
                          Private
                        </span>
                      )}
                      {channel.num_members && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {channel.num_members}
                        </span>
                      )}
                    </div>
                  ))}
                  {channels.length > 10 && (
                    <p className="text-xs text-center text-neutral-500 pt-2">
                      and {channels.length - 10} more channel{channels.length - 10 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional workspace limit notice */}
          {workspaces.length >= 5 && (
            <div className="p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded text-xs text-warning-900 dark:text-warning-100">
              You've connected the maximum of 5 Slack workspaces. To add more, disconnect an existing workspace first.
            </div>
          )}
        </div>
      )}
    </IntegrationCard>
  );
}
