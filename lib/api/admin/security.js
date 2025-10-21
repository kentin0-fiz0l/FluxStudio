/**
 * Security Events & Anomaly Timeline API
 * Sprint 13, Day 5: Security Dashboard & Admin Endpoints
 *
 * Features:
 * - List security events with filtering and pagination
 * - Get event details
 * - Event statistics and analytics
 * - Export events for compliance/audit
 * - Timeline visualization data
 *
 * Date: 2025-10-17
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const fs = require('fs').promises;
const path = require('path');

const SECURITY_EVENTS_FILE = path.join(__dirname, '../../../security_events.json');

/**
 * Load security events from file
 */
async function loadEvents() {
  try {
    const data = await fs.readFile(SECURITY_EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading security events:', error);
    return [];
  }
}

/**
 * List security events
 * GET /api/admin/security/events
 *
 * Query params:
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 50, max: 100)
 * - type: Filter by event type
 * - severity: Filter by severity (low, medium, high, critical)
 * - userId: Filter by user ID
 * - ipAddress: Filter by IP address
 * - fromDate: Filter from date (ISO string)
 * - toDate: Filter to date (ISO string)
 * - sort: Sort field (timestamp, severity)
 * - order: Sort order (asc, desc)
 */
router.get('/events', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      perPage = 50,
      type,
      severity,
      userId,
      ipAddress,
      fromDate,
      toDate,
      sort = 'timestamp',
      order = 'desc'
    } = req.query;

    const events = await loadEvents();

    // Filter events
    let filteredEvents = events.filter(event => {
      // Type filter
      if (type && event.type !== type) return false;

      // Severity filter
      if (severity) {
        const severityLower = event.severity?.toLowerCase();
        if (severityLower !== severity.toLowerCase()) return false;
      }

      // User ID filter
      if (userId && event.userId !== userId) return false;

      // IP address filter
      if (ipAddress && event.ipAddress !== ipAddress) return false;

      // Date range filter
      const eventTime = new Date(event.timestamp).getTime();
      if (fromDate && eventTime < new Date(fromDate).getTime()) return false;
      if (toDate && eventTime > new Date(toDate).getTime()) return false;

      return true;
    });

    // Sort events
    const sortField = ['timestamp', 'severity'].includes(sort) ? sort : 'timestamp';
    const sortOrder = order === 'asc' ? 1 : -1;

    filteredEvents.sort((a, b) => {
      if (sortField === 'timestamp') {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return sortOrder * (aTime - bTime);
      } else if (sortField === 'severity') {
        const severityOrder = { low: 1, info: 2, medium: 3, high: 4, critical: 5 };
        const aSev = severityOrder[a.severity?.toLowerCase()] || 0;
        const bSev = severityOrder[b.severity?.toLowerCase()] || 0;
        return sortOrder * (aSev - bSev);
      }
      return 0;
    });

    // Calculate summary statistics
    const summary = {
      totalEvents: filteredEvents.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      byType: {}
    };

    filteredEvents.forEach(event => {
      const sev = event.severity?.toLowerCase() || 'info';
      if (summary.bySeverity[sev] !== undefined) {
        summary.bySeverity[sev]++;
      }

      summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    });

    // Paginate
    const pageNum = Math.max(1, parseInt(page));
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage)));
    const total = filteredEvents.length;
    const totalPages = Math.ceil(total / perPageNum);
    const start = (pageNum - 1) * perPageNum;
    const paginatedEvents = filteredEvents.slice(start, start + perPageNum);

    // Format events
    const formattedEvents = paginatedEvents.map(event => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      userId: event.userId,
      email: event.email,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent ? event.userAgent.substring(0, 100) : null,
      details: event.details,
      resolution: event.resolution
    }));

    res.json({
      success: true,
      events: formattedEvents,
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages
      },
      summary
    });
  } catch (error) {
    console.error('Error listing security events:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get event details
 * GET /api/admin/security/events/:eventId
 */
router.get('/events/:eventId', adminAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const events = await loadEvents();

    // Find event
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Find related events (same IP or same user within 1 hour)
    const eventTime = new Date(event.timestamp).getTime();
    const oneHour = 60 * 60 * 1000;

    const relatedEvents = events.filter(e => {
      if (e.id === event.id) return false;

      const eTime = new Date(e.timestamp).getTime();
      const timeDiff = Math.abs(eTime - eventTime);

      if (timeDiff > oneHour) return false;

      return (
        e.ipAddress === event.ipAddress ||
        (e.userId && e.userId === event.userId)
      );
    }).slice(0, 20); // Max 20 related events

    res.json({
      success: true,
      event: {
        ...event,
        relatedEvents: relatedEvents.map(e => ({
          id: e.id,
          type: e.type,
          severity: e.severity,
          timestamp: e.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Error getting event details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get event statistics
 * GET /api/admin/security/events/stats
 *
 * Query params:
 * - period: Time period (24h, 7d, 30d, 90d)
 * - groupBy: Group by (hour, day, week)
 */
router.get('/events/stats', adminAuth, async (req, res) => {
  try {
    const { period = '7d', groupBy = 'day' } = req.query;

    const events = await loadEvents();
    const now = Date.now();

    // Determine time range
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[period] || 7 * 24 * 60 * 60 * 1000;

    const startTime = now - periodMs;

    // Group events by time period
    const groupMs = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000
    }[groupBy] || 24 * 60 * 60 * 1000;

    const stats = {};

    events.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      if (eventTime < startTime) return;

      // Calculate bucket
      const bucket = Math.floor((eventTime - startTime) / groupMs);
      const bucketStart = startTime + (bucket * groupMs);
      const bucketKey = new Date(bucketStart).toISOString();

      if (!stats[bucketKey]) {
        stats[bucketKey] = {
          timestamp: bucketKey,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          byType: {}
        };
      }

      stats[bucketKey].total++;

      const sev = event.severity?.toLowerCase();
      if (['critical', 'high', 'medium', 'low'].includes(sev)) {
        stats[bucketKey][sev]++;
      }

      stats[bucketKey].byType[event.type] = (stats[bucketKey].byType[event.type] || 0) + 1;
    });

    // Convert to array and sort
    const statsArray = Object.values(stats).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json({
      success: true,
      period,
      groupBy,
      stats: statsArray
    });
  } catch (error) {
    console.error('Error getting event stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Export security events
 * GET /api/admin/security/events/export
 *
 * Query params:
 * - format: Export format (json, csv)
 * - fromDate: From date (ISO string)
 * - toDate: To date (ISO string)
 * - type: Filter by event type
 * - severity: Filter by severity
 */
router.get('/events/export', adminAuth, async (req, res) => {
  try {
    const { format = 'json', fromDate, toDate, type, severity } = req.query;

    const events = await loadEvents();

    // Filter events
    let filteredEvents = events.filter(event => {
      if (type && event.type !== type) return false;
      if (severity && event.severity?.toLowerCase() !== severity.toLowerCase()) return false;

      const eventTime = new Date(event.timestamp).getTime();
      if (fromDate && eventTime < new Date(fromDate).getTime()) return false;
      if (toDate && eventTime > new Date(toDate).getTime()) return false;

      return true;
    });

    // Sort by timestamp
    filteredEvents.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (format === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Type', 'Severity', 'Timestamp', 'User ID', 'Email', 'IP Address', 'Details'];
      const csvRows = [headers.join(',')];

      filteredEvents.forEach(event => {
        const row = [
          event.id,
          event.type,
          event.severity,
          event.timestamp,
          event.userId || '',
          event.email || '',
          event.ipAddress || '',
          JSON.stringify(event.details || {}).replace(/,/g, ';')
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="security_events_${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="security_events_${Date.now()}.json"`);
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        count: filteredEvents.length,
        events: filteredEvents
      });
    }
  } catch (error) {
    console.error('Error exporting events:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get anomaly timeline data
 * GET /api/admin/security/timeline
 *
 * Returns data formatted for timeline visualization
 *
 * Query params:
 * - hours: Number of hours to include (default: 24)
 * - ipAddress: Filter by IP
 * - userId: Filter by user
 */
router.get('/timeline', adminAuth, async (req, res) => {
  try {
    const { hours = 24, ipAddress, userId } = req.query;

    const events = await loadEvents();
    const now = Date.now();
    const startTime = now - (parseInt(hours) * 60 * 60 * 1000);

    // Filter events
    let filteredEvents = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      if (eventTime < startTime) return false;
      if (ipAddress && event.ipAddress !== ipAddress) return false;
      if (userId && event.userId !== userId) return false;
      return true;
    });

    // Sort by timestamp
    filteredEvents.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Format for timeline
    const timeline = filteredEvents.map(event => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      title: formatEventTitle(event),
      description: formatEventDescription(event),
      user: event.email || event.userId,
      ip: event.ipAddress,
      details: event.details
    }));

    // Group by hour for summary
    const hourlyStats = {};
    filteredEvents.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const hour = Math.floor(eventTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
      const hourKey = new Date(hour).toISOString();

      if (!hourlyStats[hourKey]) {
        hourlyStats[hourKey] = {
          timestamp: hourKey,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }

      hourlyStats[hourKey].total++;
      const sev = event.severity?.toLowerCase();
      if (['critical', 'high', 'medium', 'low'].includes(sev)) {
        hourlyStats[hourKey][sev]++;
      }
    });

    res.json({
      success: true,
      timeline,
      hourlyStats: Object.values(hourlyStats).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      summary: {
        total: timeline.length,
        period: `${hours} hours`,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(now).toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Helper: Format event title for timeline
 */
function formatEventTitle(event) {
  const titles = {
    'brute_force_detected': 'Brute Force Attack',
    'rapid_token_refresh': 'Rapid Token Refresh',
    'bot_activity_detected': 'Bot Activity Detected',
    'multiple_device_login': 'Multiple Device Login',
    'account_takeover_attempt': 'Account Takeover Attempt',
    'suspicious_login_location': 'Suspicious Login Location',
    'ip_auto_banned': 'IP Auto-Banned',
    'ip_reputation_changed': 'IP Reputation Changed',
    'token_revoked': 'Token Revoked',
    'unauthorized_admin_access': 'Unauthorized Admin Access'
  };

  return titles[event.type] || event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Helper: Format event description for timeline
 */
function formatEventDescription(event) {
  const { details } = event;

  if (event.type === 'brute_force_detected') {
    return `${details?.failedAttempts || 0} failed login attempts in ${details?.timeWindow || 0} seconds`;
  }

  if (event.type === 'rapid_token_refresh') {
    return `${details?.refreshCount || 0} token refreshes in ${details?.timeWindow || 0} seconds`;
  }

  if (event.type === 'bot_activity_detected') {
    return `Detected bot pattern: ${details?.pattern || 'unknown'}`;
  }

  if (event.type === 'ip_auto_banned') {
    return `IP banned with final score: ${details?.finalScore || 0}`;
  }

  return JSON.stringify(details || {}).substring(0, 100);
}

module.exports = router;
