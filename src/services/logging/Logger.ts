/* eslint-disable no-console -- Logger infrastructure intentionally uses console methods */
/**
 * Centralized Logger Service
 *
 * Replaces scattered console.* calls with a unified logging system that:
 * - Filters by log level in production
 * - Integrates with error tracking (Sentry)
 * - Provides consistent formatting
 * - Can be easily mocked in tests
 *
 * @see DEBT-012: Remove Console Statements from Production
 */

import {
  LogLevel,
  LogEntry,
  LoggerConfig,
  DEFAULT_CONFIG,
  LOG_LEVEL_PRIORITY,
} from './types';

export class Logger {
  private config: LoggerConfig;
  private context: string;
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor(context?: string, config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = context || this.config.appContext;
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.config);
  }

  /**
   * Debug level - development only
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Info level - general information
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Warning level - potential issues
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
    // Check if this level should be logged
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      data,
      error,
    };

    // Buffer for potential batch sending
    this.addToBuffer(entry);

    // Console output (development)
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Remote logging (production)
    if (this.config.enableRemote && (level === 'error' || level === 'warn')) {
      this.sendToRemote(entry);
    }
  }

  /**
   * Check if log level meets minimum threshold
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Output to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, data, error } = entry;

    const prefix = this.config.includeTimestamp
      ? `[${timestamp.toISOString()}] [${level.toUpperCase()}] [${context}]`
      : `[${level.toUpperCase()}] [${context}]`;

    const consoleMethod = this.getConsoleMethod(level);

    if (data !== undefined && error) {
      consoleMethod(`${prefix} ${message}`, data, error);
    } else if (data !== undefined) {
      consoleMethod(`${prefix} ${message}`, data);
    } else if (error) {
      consoleMethod(`${prefix} ${message}`, error);
    } else {
      consoleMethod(`${prefix} ${message}`);
    }
  }

  /**
   * Get appropriate console method for level
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
   * Send to remote logging service (Sentry integration)
   */
  private sendToRemote(entry: LogEntry): void {
    // Sentry integration
    if (typeof window !== 'undefined' && (window as unknown as Window & { Sentry?: SentryLike }).Sentry) {
      const Sentry = (window as unknown as Window & { Sentry: SentryLike }).Sentry;

      if (entry.error) {
        Sentry.captureException(entry.error, {
          tags: { context: entry.context },
          extra: { message: entry.message, data: entry.data },
        });
      } else if (entry.level === 'error') {
        Sentry.captureMessage(entry.message, {
          level: 'error',
          tags: { context: entry.context },
          extra: { data: entry.data },
        });
      } else if (entry.level === 'warn') {
        Sentry.addBreadcrumb({
          category: entry.context,
          message: entry.message,
          level: 'warning',
          data: entry.data as Record<string, unknown>,
        });
      }
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
   * Update configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a timed operation logger
   */
  time(label: string): () => void {
    const start = performance.now();
    this.debug(`${label} started`);

    return () => {
      const duration = performance.now() - start;
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Log with automatic grouping (development)
   */
  group(label: string, fn: () => void): void {
    if (this.config.enableConsole) {
      console.group(`[${this.context}] ${label}`);
      try {
        fn();
      } finally {
        console.groupEnd();
      }
    } else {
      fn();
    }
  }
}

// Sentry type for runtime integration
interface SentryLike {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, context?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
}
