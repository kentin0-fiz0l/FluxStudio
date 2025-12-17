/**
 * Logging Service Types
 * Type definitions for centralized logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
  error?: Error;
}

export interface LoggerConfig {
  /** Minimum level to log (debug < info < warn < error) */
  minLevel: LogLevel;
  /** Enable console output */
  enableConsole: boolean;
  /** Enable remote logging (e.g., Sentry) */
  enableRemote: boolean;
  /** Application context/name */
  appContext: string;
  /** Include timestamps in console output */
  includeTimestamp: boolean;
  /** Include stack traces for errors */
  includeStackTrace: boolean;
}

export const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: import.meta.env.PROD ? 'warn' : 'debug',
  enableConsole: !import.meta.env.PROD,
  enableRemote: import.meta.env.PROD,
  appContext: 'FluxStudio',
  includeTimestamp: true,
  includeStackTrace: true,
};

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
