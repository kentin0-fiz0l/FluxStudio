/**
 * Context Detection Service - Smart Auto-Routing for Messages
 * Analyzes conversation patterns and automatically categorizes/routes messages
 */

import {
  Message,
  Conversation,
  ConversationType,
  Priority,
  MessageUser
} from '../types/messaging';

export interface ContextAnalysis {
  suggestedType: ConversationType;
  suggestedPriority: Priority;
  confidence: number;
  reasoning: string[];
  suggestedParticipants: string[];
  autoTags: string[];
}

export interface MessageIntent {
  intent: 'feedback' | 'approval' | 'question' | 'update' | 'meeting' | 'urgent' | 'general';
  confidence: number;
  keywords: string[];
}

class ContextDetectionService {
  // Keywords for different intents and priorities
  private readonly intentKeywords = {
    feedback: ['feedback', 'thoughts', 'opinion', 'review', 'what do you think', 'looks like', 'impression'],
    approval: ['approve', 'approval', 'final', 'sign off', 'confirm', 'go ahead', 'ready to', 'finalize'],
    question: ['?', 'question', 'wondering', 'how', 'why', 'when', 'where', 'what', 'quick question'],
    update: ['update', 'progress', 'status', 'completed', 'finished', 'working on', 'milestone'],
    meeting: ['meeting', 'call', 'schedule', 'discuss', 'chat', 'talk', 'session', 'consultation'],
    urgent: ['urgent', 'asap', 'immediately', 'rush', 'deadline', 'emergency', 'critical', 'important'],
    general: []
  };

  private readonly priorityKeywords = {
    critical: ['emergency', 'critical', 'urgent', 'asap', 'immediately', 'crisis'],
    high: ['important', 'priority', 'deadline', 'soon', 'quick', 'rush'],
    medium: ['please', 'when you can', 'feedback', 'review', 'thoughts'],
    low: ['whenever', 'no rush', 'when you have time', 'later', 'fyi']
  };

  private readonly conversationTypeIndicators = {
    direct: ['private', 'one on one', 'just between us', 'personally'],
    project: ['project', 'deliverable', 'milestone', 'scope', 'timeline', 'design'],
    team: ['team', 'everyone', 'all', 'group', 'standup', 'sync'],
    consultation: ['meeting', 'session', 'consultation', 'discuss', 'brainstorm'],
    support: ['help', 'issue', 'problem', 'bug', 'support', 'assistance'],
    broadcast: ['announce', 'announcement', 'everyone', 'all', 'fyi', 'update all']
  };

  /**
   * Analyze message content to detect intent and suggest context
   */
  analyzeMessageIntent(content: string): MessageIntent {
    const normalizedContent = content.toLowerCase();
    const scores: Record<string, number> = {};

    // Score each intent based on keyword matches
    Object.entries(this.intentKeywords).forEach(([intent, keywords]) => {
      scores[intent] = keywords.reduce((score, keyword) => {
        if (normalizedContent.includes(keyword)) {
          return score + 1;
        }
        return score;
      }, 0);
    });

    // Find the highest scoring intent
    const sortedIntents = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a);

    if (sortedIntents.length === 0) {
      return {
        intent: 'general',
        confidence: 0.5,
        keywords: []
      };
    }

    const [topIntent, topScore] = sortedIntents[0];
    const matchedKeywords = this.intentKeywords[topIntent as keyof typeof this.intentKeywords]
      .filter(keyword => normalizedContent.includes(keyword));

    return {
      intent: topIntent as MessageIntent['intent'],
      confidence: Math.min(topScore / 3, 1), // Normalize confidence
      keywords: matchedKeywords
    };
  }

  /**
   * Suggest conversation context based on message content and participants
   */
  suggestConversationContext(
    messageContent: string,
    participants: MessageUser[],
    _currentUser: MessageUser,
    _existingConversations: Conversation[] = []
  ): ContextAnalysis {
    const messageIntent = this.analyzeMessageIntent(messageContent);
    const normalizedContent = messageContent.toLowerCase();

    // Analyze participant types
    const hasClients = participants.some(p => p.userType === 'client');
    const hasMultipleUsers = participants.length > 1;

    // Determine conversation type
    let suggestedType: ConversationType = 'direct';
    let confidence = 0.5;
    const reasoning: string[] = [];

    // Type detection logic
    if (messageIntent.intent === 'approval' && hasClients) {
      suggestedType = 'direct';
      confidence = 0.9;
      reasoning.push('Approval request with client suggests direct conversation');
    } else if (messageIntent.intent === 'meeting') {
      suggestedType = 'consultation';
      confidence = 0.8;
      reasoning.push('Meeting request suggests consultation session');
    } else if (hasMultipleUsers && !hasClients) {
      suggestedType = 'team';
      confidence = 0.7;
      reasoning.push('Multiple team members suggests team conversation');
    } else if (normalizedContent.includes('project')) {
      suggestedType = 'project';
      confidence = 0.8;
      reasoning.push('Project-related content detected');
    } else if (messageIntent.intent === 'urgent' && hasClients) {
      suggestedType = 'support';
      confidence = 0.7;
      reasoning.push('Urgent client issue suggests support conversation');
    }

    // Check against conversation type indicators
    Object.entries(this.conversationTypeIndicators).forEach(([type, keywords]) => {
      const matches = keywords.filter(keyword => normalizedContent.includes(keyword));
      if (matches.length > 0) {
        suggestedType = type as ConversationType;
        confidence = Math.max(confidence, 0.6 + (matches.length * 0.1));
        reasoning.push(`Keywords "${matches.join(', ')}" suggest ${type} conversation`);
      }
    });

    // Determine priority
    let suggestedPriority: Priority = 'medium';
    if (messageIntent.intent === 'urgent') {
      suggestedPriority = 'high';
      reasoning.push('Urgent intent detected');
    } else if (messageIntent.intent === 'approval') {
      suggestedPriority = 'high';
      reasoning.push('Approval requests are high priority');
    } else if (messageIntent.intent === 'question') {
      suggestedPriority = 'medium';
    }

    // Check priority keywords
    Object.entries(this.priorityKeywords).forEach(([priority, keywords]) => {
      const matches = keywords.filter(keyword => normalizedContent.includes(keyword));
      if (matches.length > 0) {
        suggestedPriority = priority as Priority;
        reasoning.push(`Priority keywords "${matches.join(', ')}" detected`);
      }
    });

    // Generate auto-tags based on content
    const autoTags: string[] = [];
    if (messageIntent.intent !== 'general') {
      autoTags.push(messageIntent.intent);
    }
    if (normalizedContent.includes('design')) autoTags.push('design');
    if (normalizedContent.includes('deadline')) autoTags.push('deadline');
    if (normalizedContent.includes('client')) autoTags.push('client');
    if (normalizedContent.includes('feedback')) autoTags.push('feedback');

    // Suggest additional participants based on context
    const suggestedParticipants: string[] = [];
    if (suggestedType === 'project' && messageIntent.intent === 'approval') {
      // Suggest project stakeholders for approval
      reasoning.push('Project approval may require additional stakeholders');
    }

    return {
      suggestedType,
      suggestedPriority,
      confidence,
      reasoning,
      suggestedParticipants,
      autoTags
    };
  }

  /**
   * Analyze conversation patterns to suggest improvements
   */
  analyzeConversationPatterns(conversations: Conversation[]): {
    insights: string[];
    suggestions: string[];
    trends: Record<string, number>;
  } {
    const insights: string[] = [];
    const suggestions: string[] = [];
    const trends: Record<string, number> = {
      avgResponseTime: 0,
      highPriorityRatio: 0,
      clientSatisfactionScore: 0,
      mostActiveType: 0
    };

    // Calculate conversation type distribution
    const typeDistribution = conversations.reduce((acc, conv) => {
      acc[conv.type] = (acc[conv.type] || 0) + 1;
      return acc;
    }, {} as Record<ConversationType, number>);

    const totalConversations = conversations.length;
    const highPriorityCount = conversations.filter(
      conv => conv.metadata.priority === 'high' || conv.metadata.priority === 'critical'
    ).length;

    trends.highPriorityRatio = totalConversations > 0 ? highPriorityCount / totalConversations : 0;

    // Generate insights
    if (trends.highPriorityRatio > 0.3) {
      insights.push('High volume of urgent conversations detected');
      suggestions.push('Consider implementing better project planning to reduce urgent requests');
    }

    const mostActiveType = Object.entries(typeDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as ConversationType;

    if (mostActiveType === 'support') {
      insights.push('High support conversation volume');
      suggestions.push('Consider creating better documentation or FAQ resources');
    } else if (mostActiveType === 'project') {
      insights.push('Project-focused communication pattern');
      suggestions.push('Excellent project-centric communication');
    }

    // Check for communication efficiency
    const activeConversations = conversations.filter(conv => !conv.metadata.isArchived);
    if (activeConversations.length > 20) {
      suggestions.push('Consider archiving completed conversations to reduce clutter');
    }

    return { insights, suggestions, trends };
  }

  /**
   * Smart routing: automatically route messages to appropriate channels
   */
  smartRoute(
    message: Partial<Message>,
    availableConversations: Conversation[],
    _currentUser: MessageUser
  ): {
    suggestedConversation?: Conversation;
    shouldCreateNew: boolean;
    reasoning: string[];
  } {
    const reasoning: string[] = [];

    if (!message.content) {
      return { shouldCreateNew: true, reasoning: ['No content to analyze'] };
    }

    const intent = this.analyzeMessageIntent(message.content);

    // Try to find existing conversation that matches intent
    const relevantConversations = availableConversations.filter(conv => {
      // Match by type and participants
      if (intent.intent === 'approval' && conv.type === 'direct') {
        return true;
      }
      if (intent.intent === 'meeting' && conv.type === 'consultation') {
        return true;
      }
      if (intent.intent === 'update' && conv.type === 'project') {
        return true;
      }
      return false;
    });

    // Sort by relevance (recent activity, unread count, etc.)
    const sortedConversations = relevantConversations.sort((a, b) => {
      const aRecent = new Date(a.lastActivity).getTime();
      const bRecent = new Date(b.lastActivity).getTime();
      return bRecent - aRecent;
    });

    if (sortedConversations.length > 0) {
      const suggested = sortedConversations[0];
      reasoning.push(`Found existing ${suggested.type} conversation: "${suggested.name}"`);
      reasoning.push(`Intent "${intent.intent}" matches conversation context`);

      return {
        suggestedConversation: suggested,
        shouldCreateNew: false,
        reasoning
      };
    }

    reasoning.push(`No existing conversation matches intent "${intent.intent}"`);
    reasoning.push('Recommend creating new conversation');

    return {
      shouldCreateNew: true,
      reasoning
    };
  }
}

export const contextDetectionService = new ContextDetectionService();
export default contextDetectionService;