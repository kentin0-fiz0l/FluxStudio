/**
 * Conversation Insights Service
 * Context-aware analysis of conversations to provide actionable insights
 */

import { Message, Conversation, MessageUser } from '../types/messaging';

interface ConversationMetrics {
  id: string;
  conversationId: string;
  analyzedAt: Date;
  participantCount: number;
  messageCount: number;
  avgResponseTime: number;
  sentimentScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  topicCoverage: string[];
  keyDecisions: string[];
  actionItems: ActionItem[];
  communicationPatterns: CommunicationPattern[];
  projectProgress?: ProjectProgressInsight;
}

interface ActionItem {
  id: string;
  description: string;
  assignee?: MessageUser;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  extractedAt: Date;
  confidence: number;
}

interface CommunicationPattern {
  type: 'response_time' | 'engagement' | 'topic_shift' | 'decision_making' | 'collaboration_style';
  description: string;
  trend: 'improving' | 'declining' | 'stable';
  impact: 'positive' | 'neutral' | 'negative';
  suggestions: string[];
}

interface ProjectProgressInsight {
  phase: string;
  completionEstimate: number;
  blockers: string[];
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled';
  riskFactors: string[];
  recommendations: string[];
}

interface TeamDynamics {
  collaborationScore: number;
  communicationEffectiveness: number;
  participationBalance: Record<string, number>;
  conflictIndicators: ConflictIndicator[];
  teamHealth: 'excellent' | 'good' | 'fair' | 'needs_attention';
}

interface ConflictIndicator {
  type: 'disagreement' | 'tension' | 'miscommunication' | 'delay';
  severity: 'low' | 'medium' | 'high';
  participants: string[];
  description: string;
  suggestedResolution: string;
}

interface InsightSummary {
  conversationId: string;
  insights: ConversationMetrics;
  teamDynamics: TeamDynamics;
  recommendations: Recommendation[];
  trendAnalysis: TrendAnalysis;
}

interface Recommendation {
  id: string;
  category: 'communication' | 'productivity' | 'collaboration' | 'project_management';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  estimatedImpact: 'high' | 'medium' | 'low';
  implementation: string[];
}

interface TrendAnalysis {
  responseTimesTrend: 'improving' | 'declining' | 'stable';
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  sentimentTrend: 'positive' | 'negative' | 'neutral';
  productivityTrend: 'improving' | 'declining' | 'stable';
  weeklyComparison: {
    messagesThisWeek: number;
    messagesLastWeek: number;
    percentChange: number;
  };
}

class ConversationInsightsService {
  private insightsCache = new Map<string, InsightSummary>();
  private readonly ANALYSIS_WINDOW_DAYS = 7;
  private readonly MIN_MESSAGES_FOR_ANALYSIS = 5;

  /**
   * Analyze conversation and generate comprehensive insights
   */
  async analyzeConversation(conversation: Conversation, messages: Message[]): Promise<InsightSummary> {
    const cacheKey = this.generateCacheKey(conversation.id, messages.length);

    if (this.insightsCache.has(cacheKey)) {
      return this.insightsCache.get(cacheKey)!;
    }

    if (messages.length < this.MIN_MESSAGES_FOR_ANALYSIS) {
      throw new Error('Insufficient message data for meaningful analysis');
    }

    try {
      const insights = await this.performComprehensiveAnalysis(conversation, messages);
      const teamDynamics = await this.analyzeTeamDynamics(messages);
      const recommendations = await this.generateRecommendations(insights, teamDynamics);
      const trendAnalysis = await this.analyzeTrends(messages);

      const summary: InsightSummary = {
        conversationId: conversation.id,
        insights,
        teamDynamics,
        recommendations,
        trendAnalysis
      };

      this.insightsCache.set(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
      throw new Error('Conversation analysis failed. Please try again.');
    }
  }

  /**
   * Get real-time insights for active conversation
   */
  async getRealTimeInsights(conversationId: string, recentMessages: Message[]): Promise<Partial<InsightSummary>> {
    if (recentMessages.length === 0) return {};

    const quickMetrics = await this.calculateQuickMetrics(recentMessages);
    const livePatterns = await this.detectLivePatterns(recentMessages);

    return {
      insights: quickMetrics,
      recommendations: await this.generateQuickRecommendations(livePatterns)
    };
  }

  /**
   * Extract action items from conversation
   */
  async extractActionItems(messages: Message[]): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];
    const actionKeywords = [
      'need to', 'should', 'must', 'will do', 'action:', 'todo:', 'task:',
      'deadline', 'by when', 'due', 'assign', 'responsible', 'follow up'
    ];

    messages.forEach((message, index) => {
      const content = message.content.toLowerCase();

      // Check for action-oriented language
      const hasActionKeywords = actionKeywords.some(keyword =>
        content.includes(keyword)
      );

      if (hasActionKeywords) {
        const actionItem = this.parseActionItem(message, index);
        if (actionItem) {
          actionItems.push(actionItem);
        }
      }
    });

    return actionItems.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze project progress from conversation context
   */
  async analyzeProjectProgress(messages: Message[], projectContext?: any): Promise<ProjectProgressInsight> {
    const progressIndicators = this.extractProgressIndicators(messages);
    const blockers = this.identifyBlockers(messages);
    const momentum = this.calculateMomentum(messages);

    return {
      phase: this.determineProjectPhase(progressIndicators),
      completionEstimate: this.estimateCompletion(progressIndicators, momentum),
      blockers,
      momentum,
      riskFactors: this.identifyRiskFactors(messages, blockers),
      recommendations: this.generateProjectRecommendations(momentum, blockers)
    };
  }

  private async performComprehensiveAnalysis(conversation: Conversation, messages: Message[]): Promise<ConversationMetrics> {
    const participants = this.getUniqueParticipants(messages);
    const responseTimeMetrics = this.calculateResponseTimes(messages);
    const sentimentScore = await this.analyzeSentiment(messages);
    const engagementLevel = this.calculateEngagementLevel(messages);
    const topicCoverage = this.extractTopics(messages);
    const keyDecisions = this.extractDecisions(messages);
    const actionItems = await this.extractActionItems(messages);
    const communicationPatterns = this.analyzeCommunicationPatterns(messages);
    const projectProgress = await this.analyzeProjectProgress(messages);

    return {
      id: `metrics-${Date.now()}`,
      conversationId: conversation.id,
      analyzedAt: new Date(),
      participantCount: participants.length,
      messageCount: messages.length,
      avgResponseTime: responseTimeMetrics.average,
      sentimentScore,
      engagementLevel,
      topicCoverage,
      keyDecisions,
      actionItems,
      communicationPatterns,
      projectProgress
    };
  }

  private async analyzeTeamDynamics(messages: Message[]): Promise<TeamDynamics> {
    const participants = this.getUniqueParticipants(messages);
    const participationBalance = this.calculateParticipationBalance(messages, participants);
    const collaborationScore = this.calculateCollaborationScore(messages);
    const communicationEffectiveness = this.calculateCommunicationEffectiveness(messages);
    const conflictIndicators = this.detectConflictIndicators(messages);

    const teamHealth = this.determineTeamHealth(
      collaborationScore,
      communicationEffectiveness,
      conflictIndicators
    );

    return {
      collaborationScore,
      communicationEffectiveness,
      participationBalance,
      conflictIndicators,
      teamHealth
    };
  }

  private async generateRecommendations(
    insights: ConversationMetrics,
    teamDynamics: TeamDynamics
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Communication efficiency recommendations
    if (insights.avgResponseTime > 3600000) { // > 1 hour
      recommendations.push({
        id: 'response-time-improvement',
        category: 'communication',
        priority: 'medium',
        title: 'Improve Response Times',
        description: 'Average response time is high. Consider setting communication expectations.',
        actionable: true,
        estimatedImpact: 'medium',
        implementation: [
          'Set expected response time guidelines',
          'Use @mentions for urgent items',
          'Consider dedicated communication channels for different urgency levels'
        ]
      });
    }

    // Engagement recommendations
    if (insights.engagementLevel === 'low') {
      recommendations.push({
        id: 'engagement-boost',
        category: 'collaboration',
        priority: 'high',
        title: 'Increase Team Engagement',
        description: 'Low engagement detected. Team may benefit from more interactive collaboration.',
        actionable: true,
        estimatedImpact: 'high',
        implementation: [
          'Schedule regular check-ins',
          'Use visual collaboration tools',
          'Create specific discussion prompts',
          'Encourage questions and feedback'
        ]
      });
    }

    // Action item management
    if (insights.actionItems.length > 5) {
      recommendations.push({
        id: 'action-item-management',
        category: 'project_management',
        priority: 'medium',
        title: 'Optimize Action Item Tracking',
        description: 'Many action items identified. Consider using dedicated task management.',
        actionable: true,
        estimatedImpact: 'medium',
        implementation: [
          'Move action items to dedicated task board',
          'Set clear deadlines and assignments',
          'Regular action item review meetings'
        ]
      });
    }

    // Team dynamics recommendations
    if (teamDynamics.teamHealth === 'needs_attention') {
      recommendations.push({
        id: 'team-health-improvement',
        category: 'collaboration',
        priority: 'high',
        title: 'Address Team Dynamics',
        description: 'Team dynamics need attention. Focus on improving collaboration.',
        actionable: true,
        estimatedImpact: 'high',
        implementation: [
          'Facilitate team building activities',
          'Address communication gaps',
          'Establish clear roles and responsibilities',
          'Create safe spaces for feedback'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async analyzeTrends(messages: Message[]): Promise<TrendAnalysis> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekMessages = messages.filter(m =>
      new Date(m.createdAt) >= oneWeekAgo
    );
    const lastWeekMessages = messages.filter(m =>
      new Date(m.createdAt) >= twoWeeksAgo && new Date(m.createdAt) < oneWeekAgo
    );

    const weeklyComparison = {
      messagesThisWeek: thisWeekMessages.length,
      messagesLastWeek: lastWeekMessages.length,
      percentChange: lastWeekMessages.length > 0
        ? ((thisWeekMessages.length - lastWeekMessages.length) / lastWeekMessages.length) * 100
        : 0
    };

    return {
      responseTimesTrend: this.calculateResponseTimeTrend(messages),
      engagementTrend: this.calculateEngagementTrend(messages),
      sentimentTrend: this.calculateSentimentTrend(messages),
      productivityTrend: this.calculateProductivityTrend(messages),
      weeklyComparison
    };
  }

  private parseActionItem(message: Message, index: number): ActionItem | null {
    const content = message.content;

    // Simple extraction - in production, this would use NLP
    const actionPatterns = [
      /(?:need to|should|must|will)\s+(.+?)(?:\.|$)/i,
      /(?:action|todo|task):\s*(.+?)(?:\.|$)/i,
      /(?:@\w+)\s+(.+?)(?:\.|$)/i
    ];

    for (const pattern of actionPatterns) {
      const match = content.match(pattern);
      if (match) {
        return {
          id: `action-${message.id}-${index}`,
          description: match[1].trim(),
          assignee: this.extractAssignee(content),
          priority: this.determinePriority(content),
          dueDate: this.extractDueDate(content),
          status: 'pending',
          extractedAt: new Date(),
          confidence: 0.7
        };
      }
    }

    return null;
  }

  private extractAssignee(content: string): MessageUser | undefined {
    const mentionMatch = content.match(/@(\w+)/);
    if (mentionMatch) {
      return {
        id: mentionMatch[1],
        name: mentionMatch[1],
        email: `${mentionMatch[1]}@example.com`,
        avatar: ''
      };
    }
    return undefined;
  }

  private determinePriority(content: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const highKeywords = ['important', 'priority', 'deadline', 'must'];

    const lowerContent = content.toLowerCase();

    if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }
    if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  private extractDueDate(content: string): Date | undefined {
    // Simple date extraction - in production, use proper date parsing
    const datePatterns = [
      /by\s+(\w+\s+\d+)/i,
      /due\s+(\w+\s+\d+)/i,
      /deadline\s+(\w+\s+\d+)/i
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private getUniqueParticipants(messages: Message[]): MessageUser[] {
    const participantMap = new Map<string, MessageUser>();
    messages.forEach(message => {
      participantMap.set(message.author.id, message.author);
    });
    return Array.from(participantMap.values());
  }

  private calculateResponseTimes(messages: Message[]): { average: number; median: number } {
    const responseTimes: number[] = [];

    for (let i = 1; i < messages.length; i++) {
      const current = new Date(messages[i].createdAt);
      const previous = new Date(messages[i - 1].createdAt);
      responseTimes.push(current.getTime() - previous.getTime());
    }

    const average = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const sorted = responseTimes.sort((a, b) => a - b);
    const median = sorted.length > 0
      ? sorted[Math.floor(sorted.length / 2)]
      : 0;

    return { average, median };
  }

  private async analyzeSentiment(messages: Message[]): Promise<number> {
    // Simplified sentiment analysis - in production, use proper NLP
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'awesome', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem', 'issue'];

    let sentimentScore = 0;
    let totalWords = 0;

    messages.forEach(message => {
      const words = message.content.toLowerCase().split(/\s+/);
      totalWords += words.length;

      words.forEach(word => {
        if (positiveWords.includes(word)) sentimentScore += 1;
        if (negativeWords.includes(word)) sentimentScore -= 1;
      });
    });

    return totalWords > 0 ? sentimentScore / totalWords : 0;
  }

  private calculateEngagementLevel(messages: Message[]): 'low' | 'medium' | 'high' {
    const participants = this.getUniqueParticipants(messages);
    const avgMessagesPerParticipant = messages.length / participants.length;

    if (avgMessagesPerParticipant >= 10) return 'high';
    if (avgMessagesPerParticipant >= 5) return 'medium';
    return 'low';
  }

  private extractTopics(messages: Message[]): string[] {
    // Simple keyword extraction - in production, use topic modeling
    const topicKeywords = [
      'design', 'development', 'testing', 'deployment', 'meeting',
      'deadline', 'review', 'feedback', 'bug', 'feature'
    ];

    const topics = new Set<string>();
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      topicKeywords.forEach(topic => {
        if (content.includes(topic)) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  private extractDecisions(messages: Message[]): string[] {
    const decisionKeywords = ['decided', 'agreed', 'conclusion', 'resolved', 'final decision'];
    const decisions: string[] = [];

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      if (decisionKeywords.some(keyword => content.includes(keyword))) {
        decisions.push(message.content);
      }
    });

    return decisions;
  }

  private analyzeCommunicationPatterns(messages: Message[]): CommunicationPattern[] {
    const patterns: CommunicationPattern[] = [];

    // Analyze response time pattern
    const responseTimes = this.calculateResponseTimes(messages);
    if (responseTimes.average > 7200000) { // > 2 hours
      patterns.push({
        type: 'response_time',
        description: 'Slow response times may impact collaboration efficiency',
        trend: 'declining',
        impact: 'negative',
        suggestions: [
          'Set communication expectations',
          'Use urgent flags for time-sensitive items',
          'Consider asynchronous communication strategies'
        ]
      });
    }

    return patterns;
  }

  private calculateParticipationBalance(messages: Message[], participants: MessageUser[]): Record<string, number> {
    const participationCounts: Record<string, number> = {};

    participants.forEach(participant => {
      participationCounts[participant.id] = 0;
    });

    messages.forEach(message => {
      participationCounts[message.author.id]++;
    });

    // Convert to percentages
    const total = messages.length;
    Object.keys(participationCounts).forEach(id => {
      participationCounts[id] = (participationCounts[id] / total) * 100;
    });

    return participationCounts;
  }

  private calculateCollaborationScore(messages: Message[]): number {
    // Simple collaboration scoring based on interaction patterns
    let collaborationEvents = 0;
    const collaborationKeywords = ['thanks', 'great idea', 'i agree', 'let me help', 'good point'];

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      if (collaborationKeywords.some(keyword => content.includes(keyword))) {
        collaborationEvents++;
      }
    });

    return Math.min(100, (collaborationEvents / messages.length) * 100);
  }

  private calculateCommunicationEffectiveness(messages: Message[]): number {
    // Score based on clarity indicators
    const clarityIndicators = ['clear', 'understand', 'makes sense', 'got it', 'confirmed'];
    const confusionIndicators = ['confused', 'unclear', 'dont understand', 'what do you mean'];

    let clarityScore = 0;
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      if (clarityIndicators.some(indicator => content.includes(indicator))) {
        clarityScore += 1;
      }
      if (confusionIndicators.some(indicator => content.includes(indicator))) {
        clarityScore -= 1;
      }
    });

    return Math.max(0, Math.min(100, 50 + (clarityScore / messages.length) * 50));
  }

  private detectConflictIndicators(messages: Message[]): ConflictIndicator[] {
    const conflicts: ConflictIndicator[] = [];
    const conflictKeywords = ['disagree', 'wrong', 'bad idea', 'problem with', 'issue with'];

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      if (conflictKeywords.some(keyword => content.includes(keyword))) {
        conflicts.push({
          type: 'disagreement',
          severity: 'medium',
          participants: [message.author.id],
          description: `Potential disagreement detected in message: "${message.content.substring(0, 100)}..."`,
          suggestedResolution: 'Schedule a discussion to align on approach'
        });
      }
    });

    return conflicts;
  }

  private determineTeamHealth(
    collaborationScore: number,
    communicationEffectiveness: number,
    conflictIndicators: ConflictIndicator[]
  ): 'excellent' | 'good' | 'fair' | 'needs_attention' {
    const avgScore = (collaborationScore + communicationEffectiveness) / 2;
    const highConflicts = conflictIndicators.filter(c => c.severity === 'high').length;

    if (avgScore >= 80 && highConflicts === 0) return 'excellent';
    if (avgScore >= 60 && highConflicts <= 1) return 'good';
    if (avgScore >= 40 && highConflicts <= 2) return 'fair';
    return 'needs_attention';
  }

  private async calculateQuickMetrics(messages: Message[]): Promise<ConversationMetrics> {
    // Simplified version for real-time analysis
    const participants = this.getUniqueParticipants(messages);
    const responseTimeMetrics = this.calculateResponseTimes(messages);

    return {
      id: `quick-metrics-${Date.now()}`,
      conversationId: 'real-time',
      analyzedAt: new Date(),
      participantCount: participants.length,
      messageCount: messages.length,
      avgResponseTime: responseTimeMetrics.average,
      sentimentScore: await this.analyzeSentiment(messages),
      engagementLevel: this.calculateEngagementLevel(messages),
      topicCoverage: this.extractTopics(messages),
      keyDecisions: [],
      actionItems: [],
      communicationPatterns: []
    };
  }

  private async detectLivePatterns(messages: Message[]): Promise<CommunicationPattern[]> {
    // Quick pattern detection for real-time feedback
    const patterns: CommunicationPattern[] = [];

    if (messages.length >= 3) {
      const recentResponseTimes = this.calculateResponseTimes(messages.slice(-3));
      if (recentResponseTimes.average < 300000) { // < 5 minutes
        patterns.push({
          type: 'engagement',
          description: 'High engagement: Quick responses detected',
          trend: 'improving',
          impact: 'positive',
          suggestions: ['Maintain this engagement level', 'Consider documenting key decisions']
        });
      }
    }

    return patterns;
  }

  private async generateQuickRecommendations(patterns: CommunicationPattern[]): Promise<Recommendation[]> {
    return patterns.map((pattern, index) => ({
      id: `quick-rec-${index}`,
      category: 'communication',
      priority: 'low',
      title: `${pattern.type} Pattern Detected`,
      description: pattern.description,
      actionable: true,
      estimatedImpact: 'low',
      implementation: pattern.suggestions
    }));
  }

  // Additional helper methods for project progress analysis
  private extractProgressIndicators(messages: Message[]): string[] {
    const progressKeywords = [
      'completed', 'finished', 'done', 'deployed', 'shipped',
      'started', 'beginning', 'working on', 'in progress'
    ];

    const indicators: string[] = [];
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      progressKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          indicators.push(keyword);
        }
      });
    });

    return indicators;
  }

  private identifyBlockers(messages: Message[]): string[] {
    const blockerKeywords = ['blocked', 'stuck', 'waiting for', 'dependency', 'issue', 'problem'];
    const blockers: string[] = [];

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      if (blockerKeywords.some(keyword => content.includes(keyword))) {
        blockers.push(message.content);
      }
    });

    return blockers;
  }

  private calculateMomentum(messages: Message[]): 'accelerating' | 'steady' | 'slowing' | 'stalled' {
    if (messages.length < 5) return 'steady';

    const recent = messages.slice(-3);
    const older = messages.slice(-6, -3);

    if (recent.length > older.length * 1.2) return 'accelerating';
    if (recent.length < older.length * 0.8) return 'slowing';
    if (recent.length === 0) return 'stalled';
    return 'steady';
  }

  private determineProjectPhase(indicators: string[]): string {
    const completionWords = ['completed', 'finished', 'done', 'deployed'];
    const startWords = ['started', 'beginning', 'planning'];

    const completionCount = indicators.filter(i => completionWords.includes(i)).length;
    const startCount = indicators.filter(i => startWords.includes(i)).length;

    if (completionCount > startCount) return 'completion';
    if (startCount > 0) return 'development';
    return 'planning';
  }

  private estimateCompletion(indicators: string[], momentum: string): number {
    let baseEstimate = 0.5; // 50% default

    // Adjust based on momentum
    switch (momentum) {
      case 'accelerating': baseEstimate += 0.2; break;
      case 'slowing': baseEstimate -= 0.2; break;
      case 'stalled': baseEstimate -= 0.3; break;
    }

    return Math.max(0, Math.min(1, baseEstimate));
  }

  private identifyRiskFactors(messages: Message[], blockers: string[]): string[] {
    const risks: string[] = [];

    if (blockers.length > 3) {
      risks.push('Multiple blockers may delay project');
    }

    const recentMessages = messages.slice(-5);
    if (recentMessages.length < 2) {
      risks.push('Low communication frequency');
    }

    return risks;
  }

  private generateProjectRecommendations(momentum: string, blockers: string[]): string[] {
    const recommendations: string[] = [];

    if (momentum === 'slowing' || momentum === 'stalled') {
      recommendations.push('Schedule standup to identify and resolve blockers');
      recommendations.push('Review project timeline and adjust expectations');
    }

    if (blockers.length > 2) {
      recommendations.push('Prioritize blocker resolution');
      recommendations.push('Consider parallel workstreams to maintain momentum');
    }

    return recommendations;
  }

  private calculateResponseTimeTrend(messages: Message[]): 'improving' | 'declining' | 'stable' {
    if (messages.length < 10) return 'stable';

    const recent = messages.slice(-5);
    const older = messages.slice(-10, -5);

    const recentAvg = this.calculateResponseTimes(recent).average;
    const olderAvg = this.calculateResponseTimes(older).average;

    if (recentAvg < olderAvg * 0.8) return 'improving';
    if (recentAvg > olderAvg * 1.2) return 'declining';
    return 'stable';
  }

  private calculateEngagementTrend(messages: Message[]): 'increasing' | 'decreasing' | 'stable' {
    if (messages.length < 10) return 'stable';

    const recentEngagement = this.calculateEngagementLevel(messages.slice(-5));
    const olderEngagement = this.calculateEngagementLevel(messages.slice(-10, -5));

    const levels = { low: 1, medium: 2, high: 3 };

    if (levels[recentEngagement] > levels[olderEngagement]) return 'increasing';
    if (levels[recentEngagement] < levels[olderEngagement]) return 'decreasing';
    return 'stable';
  }

  private calculateSentimentTrend(messages: Message[]): 'positive' | 'negative' | 'neutral' {
    if (messages.length < 10) return 'neutral';

    const recentSentiment = this.analyzeSentiment(messages.slice(-5));
    const olderSentiment = this.analyzeSentiment(messages.slice(-10, -5));

    const diff = (recentSentiment as any) - (olderSentiment as any);

    if (diff > 0.1) return 'positive';
    if (diff < -0.1) return 'negative';
    return 'neutral';
  }

  private calculateProductivityTrend(messages: Message[]): 'improving' | 'declining' | 'stable' {
    const actionKeywords = ['completed', 'finished', 'done', 'shipped'];

    if (messages.length < 10) return 'stable';

    const recentActions = messages.slice(-5).filter(m =>
      actionKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
    ).length;

    const olderActions = messages.slice(-10, -5).filter(m =>
      actionKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
    ).length;

    if (recentActions > olderActions) return 'improving';
    if (recentActions < olderActions) return 'declining';
    return 'stable';
  }

  private generateCacheKey(conversationId: string, messageCount: number): string {
    return `${conversationId}-${messageCount}-${Math.floor(Date.now() / 300000)}`; // 5-minute cache
  }

  /**
   * Clear insights cache
   */
  clearCache(): void {
    this.insightsCache.clear();
  }

  /**
   * Get cached insights
   */
  getCachedInsights(conversationId: string, messageCount: number): InsightSummary | null {
    const cacheKey = this.generateCacheKey(conversationId, messageCount);
    return this.insightsCache.get(cacheKey) || null;
  }
}

// Singleton instance
export const conversationInsightsService = new ConversationInsightsService();

export type {
  ConversationMetrics,
  ActionItem,
  CommunicationPattern,
  ProjectProgressInsight,
  TeamDynamics,
  ConflictIndicator,
  InsightSummary,
  Recommendation,
  TrendAnalysis
};

export default conversationInsightsService;