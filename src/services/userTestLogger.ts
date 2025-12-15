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

export interface ConfusionReport {
  timestamp: string;
  route: string;
  focusedProjectId: string | null;
  activeSubpage: string | null;
  note?: string; // max 140 chars
}

export interface HesitationEvent {
  timestamp: string;
  route: string;
  component: string;
  durationMs: number;
}

export interface FrictionPattern {
  mostCommonHesitationRoutes: Array<{ route: string; count: number }>;
  repeatedPanelOpenCloses: number;
  tasksWithLongestTime: Array<{ taskId: string; taskTitle: string; timeMs: number }>;
  totalConfusionReports: number;
  averageHesitationDurationMs: number;
}

const STORAGE_KEY_EVENTS = 'fluxstudio_usertest_events';
const STORAGE_KEY_ENABLED = 'fluxstudio_usertest';
const STORAGE_KEY_TESTER = 'fluxstudio_usertest_tester';
const STORAGE_KEY_TASKS = 'fluxstudio_usertest_tasks';
const STORAGE_KEY_FEEDBACK = 'fluxstudio_usertest_feedback';
const STORAGE_KEY_CONFUSIONS = 'fluxstudio_usertest_confusions';
const STORAGE_KEY_HESITATIONS = 'fluxstudio_usertest_hesitations';
const MAX_EVENTS = 500;
const MAX_CONFUSION_NOTE_LENGTH = 140;

class UserTestLogger {
  private events: UserTestEvent[] = [];
  private confusions: ConfusionReport[] = [];
  private hesitations: HesitationEvent[] = [];
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
      const storedConfusions = localStorage.getItem(STORAGE_KEY_CONFUSIONS);
      if (storedConfusions) {
        this.confusions = JSON.parse(storedConfusions);
      }
      const storedHesitations = localStorage.getItem(STORAGE_KEY_HESITATIONS);
      if (storedHesitations) {
        this.hesitations = JSON.parse(storedHesitations);
      }
      this.isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
    } catch (e) {
      console.warn('Failed to load user test events from storage:', e);
      this.events = [];
      this.confusions = [];
      this.hesitations = [];
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

  // Confusion Report Management
  reportConfusion(report: Omit<ConfusionReport, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const confusion: ConfusionReport = {
      timestamp: new Date().toISOString(),
      route: report.route,
      focusedProjectId: report.focusedProjectId,
      activeSubpage: report.activeSubpage,
      note: report.note ? report.note.slice(0, MAX_CONFUSION_NOTE_LENGTH) : undefined,
    };

    this.confusions.push(confusion);
    localStorage.setItem(STORAGE_KEY_CONFUSIONS, JSON.stringify(this.confusions));

    // Also log as event for telemetry
    this.log('usertest_confusion_reported', {
      route: confusion.route,
      focusedProjectId: confusion.focusedProjectId,
      activeSubpage: confusion.activeSubpage,
      hasNote: !!confusion.note,
    });
  }

  getConfusionReports(): ConfusionReport[] {
    return [...this.confusions];
  }

  // Hesitation Event Management
  logHesitation(event: Omit<HesitationEvent, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const hesitation: HesitationEvent = {
      timestamp: new Date().toISOString(),
      route: event.route,
      component: event.component,
      durationMs: event.durationMs,
    };

    this.hesitations.push(hesitation);
    localStorage.setItem(STORAGE_KEY_HESITATIONS, JSON.stringify(this.hesitations));

    // Also log as event for telemetry
    this.log('ui_hesitation_detected', {
      route: hesitation.route,
      component: hesitation.component,
      durationMs: hesitation.durationMs,
    });
  }

  getHesitationEvents(): HesitationEvent[] {
    return [...this.hesitations];
  }

  /**
   * Analyze friction patterns from collected data
   */
  analyzeFrictionPatterns(): FrictionPattern {
    const tasks = this.getTaskOutcomes();

    // Count hesitation routes
    const routeCounts: Record<string, number> = {};
    for (const h of this.hesitations) {
      routeCounts[h.route] = (routeCounts[h.route] || 0) + 1;
    }
    const mostCommonHesitationRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count panel open/close patterns (looking for pulse_panel_opened/closed pairs)
    let panelOpenCloses = 0;
    const pulseOpens = this.events.filter(e => e.eventName === 'pulse_panel_opened').length;
    const pulseCloses = this.events.filter(e => e.eventName === 'pulse_panel_closed').length;
    panelOpenCloses = Math.min(pulseOpens, pulseCloses);

    // Tasks with longest completion time
    const completedTasks = tasks
      .filter(t => t.status === 'completed' && t.timeToCompleteMs)
      .map(t => ({ taskId: t.taskId, taskTitle: t.taskTitle, timeMs: t.timeToCompleteMs! }))
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 3);

    // Average hesitation duration
    const avgHesitation = this.hesitations.length > 0
      ? this.hesitations.reduce((sum, h) => sum + h.durationMs, 0) / this.hesitations.length
      : 0;

    return {
      mostCommonHesitationRoutes,
      repeatedPanelOpenCloses: panelOpenCloses,
      tasksWithLongestTime: completedTasks,
      totalConfusionReports: this.confusions.length,
      averageHesitationDurationMs: Math.round(avgHesitation),
    };
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

    // Observed Friction Patterns (Auto-Generated)
    const friction = this.analyzeFrictionPatterns();
    const hasAnyFriction = friction.totalConfusionReports > 0 ||
      friction.mostCommonHesitationRoutes.length > 0 ||
      friction.tasksWithLongestTime.length > 0;

    if (hasAnyFriction) {
      lines.push('## Observed Friction Patterns (Auto-Generated)');
      lines.push('');

      // Summary stats
      lines.push('### Summary');
      lines.push('');
      lines.push(`- **Confusion reports:** ${friction.totalConfusionReports}`);
      lines.push(`- **Hesitation events:** ${this.hesitations.length}`);
      if (friction.averageHesitationDurationMs > 0) {
        lines.push(`- **Avg hesitation duration:** ${(friction.averageHesitationDurationMs / 1000).toFixed(1)}s`);
      }
      lines.push(`- **Panel open/close cycles:** ${friction.repeatedPanelOpenCloses}`);
      lines.push('');

      // Most common hesitation routes
      if (friction.mostCommonHesitationRoutes.length > 0) {
        lines.push('### Most Common Hesitation Routes');
        lines.push('');
        lines.push('| Route | Hesitation Count |');
        lines.push('|-------|------------------|');
        for (const { route, count } of friction.mostCommonHesitationRoutes) {
          lines.push(`| ${route} | ${count} |`);
        }
        lines.push('');
      }

      // Tasks with longest completion time
      if (friction.tasksWithLongestTime.length > 0) {
        lines.push('### Tasks with Longest Completion Time');
        lines.push('');
        lines.push('| Task | Time |');
        lines.push('|------|------|');
        for (const { taskTitle, timeMs } of friction.tasksWithLongestTime) {
          lines.push(`| ${taskTitle} | ${(timeMs / 1000).toFixed(1)}s |`);
        }
        lines.push('');
      }

      // Confusion moments (if any)
      if (this.confusions.length > 0) {
        lines.push('### Reported Confusion Moments');
        lines.push('');
        for (const c of this.confusions) {
          const time = new Date(c.timestamp).toLocaleTimeString();
          lines.push(`- **${time}** on \`${c.route}\`${c.activeSubpage ? ` (${c.activeSubpage})` : ''}`);
          if (c.note) {
            lines.push(`  > "${c.note}"`);
          }
        }
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
    // Get session info for correlation
    const sessionId = sessionStorage.getItem('fluxstudio.session_id') || 'unknown';
    const sessionStart = sessionStorage.getItem('fluxstudio.session_start');

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      session: {
        id: sessionId,
        startedAt: sessionStart,
        durationMs: sessionStart ? Date.now() - new Date(sessionStart).getTime() : null,
      },
      tester: this.getTesterInfo(),
      tasks: this.getTaskOutcomes(),
      feedback: this.getFeedback(),
      events: this.getEvents(),
      confusions: this.getConfusionReports(),
      hesitations: this.getHesitationEvents(),
      frictionAnalysis: this.analyzeFrictionPatterns(),
    }, null, 2);
  }

  /**
   * Export for specific analytics platform
   */
  exportForPlatform(platform: 'segment' | 'mixpanel' | 'amplitude' | 'json'): string {
    const events = this.getEvents();
    const sessionId = sessionStorage.getItem('fluxstudio.session_id') || 'unknown';
    const tester = this.getTesterInfo();

    switch (platform) {
      case 'segment':
        return JSON.stringify(events.map(e => ({
          type: 'track',
          event: e.eventName,
          properties: e.metadata,
          timestamp: e.timestamp,
          userId: e.userId,
          anonymousId: sessionId,
          context: {
            traits: tester ? {
              name: tester.name,
              role: tester.role,
              experienceLevel: tester.experienceLevel,
            } : {},
          },
        })), null, 2);

      case 'mixpanel':
        return JSON.stringify(events.map(e => ({
          event: e.eventName,
          properties: {
            ...e.metadata,
            time: new Date(e.timestamp).getTime(),
            distinct_id: e.userId || sessionId,
            $insert_id: `${sessionId}_${e.timestamp}`,
          },
        })), null, 2);

      case 'amplitude':
        return JSON.stringify(events.map(e => ({
          event_type: e.eventName,
          event_properties: e.metadata,
          time: new Date(e.timestamp).getTime(),
          user_id: e.userId,
          session_id: parseInt(sessionId.split('_')[1]) || Date.now(),
          user_properties: tester ? {
            tester_name: tester.name,
            tester_role: tester.role,
            experience_level: tester.experienceLevel,
          } : {},
        })), null, 2);

      default:
        return this.generateJsonExport();
    }
  }

  /**
   * Get session ID for correlation
   */
  getSessionId(): string {
    return sessionStorage.getItem('fluxstudio.session_id') || 'unknown';
  }

  /**
   * Reset all user test data
   */
  resetAll(): void {
    this.events = [];
    this.confusions = [];
    this.hesitations = [];
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    localStorage.removeItem(STORAGE_KEY_ENABLED);
    localStorage.removeItem(STORAGE_KEY_TESTER);
    localStorage.removeItem(STORAGE_KEY_TASKS);
    localStorage.removeItem(STORAGE_KEY_FEEDBACK);
    localStorage.removeItem(STORAGE_KEY_CONFUSIONS);
    localStorage.removeItem(STORAGE_KEY_HESITATIONS);
    this.isEnabled = false;
  }
}

// Export singleton instance
export const userTestLogger = new UserTestLogger();
export default userTestLogger;
