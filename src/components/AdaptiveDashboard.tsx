/**
 * Adaptive Dashboard Component
 * Single dashboard that adapts to user role, context, and current workflow
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { DashboardShell } from './DashboardShell';
import { DraggableWidgetGrid } from './widgets/DraggableWidgetGrid';
import { EnhancedCommandPalette } from './EnhancedCommandPalette';
import { IntegratedActivityFeed } from './IntegratedActivityFeed';
import { SmartTemplates } from './workflows/SmartTemplates';
import { AIWorkflowAssistant } from './workflows/AIWorkflowAssistant';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Sparkles,
  TrendingUp,
  Users,
  MessageSquare,
  Folder,
  Clock,
  ArrowRight,
  Plus,
  Zap,
  Target,
  Activity,
  Puzzle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AdaptiveDashboard() {
  const { user } = useAuth();
  const { state, actions } = useWorkspace();
  const navigate = useNavigate();

  // Adaptive layout based on current context and user role
  const getDashboardLayout = () => {
    const baseWidgets = [
      'search',
      'quick-actions',
      'recent-activity',
      'notifications'
    ];

    const roleSpecificWidgets = {
      client: ['project-overview', 'messages', 'design-review'],
      designer: ['project-overview', 'messages', 'design-tools', 'activity'],
      admin: ['stats', 'organization-overview', 'users', 'project-communication']
    };

    const contextSpecificWidgets = {
      project: ['project-details', 'project-messages', 'project-files', 'project-timeline'],
      conversation: ['conversation-details', 'related-projects', 'participants'],
      organization: ['org-overview', 'teams', 'projects', 'members']
    };

    let widgets = [...baseWidgets];

    // Add role-specific widgets
    if (user?.userType && roleSpecificWidgets[user.userType]) {
      widgets.push(...roleSpecificWidgets[user.userType]);
    }

    // Add context-specific widgets
    if (contextSpecificWidgets[state.currentContext]) {
      widgets.push(...contextSpecificWidgets[state.currentContext]);
    }

    return widgets;
  };

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
        description: `${state.activeConversation.participants?.length || 0} participants`,
        icon: MessageSquare,
        action: () => actions.setContext('conversation'),
        badge: `${state.activeConversation.unreadCount || 0} unread`,
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
    const topSuggestions = actions.getContextualActions().slice(0, 3);
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
      <EnhancedCommandPalette />
      <DashboardShell>
        <div className="flex-1 space-y-6 p-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
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
            >
              <Sparkles size={16} className="mr-2" />
              Quick Actions
            </Button>
            <Button>
              <Plus size={16} className="mr-2" />
              New Project
            </Button>
          </div>
        </div>

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
                        <Icon size={20} className="text-gray-600" />
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
                          <TrendingUp size={20} />
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
                <SmartTemplates />
              </TabsContent>

              <TabsContent value="assistant" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AIWorkflowAssistant />
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap size={20} />
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

        {/* Adaptive Widget Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DraggableWidgetGrid
              availableWidgets={getDashboardLayout()}
              context={state.currentContext}
              userRole={user?.userType || 'client'}
            />
          </CardContent>
        </Card>

        {/* Empty State */}
        {state.recentActivity.length === 0 && contextualCards.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to Flux Studio
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your creative workspace is ready. Start by creating a project or joining a conversation.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button>
                  <Plus size={16} className="mr-2" />
                  Create Project
                </Button>
                <Button variant="outline">
                  <MessageSquare size={16} className="mr-2" />
                  Start Conversation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </DashboardShell>
    </>
  );
}

export default AdaptiveDashboard;