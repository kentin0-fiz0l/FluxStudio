/**
 * Event Tracking System
 *
 * Sprint 44: Added trackEvent() to send funnel events to backend.
 * Captures and analyzes user interactions and system events.
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
  metadata?: Record<string, unknown>;
}

const ANALYTICS_ENDPOINT = '/api/analytics/events';

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

  trackPageView(page: string, metadata?: Record<string, unknown>): void {
    this.track({
      type: 'pageview',
      category: 'navigation',
      action: 'view',
      label: page,
      metadata,
    });
    this.trackEvent('page_view', { page });
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

  /**
   * Track a funnel/growth event — sent to POST /api/analytics/events.
   *
   * @param eventName - e.g. 'signup_started', 'first_project_created'
   * @param properties - arbitrary key-value pairs
   */
  trackEvent(eventName: string, properties: Record<string, unknown> = {}): void {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventName,
        properties,
        sessionId: this.sessionId,
      }),
      keepalive: true,
    }).catch(() => {
      // Silently drop — analytics are best-effort
    });
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToAnalytics(_event: AnalyticsEvent): void {
    // Legacy stub — real delivery goes through trackEvent
  }

  getEvents(filter?: Partial<AnalyticsEvent>): AnalyticsEvent[] {
    if (!filter) return this.events;

    return this.events.filter((event) =>
      Object.entries(filter).every(
        ([key, value]) => event[key as keyof AnalyticsEvent] === value
      )
    );
  }
}

export const eventTracker = new EventTracker();
