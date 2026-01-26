/**
 * Workflow Automation Panel
 * Interface for managing automated workflows and triggers
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Settings,
  Plus,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Bot,
  Lightbulb,
  Timer,
  Target,
  MessageSquare,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  workflowAutomationService,
  WorkflowTrigger,
  AutomationSuggestion
} from '../../services/workflowAutomationService';
import { Message, Conversation, MessageUser } from '../../types/messaging';
import { WorkflowContext } from '../../services/workflowEngine';

interface WorkflowAutomationPanelProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: MessageUser;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

export function WorkflowAutomationPanel({
  conversation,
  messages,
  currentUser,
  isVisible,
  onToggleVisibility,
  className = ''
}: WorkflowAutomationPanelProps) {
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [activeTriggers, setActiveTriggers] = useState<WorkflowTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [_expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['suggestions']));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      loadAutomationData();
    }
  }, [isVisible, conversation.id, messages.length]);

  const loadAutomationData = async () => {
    setIsLoading(true);
    try {
      const context: WorkflowContext = {
        conversation,
        recentMessages: messages.slice(-20), // Last 20 messages
        currentUser
      };

      const [suggestionData, triggerData, analyticsData] = await Promise.all([
        workflowAutomationService.generateWorkflowSuggestions(context),
        workflowAutomationService.getActiveTriggers(),
        workflowAutomationService.getAutomationAnalytics()
      ]);

      setSuggestions(suggestionData);
      setActiveTriggers(triggerData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load automation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const _toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleToggleTrigger = async (triggerId: string, enabled: boolean) => {
    const success = workflowAutomationService.updateTriggerStatus(triggerId, enabled);
    if (success) {
      setActiveTriggers(prev =>
        prev.map(trigger =>
          trigger.id === triggerId ? { ...trigger, enabled } : trigger
        )
      );
    }
  };

  const handleCreateAutomation = async (suggestion: AutomationSuggestion) => {
    try {
      // Convert suggestion to trigger (simplified)
      const triggerTemplate = workflowAutomationService.getAutomationTemplates()
        .find(template => template.name?.toLowerCase().includes(suggestion.title.toLowerCase()));

      if (triggerTemplate) {
        const newTrigger = await workflowAutomationService.setupTrigger(conversation.id, triggerTemplate);
        setActiveTriggers(prev => [...prev, newTrigger]);

        // Remove suggestion from list
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      }
    } catch (error) {
      console.error('Failed to create automation:', error);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'time_saving': return <Timer className="w-4 h-4" />;
      case 'quality_improvement': return <Target className="w-4 h-4" />;
      case 'communication_enhancement': return <MessageSquare className="w-4 h-4" />;
      case 'project_tracking': return <BarChart3 className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleVisibility}
        className={`fixed right-4 bottom-20 z-50 ${className}`}
      >
        <Bot className="w-4 h-4 mr-2" />
        Automation
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`fixed right-0 bottom-0 h-2/3 w-96 bg-white border-l border-t border-gray-200 shadow-2xl z-50 overflow-hidden ${className}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Workflow Automation</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAutomationData}
                disabled={isLoading}
              >
                <Settings className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVisibility}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {analytics && (
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>{analytics.activeTriggers} active</span>
              <span>•</span>
              <span>{analytics.successRate.toFixed(0)}% success rate</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="w-8 h-8 animate-pulse text-purple-500 mx-auto mb-2" />
                <p className="text-gray-600">Loading automations...</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <div className="px-6 py-4">
                <TabsContent value="suggestions" className="mt-0 space-y-4">
                  {suggestions.length === 0 ? (
                    <div className="text-center py-8">
                      <Lightbulb className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No automation suggestions available</p>
                      <p className="text-sm text-gray-500 mt-1">Continue conversing to generate suggestions</p>
                    </div>
                  ) : (
                    suggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(suggestion.category)}
                              <CardTitle className="text-sm font-medium">{suggestion.title}</CardTitle>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getImpactColor(suggestion.estimatedImpact)}`}
                            >
                              {suggestion.estimatedImpact} impact
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-gray-600">{suggestion.description}</p>

                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-blue-900 mb-2">Potential Savings</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-blue-700">Time:</span>
                                <span className="ml-1 font-medium">{suggestion.potentialSavings.timePerWeek}m/week</span>
                              </div>
                              <div>
                                <span className="text-blue-700">Messages:</span>
                                <span className="ml-1 font-medium">-{suggestion.potentialSavings.messagesReduced}</span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-blue-700">Automation Level</span>
                                <span className="font-medium">{suggestion.potentialSavings.automationLevel}%</span>
                              </div>
                              <Progress value={suggestion.potentialSavings.automationLevel} className="h-1" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleCreateAutomation(suggestion)}
                              className="text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Create
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="active" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Active Triggers ({activeTriggers.filter(t => t.enabled).length})</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {activeTriggers.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No active automations</p>
                      <p className="text-sm text-gray-500 mt-1">Create your first automation from suggestions</p>
                    </div>
                  ) : (
                    activeTriggers.map((trigger) => (
                      <Card key={trigger.id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                trigger.enabled ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <CardTitle className="text-sm font-medium">{trigger.name}</CardTitle>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${getPriorityColor(trigger.priority)}`}>
                                {trigger.priority}
                              </Badge>
                              <Switch
                                checked={trigger.enabled}
                                onCheckedChange={(enabled) => handleToggleTrigger(trigger.id, enabled)}
                                size="sm"
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-gray-600">{trigger.description}</p>

                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-700">Conditions ({trigger.conditions.length})</div>
                            {trigger.conditions.slice(0, 2).map((condition, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                {condition.type}: {condition.operator} "{Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}"
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-700">Actions ({trigger.actions.length})</div>
                            {trigger.actions.slice(0, 2).map((action, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                {action.type}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Triggered {trigger.triggerCount} times</span>
                            {trigger.lastTriggered && (
                              <span>Last: {trigger.lastTriggered.toLocaleDateString()}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 space-y-4">
                  {analytics ? (
                    <>
                      {/* Overview Stats */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Automation Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {analytics.totalTriggers}
                              </div>
                              <div className="text-xs text-gray-600">Total Triggers</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {analytics.activeTriggers}
                              </div>
                              <div className="text-xs text-gray-600">Active</div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Success Rate</span>
                              <span className="font-medium">{analytics.successRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={analytics.successRate} className="h-2" />
                          </div>

                          <div>
                            <div className="text-sm font-medium mb-2">Total Executions</div>
                            <div className="text-lg font-bold text-blue-600">
                              {analytics.totalExecutions}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Category Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Category Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {getCategoryIcon(category)}
                                  <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {count as number}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recent Activity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analytics.recentActivity.slice(0, 5).map((activity: { success: boolean; context: { triggerName?: string }; createdAt: Date }, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  {activity.success ?
                                    <CheckCircle className="w-3 h-3 text-green-500" /> :
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                  }
                                  <span className="text-gray-600">
                                    {activity.context.triggerName || 'Automation'}
                                  </span>
                                </div>
                                <span className="text-gray-500">
                                  {new Date(activity.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No analytics available</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default WorkflowAutomationPanel;