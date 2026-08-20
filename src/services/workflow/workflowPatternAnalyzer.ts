/**
 * Pattern analysis and suggestion generation for workflow automation.
 *
 * Extracted from WorkflowAutomationService to keep each file under 600 lines.
 * Handles: repetitive pattern detection, message analysis, and suggestion creation.
 */

import type { Message } from '../../types/messaging';
import type {
  AutomationSuggestion,
  WorkflowTrigger,
  WorkflowContext,
} from './workflowTypes';

export function analyzeAndSuggest(
  context: WorkflowContext,
  activeTriggers: Map<string, WorkflowTrigger>,
): AutomationSuggestion[] {
  const suggestions: AutomationSuggestion[] = [];

  const repetitivePatterns = findRepetitivePatterns(context.recentMessages);
  if (repetitivePatterns.length > 0) {
    suggestions.push({
      id: 'repetitive-automation',
      title: 'Automate Repetitive Messages',
      description: 'You have repetitive message patterns that could be automated',
      category: 'time_saving',
      estimatedImpact: 'high',
      implementation: [
        'Create template responses for common questions',
        'Set up auto-replies for status updates',
        'Use quick actions for frequent tasks',
      ],
      basedOnPattern: 'Repetitive message content detected',
      confidence: 0.85,
      potentialSavings: {
        timePerWeek: 120,
        messagesReduced: 25,
        automationLevel: 60,
      },
    });
  }

  const hasDeadlineMessages = context.recentMessages.some(m =>
    /deadline|due|delivery|launch|ship/i.test(m.content),
  );

  if (hasDeadlineMessages && !hasDeadlineAutomation(activeTriggers)) {
    suggestions.push({
      id: 'deadline-automation',
      title: 'Automated Deadline Tracking',
      description: 'Set up automatic reminders for mentioned deadlines',
      category: 'project_tracking',
      estimatedImpact: 'high',
      implementation: [
        'Extract deadline dates from messages',
        'Create calendar reminders',
        'Send progress check notifications',
      ],
      basedOnPattern: 'Deadline mentions without tracking',
      confidence: 0.90,
      potentialSavings: {
        timePerWeek: 45,
        messagesReduced: 8,
        automationLevel: 40,
      },
    });
  }

  const hasDesignSharing = context.recentMessages.some(m =>
    m.attachments?.some(a => /\.(png|jpg|jpeg|gif|figma|sketch)$/i.test(a.name || '')),
  );

  if (hasDesignSharing) {
    suggestions.push({
      id: 'quality-gate-automation',
      title: 'Automated Design Review Process',
      description: 'Trigger review workflows when design files are shared',
      category: 'quality_improvement',
      estimatedImpact: 'medium',
      implementation: [
        'Auto-notify reviewers when designs are shared',
        'Create review checklists',
        'Track review completion status',
      ],
      basedOnPattern: 'Design file sharing detected',
      confidence: 0.75,
      potentialSavings: {
        timePerWeek: 30,
        messagesReduced: 12,
        automationLevel: 35,
      },
    });
  }

  return suggestions;
}

export function analyzeMessagePatterns(messages: Message[]): { type: string; count: number }[] {
  const patterns = [];

  const questions = messages.filter(m => m.content.includes('?'));
  if (questions.length > 3) {
    patterns.push({ type: 'frequent_questions', count: questions.length });
  }

  const statusUpdates = messages.filter(m =>
    /status|update|progress|done|complete/i.test(m.content),
  );
  if (statusUpdates.length > 2) {
    patterns.push({ type: 'status_updates', count: statusUpdates.length });
  }

  return patterns;
}

export function createSuggestionFromPattern(
  pattern: { type: string; count: number },
): AutomationSuggestion | null {
  if (pattern.type === 'frequent_questions') {
    return {
      id: 'faq-automation',
      title: 'Create FAQ Automation',
      description: 'Set up auto-responses for frequently asked questions',
      category: 'communication_enhancement',
      estimatedImpact: 'medium',
      implementation: [
        'Identify common questions',
        'Create template responses',
        'Set up keyword triggers',
      ],
      basedOnPattern: `${pattern.count} questions detected`,
      confidence: 0.7,
      potentialSavings: {
        timePerWeek: 20,
        messagesReduced: pattern.count,
        automationLevel: 30,
      },
    };
  }

  return null;
}

export function getTemplateSuggestions(
  templates: Partial<WorkflowTrigger>[],
): AutomationSuggestion[] {
  return templates.map((template, index) => ({
    id: `template-${index}`,
    title: `Enable ${template.name}`,
    description: template.description || 'Pre-built automation template',
    category: 'time_saving' as const,
    estimatedImpact: template.priority === 'high' ? 'high' as const : 'medium' as const,
    implementation: [
      'Enable pre-built automation',
      'Customize trigger conditions',
      'Test automation workflow',
    ],
    basedOnPattern: 'Pre-built template',
    confidence: 0.8,
    potentialSavings: {
      timePerWeek: template.priority === 'high' ? 60 : 30,
      messagesReduced: 10,
      automationLevel: 50,
    },
  }));
}

function findRepetitivePatterns(messages: Message[]): string[] {
  const patterns: string[] = [];
  const contentMap = new Map<string, number>();

  messages.forEach(message => {
    const words = message.content.toLowerCase().split(/\s+/);
    const key = words.slice(0, 3).join(' ');

    if (key.length > 10) {
      contentMap.set(key, (contentMap.get(key) || 0) + 1);
    }
  });

  for (const [pattern, count] of contentMap) {
    if (count > 2) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

function hasDeadlineAutomation(activeTriggers: Map<string, WorkflowTrigger>): boolean {
  return Array.from(activeTriggers.values()).some(trigger =>
    trigger.name.toLowerCase().includes('deadline') ||
    trigger.conditions.some(condition =>
      condition.type === 'keyword_detection' &&
      Array.isArray(condition.value) &&
      condition.value.some(keyword => /deadline|due/i.test(keyword)),
    ),
  );
}
