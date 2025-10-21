/**
 * Conversation Insights Panel
 * Display context-aware conversation insights and analytics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  MessageSquare,
  Activity,
  Brain,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { conversationInsightsService, InsightSummary, ActionItem, Recommendation } from '../../services/conversationInsightsService';
import { Message, Conversation, MessageUser } from '../../types/messaging';

interface ConversationInsightsPanelProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: MessageUser;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

export function ConversationInsightsPanel({
  conversation,
  messages,
  currentUser,
  isVisible,
  onToggleVisibility,
  className = ''
}: ConversationInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics']));

  useEffect(() => {
    if (isVisible && messages.length > 0) {
      loadInsights();
    }
  }, [isVisible, messages.length, conversation.id]);

  const loadInsights = async () => {
    if (messages.length < 5) return;

    setIsLoading(true);
    try {
      const insightData = await conversationInsightsService.analyzeConversation(conversation, messages);
      setInsights(insightData);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
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

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return '< 1m';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
      case 'increasing':
      case 'accelerating':
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
      case 'decreasing':
      case 'slowing':
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTeamHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'needs_attention': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleVisibility}
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 ${className}`}
      >
        <Eye className="w-4 h-4 mr-2" />
        Insights
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-50 overflow-hidden ${className}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Conversation Insights</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadInsights}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
          {insights && (
            <p className="text-sm text-gray-600 mt-1">
              Last analyzed {insights.insights.analyzedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">Analyzing conversation...</p>
              </div>
            </div>
          ) : !insights ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
                <p className="text-gray-600 mb-4">Need at least 5 messages to generate insights.</p>
                <Button onClick={loadInsights} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <div className="px-6 py-4">
                <TabsContent value="overview" className="mt-0 space-y-4">
                  {/* Key Metrics */}
                  <Card>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => toggleSection('metrics')}
                    >
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4" />
                          <span>Key Metrics</span>
                        </div>
                        {expandedSections.has('metrics') ?
                          <ChevronDown className="w-4 h-4" /> :
                          <ChevronRight className="w-4 h-4" />
                        }
                      </CardTitle>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedSections.has('metrics') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {insights.insights.messageCount}
                                </div>
                                <div className="text-xs text-gray-600">Messages</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {insights.insights.participantCount}
                                </div>
                                <div className="text-xs text-gray-600">Participants</div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Avg Response Time</span>
                                <span className="font-medium">
                                  {formatDuration(insights.insights.avgResponseTime)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Sentiment Score</span>
                                <span className={`font-medium ${
                                  insights.insights.sentimentScore > 0 ? 'text-green-600' :
                                  insights.insights.sentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {insights.insights.sentimentScore > 0 ? '+' : ''}
                                  {insights.insights.sentimentScore.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Engagement Level</span>
                                <Badge variant={
                                  insights.insights.engagementLevel === 'high' ? 'default' :
                                  insights.insights.engagementLevel === 'medium' ? 'secondary' : 'outline'
                                }>
                                  {insights.insights.engagementLevel}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Trends */}
                  <Card>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => toggleSection('trends')}
                    >
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>Trends</span>
                        </div>
                        {expandedSections.has('trends') ?
                          <ChevronDown className="w-4 h-4" /> :
                          <ChevronRight className="w-4 h-4" />
                        }
                      </CardTitle>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedSections.has('trends') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Response Times</span>
                              <div className="flex items-center space-x-1">
                                {getTrendIcon(insights.trendAnalysis.responseTimesTrend)}
                                <span className="text-sm capitalize">
                                  {insights.trendAnalysis.responseTimesTrend}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm">Engagement</span>
                              <div className="flex items-center space-x-1">
                                {getTrendIcon(insights.trendAnalysis.engagementTrend)}
                                <span className="text-sm capitalize">
                                  {insights.trendAnalysis.engagementTrend}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm">Sentiment</span>
                              <div className="flex items-center space-x-1">
                                {getTrendIcon(insights.trendAnalysis.sentimentTrend)}
                                <span className="text-sm capitalize">
                                  {insights.trendAnalysis.sentimentTrend}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="text-xs text-gray-600 mb-1">Weekly Activity</div>
                              <div className="flex justify-between text-sm">
                                <span>This week: {insights.trendAnalysis.weeklyComparison.messagesThisWeek}</span>
                                <span className={`font-medium ${
                                  insights.trendAnalysis.weeklyComparison.percentChange > 0 ? 'text-green-600' :
                                  insights.trendAnalysis.weeklyComparison.percentChange < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {insights.trendAnalysis.weeklyComparison.percentChange > 0 ? '+' : ''}
                                  {insights.trendAnalysis.weeklyComparison.percentChange.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Topics */}
                  {insights.insights.topicCoverage.length > 0 && (
                    <Card>
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() => toggleSection('topics')}
                      >
                        <CardTitle className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4" />
                            <span>Topics Discussed</span>
                          </div>
                          {expandedSections.has('topics') ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                          }
                        </CardTitle>
                      </CardHeader>
                      <AnimatePresence>
                        {expandedSections.has('topics') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {insights.insights.topicCoverage.map((topic, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="team" className="mt-0 space-y-4">
                  {/* Team Health */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4" />
                        <span>Team Dynamics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className={`text-lg font-semibold ${getTeamHealthColor(insights.teamDynamics.teamHealth)}`}>
                          {insights.teamDynamics.teamHealth.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-600">Team Health</div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Collaboration Score</span>
                            <span className="font-medium">{insights.teamDynamics.collaborationScore.toFixed(0)}%</span>
                          </div>
                          <Progress value={insights.teamDynamics.collaborationScore} className="h-2" />
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Communication Effectiveness</span>
                            <span className="font-medium">{insights.teamDynamics.communicationEffectiveness.toFixed(0)}%</span>
                          </div>
                          <Progress value={insights.teamDynamics.communicationEffectiveness} className="h-2" />
                        </div>
                      </div>

                      {insights.teamDynamics.conflictIndicators.length > 0 && (
                        <div className="border-t pt-3">
                          <div className="text-sm font-medium text-red-600 mb-2">Attention Needed</div>
                          {insights.teamDynamics.conflictIndicators.slice(0, 2).map((conflict, index) => (
                            <div key={index} className="text-xs text-gray-600 mb-1">
                              <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />
                              {conflict.description.substring(0, 80)}...
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Participation Balance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Participation Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(insights.teamDynamics.participationBalance).map(([userId, percentage]) => (
                          <div key={userId} className="flex items-center justify-between">
                            <span className="text-sm truncate">{userId}</span>
                            <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="actions" className="mt-0 space-y-4">
                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Lightbulb className="w-4 h-4" />
                        <span>Recommendations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.recommendations.slice(0, 3).map((rec, index) => (
                        <div key={rec.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium">{rec.title}</h4>
                            <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                          {rec.implementation.length > 0 && (
                            <div className="text-xs">
                              <div className="font-medium mb-1">Implementation:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {rec.implementation.slice(0, 2).map((step, stepIndex) => (
                                  <li key={stepIndex} className="text-gray-600">{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Action Items */}
                  {insights.insights.actionItems.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Action Items ({insights.insights.actionItems.length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {insights.insights.actionItems.slice(0, 5).map((item, index) => (
                          <div key={item.id} className="flex items-start space-x-2 text-sm">
                            <div className="mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                item.priority === 'high' ? 'bg-red-500' :
                                item.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="text-gray-900">{item.description}</div>
                              {item.assignee && (
                                <div className="text-xs text-gray-600">
                                  Assigned to: {item.assignee.name}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Project Progress */}
                  {insights.insights.projectProgress && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Project Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Completion Estimate</span>
                            <span className="font-medium">
                              {(insights.insights.projectProgress.completionEstimate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={insights.insights.projectProgress.completionEstimate * 100}
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Phase</span>
                          <Badge variant="outline" className="text-xs">
                            {insights.insights.projectProgress.phase}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm">Momentum</span>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(insights.insights.projectProgress.momentum)}
                            <span className="text-sm capitalize">
                              {insights.insights.projectProgress.momentum}
                            </span>
                          </div>
                        </div>

                        {insights.insights.projectProgress.blockers.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-red-600 mb-1">Blockers</div>
                            {insights.insights.projectProgress.blockers.slice(0, 2).map((blocker, index) => (
                              <div key={index} className="text-xs text-gray-600 mb-1">
                                • {blocker.substring(0, 60)}...
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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

export default ConversationInsightsPanel;