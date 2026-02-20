/**
 * Analytics Scoring Engine — weighted health scores, workload indexes, velocity.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 * Follows the teamAlignment.ts weighted-score pattern.
 */

// Weight configuration (must sum to 100)
const WEIGHTS = {
  completion: 30,
  velocity: 25,
  momentum: 25,
  overdue: 20,
};

// Workload thresholds
const WORKLOAD_OVERLOADED_TASKS = 8;
const WORKLOAD_OVERLOADED_HOURS = 40;
const WORKLOAD_IDLE_TASKS = 1;

/**
 * Calculate project health score (0-100).
 *
 * @param {Object} taskStats - From project_task_stats view
 * @param {Object} velocityData - { avgEstimated, avgActual, completedCount }
 * @param {Object} momentumData - { recentActivityCount, previousActivityCount }
 * @returns {{ score: number, breakdown: Object }}
 */
function calculateProjectHealth(taskStats, velocityData, momentumData) {
  // 1. Completion Score (0-100): % of tasks completed
  const completionScore = taskStats.total_tasks > 0
    ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100)
    : 50; // No tasks = neutral

  // 2. Velocity Score (0-100): How accurately are estimates?
  // Perfect = estimated matches actual. Penalize both under and over estimation.
  let velocityScore = 50;
  if (velocityData.completedCount > 0 && velocityData.avgEstimated > 0) {
    const ratio = velocityData.avgActual / velocityData.avgEstimated;
    // ratio=1 is perfect (100), ratio=0.5 or 2.0 is poor (~25)
    velocityScore = Math.round(Math.max(0, Math.min(100, 100 - Math.abs(1 - ratio) * 75)));
  }

  // 3. Momentum Score (0-100): Is activity trending up?
  let momentumScore = 50;
  if (momentumData.previousActivityCount > 0) {
    const ratio = momentumData.recentActivityCount / momentumData.previousActivityCount;
    // ratio > 1 = accelerating (good), ratio < 1 = decelerating (bad)
    momentumScore = Math.round(Math.max(0, Math.min(100, ratio * 50)));
  } else if (momentumData.recentActivityCount > 0) {
    momentumScore = 75; // New activity where there was none
  }

  // 4. Overdue Score (0-100): Inverse of overdue ratio
  let overdueScore = 100;
  if (taskStats.total_tasks > 0) {
    const overdueRatio = taskStats.overdue_tasks / taskStats.total_tasks;
    overdueScore = Math.round(Math.max(0, (1 - overdueRatio) * 100));
  }

  const score = Math.round(
    (completionScore * WEIGHTS.completion +
     velocityScore * WEIGHTS.velocity +
     momentumScore * WEIGHTS.momentum +
     overdueScore * WEIGHTS.overdue) / 100
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    completionScore,
    velocityScore,
    momentumScore,
    overdueScore,
    breakdown: {
      completion: { score: completionScore, weight: WEIGHTS.completion, detail: `${taskStats.completed_tasks}/${taskStats.total_tasks} tasks done` },
      velocity: { score: velocityScore, weight: WEIGHTS.velocity, detail: velocityData.completedCount > 0 ? `${velocityData.completedCount} tasks measured` : 'No data' },
      momentum: { score: momentumScore, weight: WEIGHTS.momentum, detail: `${momentumData.recentActivityCount} recent vs ${momentumData.previousActivityCount} previous` },
      overdue: { score: overdueScore, weight: WEIGHTS.overdue, detail: `${taskStats.overdue_tasks} overdue` },
    },
  };
}

/**
 * Calculate workload index for a team member.
 *
 * @param {Object} memberStats - From user_task_stats view + active filter
 * @returns {{ status: string, activeTasks: number, estimatedHoursRemaining: number, overdueTasks: number }}
 */
function calculateWorkload(memberStats) {
  const activeTasks = (memberStats.in_progress_tasks || 0) + (memberStats.pending_tasks || 0);
  const estimatedHoursRemaining = Math.max(0,
    (memberStats.total_estimated_hours || 0) - (memberStats.total_actual_hours || 0)
  );
  const overdueTasks = memberStats.overdue_tasks || 0;

  let status = 'balanced';
  if (activeTasks >= WORKLOAD_OVERLOADED_TASKS || estimatedHoursRemaining >= WORKLOAD_OVERLOADED_HOURS) {
    status = 'overloaded';
  } else if (activeTasks <= WORKLOAD_IDLE_TASKS && overdueTasks === 0) {
    status = 'idle';
  }

  return {
    status,
    activeTasks,
    estimatedHoursRemaining: Math.round(estimatedHoursRemaining * 10) / 10,
    overdueTasks,
  };
}

/**
 * Calculate velocity metrics from completed tasks.
 *
 * @param {Array} completedTasks - Tasks with started_at, completed_at, estimated_hours, actual_hours
 * @returns {{ weeklyVelocity: number[], avgCycleTimeDays: number, estimationAccuracy: number }}
 */
function calculateVelocity(completedTasks) {
  if (!completedTasks || completedTasks.length === 0) {
    return { weeklyVelocity: [], avgCycleTimeDays: 0, estimationAccuracy: 0 };
  }

  // Weekly velocity (last 8 weeks)
  const now = Date.now();
  const weeklyVelocity = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = now - w * 7 * 24 * 60 * 60 * 1000;
    const count = completedTasks.filter(t => {
      const completed = new Date(t.completed_at).getTime();
      return completed >= weekStart && completed < weekEnd;
    }).length;
    weeklyVelocity.push(count);
  }

  // Average cycle time
  const cycleTimes = completedTasks
    .filter(t => t.started_at && t.completed_at)
    .map(t => {
      const started = new Date(t.started_at).getTime();
      const completed = new Date(t.completed_at).getTime();
      return (completed - started) / (24 * 60 * 60 * 1000); // days
    })
    .filter(d => d > 0);

  const avgCycleTimeDays = cycleTimes.length > 0
    ? Math.round((cycleTimes.reduce((s, d) => s + d, 0) / cycleTimes.length) * 10) / 10
    : 0;

  // Estimation accuracy (how close estimated_hours is to actual_hours)
  const withEstimates = completedTasks.filter(t => t.estimated_hours > 0 && t.actual_hours > 0);
  let estimationAccuracy = 0;
  if (withEstimates.length > 0) {
    const ratios = withEstimates.map(t => {
      const ratio = t.actual_hours / t.estimated_hours;
      return Math.max(0, 1 - Math.abs(1 - ratio)); // 1 = perfect, 0 = way off
    });
    estimationAccuracy = Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100);
  }

  return { weeklyVelocity, avgCycleTimeDays, estimationAccuracy };
}

/**
 * Forecast project completion date based on velocity.
 *
 * @param {number} remainingTasks - Incomplete tasks count
 * @param {number[]} weeklyVelocity - Array of weekly completed task counts
 * @param {string|null} dueDate - Project due date ISO string
 * @returns {{ projectedWeeks: number, projectedDate: string|null, riskLevel: string, avgVelocity: number }}
 */
function forecastCompletion(remainingTasks, weeklyVelocity, dueDate) {
  // Average velocity from last 4 non-zero weeks (or all if fewer)
  const recentWeeks = weeklyVelocity.slice(-4).filter(v => v > 0);
  const avgVelocity = recentWeeks.length > 0
    ? recentWeeks.reduce((s, v) => s + v, 0) / recentWeeks.length
    : 0;

  if (remainingTasks === 0) {
    return { projectedWeeks: 0, projectedDate: new Date().toISOString(), riskLevel: 'on-track', avgVelocity };
  }

  if (avgVelocity === 0) {
    return { projectedWeeks: null, projectedDate: null, riskLevel: 'no-data', avgVelocity: 0 };
  }

  const projectedWeeks = Math.ceil(remainingTasks / avgVelocity);
  const projectedDate = new Date(Date.now() + projectedWeeks * 7 * 24 * 60 * 60 * 1000);

  let riskLevel = 'on-track';
  if (dueDate) {
    const due = new Date(dueDate);
    const bufferMs = projectedDate.getTime() - due.getTime();
    const bufferWeeks = bufferMs / (7 * 24 * 60 * 60 * 1000);

    if (bufferWeeks > 0) {
      riskLevel = 'behind';
    } else if (bufferWeeks > -2) {
      riskLevel = 'at-risk';
    }
  }

  return {
    projectedWeeks,
    projectedDate: projectedDate.toISOString(),
    riskLevel,
    avgVelocity: Math.round(avgVelocity * 10) / 10,
  };
}

module.exports = {
  calculateProjectHealth,
  calculateWorkload,
  calculateVelocity,
  forecastCompletion,
  WEIGHTS,
};
