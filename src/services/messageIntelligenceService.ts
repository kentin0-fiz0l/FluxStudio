/**
 * Message Intelligence Service
 * Advanced message classification, content analysis, and workflow automation
 */

import { Message, Conversation } from '../types/messaging';

// Enhanced message classification types
export type MessageCategory =
  | 'design-feedback'
  | 'approval-request'
  | 'question'
  | 'update'
  | 'deadline'
  | 'resource-share'
  | 'brainstorm'
  | 'issue-report'
  | 'celebration'
  | 'coordination';

export type MessageIntent =
  | 'action-required'
  | 'information-sharing'
  | 'decision-needed'
  | 'feedback-request'
  | 'status-update'
  | 'social-interaction';

export type MessageUrgency = 'critical' | 'high' | 'medium' | 'low';

export interface MessageAnalysis {
  category: MessageCategory;
  intent: MessageIntent;
  urgency: MessageUrgency;
  confidence: number;
  extractedData: {
    actionItems?: string[];
    deadlines?: Date[];
    mentions?: string[];
    designReferences?: string[];
    emotions?: ('positive' | 'negative' | 'neutral' | 'excited' | 'concerned')[];
    questions?: string[];
    decisions?: string[];
  };
  suggestedResponses?: string[];
  relatedMessages?: string[];
  workflowTriggers?: string[];
}

export interface ContentAnalysisPatterns {
  // Design feedback patterns
  feedbackKeywords: string[];
  approvalKeywords: string[];
  rejectionKeywords: string[];

  // Action patterns
  actionVerbs: string[];
  urgencyIndicators: string[];
  timeExpressions: RegExp[];

  // Question patterns
  questionStarters: string[];
  questionMarkers: RegExp[];

  // Design-specific patterns
  designTerms: string[];
  colorReferences: RegExp;
  fontReferences: RegExp;
  sizeReferences: RegExp;
}

class MessageIntelligenceService {
  private patterns: ContentAnalysisPatterns;
  private analysisCache = new Map<string, MessageAnalysis>();

  constructor() {
    this.patterns = this.initializePatterns();
  }

  private initializePatterns(): ContentAnalysisPatterns {
    return {
      feedbackKeywords: [
        'feedback', 'review', 'thoughts', 'opinion', 'suggestion', 'improvement',
        'change', 'modify', 'adjust', 'tweak', 'refine', 'enhance', 'better',
        'like', 'love', 'prefer', 'dislike', 'concern', 'issue', 'problem'
      ],

      approvalKeywords: [
        'approve', 'approved', 'accept', 'accepted', 'looks good', 'perfect',
        'great work', 'excellent', 'sign off', 'final', 'publish', 'launch',
        'go ahead', 'proceed', 'confirmed', 'authorized'
      ],

      rejectionKeywords: [
        'reject', 'rejected', 'decline', 'declined', 'not approved', 'issues',
        'problems', 'concerns', 'revise', 'redo', 'start over', 'back to drawing board'
      ],

      actionVerbs: [
        'create', 'design', 'build', 'develop', 'implement', 'update', 'modify',
        'fix', 'resolve', 'complete', 'finish', 'deliver', 'send', 'share',
        'review', 'check', 'verify', 'test', 'validate', 'schedule', 'meet'
      ],

      urgencyIndicators: [
        'urgent', 'asap', 'immediately', 'rush', 'priority', 'critical',
        'deadline', 'due', 'emergency', 'important', 'time-sensitive'
      ],

      timeExpressions: [
        /(?:by|due|before|until)\s+(?:tomorrow|today|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
        /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
        /\d{1,2}-\d{1,2}-\d{2,4}/g,
        /(?:in\s+)?\d+\s+(?:days?|weeks?|months?|hours?)/gi
      ],

      questionStarters: [
        'what', 'when', 'where', 'who', 'why', 'how', 'which', 'would',
        'could', 'should', 'can', 'do you', 'did you', 'will you',
        'have you', 'are you', 'is it', 'are there'
      ],

      questionMarkers: [
        /\?/g,
        /(?:what|when|where|who|why|how|which)\s+(?:do|did|would|could|should|can|will|have|are|is)/gi
      ],

      designTerms: [
        'color', 'font', 'typography', 'layout', 'composition', 'spacing',
        'margin', 'padding', 'alignment', 'contrast', 'saturation', 'brightness',
        'logo', 'brand', 'palette', 'scheme', 'gradient', 'shadow', 'border',
        'texture', 'pattern', 'style', 'theme', 'aesthetic', 'visual', 'graphic'
      ],

      colorReferences: /#[0-9A-Fa-f]{6}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/g,
      fontReferences: /(?:font-family|font|typeface):\s*[^;]+/gi,
      sizeReferences: /\d+(?:px|pt|em|rem|%)/g
    };
  }

  public async analyzeMessage(message: Message, conversation: Conversation): Promise<MessageAnalysis> {
    // Check cache first
    const cacheKey = `${message.id}-${message.updatedAt?.getTime() || message.createdAt.getTime()}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const analysis = await this.performAnalysis(message, conversation);
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  private async performAnalysis(message: Message, conversation: Conversation): Promise<MessageAnalysis> {
    const content = message.content.toLowerCase();
    const originalContent = message.content;

    // Determine message category
    const category = this.categorizeMessage(content, message, conversation);

    // Determine intent
    const intent = this.determineIntent(content, message);

    // Assess urgency
    const urgency = this.assessUrgency(content, message, conversation);

    // Extract structured data
    const extractedData = this.extractStructuredData(originalContent, message);

    // Generate suggested responses
    const suggestedResponses = this.generateSuggestedResponses(category, intent, extractedData);

    // Find related messages
    const relatedMessages = await this.findRelatedMessages(message, conversation);

    // Determine workflow triggers
    const workflowTriggers = this.identifyWorkflowTriggers(category, intent, extractedData);

    // Calculate confidence score
    const confidence = this.calculateConfidence(category, intent, extractedData);

    return {
      category,
      intent,
      urgency,
      confidence,
      extractedData,
      suggestedResponses,
      relatedMessages,
      workflowTriggers
    };
  }

  private categorizeMessage(content: string, message: Message, _conversation: Conversation): MessageCategory {
    // Check for design feedback
    if (this.hasKeywords(content, this.patterns.feedbackKeywords) ||
        this.hasKeywords(content, this.patterns.designTerms)) {
      return 'design-feedback';
    }

    // Check for approval requests
    if (this.hasKeywords(content, this.patterns.approvalKeywords) ||
        content.includes('approve') || content.includes('sign off')) {
      return 'approval-request';
    }

    // Check for questions
    if (this.hasPatterns(content, this.patterns.questionMarkers) ||
        this.hasKeywords(content, this.patterns.questionStarters)) {
      return 'question';
    }

    // Check for deadlines
    if (this.hasPatterns(content, this.patterns.timeExpressions) ||
        this.hasKeywords(content, this.patterns.urgencyIndicators)) {
      return 'deadline';
    }

    // Check for file/resource sharing
    if (message.attachments && message.attachments.length > 0) {
      return 'resource-share';
    }

    // Check for brainstorming
    if (content.includes('idea') || content.includes('brainstorm') ||
        content.includes('concept') || content.includes('inspiration')) {
      return 'brainstorm';
    }

    // Check for issues
    if (content.includes('issue') || content.includes('problem') ||
        content.includes('error') || content.includes('bug')) {
      return 'issue-report';
    }

    // Check for celebrations
    if (content.includes('great') || content.includes('awesome') ||
        content.includes('perfect') || content.includes('congratulations')) {
      return 'celebration';
    }

    // Default to update if it contains action verbs
    if (this.hasKeywords(content, this.patterns.actionVerbs)) {
      return 'coordination';
    }

    return 'update';
  }

  private determineIntent(content: string, _message: Message): MessageIntent {
    // Action required
    if (this.hasKeywords(content, this.patterns.actionVerbs) ||
        this.hasKeywords(content, ['please', 'can you', 'could you', 'need', 'require'])) {
      return 'action-required';
    }

    // Decision needed
    if (this.hasKeywords(content, ['decide', 'choose', 'pick', 'select', 'approve', 'confirm'])) {
      return 'decision-needed';
    }

    // Feedback request
    if (this.hasKeywords(content, this.patterns.feedbackKeywords) ||
        this.hasKeywords(content, ['opinion', 'thoughts', 'review'])) {
      return 'feedback-request';
    }

    // Status update
    if (this.hasKeywords(content, ['update', 'progress', 'status', 'completed', 'finished', 'done'])) {
      return 'status-update';
    }

    // Social interaction
    if (this.hasKeywords(content, ['thanks', 'thank you', 'great', 'awesome', 'love', 'like'])) {
      return 'social-interaction';
    }

    return 'information-sharing';
  }

  private assessUrgency(content: string, _message: Message, conversation: Conversation): MessageUrgency {
    // Critical urgency
    if (this.hasKeywords(content, ['urgent', 'critical', 'emergency', 'asap', 'immediately'])) {
      return 'critical';
    }

    // High urgency
    if (this.hasKeywords(content, ['important', 'priority', 'deadline', 'rush']) ||
        this.hasPatterns(content, this.patterns.timeExpressions)) {
      return 'high';
    }

    // Check conversation context
    if (conversation.metadata?.priority === 'high' || conversation.metadata?.priority === 'critical') {
      return 'high';
    }

    // Medium urgency for questions and feedback requests
    if (this.hasPatterns(content, this.patterns.questionMarkers) ||
        this.hasKeywords(content, this.patterns.feedbackKeywords)) {
      return 'medium';
    }

    return 'low';
  }

  private extractStructuredData(content: string, _message: Message) {
    const data: MessageAnalysis['extractedData'] = {};

    // Extract action items
    const actionItems = this.extractActionItems(content);
    if (actionItems.length > 0) data.actionItems = actionItems;

    // Extract deadlines
    const deadlines = this.extractDeadlines(content);
    if (deadlines.length > 0) data.deadlines = deadlines;

    // Extract mentions
    const mentions = this.extractMentions(content);
    if (mentions.length > 0) data.mentions = mentions;

    // Extract design references
    const designReferences = this.extractDesignReferences(content);
    if (designReferences.length > 0) data.designReferences = designReferences;

    // Extract emotions
    const emotions = this.extractEmotions(content);
    if (emotions.length > 0) data.emotions = emotions;

    // Extract questions
    const questions = this.extractQuestions(content);
    if (questions.length > 0) data.questions = questions;

    // Extract decisions
    const decisions = this.extractDecisions(content);
    if (decisions.length > 0) data.decisions = decisions;

    return data;
  }

  private extractActionItems(content: string): string[] {
    const actionItems: string[] = [];
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (this.hasKeywords(trimmed.toLowerCase(), this.patterns.actionVerbs) &&
          (trimmed.includes('please') || trimmed.includes('can you') ||
           trimmed.includes('could you') || trimmed.includes('need to'))) {
        actionItems.push(trimmed);
      }
    }

    return actionItems;
  }

  private extractDeadlines(content: string): Date[] {
    const deadlines: Date[] = [];

    for (const pattern of this.patterns.timeExpressions) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const date = this.parseDate(match);
          if (date) deadlines.push(date);
        }
      }
    }

    return deadlines;
  }

  private extractMentions(content: string): string[] {
    const mentions = content.match(/@[\w]+/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  private extractDesignReferences(content: string): string[] {
    const references: string[] = [];

    // Extract color references
    const colors = content.match(this.patterns.colorReferences) || [];
    references.push(...colors);

    // Extract font references
    const fonts = content.match(this.patterns.fontReferences) || [];
    references.push(...fonts);

    // Extract size references
    const sizes = content.match(this.patterns.sizeReferences) || [];
    references.push(...sizes);

    return references;
  }

  private extractEmotions(content: string): Array<'positive' | 'negative' | 'neutral' | 'excited' | 'concerned'> {
    const emotions: Array<'positive' | 'negative' | 'neutral' | 'excited' | 'concerned'> = [];

    if (this.hasKeywords(content, ['love', 'awesome', 'great', 'perfect', 'excellent', 'amazing'])) {
      emotions.push('positive');
    }

    if (this.hasKeywords(content, ['excited', 'can\'t wait', 'thrilled', 'fantastic'])) {
      emotions.push('excited');
    }

    if (this.hasKeywords(content, ['concern', 'worried', 'issue', 'problem', 'disappointed'])) {
      emotions.push('concerned');
    }

    if (this.hasKeywords(content, ['hate', 'terrible', 'awful', 'bad', 'wrong', 'failed'])) {
      emotions.push('negative');
    }

    if (emotions.length === 0) {
      emotions.push('neutral');
    }

    return emotions;
  }

  private extractQuestions(content: string): string[] {
    const questions: string[] = [];
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.includes('?') ||
          this.hasKeywords(trimmed.toLowerCase(), this.patterns.questionStarters)) {
        questions.push(trimmed);
      }
    }

    return questions;
  }

  private extractDecisions(content: string): string[] {
    const decisions: string[] = [];
    const decisionKeywords = ['decided', 'choose', 'selected', 'picked', 'approved', 'confirmed'];
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (this.hasKeywords(trimmed.toLowerCase(), decisionKeywords)) {
        decisions.push(trimmed);
      }
    }

    return decisions;
  }

  private generateSuggestedResponses(
    category: MessageCategory,
    _intent: MessageIntent,
    _extractedData: MessageAnalysis['extractedData']
  ): string[] {
    const responses: string[] = [];

    switch (category) {
      case 'design-feedback':
        responses.push(
          "Thanks for the feedback! I'll incorporate these changes.",
          "Great points! Let me work on those adjustments.",
          "I appreciate the detailed feedback. When would you like to see the revisions?"
        );
        break;

      case 'approval-request':
        responses.push(
          "This looks great! Approved.",
          "I have a few minor suggestions before approval.",
          "Let me review this and get back to you by end of day."
        );
        break;

      case 'question':
        responses.push(
          "Let me look into that and get back to you.",
          "Great question! Here's what I think...",
          "I'll need to check on that - give me a few minutes."
        );
        break;

      case 'deadline':
        responses.push(
          "Got it! I'll prioritize this and have it ready on time.",
          "Thanks for the heads up. I'll adjust my timeline accordingly.",
          "Is there any flexibility on this deadline if needed?"
        );
        break;

      default:
        responses.push(
          "Thanks for the update!",
          "Noted - I'll take care of this.",
          "Perfect, let me know if you need anything else."
        );
    }

    return responses.slice(0, 3); // Return top 3 suggestions
  }

  private async findRelatedMessages(_message: Message, _conversation: Conversation): Promise<string[]> {
    // This would integrate with the messaging service to find related messages
    // For now, return empty array - would be implemented with vector similarity search
    return [];
  }

  private identifyWorkflowTriggers(
    category: MessageCategory,
    intent: MessageIntent,
    extractedData: MessageAnalysis['extractedData']
  ): string[] {
    const triggers: string[] = [];

    if (category === 'approval-request') {
      triggers.push('create-approval-task');
    }

    if (extractedData.deadlines && extractedData.deadlines.length > 0) {
      triggers.push('schedule-deadline-reminder');
    }

    if (intent === 'action-required') {
      triggers.push('create-action-item');
    }

    if (category === 'design-feedback') {
      triggers.push('track-feedback-incorporation');
    }

    return triggers;
  }

  private calculateConfidence(
    category: MessageCategory,
    intent: MessageIntent,
    extractedData: MessageAnalysis['extractedData']
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on extracted data richness
    if (extractedData.actionItems && extractedData.actionItems.length > 0) confidence += 0.1;
    if (extractedData.deadlines && extractedData.deadlines.length > 0) confidence += 0.1;
    if (extractedData.emotions && extractedData.emotions.length > 0) confidence += 0.1;
    if (extractedData.questions && extractedData.questions.length > 0) confidence += 0.1;
    if (extractedData.designReferences && extractedData.designReferences.length > 0) confidence += 0.1;

    // Increase confidence for clear patterns
    if (category === 'approval-request' && intent === 'decision-needed') confidence += 0.1;
    if (category === 'question' && extractedData.questions) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private hasKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  private hasPatterns(content: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(content));
  }

  private parseDate(dateString: string): Date | null {
    // Enhanced date parsing logic
    const now = new Date();

    // Handle relative dates
    if (dateString.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    if (dateString.includes('today')) {
      return new Date(now);
    }

    if (dateString.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }

    // Handle specific dates
    const dateMatch = dateString.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    if (dateMatch) {
      return new Date(dateMatch[0]);
    }

    // Handle "in X days" format
    const daysMatch = dateString.match(/in\s+(\d+)\s+days?/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate;
    }

    return null;
  }

  public clearCache(): void {
    this.analysisCache.clear();
  }

  public getCacheSize(): number {
    return this.analysisCache.size;
  }
}

// Export singleton instance
export const messageIntelligenceService = new MessageIntelligenceService();