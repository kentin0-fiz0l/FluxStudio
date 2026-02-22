/**
 * Observability Routes — Event ingestion + Web Vitals RUM
 *
 * Sprint 40: Phase 5.3 Observability & Analytics
 *
 * POST /api/observability/events   — Batched analytics events (auth required)
 * POST /api/observability/vitals   — Web Vitals beacon (no auth, lightweight)
 * GET  /api/observability/metrics  — Admin metrics dashboard data (admin only)
 */

const express = require('express');
const { query } = require('../database/config');
const { authenticateToken } = require('../lib/auth/middleware');
const performanceMetrics = require('../lib/monitoring/performanceMetrics');
const { queryFunnel, FUNNEL_STAGES } = require('../lib/analytics/funnelTracker');

const router = express.Router();

// Simple in-memory rate limiter for unauthenticated vitals endpoint
const vitalsLimiter = new Map();
const VITALS_RATE_LIMIT = 30; // max requests per minute per IP
const VITALS_WINDOW = 60_000;

function checkVitalsRateLimit(ip) {
  const now = Date.now();
  const entry = vitalsLimiter.get(ip);
  if (!entry || now - entry.start > VITALS_WINDOW) {
    vitalsLimiter.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= VITALS_RATE_LIMIT;
}

// Periodic cleanup of rate limiter entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of vitalsLimiter) {
    if (now - entry.start > VITALS_WINDOW * 2) vitalsLimiter.delete(ip);
  }
}, VITALS_WINDOW * 5);

// ========================================
// POST /events — Batched analytics events
// ========================================

router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events must be a non-empty array' });
    }

    if (events.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 events per batch' });
    }

    const userId = req.user.id;

    // Batch insert using unnest
    const names = [];
    const sessionIds = [];
    const properties = [];
    const timestamps = [];

    for (const event of events) {
      if (!event.name || typeof event.name !== 'string') continue;
      names.push(event.name.substring(0, 255));
      sessionIds.push((event.sessionId || 'unknown').substring(0, 255));
      properties.push(JSON.stringify(event.properties || {}));
      timestamps.push(event.timestamp || new Date().toISOString());
    }

    if (names.length === 0) {
      return res.status(400).json({ error: 'No valid events in batch' });
    }

    await query(
      `INSERT INTO analytics_events (user_id, session_id, event_name, properties, created_at)
       SELECT $1, unnest($2::text[]), unnest($3::text[]), unnest($4::jsonb[]), unnest($5::timestamptz[])`,
      [userId, sessionIds, names, properties, timestamps]
    );

    res.json({ success: true, count: names.length });
  } catch (error) {
    console.error('[Observability] Events ingestion error:', error);
    res.status(500).json({ error: 'Failed to store events' });
  }
});

// ========================================
// POST /vitals — Web Vitals beacon
// ========================================

router.post('/vitals', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkVitalsRateLimit(ip)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const { sessionId, url, vitals, viewport, connectionType, userAgent, performanceScore } = req.body;

    if (!sessionId || !vitals) {
      return res.status(400).json({ error: 'sessionId and vitals are required' });
    }

    await ensureVitalsTable();

    await query(
      `INSERT INTO web_vitals
       (session_id, url, lcp, fcp, fid, cls, ttfb, tti, connection_type, user_agent, viewport_width, viewport_height, performance_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        String(sessionId).substring(0, 255),
        (url || '').substring(0, 2048),
        vitals.LCP ?? null,
        vitals.FCP ?? null,
        vitals.FID ?? null,
        vitals.CLS ?? null,
        vitals.TTFB ?? null,
        vitals.TTI ?? null,
        (connectionType || '').substring(0, 50),
        (userAgent || '').substring(0, 512),
        viewport?.width ?? null,
        viewport?.height ?? null,
        performanceScore ?? null,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Observability] Vitals ingestion error:', error);
    res.status(500).json({ error: 'Failed to store vitals' });
  }
});

// ========================================
// GET /vitals/summary — Aggregated Web Vitals p75
// ========================================

router.get('/vitals/summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hours = Math.min(parseInt(req.query.hours) || 24, 168); // max 7 days
    await ensureVitalsTable();

    const result = await query(
      `SELECT
        COUNT(*) as total_sessions,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as lcp_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp) as fcp_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fid) as fid_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as cls_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ttfb) as ttfb_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tti) as tti_p75,
        ROUND(AVG(performance_score)::numeric, 0) as avg_score
       FROM web_vitals
       WHERE created_at >= NOW() - ($1 || ' hours')::INTERVAL
       AND lcp IS NOT NULL`,
      [hours]
    );

    // Per-page breakdown (top 10 slowest pages by LCP p75)
    const perPage = await query(
      `SELECT
        url,
        COUNT(*) as sessions,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as lcp_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as cls_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp) as fcp_p75
       FROM web_vitals
       WHERE created_at >= NOW() - ($1 || ' hours')::INTERVAL
       AND lcp IS NOT NULL
       GROUP BY url
       ORDER BY lcp_p75 DESC
       LIMIT 10`,
      [hours]
    );

    res.json({
      success: true,
      period: { hours },
      summary: result.rows[0] || null,
      perPage: perPage.rows,
    });
  } catch (error) {
    console.error('[Observability] Vitals summary error:', error);
    res.status(500).json({ error: 'Failed to fetch vitals summary' });
  }
});

// ========================================
// GET /metrics — Admin metrics dashboard
// ========================================

router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const minutes = parseInt(req.query.minutes) || 60;
    const history = performanceMetrics.getHistory(Math.min(minutes, 60));
    const summary = performanceMetrics.getSummary();
    const current = performanceMetrics.getCurrentMetrics();

    // Recent Web Vitals aggregation (last 24h)
    await ensureVitalsTable();
    const vitalsResult = await query(
      `SELECT
        COUNT(*) as total_sessions,
        ROUND(AVG(lcp)::numeric, 0) as avg_lcp,
        ROUND(AVG(fcp)::numeric, 0) as avg_fcp,
        ROUND(AVG(fid)::numeric, 0) as avg_fid,
        ROUND(AVG(cls)::numeric, 4) as avg_cls,
        ROUND(AVG(ttfb)::numeric, 0) as avg_ttfb,
        ROUND(AVG(performance_score)::numeric, 0) as avg_score,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as lcp_p75,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as cls_p75
       FROM web_vitals
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       AND lcp IS NOT NULL`
    );

    // Event counts (last 24h)
    const eventsResult = await query(
      `SELECT event_name, COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY event_name
       ORDER BY count DESC
       LIMIT 20`
    );

    // WebSocket connections per namespace
    const io = req.app.get('io');
    let wsConnections = null;
    if (io) {
      const namespaces = ['/', '/auth', '/messaging', '/printing', '/design-boards', '/metmap-collab', '/notifications'];
      wsConnections = {};
      for (const ns of namespaces) {
        try {
          const nsp = io.of(ns);
          wsConnections[ns] = nsp.sockets?.size ?? 0;
        } catch { wsConnections[ns] = 0; }
      }
      wsConnections.total = Object.values(wsConnections).reduce((a, b) => a + b, 0);
    }

    // Signup funnel (last 30 days)
    let funnelData = null;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      funnelData = await queryFunnel(FUNNEL_STAGES, thirtyDaysAgo, now);
    } catch { /* funnel query optional */ }

    // Per-page Web Vitals (top 10 slowest by LCP p75)
    let perPageVitals = [];
    try {
      const perPage = await query(
        `SELECT
          url,
          COUNT(*) as sessions,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) as lcp_p75,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls) as cls_p75,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp) as fcp_p75
         FROM web_vitals
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         AND lcp IS NOT NULL
         GROUP BY url
         ORDER BY lcp_p75 DESC
         LIMIT 10`
      );
      perPageVitals = perPage.rows;
    } catch { /* optional */ }

    res.json({
      server: {
        current,
        summary,
        history,
      },
      webVitals: vitalsResult.rows[0] || null,
      perPageVitals,
      topEvents: eventsResult.rows,
      wsConnections,
      funnel: funnelData,
    });
  } catch (error) {
    console.error('[Observability] Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ========================================
// Auto-create web_vitals table if missing
// ========================================
let vitalsTableReady = false;

async function ensureVitalsTable() {
  if (vitalsTableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS web_vitals (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        url VARCHAR(2048) DEFAULT '/',
        lcp DOUBLE PRECISION,
        fcp DOUBLE PRECISION,
        fid DOUBLE PRECISION,
        cls DOUBLE PRECISION,
        ttfb DOUBLE PRECISION,
        tti DOUBLE PRECISION,
        connection_type VARCHAR(50) DEFAULT 'unknown',
        user_agent VARCHAR(512),
        viewport_width INTEGER,
        viewport_height INTEGER,
        performance_score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals (created_at)');
    vitalsTableReady = true;
  } catch (err) {
    console.debug('[Observability] ensureVitalsTable:', err.message);
  }
}

module.exports = router;
