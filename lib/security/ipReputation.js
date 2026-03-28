/**
 * IP Reputation System
 * Sprint 13, Day 3: Token Cleanup & Enhanced Rate Limiting
 *
 * Features:
 * - Score IPs based on behavior (0-100 scale)
 * - Automatic score decay for rehabilitation
 * - Integration with rate limiter for dynamic limits
 * - Ban/suspicious/neutral/trusted tiers
 * - Historical tracking
 *
 * Scoring:
 * - Lower scores = worse reputation (0 = banned)
 * - Higher scores = better reputation (100 = fully trusted)
 * - Default score: 50 (neutral)
 *
 * Date: 2025-10-15
 */

const cache = require('../cache');
const securityLogger = require('../auth/securityLogger');
const { createLogger } = require('../logger');
const log = createLogger('IPReputation');

class IPReputationSystem {
  constructor() {
    // Scoring rules (how much to adjust score for each event)
    this.scoringRules = {
      failedLogin: -10,           // Failed login attempt
      blockedRequest: -5,          // Request blocked by rate limiter
      successfulAuth: +5,          // Successful authentication
      bruteForceDetected: -50,     // Brute force attack detected
      botActivityDetected: -30,    // Bot/scanner detected
      suspiciousUserAgent: -5,     // Suspicious user agent
      accountTakeover: -40,        // Account takeover attempt
      rapidTokenRefresh: -20,      // Rapid token refresh detected
      cleanDay: +1                 // Each day with no issues (passive rehabilitation)
    };

    // Reputation thresholds
    this.thresholds = {
      banned: 20,       // Score < 20 = banned (no access)
      suspicious: 40,   // Score 20-40 = suspicious (stricter limits)
      neutral: 60,      // Score 40-60 = neutral (normal limits)
      trusted: 100      // Score 60+ = trusted (relaxed limits)
    };

    // Score boundaries
    this.minScore = 0;
    this.maxScore = 100;
    this.defaultScore = 50; // New IPs start neutral
  }

  /**
   * Get reputation score for an IP address
   *
   * @param {string} ipAddress - IP address to check
   * @returns {Promise<number>} Reputation score (0-100)
   */
  async getScore(ipAddress) {
    try {
      const key = `ip_reputation:${ipAddress}`;
      const scoreStr = await cache.get(key);

      if (scoreStr) {
        return parseInt(scoreStr, 10);
      }

      // New IP - return default score
      return this.defaultScore;
    } catch (error) {
      log.error('Error getting IP reputation score', error);
      return this.defaultScore; // Fail neutral
    }
  }

  /**
   * Adjust reputation score based on event
   *
   * @param {string} ipAddress - IP address
   * @param {string} event - Event type (key from scoringRules)
   * @param {Object} metadata - Additional event metadata
   * @returns {Promise<number>} New score
   */
  async adjustScore(ipAddress, event, metadata = {}) {
    try {
      const adjustment = this.scoringRules[event] || 0;

      if (adjustment === 0) {
        log.warn(`Unknown reputation event: ${event}`);
        return await this.getScore(ipAddress);
      }

      const currentScore = await this.getScore(ipAddress);
      const newScore = Math.max(
        this.minScore,
        Math.min(this.maxScore, currentScore + adjustment)
      );

      const key = `ip_reputation:${ipAddress}`;
      const ttl = 30 * 24 * 3600; // 30 days

      // Store new score
      await cache.set(key, newScore.toString(), ttl);

      // Log score change
      const oldLevel = this.getLevel(currentScore);
      const newLevel = this.getLevel(newScore);

      // Log if level changed or significant score change
      if (oldLevel !== newLevel || Math.abs(adjustment) >= 20) {
        await securityLogger.logEvent(
          'ip_reputation_changed',
          newLevel === 'banned' ? securityLogger.SEVERITY.HIGH : securityLogger.SEVERITY.INFO,
          {
            ipAddress,
            event,
            oldScore: currentScore,
            newScore,
            adjustment,
            oldLevel,
            newLevel,
            ...metadata
          }
        );

        log.info(`IP Reputation Update: ${ipAddress} | ${currentScore} -> ${newScore} (${event})`);
      }

      // If IP became banned, log alert
      if (newLevel === 'banned' && oldLevel !== 'banned') {
        await securityLogger.logEvent(
          'ip_auto_banned',
          securityLogger.SEVERITY.HIGH,
          {
            ipAddress,
            finalScore: newScore,
            trigger: event,
            ...metadata
          }
        );

        log.warn(`IP Auto-Banned: ${ipAddress} (score: ${newScore})`);
      }

      return newScore;
    } catch (error) {
      log.error('Error adjusting IP reputation score', error);
      return await this.getScore(ipAddress);
    }
  }

  /**
   * Get reputation level from score
   *
   * @param {number} score - Reputation score
   * @returns {string} Level (banned, suspicious, neutral, trusted)
   */
  getLevel(score) {
    if (score < this.thresholds.banned) return 'banned';
    if (score < this.thresholds.suspicious) return 'suspicious';
    if (score < this.thresholds.neutral) return 'neutral';
    return 'trusted';
  }

  /**
   * Check if IP is banned
   *
   * @param {string} ipAddress - IP address to check
   * @returns {Promise<boolean>} True if banned
   */
  async isBanned(ipAddress) {
    const score = await this.getScore(ipAddress);
    return score < this.thresholds.banned;
  }

  /**
   * Check if IP is suspicious
   *
   * @param {string} ipAddress - IP address to check
   * @returns {Promise<boolean>} True if suspicious
   */
  async isSuspicious(ipAddress) {
    const score = await this.getScore(ipAddress);
    const level = this.getLevel(score);
    return level === 'suspicious';
  }

  /**
   * Check if IP is trusted
   *
   * @param {string} ipAddress - IP address to check
   * @returns {Promise<boolean>} True if trusted
   */
  async isTrusted(ipAddress) {
    const score = await this.getScore(ipAddress);
    const level = this.getLevel(score);
    return level === 'trusted';
  }

  /**
   * Get rate limit multiplier based on reputation
   * Used by advancedRateLimiter to adjust limits
   *
   * @param {string} ipAddress - IP address
   * @returns {Promise<number>} Multiplier (0 = banned, 0.5 = suspicious, 1.0 = neutral, 2.0 = trusted)
   */
  async getRateLimitMultiplier(ipAddress) {
    try {
      const score = await this.getScore(ipAddress);
      const level = this.getLevel(score);

      const multipliers = {
        banned: 0,       // No requests allowed
        suspicious: 0.5, // Half the normal limit
        neutral: 1.0,    // Normal limit
        trusted: 2.0     // Double the limit
      };

      return multipliers[level];
    } catch (error) {
      log.error('Error getting rate limit multiplier', error);
      return 1.0; // Fail neutral
    }
  }

  /**
   * Get full reputation info for an IP
   *
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Reputation info
   */
  async getReputationInfo(ipAddress) {
    try {
      const score = await this.getScore(ipAddress);
      const level = this.getLevel(score);
      const multiplier = await this.getRateLimitMultiplier(ipAddress);

      return {
        ipAddress,
        score,
        level,
        rateLimitMultiplier: multiplier,
        isBanned: level === 'banned',
        isSuspicious: level === 'suspicious',
        isTrusted: level === 'trusted',
        thresholds: this.thresholds,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('Error getting reputation info', error);
      return null;
    }
  }

  /**
   * Manually set reputation score
   * For admin overrides
   *
   * @param {string} ipAddress - IP address
   * @param {number} score - New score (0-100)
   * @param {string} reason - Reason for manual adjustment
   */
  async setScore(ipAddress, score, reason = 'manual_adjustment') {
    try {
      score = Math.max(this.minScore, Math.min(this.maxScore, score));

      const key = `ip_reputation:${ipAddress}`;
      const ttl = 30 * 24 * 3600;

      await cache.set(key, score.toString(), ttl);

      await securityLogger.logEvent(
        'ip_reputation_manual_set',
        securityLogger.SEVERITY.INFO,
        {
          ipAddress,
          newScore: score,
          reason,
          level: this.getLevel(score)
        }
      );

      log.info(`IP Reputation Manually Set: ${ipAddress} -> ${score} (${reason})`);
    } catch (error) {
      log.error('Error setting IP reputation score', error);
    }
  }

  /**
   * Reset reputation to default
   *
   * @param {string} ipAddress - IP address
   * @param {string} reason - Reason for reset
   */
  async resetReputation(ipAddress, reason = 'admin_reset') {
    await this.setScore(ipAddress, this.defaultScore, reason);
    log.info(`IP Reputation Reset: ${ipAddress} -> ${this.defaultScore}`);
  }

  /**
   * Get top worst IPs by reputation
   *
   * @param {number} limit - Number of IPs to return
   * @returns {Promise<Array>} List of IPs with low scores
   */
  async getWorstIPs(limit = 10) {
    try {
      const scored = await this._scanAllScores();
      scored.sort((a, b) => a.score - b.score);
      return scored.slice(0, limit);
    } catch (error) {
      log.error('Error getting worst IPs', error);
      return [];
    }
  }

  /**
   * Get top best IPs by reputation
   *
   * @param {number} limit - Number of IPs to return
   * @returns {Promise<Array>} List of IPs with high scores
   */
  async getBestIPs(limit = 10) {
    try {
      const scored = await this._scanAllScores();
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    } catch (error) {
      log.error('Error getting best IPs', error);
      return [];
    }
  }

  /**
   * Apply daily reputation decay
   * Slowly rehabilitate IPs with bad scores
   * Run this daily via cron
   */
  async applyDailyDecay() {
    try {
      log.info('Applying daily IP reputation decay (rehabilitation)...');

      const keys = await cache.getAllKeys('ip_reputation:*');
      let updated = 0;
      const ttl = 30 * 24 * 3600;

      for (const key of keys) {
        const scoreStr = await cache.get(key);
        if (scoreStr === null) continue;

        const currentScore = parseInt(scoreStr, 10);
        if (isNaN(currentScore)) continue;

        let newScore = currentScore;
        if (currentScore < this.defaultScore) {
          // Rehabilitate: move toward default (+1)
          newScore = Math.min(this.defaultScore, currentScore + 1);
        } else if (currentScore > this.defaultScore) {
          // Slow decay: move toward default (-1)
          newScore = Math.max(this.defaultScore, currentScore - 1);
        }

        if (newScore !== currentScore) {
          await cache.set(key, newScore.toString(), ttl);
          updated++;
        }
      }

      log.info(`Daily decay complete: ${updated} IPs adjusted out of ${keys.length} total`);
      return updated;
    } catch (error) {
      log.error('Error applying daily decay', error);
      return 0;
    }
  }

  /**
   * Get reputation statistics
   *
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const scored = await this._scanAllScores();
      const counts = { banned: 0, suspicious: 0, neutral: 0, trusted: 0 };
      let totalScore = 0;

      for (const entry of scored) {
        counts[entry.level]++;
        totalScore += entry.score;
      }

      return {
        totalIPs: scored.length,
        bannedCount: counts.banned,
        suspiciousCount: counts.suspicious,
        neutralCount: counts.neutral,
        trustedCount: counts.trusted,
        averageScore: scored.length > 0 ? Math.round(totalScore / scored.length) : this.defaultScore,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('Error getting reputation statistics', error);
      return null;
    }
  }

  /**
   * Scan all IP reputation keys and return scored entries
   * @returns {Promise<Array<{ip: string, score: number, level: string}>>}
   */
  async _scanAllScores() {
    const keys = await cache.getAllKeys('ip_reputation:*');
    const results = [];

    for (const key of keys) {
      const scoreStr = await cache.get(key);
      if (scoreStr === null) continue;

      const score = parseInt(scoreStr, 10);
      if (isNaN(score)) continue;

      const ip = key.replace('ip_reputation:', '');
      results.push({ ip, score, level: this.getLevel(score) });
    }

    return results;
  }
}

// Export singleton instance
module.exports = new IPReputationSystem();
