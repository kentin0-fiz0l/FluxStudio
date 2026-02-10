/**
 * Structured Logger for FluxStudio Frontend
 * Sprint 19: Foundation Hardening
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Context-aware logging (component name, user id, trace id)
 * - Environment-aware (verbose in dev, minimal in prod)
 * - Sentry integration for production error tracking
 * - Session correlation for debugging
 *
 * @example
 * import { logger, createLogger } from '@/lib/logger';
 *
 * // Use default logger
 * logger.info('User action', { action: 'click', target: 'button' });
 *
 * // Create context-specific logger
 * const authLogger = createLogger('AuthContext');
 * authLogger.error('Login failed', new Error('Invalid credentials'));
 *
 * // With trace ID
 * const apiLogger = createLogger('API', { traceId: 'abc-123' });
 * apiLogger.debug('Request started', { endpoint: '/api/users' });
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Component or module name */
  component?: string;
  /** User ID for correlation */
  userId?: string;
  /** Trace ID for request correlation */
  traceId?: string;
  /** Additional tags */
  tags?: Record<string, string>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Enable console output */
  enableConsole: boolean;
  /** Enable remote logging (Sentry) */
  enableRemote: boolean;
  /** Include timestamps in console output */
  includeTimestamp: boolean;
  /** Maximum buffer size for log entries */
  maxBufferSize: number;
}

// ============================================================================
// Constants
// ============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#9CA3AF', // gray
  info: '#3B82F6',  // blue
  warn: '#F59E0B',  // amber
  error: '#EF4444', // red
};

const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
};

// ============================================================================
// Environment Detection
// ============================================================================

const isDevelopment = typeof import.meta !== 'undefined'
  ? import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production'
  : process.env.NODE_ENV !== 'production';

const isProduction = !isDevelopment;

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: isDevelopment ? 'debug' : 'warn',
  enableConsole: isDevelopment,
  enableRemote: isProduction,
  includeTimestamp: true,
  maxBufferSize: 100,
};

// ============================================================================
// Sentry Integration
// ============================================================================

interface SentryLike {
  captureException: (error: Error, context?: Record<string, unknown>) => string;
  captureMessage: (message: string, context?: Record<string, unknown>) => string;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  setUser: (user: { id: string } | null) => void;
  setTag: (key: string, value: string) => void;
}

function getSentry(): SentryLike | null {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { Sentry?: SentryLike };
    return w.Sentry || null;
  }
  return null;
}

// ============================================================================
// Session Management
// ============================================================================

const SESSION_KEY = 'fluxstudio.logger.session_id';

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
  private config: LoggerConfig;
  private context: LogContext;
  private buffer: LogEntry[] = [];
  private sessionId: string;

  constructor(componentOrContext?: string | LogContext, config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = getSessionId();

    if (typeof componentOrContext === 'string') {
      this.context = { component: componentOrContext };
    } else {
      this.context = componentOrContext || {};
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string | LogContext): Logger {
    const childContext: LogContext = typeof context === 'string'
      ? { ...this.context, component: `${this.context.component}:${context}` }
      : { ...this.context, ...context };

    return new Logger(childContext, this.config);
  }

  /**
   * Set user context for all subsequent logs
   */
  setUser(userId: string | null): void {
    if (userId) {
      this.context.userId = userId;
      getSentry()?.setUser({ id: userId });
    } else {
      delete this.context.userId;
      getSentry()?.setUser(null);
    }
  }

  /**
   * Set trace ID for request correlation
   */
  setTraceId(traceId: string): void {
    this.context.traceId = traceId;
  }

  /**
   * Debug level - development only, verbose information
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Info level - general operational information
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Warning level - potential issues or deprecations
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Error level - errors and exceptions
   */
  error(message: string, error?: Error | unknown, data?: unknown): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error ? data : error;
    this.log('error', message, errorData, errorObj);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    // Check minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...this.context,
        tags: {
          ...this.context.tags,
          sessionId: this.sessionId,
        },
      },
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    // Add to buffer
    this.addToBuffer(entry);

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.sendToRemote(entry, error);
    }
  }

  /**
   * Add entry to internal buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Output to browser console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, data, error } = entry;

    // Build prefix
    const parts: string[] = [];
    if (this.config.includeTimestamp) {
      parts.push(`[${timestamp.split('T')[1].split('.')[0]}]`);
    }
    parts.push(LOG_LEVEL_ICONS[level]);
    if (context.component) {
      parts.push(`[${context.component}]`);
    }
    if (context.traceId) {
      parts.push(`[${context.traceId.substring(0, 8)}]`);
    }

    const prefix = parts.join(' ');
    const color = LOG_LEVEL_COLORS[level];

    // Use appropriate console method
    const consoleMethod = this.getConsoleMethod(level);
    const args: unknown[] = [`%c${prefix} ${message}`, `color: ${color}`];

    if (data !== undefined) {
      args.push(data);
    }
    if (error) {
      args.push(error);
    }

    consoleMethod(...args);
  }

  /**
   * Get appropriate console method
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug.bind(console);
      case 'info':
        return console.info.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'error':
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Send to remote logging service (Sentry)
   */
  private sendToRemote(entry: LogEntry, error?: Error): void {
    const sentry = getSentry();
    if (!sentry) return;

    const { level, message, context, data } = entry;

    // Add breadcrumb for all logs
    sentry.addBreadcrumb({
      category: context.component || 'app',
      message,
      level: level === 'debug' ? 'info' : level,
      data: data as Record<string, unknown>,
      timestamp: Date.now() / 1000,
    });

    // Capture errors
    if (error && level === 'error') {
      sentry.captureException(error, {
        tags: {
          component: context.component,
          traceId: context.traceId,
          ...context.tags,
        },
        extra: {
          message,
          data,
          userId: context.userId,
        },
      });
    } else if (level === 'error') {
      sentry.captureMessage(message, {
        level: 'error',
        tags: {
          component: context.component,
          traceId: context.traceId,
          ...context.tags,
        },
        extra: { data },
      });
    }
  }

  /**
   * Create a timed operation logger
   */
  time(label: string): () => void {
    const start = performance.now();
    this.debug(`${label} started`);

    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { durationMs: Math.round(duration * 100) / 100 });
    };
  }

  /**
   * Log with automatic grouping (development only)
   */
  group(label: string, fn: () => void): void {
    if (this.config.enableConsole) {
      const prefix = this.context.component ? `[${this.context.component}]` : '';
      console.group(`${prefix} ${label}`);
      try {
        fn();
      } finally {
        console.groupEnd();
      }
    } else {
      fn();
    }
  }

  /**
   * Get recent log entries (for debugging)
   */
  getRecentLogs(count = 50): LogEntry[] {
    return this.buffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Export logs as JSON (for debugging/support)
   */
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      context: this.context,
      logs: this.buffer,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// ============================================================================
// Factory Functions & Exports
// ============================================================================

/**
 * Create a new logger with custom context
 */
export function createLogger(
  componentOrContext: string | LogContext,
  config?: Partial<LoggerConfig>
): Logger {
  return new Logger(componentOrContext, config);
}

// Default application logger
export const logger = new Logger('App');

// Pre-configured loggers for common contexts
export const apiLogger = createLogger('API');
export const authLogger = createLogger('Auth');
export const socketLogger = createLogger('Socket');
export const uiLogger = createLogger('UI');
export const storeLogger = createLogger('Store');
export const hookLogger = createLogger('Hooks');
export const serviceLogger = createLogger('Services');

/**
 * Configure all loggers globally
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
  logger.configure(config);
  apiLogger.configure(config);
  authLogger.configure(config);
  socketLogger.configure(config);
  uiLogger.configure(config);
  storeLogger.configure(config);
  hookLogger.configure(config);
  serviceLogger.configure(config);
}

/**
 * Set user context for all loggers
 */
export function setLoggerUser(userId: string | null): void {
  logger.setUser(userId);
  apiLogger.setUser(userId);
  authLogger.setUser(userId);
  socketLogger.setUser(userId);
}

export default logger;
