/**
 * Event Tracking System
 * Captures and analyzes user interactions and system events
 */

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class EventTracker {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'sessionId'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      sessionId: this.sessionId,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    this.sendToAnalytics(fullEvent);
  }

  trackPageView(page: string, metadata?: Record<string, any>): void {
    this.track({
      type: 'pageview',
      category: 'navigation',
      action: 'view',
      label: page,
      metadata,
    });
  }

  trackAction(action: string, category: string, label?: string, value?: number): void {
    this.track({
      type: 'action',
      category,
      action,
      label,
      value,
    });
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToAnalytics(event: AnalyticsEvent): void {
    // Send to analytics backend
    console.log('Analytics Event:', event);
  }

  getEvents(filter?: Partial<AnalyticsEvent>): AnalyticsEvent[] {
    if (!filter) return this.events;

    return this.events.filter((event) =>
      Object.entries(filter).every(([key, value]) => event[key as keyof AnalyticsEvent] === value)
    );
  }
}

export const eventTracker = new EventTracker();
