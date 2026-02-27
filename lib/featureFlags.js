/**
 * Feature Flag Evaluation — Server-Side
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Lightweight feature flag system backed by PostgreSQL.
 * - 60-second TTL cache to avoid per-request DB hits
 * - Deterministic rollout hashing (userId + flagName)
 * - User allowlist for targeted overrides
 */

const crypto = require('crypto');

let dbQuery;
try {
  dbQuery = require('../database/config').query;
} catch {
  dbQuery = null;
}

// In-memory cache: { [flagName]: { flag, fetchedAt } }
const cache = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Fetch a single flag from DB (or cache)
 */
async function getFlag(name) {
  if (!dbQuery) return null;

  const cached = cache.get(name);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.flag;
  }

  try {
    const result = await dbQuery(
      'SELECT * FROM feature_flags WHERE name = $1',
      [name]
    );
    const flag = result.rows[0] || null;
    cache.set(name, { flag, fetchedAt: Date.now() });
    return flag;
  } catch (err) {
    console.error('Feature flag fetch error:', err.message);
    // Return cached value (even if stale) on DB error
    return cached?.flag || null;
  }
}

/**
 * Fetch all flags (for bulk client-side delivery)
 */
async function getAllFlags() {
  if (!dbQuery) return [];

  try {
    const result = await dbQuery(
      'SELECT id, name, description, enabled, rollout_percentage, metadata, created_at, updated_at FROM feature_flags ORDER BY name'
    );
    return result.rows;
  } catch (err) {
    console.error('Feature flags fetch error:', err.message);
    return [];
  }
}

/**
 * Deterministic hash for rollout percentage evaluation.
 * Returns 0-99 based on (userId + flagName).
 */
function rolloutHash(userId, flagName) {
  const hash = crypto
    .createHash('md5')
    .update(`${userId}:${flagName}`)
    .digest();
  // Use first 4 bytes as uint32, mod 100
  return hash.readUInt32BE(0) % 100;
}

/**
 * Evaluate whether a flag is enabled for a given user.
 *
 * Logic:
 * 1. Flag doesn't exist or enabled=false → false
 * 2. User in allowlist → true
 * 3. rollout_percentage=100 → true
 * 4. Deterministic hash(userId+flagName) < rollout_percentage → true
 * 5. Otherwise → false
 *
 * @param {string} flagName
 * @param {string|null} userId - null means anonymous/unauthenticated
 * @returns {Promise<boolean>}
 */
async function isEnabled(flagName, userId = null) {
  const flag = await getFlag(flagName);

  if (!flag || !flag.enabled) return false;

  // Check allowlist
  if (userId && Array.isArray(flag.user_allowlist) && flag.user_allowlist.includes(userId)) {
    return true;
  }

  // Full rollout
  if (flag.rollout_percentage === 100) return true;

  // No user context and not 100% rollout → false
  if (!userId) return false;

  // Deterministic percentage check
  return rolloutHash(userId, flagName) < flag.rollout_percentage;
}

/**
 * Evaluate all flags for a user (for bulk client delivery).
 * Returns { flagName: boolean, ... }
 */
async function evaluateAllFlags(userId = null) {
  const flags = await getAllFlags();
  const result = {};

  for (const flag of flags) {
    // Inline evaluation to avoid N cache lookups
    if (!flag.enabled) {
      result[flag.name] = false;
      continue;
    }
    if (userId && Array.isArray(flag.user_allowlist) && flag.user_allowlist.includes(userId)) {
      result[flag.name] = true;
      continue;
    }
    if (flag.rollout_percentage === 100) {
      result[flag.name] = true;
      continue;
    }
    if (!userId) {
      result[flag.name] = false;
      continue;
    }
    result[flag.name] = rolloutHash(userId, flag.name) < flag.rollout_percentage;
  }

  return result;
}

/**
 * Invalidate cache for a specific flag (call after admin mutations)
 */
function invalidateCache(flagName) {
  if (flagName) {
    cache.delete(flagName);
  } else {
    cache.clear();
  }
}

/**
 * Express middleware: attach flag check to req
 * Usage: app.use(featureFlagMiddleware);
 * Then in routes: const enabled = await req.isFeatureEnabled('my-flag');
 */
function featureFlagMiddleware(req, _res, next) {
  req.isFeatureEnabled = (flagName) => isEnabled(flagName, req.user?.id);
  next();
}

module.exports = {
  getFlag,
  isEnabled,
  evaluateAllFlags,
  getAllFlags,
  invalidateCache,
  featureFlagMiddleware,
  // Exported for testing
  rolloutHash,
};
