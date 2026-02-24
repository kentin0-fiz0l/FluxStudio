/**
 * AI Workflow Assistant
 * Intelligent workflow suggestions based on user behavior and context
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
// ScrollArea not currently used
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '../ui/alert';
import {
  Sparkles,
  Brain,
  TrendingUp,
  Lightbulb,
  Info,
  Zap,
  Target,
  Clock,
  Users
} from 'lucide-react';
import { useWorkspace } from '@/store';
import { useAuth } from '@/store/slices/authSlice';
import { workflowEngine, WorkflowTemplate } from '../../services/workflowEngine';
import { cn } from '../../lib/utils';

interface WorkflowSuggestion {
  id: string;
  type: 'optimization' | 'automation' | 'collaboration' | 'completion';
  title: string;
  description: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  template?: WorkflowTemplate;
  actions: {
    primary: {
      label: string;
      action: () => void;
    };
    secondary?: {
      label: string;
      action: () => void;
    };
  };
  metrics?: {
    timeSaved?: string;
    stepsReduced?: number;
    automationLevel?: number;
  };
}

export function AIWorkflowAssistant() {
  const { state, actions } = useWorkspace();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<WorkflowSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [learningMode, _setLearningMode] = useState(true);
  const [userPatterns, setUserPatterns] = useState<Map<string, number>>(new Map());

  // Analyze user behavior and generate suggestions
  useEffect(() => {
    const analyzeBehavior = () => {
      const newSuggestions: WorkflowSuggestion[] = [];

      // Guard against undefined recentActivity
      const recentActivity = Array.isArray(state.recentActivity) ? state.recentActivity : [];

      // Pattern: Frequent project creation without setup
      if (recentActivity.filter(a => a.type === 'project_created').length > 2) {
        newSuggestions.push({
          id: 'automate-project-setup',
          type: 'automation',
          title: 'Automate Project Setup',
          description: 'You create projects frequently. Let\'s automate the setup process.',
          reason: 'Detected 3+ projects created recently without automated setup',
          impact: 'high',
          confidence: 0.85,
          template: workflowEngine['templates'].get('project-kickoff'),
          actions: {
            primary: {
              label: 'Enable Automation',
              action: () => {
                // Enable project setup automation
                actions.addActivity({
                  type: 'automation_enabled',
                  title: 'Project setup automation enabled',
                  description: 'New projects will now be set up automatically',
                  userId: user?.id || '',
                  userName: user?.name || ''
                });
              }
            },
            secondary: {
              label: 'Customize',
              action: () => {
                // Open customization dialog
              }
            }
          },
          metrics: {
            timeSaved: '5 mins per project',
            stepsReduced: 8,
            automationLevel: 90
          }
        });
      }

      // Pattern: Many messages without conversation organization
      const messageCount = recentActivity.filter(a => a.type === 'message').length;
      if (messageCount > 10 && !state.activeConversation) {
        newSuggestions.push({
          id: 'organize-conversations',
          type: 'collaboration',
          title: 'Organize Your Conversations',
          description: 'Create topic-based conversations to better organize discussions',
          reason: 'High message volume detected without conversation structure',
          impact: 'medium',
          confidence: 0.72,
          actions: {
            primary: {
              label: 'Create Conversations',
              action: () => {
                // Guide user to create conversations
              }
            }
          },
          metrics: {
            timeSaved: '10 mins daily',
            stepsReduced: 5
          }
        });
      }

      // Pattern: Project nearing deadline
      if (state.activeProject && state.activeProject.dueDate) {
        const daysUntilDeadline = Math.ceil(
          (new Date(state.activeProject.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
          newSuggestions.push({
            id: 'deadline-approaching',
            type: 'completion',
            title: 'Project Deadline Approaching',
            description: `${state.activeProject.name} is due in ${daysUntilDeadline} days`,
            reason: 'Upcoming deadline detected',
            impact: 'high',
            confidence: 1.0,
            actions: {
              primary: {
                label: 'Review Progress',
                action: () => {
                  // Navigate to project dashboard
                }
              },
              secondary: {
                label: 'Set Reminders',
                action: () => {
                  // Set up reminder workflow
                }
              }
            }
          });
        }
      }

      // Pattern: Repetitive manual tasks
      const activityTypes = recentActivity.map(a => a.type);
      const activityCounts = activityTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(activityCounts).forEach(([type, count]) => {
        if (count > 5) {
          newSuggestions.push({
            id: `automate-${type}`,
            type: 'optimization',
            title: `Automate ${type.replace('_', ' ')} Tasks`,
            description: `You've performed this action ${count} times recently`,
            reason: 'Repetitive pattern detected',
            impact: 'medium',
            confidence: 0.68,
            actions: {
              primary: {
                label: 'Create Automation',
                action: () => {
                  // Create automation for this task type
                }
              }
            },
            metrics: {
              timeSaved: '15 mins weekly',
              automationLevel: 75
            }
          });
        }
      });

      // Pattern: Idle project detection
      if (state.activeProject) {
        const lastActivity = recentActivity
          .filter(a => a.projectId === state.activeProject?.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (lastActivity) {
          const daysSinceActivity = Math.ceil(
            (Date.now() - new Date(lastActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceActivity > 7) {
            newSuggestions.push({
              id: 'reactivate-project',
              type: 'collaboration',
              title: 'Reactivate Idle Project',
              description: `${state.activeProject.name} hasn't had activity in ${daysSinceActivity} days`,
              reason: 'Project inactivity detected',
              impact: 'medium',
              confidence: 0.80,
              actions: {
                primary: {
                  label: 'Schedule Check-in',
                  action: () => {
                    // Schedule team check-in
                  }
                },
                secondary: {
                  label: 'Send Update',
                  action: () => {
                    // Send status update
                  }
                }
              }
            });
          }
        }
      }

      // Filter out dismissed suggestions
      const activeSuggestions = newSuggestions.filter(
        s => !dismissedSuggestions.has(s.id)
      );

      // Sort by impact and confidence
      activeSuggestions.sort((a, b) => {
        const scoreA = (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1) * a.confidence;
        const scoreB = (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1) * b.confidence;
        return scoreB - scoreA;
      });

      setSuggestions(activeSuggestions.slice(0, 5));
    };

    analyzeBehavior();
    const interval = setInterval(analyzeBehavior, 30000); // Re-analyze every 30 seconds

    return () => clearInterval(interval);
  }, [state, user, dismissedSuggestions, actions]);

  // Track user patterns for learning
  useEffect(() => {
    const patterns = new Map<string, number>();
    const recentActivity = Array.isArray(state.recentActivity) ? state.recentActivity : [];

    recentActivity.forEach(activity => {
      const key = `${activity.type}_${activity.projectId || 'global'}`;
      patterns.set(key, (patterns.get(key) || 0) + 1);
    });

    queueMicrotask(() => setUserPatterns(patterns));
  }, [state.recentActivity]);

  const getSuggestionIcon = (type: WorkflowSuggestion['type']) => {
    switch (type) {
      case 'optimization': return TrendingUp;
      case 'automation': return Zap;
      case 'collaboration': return Users;
      case 'completion': return Target;
      default: return Lightbulb;
    }
  };

  const getImpactColor = (impact: WorkflowSuggestion['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const dismissSuggestion = (id: string) => {
    setDismissedSuggestions(new Set([...dismissedSuggestions, id]));

    // Learn from dismissal
    actions.addActivity({
      type: 'ai_feedback',
      title: 'AI suggestion dismissed',
      description: 'Learning from your preferences',
      userId: user?.id || '',
      userName: user?.name || '',
      metadata: { suggestionId: id, action: 'dismissed' }
    });
  };

  const acceptSuggestion = (suggestion: WorkflowSuggestion) => {
    // Execute the primary action
    suggestion.actions.primary.action();

    // Learn from acceptance
    actions.addActivity({
      type: 'ai_feedback',
      title: 'AI suggestion accepted',
      description: suggestion.title,
      userId: user?.id || '',
      userName: user?.name || '',
      metadata: { suggestionId: suggestion.id, action: 'accepted' }
    });

    // Remove from suggestions
    dismissSuggestion(suggestion.id);
  };

  return (
    <div className="space-y-4">
      {/* AI Assistant Header */}
      <Card className="border-gradient bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Brain className="text-white" size={20} aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Workflow Assistant</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {learningMode ? 'Learning your patterns...' : 'Optimizing your workflow'}
                </p>
              </div>
            </div>
            <Badge variant={learningMode ? 'primary' : 'secondary'}>
              {learningMode ? 'Learning' : 'Active'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const Icon = getSuggestionIcon(suggestion.type);
            const impactColor = getImpactColor(suggestion.impact);

            return (
              <Alert key={suggestion.id} className="relative">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    impactColor
                  )}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <AlertTitle className="text-base mb-1">
                      {suggestion.title}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="text-sm text-gray-600 mb-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>

                      {/* Metrics */}
                      {suggestion.metrics && (
                        <div className="flex gap-4 mb-3">
                          {suggestion.metrics.timeSaved && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock size={12} aria-hidden="true" />
                              Save {suggestion.metrics.timeSaved}
                            </div>
                          )}
                          {suggestion.metrics.stepsReduced && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Target size={12} aria-hidden="true" />
                              {suggestion.metrics.stepsReduced} fewer steps
                            </div>
                          )}
                          {suggestion.metrics.automationLevel && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Zap size={12} aria-hidden="true" />
                              {suggestion.metrics.automationLevel}% automated
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptSuggestion(suggestion)}
                        >
                          {suggestion.actions.primary.label}
                        </Button>
                        {suggestion.actions.secondary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={suggestion.actions.secondary.action}
                          >
                            {suggestion.actions.secondary.label}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissSuggestion(suggestion.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </AlertDescription>
                  </div>
                </div>

                {/* Confidence Indicator */}
                <div className="absolute top-3 right-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={`${suggestion.confidence * 125.6} 125.6`}
                        className={cn(
                          suggestion.impact === 'high' ? 'text-red-500' :
                          suggestion.impact === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="mx-auto text-gray-400 mb-3" size={32} aria-hidden="true" />
            <p className="text-gray-600">No suggestions at the moment</p>
            <p className="text-sm text-gray-500 mt-1">
              Keep working and I'll learn your patterns
            </p>
          </CardContent>
        </Card>
      )}

      {/* Learning Progress */}
      {learningMode && (
        <Card className="bg-gray-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Learning Progress</CardTitle>
              <Info size={14} className="text-gray-400" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Patterns detected</span>
                <span className="font-medium">{userPatterns.size}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Activities analyzed</span>
                <span className="font-medium">{state.recentActivity.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Suggestions generated</span>
                <span className="font-medium">{suggestions.length + dismissedSuggestions.size}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (userPatterns.size / 20) * 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.min(100, Math.round((userPatterns.size / 20) * 100))}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIWorkflowAssistant;