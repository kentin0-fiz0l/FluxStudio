/**
 * Adaptive Dashboard Component
 * Single dashboard that adapts to user role, context, and current workflow
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/slices/authSlice';
import { useWorkspace } from '@/store';
import { DashboardShell } from './DashboardShell';
import { IntegratedActivityFeed } from './IntegratedActivityFeed';

const DraggableWidgetGrid = lazy(() => import('./widgets/DraggableWidgetGrid').then(m => ({ default: m.DraggableWidgetGrid })));
const AIWorkflowAssistant = lazy(() => import('./workflows/AIWorkflowAssistant').then(m => ({ default: m.AIWorkflowAssistant })));
import { GettingStartedCard } from './common/GettingStartedCard';
import { useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { useProjects } from '../hooks/useProjects';
import { useMessaging } from '../hooks/useMessaging';
import { useFiles } from '../hooks/useFiles';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Sparkles,
  TrendingUp,
  MessageSquare,
  Folder,
  ArrowRight,
  Plus,
  Zap,
  Target,
  Puzzle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AdaptiveDashboard() {
  const { user } = useAuth();
  const { state, actions } = useWorkspace();
  const navigate = useNavigate();

  // Data hooks for first-time experience detection
  const { projects } = useProjects();
  const { conversations } = useMessaging();
  const { files } = useFiles();

  // First-time experience hook
  const {
    isFirstTime,
    steps,
    completedCount,
    totalSteps,
    dismiss,
    markStepComplete,
    updateData,
  } = useFirstTimeExperience();

  // State for expanding advanced sections (de-emphasized for first-time users)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update first-time experience data when data loads
  useEffect(() => {
    updateData({
      projectCount: projects?.length ?? 0,
      conversationCount: conversations?.length ?? 0,
      fileCount: files?.length ?? 0,
    });
  }, [projects, conversations, files, updateData]);

  // Adaptive layout based on current context and user role
  // Note: getDashboardLayout is available for future widget customization
  // const getDashboardLayout = () => { ... };

  const getWelcomeMessage = () => {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' :
                     new Date().getHours() < 17 ? 'afternoon' : 'evening';

    const contextMessages = {
      dashboard: `Good ${timeOfDay}, ${user?.name}! Ready to create something amazing?`,
      project: `Working on ${state.activeProject?.name}`,
      conversation: `Discussing: ${state.activeConversation?.name}`,
      organization: `Managing ${state.activeOrganization?.name}`,
      team: `Collaborating with ${state.activeTeam?.name}`
    };

    return contextMessages[state.currentContext] || contextMessages.dashboard;
  };

  const getContextualCards = () => {
    const cards = [];

    // Integration CTA Card - Always show at the top to encourage setup
    cards.push({
      id: 'integrations-cta',
      title: 'Connect Your Tools',
      description: 'Unlock powerful workflows with Figma, Slack, and GitHub integrations',
      icon: Puzzle,
      action: () => navigate('/settings'),
      badge: '3 available',
      color: 'blue'
    });

    // Show project card if in project context
    if (state.activeProject) {
      cards.push({
        id: 'current-project',
        title: state.activeProject.name,
        description: state.activeProject.description || 'Active project',
        icon: Folder,
        action: () => actions.setContext('project'),
        badge: state.activeProject.status,
        color: 'blue'
      });
    }

    // Show conversation card if active
    if (state.activeConversation) {
      cards.push({
        id: 'current-conversation',
        title: state.activeConversation.name,
        description: `${(state.activeConversation as { participants?: unknown[] }).participants?.length || 0} participants`,
        icon: MessageSquare,
        action: () => actions.setContext('conversation'),
        badge: `${(state.activeConversation as { unreadCount?: number }).unreadCount || 0} unread`,
        color: 'green'
      });
    }

    // Show workflow card if active
    if (state.currentWorkflow) {
      cards.push({
        id: 'current-workflow',
        title: state.currentWorkflow.title,
        description: state.currentWorkflow.description,
        icon: Target,
        action: () => {},
        badge: state.currentWorkflow.completed ? 'Completed' : 'In Progress',
        color: 'purple'
      });
    }

    // Show suggestions
    const topSuggestions = (actions.getContextualActions() || []).slice(0, 3);
    topSuggestions.forEach((suggestion, index) => {
      cards.push({
        id: `suggestion-${index}`,
        title: suggestion.title,
        description: suggestion.description,
        icon: suggestion.type === 'action' ? Zap : suggestion.type === 'workflow' ? Target : ArrowRight,
        action: suggestion.action,
        badge: suggestion.priority,
        color: suggestion.priority === 'high' ? 'red' : suggestion.priority === 'medium' ? 'orange' : 'gray'
      });
    });

    return cards;
  };

  const contextualCards = getContextualCards();

  return (
    <>
      <DashboardShell>
        <Suspense fallback={<div className="flex-1 p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4" /><div className="h-64 bg-gray-100 rounded" /></div>}>
        <div className="flex-1 space-y-6 p-6">
        {/* Welcome Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getWelcomeMessage()}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {state.currentContext}
              </Badge>
              <Badge variant="outline">
                {state.currentMode}
              </Badge>
              {state.activeOrganization && (
                <Badge variant="secondary">
                  {state.activeOrganization.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={actions.openCommandPalette}
              className="hidden sm:flex"
              aria-label="Open quick actions menu"
            >
              <Sparkles size={16} className="mr-2" aria-hidden="true" />
              Quick Actions
            </Button>
            <Button aria-label="Create new project">
              <Plus size={16} className="mr-2" aria-hidden="true" />
              New Project
            </Button>
          </div>
        </header>

        {/* Getting Started Card (First-time users only) */}
        {isFirstTime && (
          <GettingStartedCard
            steps={steps}
            completedCount={completedCount}
            totalSteps={totalSteps}
            onDismiss={dismiss}
            onStepComplete={markStepComplete}
          />
        )}

        {/* Advanced sections - de-emphasized for first-time users */}
        {isFirstTime ? (
          <div className="space-y-4">
            {/* Explore More expander */}
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

                {/* Contextual Overview Cards */}
                {contextualCards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
                    {contextualCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <Card
                          key={card.id}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
                            card.color === 'blue' && "border-l-blue-500",
                            card.color === 'green' && "border-l-green-500",
                            card.color === 'purple' && "border-l-purple-500",
                            card.color === 'red' && "border-l-red-500",
                            card.color === 'orange' && "border-l-orange-500",
                            card.color === 'gray' && "border-l-gray-500"
                          )}
                          onClick={card.action}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon size={20} className="text-gray-600" aria-hidden="true" />
                                <CardTitle className="text-sm font-medium">
                                  {card.title}
                                </CardTitle>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {card.badge}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-gray-600">{card.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Workflow Section with Tabs - wrapped in Card */}
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
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <TrendingUp size={20} aria-hidden="true" />
                                  Quick Stats
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Active Projects</span>
                                    <Badge>{state.activeProject ? '1' : '0'}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Open Conversations</span>
                                    <Badge>{state.activeConversation ? '1' : '0'}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Recent Activities</span>
                                    <Badge>{state.recentActivity.length}</Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
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
            {/* Contextual Overview Cards */}
            {contextualCards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contextualCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card
                      key={card.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
                        card.color === 'blue' && "border-l-blue-500",
                        card.color === 'green' && "border-l-green-500",
                        card.color === 'purple' && "border-l-purple-500",
                        card.color === 'red' && "border-l-red-500",
                        card.color === 'orange' && "border-l-orange-500",
                        card.color === 'gray' && "border-l-gray-500"
                      )}
                      onClick={card.action}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon size={20} className="text-gray-600" aria-hidden="true" />
                            <CardTitle className="text-sm font-medium">
                              {card.title}
                            </CardTitle>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            {card.badge}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600">
                          {card.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Workflow Section with Tabs */}
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp size={20} aria-hidden="true" />
                          Quick Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Active Projects</span>
                            <Badge>{state.activeProject ? '1' : '0'}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Open Conversations</span>
                            <Badge>{state.activeConversation ? '1' : '0'}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Recent Activities</span>
                            <Badge>{state.recentActivity.length}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workflows" className="mt-6">
                <p className="text-sm text-neutral-500">Workflow templates coming soon.</p>
              </TabsContent>

              <TabsContent value="assistant" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AIWorkflowAssistant />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap size={20} aria-hidden="true" />
                        Automation Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Time Saved This Week</span>
                            <Badge variant="secondary">2.5 hours</Badge>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }} />
                          </div>
                        </div>

                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Tasks Automated</span>
                            <Badge variant="secondary">18</Badge>
                          </div>
                          <div className="w-full bg-green-100 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }} />
                          </div>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Workflow Efficiency</span>
                            <Badge variant="secondary">84%</Badge>
                          </div>
                          <div className="w-full bg-purple-100 rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '84%' }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-gray-600 mt-1">+2 this week</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">5</div>
                      <p className="text-xs text-gray-600 mt-1">3 automated</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">8</div>
                      <p className="text-xs text-gray-600 mt-1">All active</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">92%</div>
                      <p className="text-xs text-gray-600 mt-1">Above target</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </>
        )}

        {/* Adaptive Widget Grid */}
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

        {/* Empty State */}
        {state.recentActivity.length === 0 && contextualCards.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles size={48} className="mx-auto text-gray-400 mb-4" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to Flux Studio
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your creative workspace is ready. Start by creating a project or joining a conversation.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button>
                  <Plus size={16} className="mr-2" aria-hidden="true" />
                  Create Project
                </Button>
                <Button variant="outline">
                  <MessageSquare size={16} className="mr-2" aria-hidden="true" />
                  Start Conversation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
        </Suspense>
      </DashboardShell>
    </>
  );
}

export default AdaptiveDashboard;