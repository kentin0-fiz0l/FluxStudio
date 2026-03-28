const { createLogger } = require('../lib/logger');
const log = createLogger('PushDelivery');

let webPush = null;
try {
  webPush = require('web-push');
} catch {
  log.warn('web-push not installed — push notifications disabled');
}

let dbQuery = null;
try {
  const { query } = require('../database/config');
  dbQuery = query;
} catch {
  // Database not available
}

// Configure VAPID keys
if (webPush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@fluxstudio.art',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(userId, payload) {
  if (!webPush || !dbQuery) return { sent: 0, failed: 0 };

  try {
    const result = await dbQuery(
      'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    let sent = 0;
    let failed = 0;

    for (const sub of result.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
      };

      try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — clean up
          await dbQuery('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
          log.info('Removed expired push subscription', { endpoint: sub.endpoint.slice(0, 50) });
        } else {
          log.error('Push delivery failed', { userId, error: err.message });
        }
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    log.error('Failed to send push notification', { userId, error: error.message });
    return { sent: 0, failed: 0 };
  }
}

module.exports = { sendPushToUser };
