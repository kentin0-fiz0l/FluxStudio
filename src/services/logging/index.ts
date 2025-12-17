/**
 * Logging Module
 *
 * Centralized logging for FluxStudio that replaces console.* calls.
 *
 * @example
 * // Import the default logger
 * import { logger } from '@/services/logging';
 * logger.info('User logged in', { userId: '123' });
 *
 * // Create a context-specific logger
 * import { createLogger } from '@/services/logging';
 * const apiLogger = createLogger('API');
 * apiLogger.error('Request failed', new Error('Network error'));
 *
 * // Time an operation
 * const done = logger.time('fetchData');
 * await fetchData();
 * done();
 *
 * @see DEBT-012: Remove Console Statements from Production
 */

export { Logger } from './Logger';
export type { LogLevel, LogEntry, LoggerConfig } from './types';
export { DEFAULT_CONFIG, LOG_LEVEL_PRIORITY } from './types';

import { Logger } from './Logger';
import { LoggerConfig } from './types';

// Default application logger
export const logger = new Logger('App');

// Pre-configured loggers for common contexts
export const apiLogger = new Logger('API');
export const authLogger = new Logger('Auth');
export const socketLogger = new Logger('Socket');
export const uiLogger = new Logger('UI');
export const storeLogger = new Logger('Store');

/**
 * Create a new logger with custom context
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(context, config);
}

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
}

// Default export
export default logger;
