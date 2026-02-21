/**
 * Analytics Routes — Project health, team workload, velocity, risk assessment.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 * Sprint 44: Phase 6.3 Growth — funnel analytics ingest + query endpoints.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const {
  calculateProjectHealth,
  calculateWorkload,
  calculateVelocity,
  forecastCompletion,
} = require('../lib/analytics-scoring');
const { ingestEvent, queryFunnel, queryRetention, FUNNEL_STAGES } = require('../lib/analytics/funnelTracker');

const router = express.Router();

/**
 * Verify user has access to a project (member or org member).
 */
async function verifyProjectAccess(projectId, userId) {
  const result = await query(
    `SELECT p.id, p.due_date, p.organization_id
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
     LEFT JOIN organizations o ON o.id = p.organization_id
     WHERE p.id = $1 AND (pm.user_id IS NOT NULL OR p.manager_id = $2 OR o.created_by = $2)
     LIMIT 1`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Verify user has access to a team.
 */
async function verifyTeamAccess(teamId, userId) {
  const result = await query(
    `SELECT t.id FROM teams t
     LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $2
     WHERE t.id = $1 AND (tm.user_id IS NOT NULL OR t.lead_id = $2)
     LIMIT 1`,
    [teamId, userId]
  );
  return result.rows[0] || null;
}

// ========================================
// PROJECT HEALTH
// ========================================

/**
 * GET /api/analytics/project/:projectId/health
 * Composite health score with breakdown.
 */
router.get('/project/:projectId/health', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProjectAccess(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 1. Task stats from view
    const statsResult = await query(
      'SELECT * FROM project_task_stats WHERE project_id = $1',
      [projectId]
    );
    const taskStats = statsResult.rows[0] || {
      total_tasks: 0, completed_tasks: 0, in_progress_tasks: 0,
      todo_tasks: 0, blocked_tasks: 0, overdue_tasks: 0, completion_percentage: 0,
    };

    // 2. Velocity data from completed tasks
    const velocityResult = await query(
      `SELECT AVG(estimated_hours) as avg_estimated, AVG(actual_hours) as avg_actual, COUNT(*) as count
       FROM tasks WHERE project_id = $1 AND status = 'completed'
       AND estimated_hours IS NOT NULL AND actual_hours IS NOT NULL`,
      [projectId]
    );
    const velocityData = {
      avgEstimated: parseFloat(velocityResult.rows[0]?.avg_estimated) || 0,
      avgActual: parseFloat(velocityResult.rows[0]?.avg_actual) || 0,
      completedCount: parseInt(velocityResult.rows[0]?.count) || 0,
    };

    // 3. Momentum data (activity in last 7d vs previous 7d)
    const momentumResult = await query(
      `SELECT
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as recent,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '14 days' AND timestamp < NOW() - INTERVAL '7 days' THEN 1 END) as previous
       FROM activities WHERE project_id = $1`,
      [projectId]
    );
    const momentumData = {
      recentActivityCount: parseInt(momentumResult.rows[0]?.recent) || 0,
      previousActivityCount: parseInt(momentumResult.rows[0]?.previous) || 0,
    };

    const health = calculateProjectHealth(taskStats, velocityData, momentumData);

    // Cache the snapshot
    await query(
      `INSERT INTO project_health_snapshots
       (project_id, health_score, completion_score, velocity_score, momentum_score, overdue_score, breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, health.score, health.completionScore, health.velocityScore,
       health.momentumScore, health.overdueScore, JSON.stringify(health.breakdown)]
    ).catch(() => {}); // Non-critical — don't fail the request

    res.json({
      projectId,
      ...health,
      taskStats: {
        total: parseInt(taskStats.total_tasks),
        completed: parseInt(taskStats.completed_tasks),
        inProgress: parseInt(taskStats.in_progress_tasks),
        todo: parseInt(taskStats.todo_tasks),
        blocked: parseInt(taskStats.blocked_tasks),
        overdue: parseInt(taskStats.overdue_tasks),
      },
    });
  } catch (error) {
    console.error('[Analytics] Health error:', error);
    res.status(500).json({ error: 'Failed to calculate health score' });
  }
});

// ========================================
// BURNDOWN
// ========================================

/**
 * GET /api/analytics/project/:projectId/burndown
 * Daily task completion trend (last 30 days).
 */
router.get('/project/:projectId/burndown', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProjectAccess(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Total tasks in project
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM tasks WHERE project_id = $1',
      [projectId]
    );
    const totalTasks = parseInt(totalResult.rows[0]?.total) || 0;

    // Daily completed task counts (cumulative) over last 30 days
    const dailyResult = await query(
      `SELECT
        d.day::date as date,
        COUNT(t.id) as completed_by_date
       FROM generate_series(
         CURRENT_DATE - INTERVAL '29 days',
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(day)
       LEFT JOIN tasks t ON t.project_id = $1
         AND t.status = 'completed'
         AND t.completed_at::date <= d.day::date
       GROUP BY d.day
       ORDER BY d.day`,
      [projectId]
    );

    const burndown = dailyResult.rows.map(row => ({
      date: row.date,
      remaining: Math.max(0, totalTasks - parseInt(row.completed_by_date)),
      completed: parseInt(row.completed_by_date),
    }));

    res.json({ projectId, totalTasks, burndown });
  } catch (error) {
    console.error('[Analytics] Burndown error:', error);
    res.status(500).json({ error: 'Failed to calculate burndown' });
  }
});

// ========================================
// VELOCITY
// ========================================

/**
 * GET /api/analytics/project/:projectId/velocity
 * Weekly velocity + estimation accuracy.
 */
router.get('/project/:projectId/velocity', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProjectAccess(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Completed tasks in last 8 weeks
    const tasksResult = await query(
      `SELECT started_at, completed_at, estimated_hours, actual_hours
       FROM tasks
       WHERE project_id = $1 AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '8 weeks'
       ORDER BY completed_at DESC`,
      [projectId]
    );

    const velocity = calculateVelocity(tasksResult.rows);

    // Forecast
    const remainingResult = await query(
      `SELECT COUNT(*) as remaining FROM tasks WHERE project_id = $1 AND status != 'completed'`,
      [projectId]
    );
    const remainingTasks = parseInt(remainingResult.rows[0]?.remaining) || 0;
    const forecast = forecastCompletion(remainingTasks, velocity.weeklyVelocity, project.due_date);

    res.json({ projectId, ...velocity, forecast, remainingTasks });
  } catch (error) {
    console.error('[Analytics] Velocity error:', error);
    res.status(500).json({ error: 'Failed to calculate velocity' });
  }
});

// ========================================
// TEAM WORKLOAD
// ========================================

/**
 * GET /api/analytics/team/:teamId/workload
 * Per-member workload distribution.
 */
router.get('/team/:teamId/workload', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await verifyTeamAccess(teamId, req.user.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Get team members with their task stats
    const membersResult = await query(
      `SELECT
        u.id as user_id,
        u.name as user_name,
        u.email,
        u.avatar_url,
        tm.role,
        COUNT(t.id) FILTER (WHERE t.status != 'completed') as active_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'in-progress') as in_progress_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'todo') as pending_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'blocked') as blocked_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status != 'completed') as overdue_tasks,
        COALESCE(SUM(t.estimated_hours) FILTER (WHERE t.status != 'completed'), 0) as remaining_estimated_hours,
        COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status != 'completed') as critical_tasks,
        COUNT(t.id) FILTER (WHERE t.priority = 'high' AND t.status != 'completed') as high_tasks,
        COUNT(t.id) FILTER (WHERE t.priority = 'medium' AND t.status != 'completed') as medium_tasks,
        COUNT(t.id) FILTER (WHERE t.priority = 'low' AND t.status != 'completed') as low_tasks
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN tasks t ON t.assigned_to = u.id
         AND t.project_id IN (SELECT id FROM projects WHERE team_id = $1)
       WHERE tm.team_id = $1 AND tm.is_active = true
       GROUP BY u.id, u.name, u.email, u.avatar_url, tm.role
       ORDER BY active_tasks DESC`,
      [teamId]
    );

    const members = membersResult.rows.map(m => {
      const workload = calculateWorkload({
        in_progress_tasks: parseInt(m.in_progress_tasks),
        pending_tasks: parseInt(m.pending_tasks),
        overdue_tasks: parseInt(m.overdue_tasks),
        total_estimated_hours: parseFloat(m.remaining_estimated_hours),
        total_actual_hours: 0,
      });

      return {
        userId: m.user_id,
        name: m.user_name,
        email: m.email,
        avatar: m.avatar_url,
        role: m.role,
        ...workload,
        tasksByPriority: {
          critical: parseInt(m.critical_tasks),
          high: parseInt(m.high_tasks),
          medium: parseInt(m.medium_tasks),
          low: parseInt(m.low_tasks),
        },
        completedTasks: parseInt(m.completed_tasks),
        blockedTasks: parseInt(m.blocked_tasks),
      };
    });

    // Bottlenecks: blocked or overdue tasks across the team
    const bottlenecksResult = await query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.assigned_to,
        u.name as assigned_name,
        EXTRACT(DAY FROM NOW() - t.due_date)::int as days_overdue
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id IN (SELECT id FROM projects WHERE team_id = $1)
         AND (t.status = 'blocked' OR (t.due_date < NOW() AND t.status != 'completed'))
       ORDER BY
         CASE t.status WHEN 'blocked' THEN 0 ELSE 1 END,
         t.due_date ASC
       LIMIT 20`,
      [teamId]
    );

    const bottlenecks = bottlenecksResult.rows.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      assignedTo: t.assigned_name,
      daysOverdue: Math.max(0, parseInt(t.days_overdue) || 0),
    }));

    res.json({ teamId, members, bottlenecks });
  } catch (error) {
    console.error('[Analytics] Workload error:', error);
    res.status(500).json({ error: 'Failed to calculate workload' });
  }
});

// ========================================
// RISK ASSESSMENT
// ========================================

/**
 * GET /api/analytics/project/:projectId/risks
 * Overdue + at-risk tasks with completion forecast.
 */
router.get('/project/:projectId/risks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProjectAccess(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Velocity for forecast
    const completedResult = await query(
      `SELECT started_at, completed_at, estimated_hours, actual_hours
       FROM tasks WHERE project_id = $1 AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '8 weeks'`,
      [projectId]
    );
    const velocity = calculateVelocity(completedResult.rows);

    const remainingResult = await query(
      `SELECT COUNT(*) as remaining FROM tasks WHERE project_id = $1 AND status != 'completed'`,
      [projectId]
    );
    const remainingTasks = parseInt(remainingResult.rows[0]?.remaining) || 0;
    const forecast = forecastCompletion(remainingTasks, velocity.weeklyVelocity, project.due_date);

    // At-risk tasks: overdue or approaching due date (within 3 days)
    const atRiskResult = await query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.estimated_hours,
        t.assigned_to, u.name as assigned_name,
        CASE
          WHEN t.due_date < NOW() THEN 'overdue'
          WHEN t.due_date < NOW() + INTERVAL '3 days' THEN 'due-soon'
          ELSE 'normal'
        END as risk_type,
        EXTRACT(DAY FROM NOW() - t.due_date)::int as days_overdue
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1
         AND t.status != 'completed'
         AND t.due_date IS NOT NULL
         AND t.due_date < NOW() + INTERVAL '3 days'
       ORDER BY t.due_date ASC
       LIMIT 20`,
      [projectId]
    );

    const atRiskTasks = atRiskResult.rows.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      estimatedHours: parseFloat(t.estimated_hours) || 0,
      assignedTo: t.assigned_name,
      riskType: t.risk_type,
      daysOverdue: Math.max(0, parseInt(t.days_overdue) || 0),
    }));

    // Health history (last 30 days)
    const historyResult = await query(
      `SELECT health_score, captured_at::date as date
       FROM project_health_snapshots
       WHERE project_id = $1 AND captured_at >= NOW() - INTERVAL '30 days'
       ORDER BY captured_at ASC`,
      [projectId]
    );
    const healthHistory = historyResult.rows.map(r => ({
      date: r.date,
      score: r.health_score,
    }));

    res.json({
      projectId,
      forecast,
      dueDate: project.due_date,
      remainingTasks,
      atRiskTasks,
      healthHistory,
    });
  } catch (error) {
    console.error('[Analytics] Risks error:', error);
    res.status(500).json({ error: 'Failed to calculate risks' });
  }
});

// =============================================================================
// Sprint 44: Funnel Analytics — ingest + query endpoints
// =============================================================================

/**
 * POST /api/analytics/events
 * Ingest a single funnel/growth event from the client.
 * Accepts both authenticated and anonymous requests.
 */
router.post('/events', async (req, res) => {
  try {
    const { eventName, properties = {}, sessionId } = req.body;
    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    // Extract userId from JWT if present (but don't require auth)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          authHeader.slice(7),
          process.env.JWT_SECRET || process.env.SESSION_SECRET
        );
        userId = decoded.userId || decoded.id || null;
      } catch (_) {
        // Invalid token — treat as anonymous
      }
    }

    const event = await ingestEvent(userId, eventName, properties, {
      sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('[Analytics] Ingest error:', error.message);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

/**
 * GET /api/analytics/funnel
 * Admin-only: query funnel conversion and retention data.
 */
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    // Simple admin check — requires admin role
    const userResult = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const startDate = req.query.start || new Date(Date.now() - 30 * 86400000).toISOString();
    const endDate = req.query.end || new Date().toISOString();

    const [funnel, retention] = await Promise.all([
      queryFunnel(FUNNEL_STAGES, startDate, endDate),
      queryRetention(startDate, endDate),
    ]);

    res.json({ success: true, funnel, retention, period: { startDate, endDate } });
  } catch (error) {
    console.error('[Analytics] Funnel query error:', error.message);
    res.status(500).json({ error: 'Failed to query funnel data' });
  }
});

module.exports = router;
