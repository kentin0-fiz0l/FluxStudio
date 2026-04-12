#!/usr/bin/env node

/**
 * Expire Trials — Phase 5 batch job
 *
 * Reverts expired Pro trials to free plan for users without active subscriptions.
 * Sends trial countdown emails (3-day warning, day-of, post-expiry).
 *
 * Schedule: daily at 6am UTC via DigitalOcean App Platform job.
 * Usage: node scripts/expire-trials.js [--dry-run]
 */

// Only load dotenv in development — production env vars are injected by the platform
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { query, pool } = require('../database/config');
const { emailService } = require('../lib/email/emailService');
const { createLogger } = require('../lib/logger');
const log = createLogger('ExpireTrials');

const DRY_RUN = process.argv.includes('--dry-run');

async function expireTrials() {
  if (!pool) {
    log.warn('DATABASE_URL not set — skipping trial expiry job');
    return;
  }
  log.info('Starting trial expiry job', { dryRun: DRY_RUN });

  // 1. Expire overdue trials — revert to free plan
  const expiredResult = await query(`
    SELECT u.id, u.email, u.name, u.trial_ends_at
    FROM users u
    WHERE u.plan_id = 'pro'
      AND u.trial_ends_at < NOW()
      AND u.id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      )
  `);

  const expired = expiredResult.rows;
  log.info(`Found ${expired.length} expired trial(s) to revert`);

  if (!DRY_RUN && expired.length > 0) {
    await query(`
      UPDATE users
      SET plan_id = 'free'
      WHERE plan_id = 'pro'
        AND trial_ends_at < NOW()
        AND id NOT IN (
          SELECT user_id FROM subscriptions WHERE status = 'active'
        )
    `);
  }

  // Send expiry email to each affected user
  for (const user of expired) {
    if (DRY_RUN) {
      log.info(`[DRY RUN] Would send trial-expired email to ${user.email}`);
    } else {
      try {
        await emailService.sendTrialExpiredEmail(user.email, user.name || 'there');
      } catch (err) {
        log.warn(`Failed to send expiry email to ${user.email}`, err.message);
      }
    }
  }

  // 2. Send 3-day warning emails
  const threeDayResult = await query(`
    SELECT u.id, u.email, u.name, u.trial_ends_at
    FROM users u
    WHERE u.plan_id = 'pro'
      AND u.trial_ends_at BETWEEN NOW() + INTERVAL '2 days 23 hours' AND NOW() + INTERVAL '3 days 1 hour'
      AND u.id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      )
  `);

  log.info(`Found ${threeDayResult.rows.length} user(s) for 3-day warning`);

  for (const user of threeDayResult.rows) {
    if (DRY_RUN) {
      log.info(`[DRY RUN] Would send 3-day warning to ${user.email}`);
    } else {
      try {
        await emailService.sendTrialExpiringEmail(user.email, user.name || 'there', 3);
      } catch (err) {
        log.warn(`Failed to send 3-day warning to ${user.email}`, err.message);
      }
    }
  }

  // 3. Send day-of expiry emails
  const dayOfResult = await query(`
    SELECT u.id, u.email, u.name, u.trial_ends_at
    FROM users u
    WHERE u.plan_id = 'pro'
      AND u.trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND u.id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      )
  `);

  log.info(`Found ${dayOfResult.rows.length} user(s) expiring today`);

  for (const user of dayOfResult.rows) {
    if (DRY_RUN) {
      log.info(`[DRY RUN] Would send day-of expiry email to ${user.email}`);
    } else {
      try {
        await emailService.sendTrialExpiryTodayEmail(user.email, user.name || 'there');
      } catch (err) {
        log.warn(`Failed to send day-of email to ${user.email}`, err.message);
      }
    }
  }

  // 4. Send post-expiry win-back emails (1 day after)
  const postExpiryResult = await query(`
    SELECT u.id, u.email, u.name, u.trial_ends_at
    FROM users u
    WHERE u.plan_id = 'free'
      AND u.trial_ends_at BETWEEN NOW() - INTERVAL '25 hours' AND NOW() - INTERVAL '23 hours'
      AND u.id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
      )
  `);

  log.info(`Found ${postExpiryResult.rows.length} user(s) for post-expiry win-back`);

  for (const user of postExpiryResult.rows) {
    if (DRY_RUN) {
      log.info(`[DRY RUN] Would send post-expiry email to ${user.email}`);
    } else {
      try {
        await emailService.sendTrialExpiredWinbackEmail(user.email, user.name || 'there');
      } catch (err) {
        log.warn(`Failed to send win-back email to ${user.email}`, err.message);
      }
    }
  }

  log.info('Trial expiry job complete', {
    expired: expired.length,
    threeDayWarning: threeDayResult.rows.length,
    dayOf: dayOfResult.rows.length,
    postExpiry: postExpiryResult.rows.length,
  });
}

expireTrials()
  .then(() => process.exit(0))
  .catch((err) => {
    log.error('Trial expiry job failed (non-blocking)', err.message || err);
    // Exit 0 so POST_DEPLOY job doesn't trigger a rollback
    process.exit(0);
  });
