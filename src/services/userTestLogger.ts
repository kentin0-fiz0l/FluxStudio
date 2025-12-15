/**
 * User Test Logger Service
 *
 * Client-only telemetry logging for user testing sessions.
 * Stores events in localStorage for later report generation.
 *
 * Privacy-focused: Never logs message contents, only IDs and counts.
 */

export interface UserTestEvent {
  timestamp: string;
  userId: string | null;
  projectId: string | null;
  route: string;
  eventName: string;
  metadata?: Record<string, unknown>;
}

export interface TesterInfo {
  name: string;
  role: 'designer' | 'student' | 'teacher' | 'other';
  experienceLevel: 'new' | 'returning';
}

export interface TaskOutcome {
  taskId: string;
  taskTitle: string;
  status: 'pending' | 'started' | 'completed' | 'stuck';
  startedAt?: string;
  completedAt?: string;
  timeToCompleteMs?: number;
  notes?: string;
}

export interface UserTestFeedback {
  topConfusions: string[];
  clarityRating: number; // 1-10
  speedRating: number; // 1-10
  delightRating: number; // 1-10
  additionalComments?: string;
}

const STORAGE_KEY_EVENTS = 'fluxstudio_usertest_events';
const STORAGE_KEY_ENABLED = 'fluxstudio_usertest';
const STORAGE_KEY_TESTER = 'fluxstudio_usertest_tester';
const STORAGE_KEY_TASKS = 'fluxstudio_usertest_tasks';
const STORAGE_KEY_FEEDBACK = 'fluxstudio_usertest_feedback';
const MAX_EVENTS = 500;

class UserTestLogger {
  private events: UserTestEvent[] = [];
  private isEnabled: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (stored) {
        this.events = JSON.parse(stored);
      }
      this.isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
    } catch (e) {
      console.warn('Failed to load user test events from storage:', e);
      this.events = [];
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only last MAX_EVENTS to prevent storage bloat
      const eventsToStore = this.events.slice(-MAX_EVENTS);
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(eventsToStore));
    } catch (e) {
      console.warn('Failed to save user test events to storage:', e);
    }
  }

  enable(): void {
    this.isEnabled = true;
    localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
    this.log('usertest_enabled', {});
  }

  disable(): void {
    this.isEnabled = false;
    localStorage.removeItem(STORAGE_KEY_ENABLED);
  }

  isTestModeEnabled(): boolean {
    return this.isEnabled;
  }

  log(
    eventName: string,
    metadata: Record<string, unknown>,
    context?: { userId?: string | null; projectId?: string | null }
  ): void {
    if (!this.isEnabled) return;

    const event: UserTestEvent = {
      timestamp: new Date().toISOString(),
      userId: context?.userId ?? null,
      projectId: context?.projectId ?? null,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      eventName,
      metadata: this.sanitizeMetadata(metadata),
    };

    this.events.push(event);
    this.saveToStorage();
  }

  /**
   * Sanitize metadata to prevent logging sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip potentially sensitive keys
      if (['content', 'message', 'body', 'text', 'password', 'token', 'secret'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // For arrays, just store count
      if (Array.isArray(value)) {
        sanitized[`${key}Count`] = value.length;
        continue;
      }

      // For objects, sanitize recursively (shallow)
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[object]';
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  getEvents(): UserTestEvent[] {
    return [...this.events];
  }

  getRecentEvents(count: number = 50): UserTestEvent[] {
    return this.events.slice(-count);
  }

  clearEvents(): void {
    this.events = [];
    localStorage.removeItem(STORAGE_KEY_EVENTS);
  }

  // Tester Info Management
  saveTesterInfo(info: TesterInfo): void {
    localStorage.setItem(STORAGE_KEY_TESTER, JSON.stringify(info));
  }

  getTesterInfo(): TesterInfo | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TESTER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Task Outcomes Management
  saveTaskOutcomes(tasks: TaskOutcome[]): void {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  }

  getTaskOutcomes(): TaskOutcome[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TASKS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Feedback Management
  saveFeedback(feedback: UserTestFeedback): void {
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(feedback));
  }

  getFeedback(): UserTestFeedback | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FEEDBACK);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a markdown report for GitHub issues
   */
  generateMarkdownReport(): string {
    const tester = this.getTesterInfo();
    const tasks = this.getTaskOutcomes();
    const feedback = this.getFeedback();
    const events = this.getRecentEvents(50);

    const lines: string[] = [
      '# User Test Report: Project Focus + Pulse',
      '',
      `**Date:** ${new Date().toISOString().split('T')[0]}`,
      `**Time:** ${new Date().toLocaleTimeString()}`,
      '',
    ];

    // Tester Info
    if (tester) {
      lines.push('## Tester Information');
      lines.push('');
      lines.push(`- **Name:** ${tester.name || 'Anonymous'}`);
      lines.push(`- **Role:** ${tester.role}`);
      lines.push(`- **Experience:** ${tester.experienceLevel}`);
      lines.push('');
    }

    // Task Outcomes
    lines.push('## Task Outcomes');
    lines.push('');
    lines.push('| Task | Status | Time | Notes |');
    lines.push('|------|--------|------|-------|');

    for (const task of tasks) {
      const timeStr = task.timeToCompleteMs
        ? `${(task.timeToCompleteMs / 1000).toFixed(1)}s`
        : '-';
      const statusEmoji = {
        pending: ':white_circle:',
        started: ':yellow_circle:',
        completed: ':white_check_mark:',
        stuck: ':x:',
      }[task.status];
      lines.push(`| ${task.taskTitle} | ${statusEmoji} ${task.status} | ${timeStr} | ${task.notes || '-'} |`);
    }
    lines.push('');

    // Stuck Tasks Details
    const stuckTasks = tasks.filter(t => t.status === 'stuck' && t.notes);
    if (stuckTasks.length > 0) {
      lines.push('### Stuck Task Details');
      lines.push('');
      for (const task of stuckTasks) {
        lines.push(`**${task.taskTitle}:**`);
        lines.push(`> ${task.notes}`);
        lines.push('');
      }
    }

    // Feedback
    if (feedback) {
      lines.push('## Feedback Ratings');
      lines.push('');
      lines.push(`- **Clarity:** ${feedback.clarityRating}/10`);
      lines.push(`- **Speed:** ${feedback.speedRating}/10`);
      lines.push(`- **Delight:** ${feedback.delightRating}/10`);
      lines.push('');

      if (feedback.topConfusions.length > 0) {
        lines.push('### Top Confusions');
        lines.push('');
        feedback.topConfusions.forEach((c, i) => {
          lines.push(`${i + 1}. ${c}`);
        });
        lines.push('');
      }

      if (feedback.additionalComments) {
        lines.push('### Additional Comments');
        lines.push('');
        lines.push(feedback.additionalComments);
        lines.push('');
      }
    }

    // Telemetry Summary
    lines.push('## Telemetry Summary');
    lines.push('');
    lines.push(`Total events captured: ${events.length}`);
    lines.push('');

    // Event type counts
    const eventCounts: Record<string, number> = {};
    for (const event of events) {
      eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
    }

    lines.push('### Event Counts');
    lines.push('');
    lines.push('| Event | Count |');
    lines.push('|-------|-------|');
    for (const [name, count] of Object.entries(eventCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${name} | ${count} |`);
    }
    lines.push('');

    // Recent events (last 20)
    lines.push('<details>');
    lines.push('<summary>Recent Events (last 20)</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(events.slice(-20), null, 2));
    lines.push('```');
    lines.push('</details>');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate JSON export of all test data
   */
  generateJsonExport(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      tester: this.getTesterInfo(),
      tasks: this.getTaskOutcomes(),
      feedback: this.getFeedback(),
      events: this.getEvents(),
    }, null, 2);
  }

  /**
   * Reset all user test data
   */
  resetAll(): void {
    this.events = [];
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_ENABLED);
    localStorage.removeItem(STORAGE_KEY_TESTER);
    localStorage.removeItem(STORAGE_KEY_TASKS);
    localStorage.removeItem(STORAGE_KEY_FEEDBACK);
    this.isEnabled = false;
  }
}

// Export singleton instance
export const userTestLogger = new UserTestLogger();
export default userTestLogger;
