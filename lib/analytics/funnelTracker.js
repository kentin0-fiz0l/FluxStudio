/**
 * Funnel Tracker — Server-side event ingestion and funnel query helpers
 *
 * Sprint 44: Phase 6.3 Growth & Engagement
 *
 * Provides:
 * - ingestEvent(userId, eventName, properties, meta) — write to analytics_events
 * - queryFunnel(stages, startDate, endDate) — count unique users per stage
 * - queryRetention(startDate, endDate) — day-7 return rate
 */

const { query } = require('../../database/config');

/**
 * Ordered funnel stages for the default signup→retention funnel.
 */
const FUNNEL_STAGES = [
  'signup_started',
  'signup_completed',
  'email_verified',
  'first_project_created',
  'first_collaboration',
  'day_7_return',
];

/**
 * Ingest a single analytics event.
 *
 * @param {string|null} userId - Authenticated user ID (null for anonymous)
 * @param {string} eventName - Event name (e.g. 'signup_completed')
 * @param {Object} properties - Arbitrary JSON properties
 * @param {Object} meta - Request metadata { sessionId, ipAddress, userAgent }
 * @returns {Promise<Object>} Created event row
 */
async function ingestEvent(userId, eventName, properties = {}, meta = {}) {
  const result = await query(
    `INSERT INTO analytics_events (user_id, event_name, properties, session_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5::inet, $6)
     RETURNING id, event_name, created_at`,
    [
      userId || null,
      eventName,
      JSON.stringify(properties),
      meta.sessionId || null,
      meta.ipAddress || null,
      meta.userAgent || null,
    ]
  );
  return result.rows[0];
}

/**
 * Query funnel conversion — count unique users who reached each stage.
 *
 * @param {string[]} stages - Ordered array of event names
 * @param {string} startDate - ISO date string (inclusive)
 * @param {string} endDate - ISO date string (inclusive)
 * @returns {Promise<Array<{stage: string, unique_users: number}>>}
 */
async function queryFunnel(stages = FUNNEL_STAGES, startDate, endDate) {
  const conditions = ['created_at >= $1', 'created_at <= $2'];
  const params = [startDate, endDate];

  const result = await query(
    `SELECT event_name, COUNT(DISTINCT user_id) AS unique_users
     FROM analytics_events
     WHERE ${conditions.join(' AND ')}
       AND event_name = ANY($3)
       AND user_id IS NOT NULL
     GROUP BY event_name`,
    [...params, stages]
  );

  // Build ordered result with zero-fill for missing stages
  const countsMap = Object.fromEntries(
    result.rows.map((r) => [r.event_name, parseInt(r.unique_users, 10)])
  );

  return stages.map((stage) => ({
    stage,
    unique_users: countsMap[stage] || 0,
  }));
}

/**
 * Query retention — users who signed up in a date range and returned after 7+ days.
 *
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<{signups: number, retained: number, rate: number}>}
 */
async function queryRetention(startDate, endDate) {
  const result = await query(
    `WITH signups AS (
       SELECT DISTINCT user_id, MIN(created_at) AS signup_time
       FROM analytics_events
       WHERE event_name = 'signup_completed'
         AND created_at >= $1 AND created_at <= $2
         AND user_id IS NOT NULL
       GROUP BY user_id
     ),
     returns AS (
       SELECT DISTINCT s.user_id
       FROM signups s
       JOIN analytics_events ae ON ae.user_id = s.user_id
         AND ae.event_name IN ('page_view', 'login_success', 'project_opened')
         AND ae.created_at >= s.signup_time + INTERVAL '7 days'
     )
     SELECT
       (SELECT COUNT(*) FROM signups) AS signups,
       (SELECT COUNT(*) FROM returns) AS retained`,
    [startDate, endDate]
  );

  const row = result.rows[0];
  const signups = parseInt(row.signups, 10) || 0;
  const retained = parseInt(row.retained, 10) || 0;
  const rate = signups > 0 ? Math.round((retained / signups) * 100) : 0;

  return { signups, retained, rate };
}

module.exports = {
  FUNNEL_STAGES,
  ingestEvent,
  queryFunnel,
  queryRetention,
};
