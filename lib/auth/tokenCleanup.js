/**
 * Token Cleanup Service
 * Sprint 13, Day 3: Token Cleanup & Enhanced Rate Limiting
 *
 * Automated cleanup of:
 * - Expired refresh tokens
 * - Revoked tokens (older than 7 days)
 * - Orphaned sessions
 * - Old security events (older than 90 days)
 *
 * Date: 2025-10-15
 */

const fs = require('fs').promises;
const path = require('path');
const securityLogger = require('./securityLogger');
const cache = require('../cache');
const { createLogger } = require('../logger');
const log = createLogger('TokenCleanup');

class TokenCleanupService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.tokensFile = path.join(this.dataDir, 'tokens.json');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
  }

  /**
   * Load tokens from file storage
   * @returns {Promise<Array>}
   * @private
   */
  async loadTokens() {
    try {
      const data = await fs.readFile(this.tokensFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      log.error('Error loading tokens', error);
      return [];
    }
  }

  /**
   * Save tokens to file storage
   * @param {Array} tokens
   * @private
   */
  async saveTokens(tokens) {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(this.tokensFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      log.error('Error saving tokens', error);
      throw error;
    }
  }

  /**
   * Load sessions from file storage
   * @returns {Promise<Array>}
   * @private
   */
  async loadSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      log.error('Error loading sessions', error);
      return [];
    }
  }

  /**
   * Save sessions to file storage
   * @param {Array} sessions
   * @private
   */
  async saveSessions(sessions) {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      log.error('Error saving sessions', error);
      throw error;
    }
  }

  /**
   * Cleanup expired refresh tokens
   * Deletes tokens where expires_at < now
   *
   * @returns {Promise<number>} Number of tokens deleted
   */
  async cleanupExpiredTokens() {
    try {
      const tokens = await this.loadTokens();
      const now = Date.now();

      const beforeCount = tokens.length;
      const validTokens = tokens.filter(token => {
        const expiresAt = new Date(token.expiresAt).getTime();
        return expiresAt > now;
      });

      const deletedCount = beforeCount - validTokens.length;

      if (deletedCount > 0) {
        await this.saveTokens(validTokens);
        log.info(`Cleaned up ${deletedCount} expired tokens`);

        await securityLogger.logEvent(
          'token_cleanup_expired',
          securityLogger.SEVERITY.INFO,
          {
            tokensDeleted: deletedCount,
            totalTokens: beforeCount,
            remainingTokens: validTokens.length,
            timestamp: new Date().toISOString()
          }
        );
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up expired tokens', error);
      await securityLogger.logEvent(
        'token_cleanup_error',
        securityLogger.SEVERITY.ERROR,
        {
          error: error.message,
          type: 'expired_tokens'
        }
      );
      return 0;
    }
  }

  /**
   * Cleanup revoked tokens older than 7 days
   * Keeps recent revoked tokens for audit trail
   *
   * @returns {Promise<number>} Number of tokens deleted
   */
  async cleanupRevokedTokens() {
    try {
      const tokens = await this.loadTokens();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      const beforeCount = tokens.length;
      const validTokens = tokens.filter(token => {
        if (!token.revoked) return true;

        const revokedAt = new Date(token.revokedAt).getTime();
        return revokedAt > sevenDaysAgo;
      });

      const deletedCount = beforeCount - validTokens.length;

      if (deletedCount > 0) {
        await this.saveTokens(validTokens);
        log.info(`Cleaned up ${deletedCount} old revoked tokens`);

        await securityLogger.logEvent(
          'token_cleanup_revoked',
          securityLogger.SEVERITY.INFO,
          {
            tokensDeleted: deletedCount,
            totalTokens: beforeCount,
            remainingTokens: validTokens.length,
            timestamp: new Date().toISOString()
          }
        );
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up revoked tokens', error);
      await securityLogger.logEvent(
        'token_cleanup_error',
        securityLogger.SEVERITY.ERROR,
        {
          error: error.message,
          type: 'revoked_tokens'
        }
      );
      return 0;
    }
  }

  /**
   * Cleanup orphaned sessions
   * Removes sessions that don't have any valid tokens
   *
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupOrphanedSessions() {
    try {
      const tokens = await this.loadTokens();
      const sessions = await this.loadSessions();

      // Get set of session IDs with valid tokens
      const validSessionIds = new Set(
        tokens
          .filter(token => new Date(token.expiresAt).getTime() > Date.now())
          .map(token => token.sessionId)
      );

      const beforeCount = sessions.length;
      const validSessions = sessions.filter(session =>
        validSessionIds.has(session.id)
      );

      const deletedCount = beforeCount - validSessions.length;

      if (deletedCount > 0) {
        await this.saveSessions(validSessions);
        log.info(`Cleaned up ${deletedCount} orphaned sessions`);

        await securityLogger.logEvent(
          'session_cleanup_orphaned',
          securityLogger.SEVERITY.INFO,
          {
            sessionsDeleted: deletedCount,
            totalSessions: beforeCount,
            remainingSessions: validSessions.length,
            timestamp: new Date().toISOString()
          }
        );
      }

      return deletedCount;
    } catch (error) {
      log.error('Error cleaning up orphaned sessions', error);
      await securityLogger.logEvent(
        'session_cleanup_error',
        securityLogger.SEVERITY.ERROR,
        {
          error: error.message,
          type: 'orphaned_sessions'
        }
      );
      return 0;
    }
  }

  /**
   * Cleanup old Redis cache entries
   * Removes expired anomaly detection counters
   *
   * @returns {Promise<number>} Number of cache entries cleaned
   */
  async cleanupCacheEntries() {
    try {
      // Redis handles TTL automatically, but we can check for orphaned keys
      // This is a placeholder for manual cache cleanup if needed

      // For now, just log that cache cleanup was checked
      log.info('Redis cache TTL cleanup handled automatically');

      return 0;
    } catch (error) {
      log.error('Error checking cache cleanup', error);
      return 0;
    }
  }

  /**
   * Archive old security events (older than 90 days)
   * Moves events to archive file to keep main log manageable
   *
   * @returns {Promise<number>} Number of events archived
   */
  async archiveOldSecurityEvents() {
    try {
      const securityEventsFile = path.join(process.cwd(), 'logs', 'security-events.json');
      const archiveFile = path.join(process.cwd(), 'logs', 'security-events-archive.json');

      // Check if security events file exists
      try {
        await fs.access(securityEventsFile);
      } catch {
        log.info('No security events file to archive');
        return 0;
      }

      const data = await fs.readFile(securityEventsFile, 'utf8');
      const events = JSON.parse(data);

      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

      // Separate old and recent events
      const oldEvents = [];
      const recentEvents = [];

      events.forEach(event => {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime < ninetyDaysAgo) {
          oldEvents.push(event);
        } else {
          recentEvents.push(event);
        }
      });

      if (oldEvents.length > 0) {
        // Load existing archive
        let archive = [];
        try {
          const archiveData = await fs.readFile(archiveFile, 'utf8');
          archive = JSON.parse(archiveData);
        } catch {
          // No archive file yet
        }

        // Append old events to archive
        archive.push(...oldEvents);
        await fs.writeFile(archiveFile, JSON.stringify(archive, null, 2));

        // Save only recent events to main file
        await fs.writeFile(securityEventsFile, JSON.stringify(recentEvents, null, 2));

        log.info(`Archived ${oldEvents.length} old security events`);

        await securityLogger.logEvent(
          'security_events_archived',
          securityLogger.SEVERITY.INFO,
          {
            eventsArchived: oldEvents.length,
            totalEvents: events.length,
            remainingEvents: recentEvents.length,
            timestamp: new Date().toISOString()
          }
        );
      }

      return oldEvents.length;
    } catch (error) {
      log.error('Error archiving security events', error);
      return 0;
    }
  }

  /**
   * Get cleanup statistics
   * Returns current token/session counts
   *
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    try {
      const tokens = await this.loadTokens();
      const sessions = await this.loadSessions();
      const now = Date.now();

      const stats = {
        tokens: {
          total: tokens.length,
          active: tokens.filter(t => new Date(t.expiresAt).getTime() > now && !t.revoked).length,
          expired: tokens.filter(t => new Date(t.expiresAt).getTime() <= now).length,
          revoked: tokens.filter(t => t.revoked).length
        },
        sessions: {
          total: sessions.length,
          active: sessions.filter(s => new Date(s.lastUsedAt).getTime() > now - (24 * 60 * 60 * 1000)).length
        },
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      log.error('Error getting cleanup statistics', error);
      return null;
    }
  }

  /**
   * Run full cleanup process
   * Executes all cleanup tasks in sequence
   *
   * @returns {Promise<Object>} Cleanup statistics
   */
  async runFullCleanup() {
    log.info('Starting token cleanup process...');
    const startTime = Date.now();

    try {
      const stats = {
        expiredTokens: await this.cleanupExpiredTokens(),
        revokedTokens: await this.cleanupRevokedTokens(),
        orphanedSessions: await this.cleanupOrphanedSessions(),
        cacheEntries: await this.cleanupCacheEntries(),
        archivedEvents: await this.archiveOldSecurityEvents(),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      const finalStats = await this.getStatistics();
      stats.current = finalStats;

      log.info('Token cleanup completed', {
        expiredTokens: stats.expiredTokens,
        revokedTokens: stats.revokedTokens,
        orphanedSessions: stats.orphanedSessions,
        archivedEvents: stats.archivedEvents,
        duration: `${stats.duration}ms`
      });

      await securityLogger.logEvent(
        'token_cleanup_completed',
        securityLogger.SEVERITY.INFO,
        stats
      );

      return stats;
    } catch (error) {
      log.error('Token cleanup failed', error);
      await securityLogger.logEvent(
        'token_cleanup_failed',
        securityLogger.SEVERITY.ERROR,
        {
          error: error.message,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      );
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TokenCleanupService();
