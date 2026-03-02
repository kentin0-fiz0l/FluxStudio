/**
 * FluxPrint Job Logger Service
 * Logs print jobs to FluxStudio database for project linking and analytics
 * Phase 2.5: Database Integration
 */

const { query } = require('../database/config');
const { createId } = require('@paralleldrive/cuid2');
const { createLogger } = require('../lib/logger');
const log = createLogger('PrintJobLogger');

class PrintJobLogger {
  /**
   * Create a new print job record when a job is added to the queue
   * @param {Object} jobData - Print job data from FluxPrint
   * @param {string} jobData.file_name - Name of the G-code file
   * @param {number} jobData.fluxprint_queue_id - ID in FluxPrint queue
   * @param {string} jobData.project_id - Optional: FluxStudio project ID
   * @param {string} jobData.file_id - Optional: FluxStudio file ID
   * @param {Object} jobData.metadata - Optional: Additional metadata
   * @returns {Promise<Object>} Created print job record
   */
  async createPrintJob(jobData) {
    const jobId = createId();

    const sql = `
      INSERT INTO print_jobs (
        id,
        project_id,
        file_id,
        fluxprint_queue_id,
        file_name,
        status,
        metadata,
        queued_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING *;
    `;

    const values = [
      jobId,
      jobData.project_id || null,
      jobData.file_id || null,
      jobData.fluxprint_queue_id,
      jobData.file_name,
      'queued',
      JSON.stringify(jobData.metadata || {}),
    ];

    try {
      const result = await query(sql, values);
      log.info('Print job logged', { jobId, fileName: jobData.file_name });
      return result.rows[0];
    } catch (error) {
      log.error('Failed to create print job', { error: error.message });
      throw error;
    }
  }

  /**
   * Update print job status
   * @param {string} jobId - FluxStudio print job ID
   * @param {string} status - New status (printing, completed, failed, canceled)
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} additionalData - Additional fields to update
   */
  async updateJobStatus(jobId, status, progress = null, additionalData = {}) {
    const sql = `
      SELECT update_print_job_status($1, $2, $3, $4);
    `;

    const values = [
      jobId,
      status,
      progress,
      additionalData.error_message || null,
    ];

    try {
      await query(sql, values);
      log.info('Print job status updated', { jobId, status, progress });
    } catch (error) {
      log.error('Failed to update job status', { error: error.message });
      throw error;
    }
  }

  /**
   * Update job status by FluxPrint queue ID
   * @param {number} fluxprintQueueId - FluxPrint queue ID
   * @param {string} status - New status
   * @param {number} progress - Progress percentage
   */
  async updateJobByFluxPrintId(fluxprintQueueId, status, progress = null) {
    const sql = `
      UPDATE print_jobs
      SET
        status = $1,
        progress = COALESCE($2, progress),
        started_at = CASE WHEN $1 = 'printing' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN $1 IN ('completed', 'failed', 'canceled') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE fluxprint_queue_id = $3
      RETURNING id, file_name, status, progress;
    `;

    const values = [status, progress, fluxprintQueueId];

    try {
      const result = await query(sql, values);
      if (result.rows.length > 0) {
        const job = result.rows[0];
        log.info('Print job updated via FluxPrint ID', { fluxprintQueueId, fileName: job.file_name, status });
        return job;
      }
      return null;
    } catch (error) {
      log.error('Failed to update job by FluxPrint ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate and store actual print time when job completes
   * @param {string} jobId - FluxStudio print job ID
   */
  async calculatePrintTime(jobId) {
    const sql = `SELECT calculate_print_time($1) as actual_time;`;

    try {
      const result = await query(sql, [jobId]);
      const actualTime = result.rows[0].actual_time;

      if (actualTime !== null) {
        const hours = Math.floor(actualTime / 3600);
        const minutes = Math.floor((actualTime % 3600) / 60);
        log.info('Print time calculated', { jobId, hours, minutes });
      }

      return actualTime;
    } catch (error) {
      log.error('Failed to calculate print time', { error: error.message });
      throw error;
    }
  }

  /**
   * Link a print job to a FluxStudio project
   * @param {string} jobId - Print job ID
   * @param {string} projectId - FluxStudio project ID
   * @param {string} fileId - Optional: FluxStudio file ID
   */
  async linkToProject(jobId, projectId, fileId = null) {
    const sql = `
      UPDATE print_jobs
      SET
        project_id = $1,
        file_id = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, file_name, project_id;
    `;

    const values = [projectId, fileId, jobId];

    try {
      const result = await query(sql, values);
      if (result.rows.length > 0) {
        log.info('Print job linked to project', { jobId, projectId });
        return result.rows[0];
      }
      return null;
    } catch (error) {
      log.error('Failed to link job to project', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active print jobs
   * @returns {Promise<Array>} Active print jobs from the view
   */
  async getActiveJobs() {
    const sql = `SELECT * FROM active_print_jobs;`;

    try {
      const result = await query(sql);
      return result.rows;
    } catch (error) {
      log.error('Failed to get active jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get print job history
   * @param {number} limit - Number of jobs to return
   * @returns {Promise<Array>} Recent completed/failed/canceled jobs
   */
  async getJobHistory(limit = 100) {
    const sql = `
      SELECT * FROM print_job_history
      LIMIT $1;
    `;

    try {
      const result = await query(sql, [limit]);
      return result.rows;
    } catch (error) {
      log.error('Failed to get job history', { error: error.message });
      throw error;
    }
  }

  /**
   * Get print statistics for a project
   * @param {string} projectId - FluxStudio project ID
   * @returns {Promise<Object>} Print job statistics
   */
  async getProjectStats(projectId) {
    const sql = `
      SELECT * FROM print_job_stats_by_project
      WHERE project_id = $1;
    `;

    try {
      const result = await query(sql, [projectId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      log.error('Failed to get project stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Find print job by FluxPrint queue ID
   * @param {number} fluxprintQueueId - FluxPrint queue ID
   * @returns {Promise<Object>} Print job record
   */
  async findByFluxPrintId(fluxprintQueueId) {
    const sql = `
      SELECT * FROM print_jobs
      WHERE fluxprint_queue_id = $1;
    `;

    try {
      const result = await query(sql, [fluxprintQueueId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      log.error('Failed to find job by FluxPrint ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old completed jobs (called by cron or manually)
   * @returns {Promise<number>} Number of jobs deleted
   */
  async cleanup() {
    const sql = `SELECT cleanup_old_print_jobs() as deleted_count;`;

    try {
      const result = await query(sql);
      const deletedCount = result.rows[0].deleted_count;
      log.info('Cleaned up old print jobs', { deletedCount });
      return deletedCount;
    } catch (error) {
      log.error('Failed to cleanup old jobs', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new PrintJobLogger();
