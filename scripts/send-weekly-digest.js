#!/usr/bin/env node
/**
 * Weekly Digest Email Script
 *
 * Sends personalized weekly activity digests to active users.
 * Run via cron: 0 9 * * 1 (every Monday at 9am)
 *
 * Usage: node scripts/send-weekly-digest.js [--dry-run]
 */

// Only load dotenv in development — production env vars are injected by the platform
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
}

const { query, pool } = require('../database/config');
const { emailService } = require('../lib/email/emailService');

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fetch all active users who have opted in to the weekly digest
 * and have been active in the last 30 days.
 */
async function getDigestRecipients() {
  const result = await query(`
    SELECT u.id, u.email, u.name
    FROM users u
    WHERE u.is_active = true
      AND (u.deleted_at IS NULL)
      AND (u.banned_at IS NULL)
      AND (
        COALESCE(u.email_preferences->>'weekly_digest', 'true') != 'false'
      )
      AND (
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.user_id = u.id
            AND p.updated_at > NOW() - INTERVAL '30 days'
        )
        OR EXISTS (
          SELECT 1 FROM comments c
          WHERE c.user_id = u.id
            AND c.created_at > NOW() - INTERVAL '30 days'
        )
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.assignee_id = u.id
            AND t.updated_at > NOW() - INTERVAL '30 days'
        )
      )
    ORDER BY u.id
  `);

  return result.rows;
}

/**
 * Gather weekly activity stats for a single user.
 */
async function getUserWeeklyStats(userId) {
  const [projectResult, commentResult, taskResult, topProjectResult] = await Promise.all([
    query(
      `SELECT COUNT(*) AS count FROM projects WHERE user_id = $1 AND updated_at > NOW() - INTERVAL '7 days'`,
      [userId]
    ),
    query(
      `SELECT COUNT(*) AS count FROM comments WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [userId]
    ),
    query(
      `SELECT COUNT(*) AS count FROM tasks WHERE assignee_id = $1 AND status = 'completed' AND updated_at > NOW() - INTERVAL '7 days'`,
      [userId]
    ),
    query(
      `SELECT name FROM projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    ),
  ]);

  return {
    projectCount: parseInt(projectResult.rows[0].count, 10),
    commentCount: parseInt(commentResult.rows[0].count, 10),
    taskCount: parseInt(taskResult.rows[0].count, 10),
    topProject: topProjectResult.rows.length > 0 ? topProjectResult.rows[0].name : null,
  };
}

/**
 * Sleep helper for batch delays.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main entry point.
 */
async function main() {
  const startTime = Date.now();

  console.log(`[weekly-digest] Starting${DRY_RUN ? ' (DRY RUN)' : ''}...`);

  if (!pool) {
    console.log('[weekly-digest] DATABASE_URL not set — skipping weekly digest');
    return;
  }

  if (!DRY_RUN && !emailService.isConfigured()) {
    console.log('[weekly-digest] Email service is not configured — skipping digest (set SMTP env vars to enable)');
    return;
  }

  let recipients;
  try {
    recipients = await getDigestRecipients();
  } catch (err) {
    console.error('[weekly-digest] Failed to fetch recipients:', err.message);
    return;
  }

  console.log(`[weekly-digest] Found ${recipients.length} eligible recipient(s).`);

  if (recipients.length === 0) {
    console.log('[weekly-digest] No recipients to process. Exiting.');
    return;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Add a delay between batches (but not before the first batch)
    if (i > 0) {
      console.log(`[weekly-digest] Pausing ${BATCH_DELAY_MS}ms before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }

    for (const user of batch) {
      const index = i + batch.indexOf(user) + 1;
      const total = recipients.length;

      try {
        const stats = await getUserWeeklyStats(user.id);

        // Skip users with zero activity this week
        if (stats.projectCount === 0 && stats.commentCount === 0 && stats.taskCount === 0) {
          console.log(`[weekly-digest] Skipping ${user.email} (${index}/${total}) - no activity this week`);
          skipped++;
          continue;
        }

        const digestData = {
          userName: user.name || 'there',
          projectCount: stats.projectCount,
          commentCount: stats.commentCount,
          taskCount: stats.taskCount,
          topProject: stats.topProject || null,
          ctaUrl: `${process.env.FRONTEND_URL || 'https://fluxstudio.art'}/projects`,
        };

        if (DRY_RUN) {
          console.log(
            `[weekly-digest] [DRY RUN] Would send to ${user.email} (${index}/${total}):`,
            JSON.stringify(digestData)
          );
          sent++;
        } else {
          console.log(`[weekly-digest] Sending digest to ${user.email} (${index}/${total})...`);
          const success = await emailService.sendWeeklyDigestEmail(user.email, digestData);
          if (success) {
            sent++;
          } else {
            console.warn(`[weekly-digest] Email service returned false for ${user.email}`);
            failed++;
          }
        }
      } catch (err) {
        console.error(`[weekly-digest] Error processing ${user.email} (${index}/${total}):`, err.message);
        failed++;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[weekly-digest] Complete in ${elapsed}s. Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`
  );
}

main()
  .catch((err) => {
    console.error('[weekly-digest] Unhandled error (non-blocking):', err.message || err);
  })
  .finally(async () => {
    try {
      if (pool) await pool.end();
    } catch (_) {
      // ignore pool close errors
    }
  });
