/**
 * ConversationIntelligencePanel Component
 * Smart conversation grouping, context detection, and workflow insights
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  MessageSquare,
  Search,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Conversation, Message } from '../../types/messaging';
import { MessageAnalysis } from '../../services/messageIntelligenceService';
import { cn } from '../../lib/utils';

interface ConversationIntelligencePanelProps {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  messageAnalyses: Record<string, MessageAnalysis>;
  currentUserId: string;
  className?: string;
  onConversationSelect?: (conversationId: string) => void;
  onActionTrigger?: (action: string, data?: any) => void;
}

interface WorkflowSuggestion {
  id: string;
  type: 'deadline-reminder' | 'approval-needed' | 'follow-up' | 'escalation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  conversationId: string;
  actionData?: any;
}

export function ConversationIntelligencePanel({
  conversations,
  messages,
  messageAnalyses,
  currentUserId: _currentUserId,
  className,
  onConversationSelect,
  onActionTrigger
}: ConversationIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState('insights');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'pending' | 'stale'>('all');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Generate conversation insights
  const conversationInsights = useMemo(() => {
    return conversations.map(conversation => {
      const conversationMessages = messages[conversation.id] || [];
      const analyses = conversationMessages
        .map(msg => messageAnalyses[msg.id])
        .filter(Boolean);

      // Calculate insights
      const urgentMessages = analyses.filter(a =>
        a.urgency === 'critical' || a.urgency === 'high'
      ).length;

      const pendingActions = analyses.filter(a =>
        a.intent === 'action-required' || a.category === 'approval-request'
      ).length;

      const unansweredQuestions = analyses.filter(a =>
        a.category === 'question' && !hasSubsequentResponse(conversation.id, a)
      ).length;

      const approvalRequests = analyses.filter(a =>
        a.category === 'approval-request'
      ).length;

      const sentiments = analyses.flatMap(a => a.extractedData.emotions || []);
      const overallSentiment = calculateOverallSentiment(sentiments);

      const activityLevel = calculateActivityLevel(conversationMessages);
      const responseTime = calculateAverageResponseTime(conversationMessages);
      const lastActivity = conversationMessages.length > 0
        ? new Date(Math.max(...conversationMessages.map(m => m.createdAt.getTime())))
        : conversation.updatedAt || conversation.createdAt;

      return {
        id: conversation.id,
        conversation,
        insights: {
          urgentMessages,
          pendingActions,
          unansweredQuestions,
          approvalRequests,
          overallSentiment,
          activityLevel,
          responseTime,
          lastActivity
        }
      };
    });
  }, [conversations, messages, messageAnalyses]);

  // Generate workflow suggestions
  const workflowSuggestions = useMemo(() => {
    const suggestions: WorkflowSuggestion[] = [];

    conversationInsights.forEach(insight => {
      const { conversation, insights } = insight;

      // Urgent messages requiring attention
      if (insights.urgentMessages > 0) {
        suggestions.push({
          id: `urgent-${conversation.id}`,
          type: 'escalation',
          priority: 'high',
          title: 'Urgent Messages Need Attention',
          description: `${insights.urgentMessages} urgent message(s) in ${conversation.name}`,
          conversationId: conversation.id,
          actionData: { urgentCount: insights.urgentMessages }
        });
      }

      // Pending approvals
      if (insights.approvalRequests > 0) {
        suggestions.push({
          id: `approval-${conversation.id}`,
          type: 'approval-needed',
          priority: 'high',
          title: 'Pending Approvals',
          description: `${insights.approvalRequests} approval request(s) awaiting response`,
          conversationId: conversation.id,
          actionData: { approvalCount: insights.approvalRequests }
        });
      }

      // Unanswered questions
      if (insights.unansweredQuestions > 0) {
        suggestions.push({
          id: `questions-${conversation.id}`,
          type: 'follow-up',
          priority: 'medium',
          title: 'Unanswered Questions',
          description: `${insights.unansweredQuestions} question(s) need responses`,
          conversationId: conversation.id,
          actionData: { questionCount: insights.unansweredQuestions }
        });
      }

      // Stale conversations
      const daysSinceActivity = (Date.now() - insights.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 3 && insights.pendingActions > 0) {
        suggestions.push({
          id: `stale-${conversation.id}`,
          type: 'follow-up',
          priority: 'low',
          title: 'Stale Conversation',
          description: `No activity for ${Math.floor(daysSinceActivity)} days`,
          conversationId: conversation.id,
          actionData: { daysSinceActivity: Math.floor(daysSinceActivity) }
        });
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [conversationInsights]);

  // Filter insights based on search and filter type
  const filteredInsights = useMemo(() => {
    let filtered = conversationInsights;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(insight =>
        insight.conversation.name.toLowerCase().includes(query) ||
        insight.conversation.participants.some(p => p.name.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'urgent':
        filtered = filtered.filter(insight => insight.insights.urgentMessages > 0);
        break;
      case 'pending':
        filtered = filtered.filter(insight => insight.insights.pendingActions > 0);
        break;
      case 'stale':
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(insight =>
          insight.insights.lastActivity.getTime() < threeDaysAgo
        );
        break;
    }

    return filtered;
  }, [conversationInsights, searchQuery, filterType]);

  // Helper functions
  function hasSubsequentResponse(_conversationId: string, _analysis: MessageAnalysis): boolean {
    // This would check if there's a response after the question
    // For now, return false to show all questions as unanswered
    return false;
  }

  function calculateOverallSentiment(emotions: string[]): 'positive' | 'neutral' | 'negative' {
    const positive = emotions.filter(e => e === 'positive' || e === 'excited').length;
    const negative = emotions.filter(e => e === 'negative' || e === 'concerned').length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  function calculateActivityLevel(messages: Message[]): 'high' | 'medium' | 'low' {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentMessages = messages.filter(m => m.createdAt.getTime() > oneDayAgo).length;
    const weeklyMessages = messages.filter(m => m.createdAt.getTime() > oneWeekAgo).length;

    if (recentMessages >= 5 || weeklyMessages >= 20) return 'high';
    if (recentMessages >= 2 || weeklyMessages >= 10) return 'medium';
    return 'low';
  }

  function calculateAverageResponseTime(_messages: Message[]): number {
    // Calculate average response time between messages
    // For now, return a mock value
    return Math.random() * 24; // 0-24 hours
  }

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-500/10';
      case 'negative': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Card className={cn('backdrop-blur-md bg-white/5 border border-white/10', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="h-5 w-5 text-blue-400" />
          Conversation Intelligence
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm"
          >
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="pending">Pending Actions</option>
            <option value="stale">Stale</option>
          </select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full bg-white/10">
            <TabsTrigger value="insights" className="text-white data-[state=active]:bg-white/20">
              Insights
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-white data-[state=active]:bg-white/20">
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-3">
            {filteredInsights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div
                      className="flex items-center justify-between"
                      onClick={() => toggleInsightExpansion(insight.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          {insight.conversation.name}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-white/60">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {insight.conversation.participants.length}
                          </span>
                          <span className={cn('flex items-center gap-1', getActivityColor(insight.insights.activityLevel))}>
                            <TrendingUp className="h-3 w-3" />
                            {insight.insights.activityLevel}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(insight.insights.responseTime)}h avg
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick indicators */}
                        {insight.insights.urgentMessages > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            {insight.insights.urgentMessages} urgent
                          </Badge>
                        )}
                        {insight.insights.pendingActions > 0 && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                            {insight.insights.pendingActions} pending
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-white/60"
                        >
                          {expandedInsights.has(insight.id) ?
                            <ChevronDown className="h-4 w-4" /> :
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedInsights.has(insight.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-white/10"
                        >
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-white/60">Urgent Messages:</span>
                                <span className="text-red-400">{insight.insights.urgentMessages}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Pending Actions:</span>
                                <span className="text-orange-400">{insight.insights.pendingActions}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Unanswered Questions:</span>
                                <span className="text-blue-400">{insight.insights.unansweredQuestions}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-white/60">Sentiment:</span>
                                <Badge className={cn('text-xs', getSentimentColor(insight.insights.overallSentiment))}>
                                  {insight.insights.overallSentiment}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Last Activity:</span>
                                <span className="text-white/80">
                                  {Math.floor((Date.now() - insight.insights.lastActivity.getTime()) / (1000 * 60 * 60 * 24))}d ago
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => onConversationSelect?.(insight.conversation.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Open Conversation
                            </Button>
                            {insight.insights.pendingActions > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onActionTrigger?.('review-pending-actions', insight)}
                                className="border-white/20 text-white/80 hover:bg-white/10"
                              >
                                Review Actions
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-3">
            {workflowSuggestions.slice(0, 10).map((suggestion) => (
              <Card key={suggestion.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn('text-xs', getPriorityColor(suggestion.priority))}>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                          {suggestion.type.replace('-', ' ')}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-white mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-white/70">
                        {suggestion.description}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onConversationSelect?.(suggestion.conversationId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {workflowSuggestions.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  All Caught Up!
                </h3>
                <p className="text-white/60">
                  No workflow suggestions at the moment.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Total Conversations</span>
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{conversations.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Urgent Messages</span>
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {conversationInsights.reduce((sum, c) => sum + c.insights.urgentMessages, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Pending Actions</span>
                    <Target className="h-4 w-4 text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {conversationInsights.reduce((sum, c) => sum + c.insights.pendingActions, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Avg Response Time</span>
                    <Clock className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {Math.round(conversationInsights.reduce((sum, c) => sum + c.insights.responseTime, 0) / conversations.length || 0)}h
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activity distribution */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['high', 'medium', 'low'].map(level => {
                    const count = conversationInsights.filter(c => c.insights.activityLevel === level).length;
                    const percentage = (count / conversations.length) * 100;

                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={cn('capitalize', getActivityColor(level))}>
                            {level} Activity
                          </span>
                          <span className="text-white/60">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ConversationIntelligencePanel;