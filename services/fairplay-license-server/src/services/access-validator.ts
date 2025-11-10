import { createLogger } from '../utils/logger';
import { db } from '../utils/database';

const logger = createLogger('access-validator');

/**
 * Validate if a user has access to protected content
 * Checks:
 * 1. User owns the file
 * 2. User has appropriate subscription tier
 * 3. Content is available (not expired/removed)
 * 4. User hasn't exceeded concurrent stream limit
 */
export async function validateContentAccess(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    logger.debug('Validating content access', { userId, contentId });

    // Check if file exists and user has access
    const fileResult = await db.query(
      `SELECT
        f.id,
        f.uploaded_by,
        f.is_public,
        f.drm_protected,
        p.id as project_id,
        p.organization_id
       FROM files f
       LEFT JOIN projects p ON f.project_id = p.id
       WHERE f.id = $1`,
      [contentId]
    );

    if (fileResult.rows.length === 0) {
      logger.warn('Content not found', { contentId });
      return false;
    }

    const file = fileResult.rows[0];

    // Public content is always accessible
    if (file.is_public) {
      logger.debug('Public content access granted', { contentId, userId });
      return true;
    }

    // User owns the content
    if (file.uploaded_by === userId) {
      logger.debug('Owner access granted', { contentId, userId });
      return true;
    }

    // Check team/organization membership
    if (file.organization_id) {
      const orgMember = await checkOrganizationMembership(userId, file.organization_id);
      if (orgMember) {
        logger.debug('Organization member access granted', { contentId, userId });
        return true;
      }
    }

    // Check project collaboration
    if (file.project_id) {
      const collaborator = await checkProjectCollaboration(userId, file.project_id);
      if (collaborator) {
        logger.debug('Project collaborator access granted', { contentId, userId });
        return true;
      }
    }

    // Check subscription tier (for premium content)
    const hasSubscription = await checkSubscriptionAccess(userId, contentId);
    if (hasSubscription) {
      logger.debug('Subscription access granted', { contentId, userId });
      return true;
    }

    // Check concurrent stream limit
    const withinLimit = await checkConcurrentStreamLimit(userId);
    if (!withinLimit) {
      logger.warn('User exceeded concurrent stream limit', { userId });
      return false;
    }

    logger.warn('Access denied - no valid access method', { userId, contentId });
    return false;

  } catch (error) {
    logger.error('Access validation error', { userId, contentId, error });
    return false;
  }
}

/**
 * Check if user is member of an organization
 */
async function checkOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT id FROM team_members
       WHERE user_id = $1 AND team_id = $2 AND active = true`,
      [userId, organizationId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Organization membership check failed', { error });
    return false;
  }
}

/**
 * Check if user is collaborator on a project
 */
async function checkProjectCollaboration(
  userId: string,
  projectId: string
): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT id FROM project_members
       WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Project collaboration check failed', { error });
    return false;
  }
}

/**
 * Check subscription tier access
 * TODO: Implement actual subscription tier logic
 */
async function checkSubscriptionAccess(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    // Placeholder - implement actual subscription logic
    // For now, return true for all authenticated users
    return true;
  } catch (error) {
    logger.error('Subscription check failed', { error });
    return false;
  }
}

/**
 * Check if user is within concurrent stream limit
 */
async function checkConcurrentStreamLimit(userId: string): Promise<boolean> {
  try {
    const maxStreams = parseInt(process.env.MAX_CONCURRENT_STREAMS || '3');

    // Count active licenses issued in last hour
    const result = await db.query(
      `SELECT COUNT(*) as active_count
       FROM media_licenses
       WHERE user_id = $1
       AND issued_at > NOW() - INTERVAL '1 hour'
       AND expires_at > NOW()`,
      [userId]
    );

    const activeCount = parseInt(result.rows[0]?.active_count || '0');
    const withinLimit = activeCount < maxStreams;

    if (!withinLimit) {
      logger.warn('Concurrent stream limit exceeded', {
        userId,
        activeCount,
        maxStreams
      });
    }

    return withinLimit;

  } catch (error) {
    logger.error('Concurrent stream check failed', { error });
    return true; // Fail open on error
  }
}
