/**
 * AI Content Generation Service
 * Smart content generation for messages, responses, and creative copy
 */

import { Message, MessageUser, Conversation } from '../types/messaging';

interface ContentGenerationContext {
  conversationHistory: Message[];
  currentUser: MessageUser;
  conversation: Conversation;
  intent?: 'response' | 'follow_up' | 'creative' | 'professional' | 'feedback' | 'summary';
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'creative' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
  industry?: string;
  projectType?: string;
}

interface GeneratedContent {
  id: string;
  content: string;
  confidence: number;
  tone: string;
  intent: string;
  alternatives?: string[];
  reasoning?: string;
  suggestedImprovement?: string;
}

interface SmartSuggestion {
  id: string;
  type: 'completion' | 'response' | 'alternative' | 'enhancement';
  trigger: string;
  suggestion: string;
  confidence: number;
  context: string;
}

interface WritingAssistance {
  id: string;
  type: 'grammar' | 'clarity' | 'tone' | 'length' | 'engagement';
  issue: string;
  suggestion: string;
  original: string;
  improved: string;
  confidence: number;
}

class AIContentGenerationService {
  private contentTemplates: Record<string, Record<string, string[]>> = {
    professional: {
      project_update: [
        "Here's the latest update on the project:",
        "Quick progress update:",
        "Status report for {project}:",
        "Project milestone achieved:"
      ],
      feedback_request: [
        "I'd love to get your thoughts on this:",
        "Could you review this when you have a moment?",
        "Looking for feedback on:",
        "What are your initial impressions of:"
      ],
      approval_request: [
        "This is ready for your approval:",
        "Please review and approve when ready:",
        "Seeking final approval for:",
        "Ready for sign-off:"
      ],
      clarification: [
        "Just to clarify:",
        "To make sure we're aligned:",
        "Quick question about:",
        "Need clarification on:"
      ]
    },
    creative: {
      design_presentation: [
        "🎨 Exciting design update!",
        "✨ Fresh creative direction:",
        "🚀 New concept to explore:",
        "💡 Creative breakthrough:"
      ],
      brainstorm: [
        "Brainstorming some ideas:",
        "What if we tried:",
        "Throwing out some concepts:",
        "Creative exploration:"
      ],
      inspiration: [
        "Found some great inspiration:",
        "This caught my eye:",
        "Loving this aesthetic:",
        "Great reference for our project:"
      ]
    },
    casual: {
      check_in: [
        "Hey! Just checking in:",
        "Quick check on progress:",
        "How are things going with:",
        "Touching base about:"
      ],
      suggestion: [
        "Had a thought:",
        "What do you think about:",
        "Quick idea:",
        "This might work:"
      ]
    }
  };

  private _responsePatterns = {
    agreement: [
      "That sounds great!",
      "Perfect, I'm on board with that.",
      "Excellent approach.",
      "Love this direction.",
      "That's exactly what I was thinking."
    ],
    questions: [
      "Could you elaborate on {topic}?",
      "What's the timeline for {item}?",
      "How do you see this fitting with {context}?",
      "What are your thoughts on {aspect}?"
    ],
    concerns: [
      "I have a few concerns about {item}:",
      "One thing to consider is {concern}.",
      "We might want to think about {aspect}.",
      "Let's make sure we address {issue}."
    ],
    next_steps: [
      "Next steps would be:",
      "Here's what I propose:",
      "Moving forward, we should:",
      "Action items:"
    ]
  };

  /**
   * Generate contextual message content
   */
  async generateContent(
    prompt: string,
    context: ContentGenerationContext
  ): Promise<GeneratedContent> {
    try {
      // Analyze context and intent
      const analyzedIntent = this.analyzeIntent(prompt, context);
      const suggestedTone = this.suggestTone(context);

      // Generate content based on context
      const content = await this.generateContextualContent(
        prompt,
        analyzedIntent,
        suggestedTone,
        context
      );

      // Generate alternatives
      const alternatives = await this.generateAlternatives(content, context);

      return {
        id: `generated-${Date.now()}`,
        content,
        confidence: 0.85,
        tone: suggestedTone,
        intent: analyzedIntent,
        alternatives,
        reasoning: this.explainGeneration(analyzedIntent, suggestedTone, context)
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error('Unable to generate content. Please try again.');
    }
  }

  /**
   * Get smart suggestions as user types
   */
  async getSmartSuggestions(
    currentText: string,
    context: ContentGenerationContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Completion suggestions
    if (currentText.length > 5) {
      const completions = this.generateCompletions(currentText, context);
      suggestions.push(...completions);
    }

    // Response suggestions based on last message
    if (context.conversationHistory.length > 0) {
      const responsesSuggestions = this.generateResponseSuggestions(context);
      suggestions.push(...responsesSuggestions);
    }

    // Template suggestions
    const templateSuggestions = this.getTemplateSuggestions(currentText, context);
    suggestions.push(...templateSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Provide writing assistance and improvements
   */
  async analyzeWriting(text: string, context: ContentGenerationContext): Promise<WritingAssistance[]> {
    const assistance: WritingAssistance[] = [];

    // Grammar and clarity checks
    assistance.push(...this.checkGrammarAndClarity(text));

    // Tone analysis
    assistance.push(...this.analyzeTone(text, context));

    // Length optimization
    assistance.push(...this.analyzeLength(text, context));

    // Engagement improvements
    assistance.push(...this.suggestEngagementImprovements(text, context));

    return assistance.filter(a => a.confidence > 0.7);
  }

  /**
   * Generate message summary
   */
  async generateSummary(messages: Message[], type: 'brief' | 'detailed' = 'brief'): Promise<string> {
    if (messages.length === 0) return "No messages to summarize.";

    const keyPoints = this.extractKeyPoints(messages);
    const decisions = this.extractDecisions(messages);
    const actionItems = this.extractActionItems(messages);

    let summary = "";

    if (type === 'brief') {
      summary = `**Conversation Summary**\n\n`;
      if (keyPoints.length > 0) {
        summary += `Key points discussed:\n${keyPoints.slice(0, 3).map(p => `• ${p}`).join('\n')}\n\n`;
      }
      if (decisions.length > 0) {
        summary += `Decisions made:\n${decisions.slice(0, 2).map(d => `✅ ${d}`).join('\n')}\n\n`;
      }
    } else {
      summary = `**Detailed Conversation Summary**\n\n`;
      summary += `**Participants:** ${[...new Set(messages.map(m => m.author.name))].join(', ')}\n`;
      summary += `**Messages:** ${messages.length}\n`;
      summary += `**Duration:** ${this.calculateDuration(messages)}\n\n`;

      if (keyPoints.length > 0) {
        summary += `**Key Discussion Points:**\n${keyPoints.map(p => `• ${p}`).join('\n')}\n\n`;
      }

      if (decisions.length > 0) {
        summary += `**Decisions Made:**\n${decisions.map(d => `✅ ${d}`).join('\n')}\n\n`;
      }

      if (actionItems.length > 0) {
        summary += `**Action Items:**\n${actionItems.map(a => `🔄 ${a}`).join('\n')}\n\n`;
      }
    }

    return summary.trim();
  }

  private analyzeIntent(prompt: string, context: ContentGenerationContext): string {
    const promptLower = prompt.toLowerCase();

    // Intent detection patterns
    if (promptLower.includes('feedback') || promptLower.includes('review') || promptLower.includes('thoughts')) {
      return 'feedback';
    }
    if (promptLower.includes('update') || promptLower.includes('progress') || promptLower.includes('status')) {
      return 'update';
    }
    if (promptLower.includes('approve') || promptLower.includes('sign off') || promptLower.includes('final')) {
      return 'approval';
    }
    if (promptLower.includes('question') || promptLower.includes('clarify') || promptLower.includes('understand')) {
      return 'clarification';
    }
    if (promptLower.includes('idea') || promptLower.includes('concept') || promptLower.includes('creative')) {
      return 'creative';
    }

    // Default based on conversation type
    return context.conversation.type === 'project' ? 'professional' : 'casual';
  }

  private suggestTone(context: ContentGenerationContext): string {
    // Analyze conversation history for tone patterns
    const recentMessages = context.conversationHistory.slice(-5);
    const formalWords = ['please', 'regarding', 'attached', 'kindly', 'sincerely'];
    const casualWords = ['hey', 'awesome', 'cool', 'great', 'thanks'];

    let formalScore = 0;
    let casualScore = 0;

    recentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      formalWords.forEach(word => {
        if (content.includes(word)) formalScore++;
      });
      casualWords.forEach(word => {
        if (content.includes(word)) casualScore++;
      });
    });

    // Consider user type and conversation type
    if (context.currentUser.userType === 'client') {
      return formalScore > casualScore ? 'professional' : 'friendly';
    }

    if (context.conversation.type === 'project') {
      return 'professional';
    }

    return casualScore > formalScore ? 'casual' : 'friendly';
  }

  private async generateContextualContent(
    prompt: string,
    intent: string,
    tone: string,
    context: ContentGenerationContext
  ): Promise<string> {
    // Get appropriate template
    const templates = this.contentTemplates[tone]?.[intent] || [];
    const template = templates[Math.floor(Math.random() * templates.length)] || "";

    // Generate contextual content
    let content = "";

    if (template) {
      content = template + "\n\n";
    }

    // Add contextual content based on prompt
    content += this.expandPrompt(prompt, context);

    // Add conversation-specific elements
    if (context.conversation.projectId) {
      content = this.addProjectContext(content, context);
    }

    return content.trim();
  }

  private expandPrompt(prompt: string, _context: ContentGenerationContext): string {
    // Simple expansion based on keywords and context
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('feedback')) {
      return `${prompt}\n\nI'd appreciate your thoughts on the direction, especially regarding the overall approach and any specific areas that stand out to you.`;
    }

    if (promptLower.includes('update')) {
      return `${prompt}\n\nEverything is progressing well, and I'll keep you posted on the next milestones.`;
    }

    if (promptLower.includes('review')) {
      return `${prompt}\n\nLet me know if you have any questions or if there's anything you'd like me to adjust.`;
    }

    return prompt;
  }

  private async generateAlternatives(content: string, context: ContentGenerationContext): Promise<string[]> {
    const alternatives: string[] = [];

    // Generate variations with different tones
    if (context.tone !== 'casual') {
      alternatives.push(this.adjustTone(content, 'casual'));
    }

    if (context.tone !== 'professional') {
      alternatives.push(this.adjustTone(content, 'professional'));
    }

    // Generate shorter version
    alternatives.push(this.shortenContent(content));

    // Generate more detailed version
    alternatives.push(this.expandContent(content));

    return alternatives.filter(alt => alt !== content && alt.length > 10);
  }

  private adjustTone(content: string, targetTone: string): string {
    const toneAdjustments = {
      casual: {
        'please review': 'check this out',
        'I would appreciate': "I'd love",
        'regarding': 'about',
        'attached': 'here\'s'
      },
      professional: {
        'check this out': 'please review',
        'awesome': 'excellent',
        'cool': 'great',
        'hey': 'hello'
      }
    };

    let adjusted = content;
    const adjustments = toneAdjustments[targetTone as keyof typeof toneAdjustments] || {};

    Object.entries(adjustments).forEach(([from, to]) => {
      const regex = new RegExp(from, 'gi');
      adjusted = adjusted.replace(regex, to);
    });

    return adjusted;
  }

  private shortenContent(content: string): string {
    const sentences = content.split('.').filter(s => s.trim().length > 0);
    return sentences.slice(0, Math.ceil(sentences.length / 2)).join('.') + '.';
  }

  private expandContent(content: string): string {
    return content + '\n\nLet me know if you need any additional details or if there\'s anything specific you\'d like me to elaborate on.';
  }

  private generateCompletions(currentText: string, _context: ContentGenerationContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Common completions based on current text
    const completionPatterns = {
      'I think': [' we should consider', ' this approach would work well', ' the next step is'],
      'What do you': [' think about this?', ' think of the direction?', ' prefer for'],
      'Can you': [' review this?', ' provide feedback on', ' help with'],
      'The design': [' looks great', ' needs some adjustments', ' is ready for review']
    };

    Object.entries(completionPatterns).forEach(([trigger, completions]) => {
      if (currentText.toLowerCase().includes(trigger.toLowerCase())) {
        completions.forEach((completion, index) => {
          suggestions.push({
            id: `completion-${trigger}-${index}`,
            type: 'completion',
            trigger,
            suggestion: currentText + completion,
            confidence: 0.8 - (index * 0.1),
            context: 'text completion'
          });
        });
      }
    });

    return suggestions;
  }

  private generateResponseSuggestions(context: ContentGenerationContext): SmartSuggestion[] {
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    if (!lastMessage || lastMessage.author.id === context.currentUser.id) return [];

    const suggestions: SmartSuggestion[] = [];
    const lastContent = lastMessage.content.toLowerCase();

    // Generate appropriate responses
    if (lastContent.includes('?')) {
      suggestions.push({
        id: 'response-question',
        type: 'response',
        trigger: 'question detected',
        suggestion: "Good question! Let me think about that...",
        confidence: 0.85,
        context: 'response to question'
      });
    }

    if (lastContent.includes('feedback') || lastContent.includes('thoughts')) {
      suggestions.push({
        id: 'response-feedback',
        type: 'response',
        trigger: 'feedback request',
        suggestion: "This looks great overall! A few thoughts:",
        confidence: 0.9,
        context: 'feedback response'
      });
    }

    if (lastContent.includes('approve') || lastContent.includes('review')) {
      suggestions.push({
        id: 'response-approval',
        type: 'response',
        trigger: 'approval request',
        suggestion: "Looks good to me! Approved.",
        confidence: 0.85,
        context: 'approval response'
      });
    }

    return suggestions;
  }

  private getTemplateSuggestions(currentText: string, _context: ContentGenerationContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Project update template
    if (currentText.toLowerCase().includes('update')) {
      suggestions.push({
        id: 'template-update',
        type: 'enhancement',
        trigger: 'update keyword',
        suggestion: "Quick project update:\n\n✅ Completed:\n• \n\n🔄 In Progress:\n• \n\n📅 Next:\n• ",
        confidence: 0.8,
        context: 'project update template'
      });
    }

    // Feedback template
    if (currentText.toLowerCase().includes('feedback')) {
      suggestions.push({
        id: 'template-feedback',
        type: 'enhancement',
        trigger: 'feedback keyword',
        suggestion: "Here's my feedback:\n\n👍 What's working well:\n• \n\n🔄 Areas for improvement:\n• \n\n💡 Suggestions:\n• ",
        confidence: 0.85,
        context: 'feedback template'
      });
    }

    return suggestions;
  }

  private checkGrammarAndClarity(text: string): WritingAssistance[] {
    const assistance: WritingAssistance[] = [];

    // Simple grammar checks
    const grammarIssues = [
      { pattern: /\bi\b/g, suggestion: 'I', type: 'grammar' },
      { pattern: /\byour\b(?=\s+[a-z])/g, suggestion: 'you\'re', type: 'grammar' },
      { pattern: /\bteh\b/g, suggestion: 'the', type: 'grammar' }
    ];

    grammarIssues.forEach((issue, index) => {
      if (issue.pattern.test(text)) {
        assistance.push({
          id: `grammar-${index}`,
          type: 'grammar',
          issue: 'Grammar correction',
          suggestion: `Consider: "${issue.suggestion}"`,
          original: text,
          improved: text.replace(issue.pattern, issue.suggestion),
          confidence: 0.9
        });
      }
    });

    return assistance;
  }

  private analyzeTone(text: string, context: ContentGenerationContext): WritingAssistance[] {
    const assistance: WritingAssistance[] = [];

    // Tone analysis based on context
    if (context.conversation.type === 'project' && text.toLowerCase().includes('awesome')) {
      assistance.push({
        id: 'tone-professional',
        type: 'tone',
        issue: 'Consider more professional language',
        suggestion: 'Use "excellent" instead of "awesome"',
        original: text,
        improved: text.replace(/awesome/gi, 'excellent'),
        confidence: 0.75
      });
    }

    return assistance;
  }

  private analyzeLength(text: string, context: ContentGenerationContext): WritingAssistance[] {
    const assistance: WritingAssistance[] = [];

    if (text.length > 500 && context.intent === 'response') {
      assistance.push({
        id: 'length-shorten',
        type: 'length',
        issue: 'Message might be too long',
        suggestion: 'Consider breaking into shorter paragraphs',
        original: text,
        improved: this.shortenContent(text),
        confidence: 0.7
      });
    }

    return assistance;
  }

  private suggestEngagementImprovements(text: string, context: ContentGenerationContext): WritingAssistance[] {
    const assistance: WritingAssistance[] = [];

    if (!text.includes('?') && context.intent === 'feedback') {
      assistance.push({
        id: 'engagement-question',
        type: 'engagement',
        issue: 'Add a question to encourage response',
        suggestion: 'End with "What are your thoughts?"',
        original: text,
        improved: text + '\n\nWhat are your thoughts?',
        confidence: 0.8
      });
    }

    return assistance;
  }

  private extractKeyPoints(messages: Message[]): string[] {
    const keyPoints: string[] = [];

    messages.forEach(msg => {
      // Look for sentences with decision words
      const sentences = msg.content.split(/[.!?]+/);
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && (
          trimmed.toLowerCase().includes('decided') ||
          trimmed.toLowerCase().includes('agreed') ||
          trimmed.toLowerCase().includes('important') ||
          trimmed.toLowerCase().includes('key')
        )) {
          keyPoints.push(trimmed);
        }
      });
    });

    return [...new Set(keyPoints)].slice(0, 5);
  }

  private extractDecisions(messages: Message[]): string[] {
    const decisions: string[] = [];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      if (content.includes('approved') || content.includes('decided') || content.includes('go with')) {
        decisions.push(msg.content.split(/[.!?]+/)[0].trim());
      }
    });

    return [...new Set(decisions)].slice(0, 3);
  }

  private extractActionItems(messages: Message[]): string[] {
    const actionItems: string[] = [];

    messages.forEach(msg => {
      const sentences = msg.content.split(/[.!?]+/);
      sentences.forEach(sentence => {
        const trimmed = sentence.trim().toLowerCase();
        if (trimmed.includes('will') || trimmed.includes('should') || trimmed.includes('need to')) {
          actionItems.push(sentence.trim());
        }
      });
    });

    return [...new Set(actionItems)].slice(0, 4);
  }

  private calculateDuration(messages: Message[]): string {
    if (messages.length < 2) return 'N/A';

    const start = new Date(messages[0].createdAt);
    const end = new Date(messages[messages.length - 1].createdAt);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  }

  private addProjectContext(content: string, context: ContentGenerationContext): string {
    // Add project-specific context if available
    if (context.conversation.name) {
      return content.replace(/\{project\}/g, context.conversation.name);
    }
    return content;
  }

  private explainGeneration(intent: string, tone: string, _context: ContentGenerationContext): string {
    return `Generated ${tone} content for ${intent} based on conversation context and user preferences.`;
  }
}

// Singleton instance
export const aiContentGenerationService = new AIContentGenerationService();

export type {
  ContentGenerationContext,
  GeneratedContent,
  SmartSuggestion,
  WritingAssistance
};

export default aiContentGenerationService;