/**
 * Admin Audit Log Routes
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Endpoints:
 * - GET  /api/admin/audit-logs      — Paginated, filterable audit log list
 * - GET  /api/admin/audit-logs/export — CSV export of filtered logs
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');

// All routes require authentication + admin role
router.use(authenticateToken);

function requireAdmin(req, res, next) {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/audit-logs
 *
 * Query params:
 *   action    — filter by action (login, create, delete, etc.)
 *   resource  — filter by resource_type (project, file, user, etc.)
 *   userId    — filter by acting user
 *   search    — full-text search in details JSONB
 *   startDate — ISO date lower bound
 *   endDate   — ISO date upper bound
 *   page      — page number (default 1)
 *   limit     — rows per page (default 50, max 200)
 */
router.get('/', async (req, res) => {
  try {
    const {
      action,
      resource,
      userId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`al.action = $${paramIdx++}`);
      params.push(action);
    }
    if (resource) {
      conditions.push(`al.resource_type = $${paramIdx++}`);
      params.push(resource);
    }
    if (userId) {
      conditions.push(`al.user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (search) {
      conditions.push(`al.details::text ILIKE $${paramIdx++}`);
      params.push(`%${search}%`);
    }
    if (startDate) {
      conditions.push(`al.created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`al.created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total for pagination
    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs al ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch page
    const result = await query(
      `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id,
              al.details, al.ip_address, al.user_agent, al.created_at,
              u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      logs: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: row.details,
        ip: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.created_at,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[AdminAudit] List failed:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/admin/audit-logs/export
 *
 * Returns CSV of filtered audit logs (same filters as list endpoint).
 */
router.get('/export', async (req, res) => {
  try {
    const { action, resource, userId, startDate, endDate } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`al.action = $${paramIdx++}`);
      params.push(action);
    }
    if (resource) {
      conditions.push(`al.resource_type = $${paramIdx++}`);
      params.push(resource);
    }
    if (userId) {
      conditions.push(`al.user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (startDate) {
      conditions.push(`al.created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`al.created_at <= $${paramIdx++}`);
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT al.action, al.resource_type, al.resource_id,
              al.details, al.ip_address, al.created_at,
              u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT 10000`,
      params
    );

    // Build CSV
    const header = 'Timestamp,User,Email,Action,Resource Type,Resource ID,Details,IP Address\n';
    const rows = result.rows.map(r => {
      const details = typeof r.details === 'object' ? JSON.stringify(r.details) : r.details || '';
      return [
        r.created_at,
        `"${(r.user_name || '').replace(/"/g, '""')}"`,
        r.user_email || '',
        r.action,
        r.resource_type,
        r.resource_id || '',
        `"${details.replace(/"/g, '""')}"`,
        r.ip_address || '',
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(header + rows);
  } catch (error) {
    console.error('[AdminAudit] Export failed:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
