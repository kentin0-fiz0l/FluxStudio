/**
 * Blocked IPs Management API
 * Sprint 13, Day 5: Security Dashboard & Admin Endpoints
 *
 * Features:
 * - List blocked IPs with pagination and filtering
 * - Get detailed IP information
 * - Unblock IPs (reset reputation to neutral)
 * - Whitelist IPs (set reputation to trusted)
 * - Manually block IPs
 * - All actions logged for audit trail
 *
 * Date: 2025-10-17
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const ipReputation = require('../../security/ipReputation');
const securityLogger = require('../../auth/securityLogger');
const cache = require('../../cache');
const fs = require('fs').promises;
const path = require('path');

const SECURITY_EVENTS_FILE = path.join(__dirname, '../../../security_events.json');

/**
 * List all blocked IPs
 * GET /api/admin/security/blocked-ips
 *
 * Query params:
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 50, max: 100)
 * - minScore: Minimum reputation score filter
 * - maxScore: Maximum reputation score filter
 * - sort: Sort field (score, lastSeen, requestCount)
 * - order: Sort order (asc, desc)
 */
router.get('/blocked-ips', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      perPage = 50,
      minScore,
      maxScore,
      sort = 'score',
      order = 'asc'
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage)));

    // Get all IPs from cache
    const allIpsData = await cache.getAllKeys('ip_reputation:*');
    const blockedIps = [];

    for (const key of allIpsData) {
      const ip = key.replace('ip_reputation:', '');
      const score = await ipReputation.getScore(ip);

      // Only include blocked IPs (score < 20)
      if (score < 20) {
        // Get additional data
        const history = await ipReputation.getHistory(ip);
        const lastEvent = history.length > 0 ? history[history.length - 1] : null;

        const ipData = {
          ip,
          score,
          level: ipReputation.getLevel(score),
          banReason: lastEvent ? lastEvent.event : 'unknown',
          bannedAt: lastEvent ? lastEvent.timestamp : null,
          lastSeen: lastEvent ? lastEvent.timestamp : null,
          requestCount: history.length
        };

        // Apply filters
        if (minScore && score < parseInt(minScore)) continue;
        if (maxScore && score > parseInt(maxScore)) continue;

        blockedIps.push(ipData);
      }
    }

    // Sort
    const sortField = ['score', 'lastSeen', 'requestCount'].includes(sort) ? sort : 'score';
    const sortOrder = order === 'desc' ? -1 : 1;

    blockedIps.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;

      if (sortField === 'lastSeen') {
        return sortOrder * (new Date(bVal) - new Date(aVal));
      }

      return sortOrder * (aVal - bVal);
    });

    // Paginate
    const total = blockedIps.length;
    const totalPages = Math.ceil(total / perPageNum);
    const start = (pageNum - 1) * perPageNum;
    const paginatedIps = blockedIps.slice(start, start + perPageNum);

    res.json({
      success: true,
      ips: paginatedIps,
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error listing blocked IPs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get detailed IP information
 * GET /api/admin/security/blocked-ips/:ip
 */
router.get('/blocked-ips/:ip', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    // Get IP reputation
    const score = await ipReputation.getScore(ip);
    const level = ipReputation.getLevel(score);
    const history = await ipReputation.getHistory(ip);

    // Get whitelist status
    const whitelisted = await cache.get(`ip_whitelisted:${ip}`);

    // Get related security events
    let relatedEvents = [];
    try {
      const eventsData = await fs.readFile(SECURITY_EVENTS_FILE, 'utf8');
      const events = JSON.parse(eventsData);
      relatedEvents = events.filter(event =>
        event.ipAddress === ip
      ).slice(-50); // Last 50 events
    } catch (error) {
      console.error('Error reading security events:', error);
    }

    // Get rate limit multiplier
    const rateLimitMultiplier = await ipReputation.getRateLimitMultiplier(ip);

    const details = {
      ip,
      reputation: {
        score,
        level,
        rateLimitMultiplier
      },
      status: {
        blocked: score < 20,
        whitelisted: whitelisted === 'true',
        suspicious: score >= 20 && score < 40
      },
      history: history.map(h => ({
        timestamp: h.timestamp,
        event: h.event,
        adjustment: h.adjustment,
        newScore: h.newScore,
        metadata: h.metadata
      })),
      events: relatedEvents.map(e => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        timestamp: e.timestamp,
        details: e.details
      })),
      statistics: {
        totalEvents: relatedEvents.length,
        firstSeen: history.length > 0 ? history[0].timestamp : null,
        lastSeen: history.length > 0 ? history[history.length - 1].timestamp : null,
        eventTypes: relatedEvents.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      }
    };

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error getting IP details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Unblock IP (reset reputation to neutral)
 * POST /api/admin/security/blocked-ips/:ip/unblock
 *
 * Body:
 * - reason: Reason for unblocking (optional)
 */
router.post('/blocked-ips/:ip/unblock', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason } = req.body;

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    // Get current score
    const oldScore = await ipReputation.getScore(ip);

    // Reset reputation to neutral (50)
    await ipReputation.setScore(ip, 50);

    // Remove from blocked cache if exists
    await cache.del(`blocked_ip:${ip}`);

    // Log admin action
    await securityLogger.logEvent('ip_unblocked', 'MEDIUM', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      oldScore,
      newScore: 50,
      reason: reason || 'Manual unblock by admin'
    });

    res.json({
      success: true,
      ip,
      oldScore,
      newScore: 50,
      message: 'IP unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Whitelist IP (set reputation to trusted)
 * POST /api/admin/security/blocked-ips/:ip/whitelist
 *
 * Body:
 * - reason: Reason for whitelisting (optional)
 * - duration: Duration in seconds (default: 1 year)
 */
router.post('/blocked-ips/:ip/whitelist', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason, duration = 365 * 24 * 3600 } = req.body;

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    // Get current score
    const oldScore = await ipReputation.getScore(ip);

    // Set reputation to trusted (100)
    await ipReputation.setScore(ip, 100);

    // Add to whitelist
    await cache.set(`ip_whitelisted:${ip}`, 'true', duration);

    // Log admin action
    await securityLogger.logEvent('ip_whitelisted', 'MEDIUM', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      oldScore,
      newScore: 100,
      duration,
      reason: reason || 'Manual whitelist by admin'
    });

    res.json({
      success: true,
      ip,
      oldScore,
      newScore: 100,
      whitelisted: true,
      expiresAt: new Date(Date.now() + duration * 1000).toISOString(),
      message: 'IP whitelisted successfully'
    });
  } catch (error) {
    console.error('Error whitelisting IP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Manually block IP
 * POST /api/admin/security/blocked-ips/:ip/block
 *
 * Body:
 * - reason: Reason for blocking (required)
 * - duration: Duration in seconds (optional, permanent if not specified)
 */
router.post('/blocked-ips/:ip/block', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason, duration } = req.body;

    // Validate IP format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    // Require reason for manual blocks
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for manual IP blocks'
      });
    }

    // Get current score
    const oldScore = await ipReputation.getScore(ip);

    // Set reputation to banned (0)
    await ipReputation.setScore(ip, 0);

    // Add to blocked cache
    await cache.set(`blocked_ip:${ip}`, 'true', duration || 30 * 24 * 3600);

    // Set expiry if duration provided
    let expiresAt = null;
    if (duration) {
      expiresAt = new Date(Date.now() + duration * 1000).toISOString();
      await cache.set(`ip_ban_expires:${ip}`, expiresAt, duration);
    }

    // Log admin action
    await securityLogger.logEvent('ip_blocked_manually', 'HIGH', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      oldScore,
      newScore: 0,
      duration: duration || 'permanent',
      expiresAt,
      reason
    });

    res.json({
      success: true,
      ip,
      oldScore,
      newScore: 0,
      blocked: true,
      expiresAt,
      permanent: !duration,
      message: 'IP blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get blocked IPs statistics
 * GET /api/admin/security/blocked-ips/stats
 */
router.get('/blocked-ips/stats', adminAuth, async (req, res) => {
  try {
    // Get all IPs
    const allIpsData = await cache.getAllKeys('ip_reputation:*');
    const stats = {
      total: 0,
      banned: 0,
      suspicious: 0,
      neutral: 0,
      trusted: 0,
      whitelisted: 0,
      byScore: {
        '0-20': 0,
        '20-40': 0,
        '40-60': 0,
        '60-80': 0,
        '80-100': 0
      }
    };

    for (const key of allIpsData) {
      const ip = key.replace('ip_reputation:', '');
      const score = await ipReputation.getScore(ip);
      const level = ipReputation.getLevel(score);

      stats.total++;
      stats[level]++;

      // Score distribution
      if (score < 20) stats.byScore['0-20']++;
      else if (score < 40) stats.byScore['20-40']++;
      else if (score < 60) stats.byScore['40-60']++;
      else if (score < 80) stats.byScore['60-80']++;
      else stats.byScore['80-100']++;

      // Check whitelist
      const whitelisted = await cache.get(`ip_whitelisted:${ip}`);
      if (whitelisted === 'true') stats.whitelisted++;
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting blocked IPs stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
