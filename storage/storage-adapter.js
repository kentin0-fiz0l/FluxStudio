/**
 * Storage Adapter - FluxStudio
 *
 * Provides a unified abstraction for file storage operations.
 * Supports local filesystem storage with optional S3 support.
 *
 * Environment variables:
 * - FILE_STORAGE_ROOT: Root directory for local storage (default: ./data/files)
 * - AWS_ACCESS_KEY_ID: AWS credentials for S3 (optional)
 * - AWS_SECRET_ACCESS_KEY: AWS credentials for S3 (optional)
 * - AWS_REGION: AWS region (default: us-east-1)
 * - AWS_S3_BUCKET: S3 bucket name (optional)
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Storage root from environment or default
const FILE_STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || path.join(process.cwd(), 'data', 'files');
const PREVIEW_STORAGE_ROOT = path.join(FILE_STORAGE_ROOT, 'previews');

/**
 * Storage Adapter Class
 *
 * Handles file storage operations with support for:
 * - Local filesystem storage (default)
 * - Organized directory structure by user/date
 * - Preview generation and storage
 */
class StorageAdapter {
  constructor() {
    this.storageRoot = FILE_STORAGE_ROOT;
    this.previewRoot = PREVIEW_STORAGE_ROOT;
    this.initialized = false;
  }

  /**
   * Initialize storage directories
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.storageRoot, { recursive: true });
      await fs.mkdir(this.previewRoot, { recursive: true });
      this.initialized = true;
      console.log('[Storage] Initialized at:', this.storageRoot);
    } catch (error) {
      console.error('[Storage] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Generate storage path based on userId and date
   * Structure: /<userId>/<YYYY>/<MM>/<DD>/
   */
  _generateStoragePath(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return path.join(String(userId), String(year), month, day);
  }

  /**
   * Get file extension from mime type or filename
   */
  _getExtension(mimeType, originalName) {
    // Try to get from original name first
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase();
      if (ext) return ext.slice(1); // Remove leading dot
    }

    // Fall back to mime type mapping
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'application/zip': 'zip',
      'application/json': 'json',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/css': 'css',
      'text/javascript': 'js',
      'application/javascript': 'js',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Calculate file hash for deduplication
   */
  _calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  /**
   * Save a file to storage
   *
   * @param {Object} options
   * @param {Buffer} options.buffer - File content
   * @param {string} options.mimeType - MIME type
   * @param {string} options.extension - File extension (optional)
   * @param {string} options.userId - User ID
   * @param {string} options.originalName - Original filename (optional)
   * @returns {Object} { storageKey, sizeBytes, hash }
   */
  async saveFile({ buffer, mimeType, extension, userId, originalName }) {
    await this.initialize();

    // Generate unique filename
    const fileId = uuidv4();
    const ext = extension || this._getExtension(mimeType, originalName);
    const filename = `${fileId}.${ext}`;

    // Generate storage path
    const storagePath = this._generateStoragePath(userId);
    const fullDir = path.join(this.storageRoot, storagePath);
    const fullPath = path.join(fullDir, filename);

    // Create directory if needed
    await fs.mkdir(fullDir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    // Calculate hash and size
    const hash = this._calculateHash(buffer);
    const sizeBytes = buffer.length;

    // Storage key is relative path from storage root
    const storageKey = path.join(storagePath, filename);

    console.log(`[Storage] Saved file: ${storageKey} (${sizeBytes} bytes)`);

    return {
      storageKey,
      sizeBytes,
      hash,
      extension: ext,
    };
  }

  /**
   * Get a readable stream for a file
   *
   * @param {string} storageKey - Storage key from saveFile
   * @returns {ReadStream} Node.js readable stream
   */
  async getFileStream(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);

    // Check file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`File not found: ${storageKey}`);
    }

    return fsSync.createReadStream(fullPath);
  }

  /**
   * Get file contents as buffer
   *
   * @param {string} storageKey - Storage key
   * @returns {Buffer} File contents
   */
  async getFileBuffer(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);
    return fs.readFile(fullPath);
  }

  /**
   * Get file stats
   *
   * @param {string} storageKey - Storage key
   * @returns {Object} File stats
   */
  async getFileStats(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);
    const stats = await fs.stat(fullPath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
    };
  }

  /**
   * Delete a file from storage
   *
   * @param {string} storageKey - Storage key
   * @returns {boolean} Success
   */
  async deleteFile(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);

    try {
      await fs.unlink(fullPath);
      console.log(`[Storage] Deleted file: ${storageKey}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - that's OK
        console.log(`[Storage] File already deleted: ${storageKey}`);
        return true;
      }
      throw error;
    }
  }

  /**
   * Save a preview/thumbnail
   *
   * @param {Object} options
   * @param {Buffer} options.buffer - Preview content
   * @param {string} options.mimeType - MIME type
   * @param {string} options.extension - File extension (optional)
   * @param {string} options.fileId - Parent file ID
   * @param {string} options.previewType - Type of preview (thumbnail, pdf_page, etc.)
   * @param {number} options.pageNumber - Page number for multi-page previews
   * @returns {Object} { storageKey, sizeBytes }
   */
  async savePreview({ buffer, mimeType, extension, fileId, previewType = 'thumbnail', pageNumber }) {
    await this.initialize();

    // Generate preview filename
    const ext = extension || this._getExtension(mimeType);
    const pageSuffix = pageNumber ? `_p${pageNumber}` : '';
    const filename = `${fileId}_${previewType}${pageSuffix}.${ext}`;

    // Preview path is flat structure under previews directory
    const fullPath = path.join(this.previewRoot, filename);

    // Write preview
    await fs.writeFile(fullPath, buffer);

    const sizeBytes = buffer.length;
    const storageKey = path.join('previews', filename);

    console.log(`[Storage] Saved preview: ${storageKey} (${sizeBytes} bytes)`);

    return {
      storageKey,
      sizeBytes,
    };
  }

  /**
   * Delete a preview
   *
   * @param {string} storageKey - Preview storage key
   * @returns {boolean} Success
   */
  async deletePreview(storageKey) {
    // Previews use same delete logic
    return this.deleteFile(storageKey);
  }

  /**
   * Get the full filesystem path for a storage key
   * (Useful for direct file serving)
   *
   * @param {string} storageKey - Storage key
   * @returns {string} Full filesystem path
   */
  getFullPath(storageKey) {
    return path.join(this.storageRoot, storageKey);
  }

  /**
   * Check if a file exists
   *
   * @param {string} storageKey - Storage key
   * @returns {boolean} Exists
   */
  async exists(storageKey) {
    const fullPath = path.join(this.storageRoot, storageKey);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy a file to a new location
   *
   * @param {string} sourceKey - Source storage key
   * @param {string} destKey - Destination storage key
   * @returns {boolean} Success
   */
  async copyFile(sourceKey, destKey) {
    await this.initialize();

    const sourcePath = path.join(this.storageRoot, sourceKey);
    const destPath = path.join(this.storageRoot, destKey);

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    await fs.copyFile(sourcePath, destPath);

    console.log(`[Storage] Copied: ${sourceKey} -> ${destKey}`);
    return true;
  }
}

// Create singleton instance
const storageAdapter = new StorageAdapter();

module.exports = storageAdapter;
