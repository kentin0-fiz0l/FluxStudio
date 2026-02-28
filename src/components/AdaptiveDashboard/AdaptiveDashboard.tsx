/**
 * Adaptive Dashboard Component
 * Single dashboard that adapts to user role, context, and current workflow
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/slices/authSlice';
import { useWorkspace } from '@/store';
import { DashboardShell } from '../DashboardShell';
import { IntegratedActivityFeed } from '../IntegratedActivityFeed';

const DraggableWidgetGrid = lazy(() => import('../widgets/DraggableWidgetGrid').then(m => ({ default: m.DraggableWidgetGrid })));
const AIWorkflowAssistant = lazy(() => import('../workflows/AIWorkflowAssistant').then(m => ({ default: m.AIWorkflowAssistant })));
import { GettingStartedCard } from '../common/GettingStartedCard';
import { useFirstTimeExperience } from '../../hooks/useFirstTimeExperience';
import { useProjects } from '../../hooks/useProjects';
import { useMessaging } from '../../hooks/useMessaging';
import { useFiles } from '../../hooks/useFiles';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

import { getWelcomeMessage, getContextualCards } from './dashboard-utils';
import { WelcomeHeader } from './WelcomeHeader';
import { ContextualCardsGrid } from './ContextualCardsGrid';
import { QuickStatsCard } from './QuickStatsCard';
import { StatsGrid, AutomationInsightsCard, EmptyState } from './StatsGrid';

export function AdaptiveDashboard() {
  const { user } = useAuth();
  const { state, actions } = useWorkspace();
  const navigate = useNavigate();

  const { projects } = useProjects();
  const { conversations } = useMessaging();
  const { files } = useFiles();

  const {
    isFirstTime,
    steps,
    completedCount,
    totalSteps,
    dismiss,
    markStepComplete,
    updateData,
  } = useFirstTimeExperience();

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    updateData({
      projectCount: projects?.length ?? 0,
      conversationCount: conversations?.length ?? 0,
      fileCount: files?.length ?? 0,
    });
  }, [projects, conversations, files, updateData]);

  const contextualCards = getContextualCards(state, actions, navigate);
  const welcomeMessage = getWelcomeMessage(user?.name, state.currentContext, state);

  return (
    <>
      <DashboardShell>
        <Suspense fallback={<div className="flex-1 p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /><div className="h-64 bg-gray-100 rounded" /></div>}>
        <div className="flex-1 space-y-6 p-6">
        <WelcomeHeader
          welcomeMessage={welcomeMessage}
          currentContext={state.currentContext}
          currentMode={state.currentMode}
          organizationName={state.activeOrganization?.name}
          onOpenCommandPalette={actions.openCommandPalette}
        />

        {isFirstTime && (
          <GettingStartedCard
            steps={steps}
            completedCount={completedCount}
            totalSteps={totalSteps}
            onDismiss={dismiss}
            onStepComplete={markStepComplete}
          />
        )}

        {isFirstTime ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[44px]"
              aria-expanded={showAdvanced}
              aria-controls="advanced-content"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Explore more
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  — activity, workflows, stats, and automations
                </span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              )}
            </button>

            {showAdvanced && (
              <div id="advanced-content" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  You can explore these anytime — focus on your first project for now.
                </p>

                <ContextualCardsGrid cards={contextualCards} className="opacity-90" />

                <Card>
                  <CardContent className="p-6">
                    <Tabs defaultValue="activity" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="workflows">Workflows</TabsTrigger>
                        <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
                        <TabsTrigger value="stats">Stats</TabsTrigger>
                      </TabsList>

                      <TabsContent value="activity" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <IntegratedActivityFeed />
                          </div>
                          <div>
                            <QuickStatsCard
                              activeProjectCount={state.activeProject ? '1' : '0'}
                              openConversationCount={state.activeConversation ? '1' : '0'}
                              recentActivityCount={state.recentActivity.length}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="workflows" className="mt-6">
                        <p className="text-sm text-neutral-500">Workflow templates coming soon.</p>
                      </TabsContent>

                      <TabsContent value="assistant" className="mt-6">
                        <AIWorkflowAssistant />
                      </TabsContent>

                      <TabsContent value="stats" className="mt-6">
                        <p className="text-sm text-neutral-500">Stats will populate as you work on projects.</p>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <>
            <ContextualCardsGrid cards={contextualCards} />

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="activity" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="workflows">Workflows</TabsTrigger>
                    <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>

                  <TabsContent value="activity" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <IntegratedActivityFeed />
                      </div>
                      <div>
                        <QuickStatsCard
                          activeProjectCount={state.activeProject ? '1' : '0'}
                          openConversationCount={state.activeConversation ? '1' : '0'}
                          recentActivityCount={state.recentActivity.length}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="workflows" className="mt-6">
                    <p className="text-sm text-neutral-500">Workflow templates coming soon.</p>
                  </TabsContent>

                  <TabsContent value="assistant" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AIWorkflowAssistant />
                      <AutomationInsightsCard />
                    </div>
                  </TabsContent>

                  <TabsContent value="stats" className="mt-6">
                    <StatsGrid />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} aria-hidden="true" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DraggableWidgetGrid />
          </CardContent>
        </Card>

        {state.recentActivity.length === 0 && contextualCards.length === 0 && (
          <EmptyState />
        )}
        </div>
        </Suspense>
      </DashboardShell>
    </>
  );
}

export default AdaptiveDashboard;
