/**
 * Observability Layer - Unified telemetry, analytics, and monitoring
 *
 * Consolidates all observability concerns into a single API:
 * - User Test Mode (existing)
 * - Performance monitoring (existing)
 * - Analytics tracking (new)
 * - Error tracking (new)
 * - Feature flags (new)
 * - Session correlation (new)
 *
 * Usage:
 *   import { observability } from '@/services/observability';
 *   observability.analytics.track('button_clicked', { buttonId: 'submit' });
 *   observability.errors.capture(error);
 *   if (observability.flags.isEnabled('new_feature')) { ... }
 */

import { userTestLogger } from '../userTestLogger';
import { performanceMonitoring } from '../performanceMonitoring';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

export interface ErrorEvent {
  error: Error;
  context?: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  userId?: string;
  componentStack?: string;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  variant?: string;
}

// ============================================================================
// Session Management
// ============================================================================

const SESSION_KEY = 'fluxstudio.session_id';
const SESSION_START_KEY = 'fluxstudio.session_start';

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    sessionStorage.setItem(SESSION_START_KEY, new Date().toISOString());
  }
  return sessionId;
}

// ============================================================================
// Analytics Service
// ============================================================================

class AnalyticsService {
  private userId: string | null = null;
  private userTraits: Record<string, unknown> = {};
  private queue: AnalyticsEvent[] = [];
  private maxQueueSize = 100;

  identify(userId: string, traits?: Record<string, unknown>) {
    this.userId = userId;
    if (traits) {
      this.userTraits = { ...this.userTraits, ...traits };
    }
    // Also update error tracking
    observability.errors.setUser(userId);
  }

  track(eventName: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        ...this.userTraits,
      },
      timestamp: new Date().toISOString(),
      sessionId: getOrCreateSessionId(),
      userId: this.userId ?? undefined,
    };

    this.queue.push(event);
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    // If user test mode is enabled, also log there
    if (userTestLogger.isTestModeEnabled()) {
      userTestLogger.log(eventName, properties ?? {}, {
        userId: this.userId,
        projectId: null,
      });
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
    }
  }

  page(name: string, properties?: Record<string, unknown>) {
    this.track('page_view', {
      page_name: name,
      page_path: window.location.pathname,
      page_url: window.location.href,
      ...properties,
    });
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.queue];
  }

  clearEvents() {
    this.queue = [];
  }

  // Export for analytics platforms (opt-in)
  exportForPlatform(platform: 'segment' | 'mixpanel' | 'amplitude' | 'json'): string {
    const events = this.getEvents();

    switch (platform) {
      case 'segment':
        return JSON.stringify(events.map(e => ({
          type: 'track',
          event: e.name,
          properties: e.properties,
          timestamp: e.timestamp,
          userId: e.userId,
          anonymousId: e.sessionId,
        })), null, 2);

      case 'mixpanel':
        return JSON.stringify(events.map(e => ({
          event: e.name,
          properties: {
            ...e.properties,
            time: new Date(e.timestamp).getTime(),
            distinct_id: e.userId || e.sessionId,
          },
        })), null, 2);

      case 'amplitude':
        return JSON.stringify(events.map(e => ({
          event_type: e.name,
          event_properties: e.properties,
          time: new Date(e.timestamp).getTime(),
          user_id: e.userId,
          session_id: parseInt(e.sessionId.split('_')[1]) || 0,
        })), null, 2);

      default:
        return JSON.stringify(events, null, 2);
    }
  }
}

// ============================================================================
// Error Tracking Service
// ============================================================================

class ErrorTrackingService {
  private userId: string | null = null;
  private errors: ErrorEvent[] = [];
  private maxErrors = 50;
  private globalContext: Record<string, unknown> = {};

  setUser(userId: string) {
    this.userId = userId;
  }

  setContext(context: Record<string, unknown>) {
    this.globalContext = { ...this.globalContext, ...context };
  }

  capture(error: Error, context?: Record<string, unknown>) {
    const errorEvent: ErrorEvent = {
      error,
      context: {
        ...this.globalContext,
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
      timestamp: new Date().toISOString(),
      sessionId: getOrCreateSessionId(),
      userId: this.userId ?? undefined,
    };

    this.errors.push(errorEvent);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorTracking]', error, context);
    }

    // Correlate with user test mode if enabled
    if (userTestLogger.isTestModeEnabled()) {
      userTestLogger.log('error_captured', {
        errorName: error.name,
        errorMessage: error.message,
        sessionId: errorEvent.sessionId,
      }, {
        userId: this.userId,
        projectId: null,
      });
    }
  }

  captureFromBoundary(error: Error, errorInfo: { componentStack?: string }) {
    this.capture(error, {
      componentStack: errorInfo.componentStack,
      source: 'error_boundary',
    });
  }

  getErrors(): ErrorEvent[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

// ============================================================================
// Feature Flags Service
// ============================================================================

const FLAGS_STORAGE_KEY = 'fluxstudio.feature_flags';
const EXPERIMENTS_STORAGE_KEY = 'fluxstudio.experiments';

class FeatureFlagsService {
  private flags: Map<string, boolean> = new Map();
  private variants: Map<string, string> = new Map();
  private overrides: Map<string, boolean> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedFlags = localStorage.getItem(FLAGS_STORAGE_KEY);
      if (storedFlags) {
        const parsed = JSON.parse(storedFlags);
        Object.entries(parsed).forEach(([key, value]) => {
          this.flags.set(key, value as boolean);
        });
      }

      const storedExperiments = localStorage.getItem(EXPERIMENTS_STORAGE_KEY);
      if (storedExperiments) {
        const parsed = JSON.parse(storedExperiments);
        Object.entries(parsed).forEach(([key, value]) => {
          this.variants.set(key, value as string);
        });
      }
    } catch (e) {
      console.warn('[FeatureFlags] Failed to load from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      const flagsObj: Record<string, boolean> = {};
      this.flags.forEach((value, key) => {
        flagsObj[key] = value;
      });
      localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(flagsObj));

      const variantsObj: Record<string, string> = {};
      this.variants.forEach((value, key) => {
        variantsObj[key] = value;
      });
      localStorage.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(variantsObj));
    } catch (e) {
      console.warn('[FeatureFlags] Failed to save to storage:', e);
    }
  }

  isEnabled(flagName: string, defaultValue = false): boolean {
    // Check overrides first (for testing)
    if (this.overrides.has(flagName)) {
      return this.overrides.get(flagName)!;
    }
    return this.flags.get(flagName) ?? defaultValue;
  }

  setFlag(flagName: string, enabled: boolean) {
    this.flags.set(flagName, enabled);
    this.saveToStorage();

    // Track flag change
    observability.analytics.track('feature_flag_changed', {
      flag: flagName,
      enabled,
    });
  }

  getVariant(experimentName: string, defaultVariant = 'control'): string {
    return this.variants.get(experimentName) ?? defaultVariant;
  }

  setVariant(experimentName: string, variant: string) {
    this.variants.set(experimentName, variant);
    this.saveToStorage();

    // Track experiment assignment
    observability.analytics.track('experiment_assigned', {
      experiment: experimentName,
      variant,
    });
  }

  // For testing - override flags without persistence
  override(flagName: string, enabled: boolean) {
    this.overrides.set(flagName, enabled);
  }

  clearOverrides() {
    this.overrides.clear();
  }

  // Get all flags for debugging
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.flags.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  // Bulk set flags (e.g., from server config)
  setFlags(flags: Record<string, boolean>) {
    Object.entries(flags).forEach(([key, value]) => {
      this.flags.set(key, value);
    });
    this.saveToStorage();
  }
}

// ============================================================================
// Session Replay Markers (for correlation, not capture)
// ============================================================================

class SessionReplayMarkers {
  private markers: Array<{ type: string; data: unknown; timestamp: string }> = [];

  mark(type: string, data?: unknown) {
    this.markers.push({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep last 100 markers
    if (this.markers.length > 100) {
      this.markers.shift();
    }
  }

  getMarkers() {
    return [...this.markers];
  }

  getSessionId(): string {
    return getOrCreateSessionId();
  }

  getSessionStart(): string | null {
    return sessionStorage.getItem(SESSION_START_KEY);
  }

  getSessionDuration(): number {
    const start = this.getSessionStart();
    if (!start) return 0;
    return Date.now() - new Date(start).getTime();
  }
}

// ============================================================================
// Observability Singleton
// ============================================================================

export const observability = {
  // Existing services
  userTest: userTestLogger,
  performance: performanceMonitoring,

  // New services
  analytics: new AnalyticsService(),
  errors: new ErrorTrackingService(),
  flags: new FeatureFlagsService(),
  session: new SessionReplayMarkers(),

  // Convenience methods
  getSessionId: getOrCreateSessionId,

  // Export all data (for user test reports)
  exportAll(): string {
    return JSON.stringify({
      sessionId: getOrCreateSessionId(),
      sessionStart: sessionStorage.getItem(SESSION_START_KEY),
      sessionDuration: observability.session.getSessionDuration(),
      analytics: observability.analytics.getEvents(),
      errors: observability.errors.getErrors().map(e => ({
        ...e,
        error: {
          name: e.error.name,
          message: e.error.message,
          stack: e.error.stack,
        },
      })),
      markers: observability.session.getMarkers(),
      flags: observability.flags.getAllFlags(),
      userTest: userTestLogger.isTestModeEnabled() ? {
        tester: userTestLogger.getTesterInfo(),
        tasks: userTestLogger.getTaskOutcomes(),
        feedback: userTestLogger.getFeedback(),
        friction: userTestLogger.analyzeFrictionPatterns(),
      } : null,
    }, null, 2);
  },
};

export default observability;
