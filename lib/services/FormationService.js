/**
 * FormationService - Domain service for formation operations
 *
 * Extracts business logic from route handlers into a testable,
 * reusable service layer. Accepts only primitives/plain objects,
 * handles validation and authorization, returns standardized results.
 */

const { createLogger } = require('../logger');
const log = createLogger('FormationService');

// Lazy-load adapter
let formationsAdapter = null;

function getAdapter() {
  if (!formationsAdapter) {
    try {
      formationsAdapter = require('../../database/formations-adapter');
    } catch (e) {
      log.warn('Formations adapter not available');
    }
  }
  return formationsAdapter;
}

/**
 * Create a new formation in a project
 * @param {string} projectId - Project ID
 * @param {string} userId - Creating user's ID
 * @param {Object} data - Formation data (name, description, stageWidth, stageHeight, gridSize)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function createFormation(projectId, userId, data) {
  try {
    const { name, description, stageWidth, stageHeight, gridSize } = data;

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Formation name is required' };
    }

    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const formation = await adapter.createFormation({
      projectId,
      name: name.trim(),
      description,
      stageWidth,
      stageHeight,
      gridSize,
      createdBy: userId
    });

    return { success: true, data: formation };
  } catch (error) {
    log.error('Create formation error', error);
    return { success: false, error: 'Failed to create formation' };
  }
}

/**
 * Update formation metadata
 * @param {string} formationId - Formation ID
 * @param {string} userId - Requesting user ID (for future auth checks)
 * @param {Object} data - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function updateFormation(formationId, userId, data) {
  try {
    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const existing = await adapter.getFormationById(formationId);
    if (!existing) {
      return { success: false, error: 'Formation not found' };
    }

    const { name, description, stageWidth, stageHeight, gridSize, isArchived, audioTrack } = data;

    const updatedFormation = await adapter.updateFormation(formationId, {
      name,
      description,
      stageWidth,
      stageHeight,
      gridSize,
      isArchived,
      audioTrack
    });

    return { success: true, data: updatedFormation };
  } catch (error) {
    log.error('Update formation error', error);
    return { success: false, error: 'Failed to update formation' };
  }
}

/**
 * Get a formation by ID
 * @param {string} formationId - Formation ID
 * @param {string} userId - Requesting user ID (for future auth checks)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function getFormation(formationId, userId) {
  try {
    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const formation = await adapter.getFormationById(formationId);
    if (!formation) {
      return { success: false, error: 'Formation not found' };
    }

    return { success: true, data: formation };
  } catch (error) {
    log.error('Get formation error', error);
    return { success: false, error: 'Failed to get formation' };
  }
}

/**
 * List formations for a project
 * @param {string} projectId - Project ID
 * @param {string} userId - Requesting user ID (for future auth checks)
 * @param {Object} options - Listing options
 * @returns {Promise<{success: boolean, data?: Object[], error?: string}>}
 */
async function listFormations(projectId, userId, options = {}) {
  try {
    const { includeArchived = false } = options;

    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const formations = await adapter.listFormationsForProject({
      projectId,
      includeArchived
    });

    return { success: true, data: formations };
  } catch (error) {
    log.error('List formations error', error);
    return { success: false, error: 'Failed to list formations' };
  }
}

/**
 * Duplicate a formation
 * @param {string} formationId - Formation ID to duplicate
 * @param {string} userId - User performing the duplication
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function duplicateFormation(formationId, userId) {
  try {
    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    // Fetch the original formation with all data
    const original = await adapter.getFormationById(formationId);
    if (!original) {
      return { success: false, error: 'Formation not found' };
    }

    // Create a new formation based on the original
    const newFormation = await adapter.createFormation({
      projectId: original.projectId || original.project_id,
      name: `${original.name} (Copy)`,
      description: original.description,
      stageWidth: original.stageWidth || original.stage_width,
      stageHeight: original.stageHeight || original.stage_height,
      gridSize: original.gridSize || original.grid_size,
      createdBy: userId
    });

    // Copy performers, keyframes, and positions using bulk save if available
    if (adapter.saveFormation && original.performers && original.keyframes) {
      await adapter.saveFormation(newFormation.id, {
        name: newFormation.name,
        performers: original.performers,
        keyframes: original.keyframes,
      });
    }

    return { success: true, data: newFormation };
  } catch (error) {
    log.error('Duplicate formation error', error);
    return { success: false, error: 'Failed to duplicate formation' };
  }
}

module.exports = {
  createFormation,
  updateFormation,
  getFormation,
  listFormations,
  duplicateFormation,
};
