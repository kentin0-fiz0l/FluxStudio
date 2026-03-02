/**
 * Unified Storage Module - FluxStudio
 *
 * Consolidates all storage functionality into a single module:
 * - StorageAdapter: Local filesystem storage with organized directory structure
 * - FileStorage: S3/local storage with DB integration, image processing, versioning
 * - EnhancedFileStorage: Security scanning, progress tracking, quarantine
 *
 * Environment variables:
 * - FILE_STORAGE_ROOT: Root directory for local storage (default: ./data/files)
 * - AWS_ACCESS_KEY_ID: AWS credentials for S3 (optional)
 * - AWS_SECRET_ACCESS_KEY: AWS credentials for S3 (optional)
 * - AWS_REGION: AWS region (default: us-east-1)
 * - AWS_S3_BUCKET: S3 bucket name (optional)
 * - CLOUDFRONT_URL: CloudFront distribution URL (optional)
 */

const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const { query } = require('../database/config');
const { createLogger } = require('./logger');
const log = createLogger('Storage');

// ---------------------------------------------------------------------------
// S3 Configuration
// ---------------------------------------------------------------------------

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fluxstudio-files';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

// ---------------------------------------------------------------------------
// StorageAdapter - Local filesystem storage
// ---------------------------------------------------------------------------

const FILE_STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || path.join(process.cwd(), 'data', 'files');
const PREVIEW_STORAGE_ROOT = path.join(FILE_STORAGE_ROOT, 'previews');

class StorageAdapter {
  constructor() {
    this.storageRoot = FILE_STORAGE_ROOT;
    this.previewRoot = PREVIEW_STORAGE_ROOT;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.storageRoot, { recursive: true });
      await fs.mkdir(this.previewRoot, { recursive: true });
      this.initialized = true;
      log.info('Initialized at:', { path: this.storageRoot });
    } catch (error) {
      log.error('Failed to initialize', error);
      throw error;
    }
  }

  _generateStoragePath(userId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return path.join(String(userId), String(year), month, day);
  }

  _getExtension(mimeType, originalName) {
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase();
      if (ext) return ext.slice(1);
    }

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

  _calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  async saveFile({ buffer, mimeType, extension, userId, originalName }) {
    await this.initialize();

    const fileId = uuidv4();
    const ext = extension || this._getExtension(mimeType, originalName);
    const filename = `${fileId}.${ext}`;

    const storagePath = this._generateStoragePath(userId);
    const fullDir = path.join(this.storageRoot, storagePath);
    const fullPath = path.join(fullDir, filename);

    await fs.mkdir(fullDir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const hash = this._calculateHash(buffer);
    const sizeBytes = buffer.length;
    const storageKey = path.join(storagePath, filename);

    log.info(`Saved file: ${storageKey} (${sizeBytes} bytes)`);

    return {
      storageKey,
      sizeBytes,
      hash,
      extension: ext,
    };
  }

  /**
   * Alias for saveFile - used by routes/files.js
   * Accepts (buffer, { filename, contentType, userId }) signature
   */
  async upload(buffer, options = {}) {
    const { filename, contentType, userId } = options;
    const result = await this.saveFile({
      buffer,
      mimeType: contentType,
      userId,
      originalName: filename,
    });
    return result.storageKey;
  }

  async getFileStream(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);

    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`File not found: ${storageKey}`);
    }

    return fsSync.createReadStream(fullPath);
  }

  async getFileBuffer(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);
    return fs.readFile(fullPath);
  }

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

  async deleteFile(storageKey) {
    await this.initialize();

    const fullPath = path.join(this.storageRoot, storageKey);

    try {
      await fs.unlink(fullPath);
      log.info(`Deleted file: ${storageKey}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        log.info(`File already deleted: ${storageKey}`);
        return true;
      }
      throw error;
    }
  }

  /**
   * Alias for deleteFile - used by routes/files.js
   */
  async delete(storageKey) {
    return this.deleteFile(storageKey);
  }

  async savePreview({ buffer, mimeType, extension, fileId, previewType = 'thumbnail', pageNumber }) {
    await this.initialize();

    const ext = extension || this._getExtension(mimeType);
    const pageSuffix = pageNumber ? `_p${pageNumber}` : '';
    const filename = `${fileId}_${previewType}${pageSuffix}.${ext}`;

    const fullPath = path.join(this.previewRoot, filename);
    await fs.writeFile(fullPath, buffer);

    const sizeBytes = buffer.length;
    const storageKey = path.join('previews', filename);

    log.info(`Saved preview: ${storageKey} (${sizeBytes} bytes)`);

    return {
      storageKey,
      sizeBytes,
    };
  }

  async deletePreview(storageKey) {
    return this.deleteFile(storageKey);
  }

  getFullPath(storageKey) {
    return path.join(this.storageRoot, storageKey);
  }

  async exists(storageKey) {
    const fullPath = path.join(this.storageRoot, storageKey);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async copyFile(sourceKey, destKey) {
    await this.initialize();

    const sourcePath = path.join(this.storageRoot, sourceKey);
    const destPath = path.join(this.storageRoot, destKey);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(sourcePath, destPath);

    log.info(`Copied: ${sourceKey} -> ${destKey}`);
    return true;
  }
}

// ---------------------------------------------------------------------------
// FileStorage - S3/local storage with DB integration and image processing
// ---------------------------------------------------------------------------

class FileStorage {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 10
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/mov',
          'video/avi',
          'application/pdf',
          'application/zip',
          'application/x-zip-compressed',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      }
    });
  }

  async uploadFile(file, options = {}) {
    const {
      userId,
      projectId,
      organizationId,
      category = 'other',
      description = '',
      isPublic = false
    } = options;

    try {
      const fileId = uuidv4();
      const sanitizedName = this.sanitizeFilename(file.originalname);
      const fileExtension = path.extname(sanitizedName);
      const fileName = `${fileId}${fileExtension}`;

      let filePath, fileUrl, thumbnailUrl;
      let processedBuffer = file.buffer;

      if (file.mimetype.startsWith('image/')) {
        const { buffer, thumbnail } = await this.processImage(file.buffer, fileName);
        processedBuffer = buffer;

        if (thumbnail) {
          thumbnailUrl = await this.uploadToStorage(`thumbnails/${fileId}_thumb.jpg`, thumbnail, 'image/jpeg', isPublic);
        }
      }

      if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
        filePath = await this.uploadToS3(fileName, processedBuffer, file.mimetype, isPublic);
        fileUrl = `${CLOUDFRONT_URL}/${filePath}`;
      } else {
        filePath = await this.uploadToLocal(fileName, processedBuffer);
        fileUrl = `/uploads/${fileName}`;
      }

      const metadata = await this.getFileMetadata(processedBuffer, file.mimetype);

      const fileRecord = await query(`
        INSERT INTO files (
          id, name, original_name, description, file_path, file_url, thumbnail_url,
          mime_type, file_size, width, height, duration, pages, category,
          project_id, organization_id, uploaded_by, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `, [
        fileId, fileName, sanitizedName, description, filePath, fileUrl, thumbnailUrl,
        file.mimetype, file.size, metadata.width, metadata.height, metadata.duration,
        metadata.pages, category, projectId, organizationId, userId, JSON.stringify(metadata)
      ]);

      return fileRecord.rows[0];
    } catch (error) {
      log.error('File upload error', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async uploadFiles(files, options = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return { results, errors };
  }

  async processImage(buffer, filename) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      let optimized = image;

      if (metadata.width > 2048 || metadata.height > 2048) {
        optimized = optimized.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      const processedBuffer = await optimized
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      const thumbnailBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return {
        buffer: processedBuffer,
        thumbnail: thumbnailBuffer
      };
    } catch (error) {
      log.error('Image processing error', error);
      return { buffer, thumbnail: null };
    }
  }

  async uploadToS3(fileName, buffer, mimeType, isPublic = false) {
    const key = `files/${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: isPublic ? 'public-read' : 'private',
      CacheControl: 'max-age=31536000',
    };

    await s3.upload(params).promise();
    return key;
  }

  async uploadToLocal(fileName, buffer) {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    return fileName;
  }

  async uploadToStorage(key, buffer, mimeType, isPublic = false) {
    if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
      return await this.uploadToS3(key, buffer, mimeType, isPublic);
    } else {
      return await this.uploadToLocal(path.basename(key), buffer);
    }
  }

  async getFileMetadata(buffer, mimeType) {
    const metadata = {};

    try {
      if (mimeType.startsWith('image/')) {
        const imageInfo = await sharp(buffer).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;
        metadata.space = imageInfo.space;
        metadata.channels = imageInfo.channels;
        metadata.density = imageInfo.density;
      } else if (mimeType === 'application/pdf') {
        metadata.pages = 1;
      }
    } catch (error) {
      log.error('Metadata extraction error', error);
    }

    return metadata;
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async deleteFile(fileId) {
    try {
      const fileResult = await query('SELECT * FROM files WHERE id = $1', [fileId]);
      if (fileResult.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = fileResult.rows[0];

      if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
        await this.deleteFromS3(file.file_path);
        if (file.thumbnail_url) {
          const thumbnailKey = file.thumbnail_url.replace(`${CLOUDFRONT_URL}/`, '');
          await this.deleteFromS3(thumbnailKey);
        }
      } else {
        await this.deleteFromLocal(file.file_path);
        if (file.thumbnail_url) {
          const thumbnailPath = file.thumbnail_url.replace('/uploads/', '');
          await this.deleteFromLocal(thumbnailPath);
        }
      }

      await query('DELETE FROM files WHERE id = $1', [fileId]);

      return true;
    } catch (error) {
      log.error('File deletion error', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async deleteFromS3(key) {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
  }

  async deleteFromLocal(fileName) {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getFileVersions(fileId) {
    const result = await query(`
      SELECT * FROM files
      WHERE id = $1 OR parent_file_id = $1
      ORDER BY version DESC
    `, [fileId]);

    return result.rows;
  }

  async createFileVersion(originalFileId, newFile, options = {}) {
    const originalResult = await query('SELECT * FROM files WHERE id = $1', [originalFileId]);
    if (originalResult.rows.length === 0) {
      throw new Error('Original file not found');
    }

    const originalFile = originalResult.rows[0];

    await query('UPDATE files SET is_latest = false WHERE id = $1', [originalFileId]);

    const newVersion = await this.uploadFile(newFile, {
      ...options,
      category: originalFile.category,
      projectId: originalFile.project_id,
      organizationId: originalFile.organization_id
    });

    await query(`
      UPDATE files
      SET parent_file_id = $1, version = $2, is_latest = true
      WHERE id = $3
    `, [originalFileId, originalFile.version + 1, newVersion.id]);

    return newVersion;
  }

  async getSignedUrl(filePath, expiresIn = 3600) {
    if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
      const params = {
        Bucket: BUCKET_NAME,
        Key: filePath,
        Expires: expiresIn
      };

      return s3.getSignedUrl('getObject', params);
    } else {
      return `/uploads/${path.basename(filePath)}`;
    }
  }

  async searchFiles(searchQuery, options = {}) {
    const {
      organizationId,
      projectId,
      category,
      mimeType,
      limit = 50,
      offset = 0
    } = options;

    let sql = `
      SELECT f.*, u.name as uploaded_by_name
      FROM files f
      JOIN users u ON f.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (searchQuery) {
      paramCount++;
      sql += ` AND (f.name ILIKE $${paramCount} OR f.description ILIKE $${paramCount})`;
      params.push(`%${searchQuery}%`);
    }

    if (organizationId) {
      paramCount++;
      sql += ` AND f.organization_id = $${paramCount}`;
      params.push(organizationId);
    }

    if (projectId) {
      paramCount++;
      sql += ` AND f.project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (category) {
      paramCount++;
      sql += ` AND f.category = $${paramCount}`;
      params.push(category);
    }

    if (mimeType) {
      paramCount++;
      sql += ` AND f.mime_type LIKE $${paramCount}`;
      params.push(`${mimeType}%`);
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }
}

// ---------------------------------------------------------------------------
// EnhancedFileStorage - Security scanning and progress tracking
// ---------------------------------------------------------------------------

let performanceMonitor;
try {
  performanceMonitor = require('../monitoring/performance').performanceMonitor;
} catch {
  performanceMonitor = {
    recordMetric: () => {},
    timeAsyncFunction: (name, fn) => fn()
  };
}

class EnhancedFileStorage {
  constructor(io) {
    this.baseStorage = fileStorage;
    this.io = io;
    this.uploadSessions = new Map();
    this.scanQueue = [];
    this.isProcessingScans = false;

    this.securityConfig = {
      allowedExecutables: [],
      maxFileSize: 100 * 1024 * 1024,
      scanTimeout: 30000,
      quarantineDir: path.join(process.cwd(), 'quarantine'),

      suspiciousPatterns: [
        /\.(exe|bat|cmd|scr|pif|com|vbs|vbe|js|jar|app|deb|rpm)$/i,
        /\.pdf\.exe$/i,
        /\.doc\.exe$/i,
        /password|virus|malware|trojan/i
      ],

      safeMimeTypes: [
        'text/plain',
        'text/css',
        'text/javascript',
        'application/json',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ]
    };

    this.ensureQuarantineDir();
    this.startScanProcessor();
  }

  async ensureQuarantineDir() {
    try {
      await fs.access(this.securityConfig.quarantineDir);
    } catch {
      await fs.mkdir(this.securityConfig.quarantineDir, { recursive: true });
    }
  }

  async uploadFileWithProgress(file, options = {}, socketId = null) {
    const uploadId = crypto.randomUUID();
    const { userId, projectId, organizationId } = options;

    try {
      const session = {
        uploadId,
        socketId,
        userId,
        projectId,
        organizationId,
        filename: file.originalname,
        filesize: file.size,
        status: 'initializing',
        progress: 0,
        stage: 'validation',
        startTime: Date.now(),
        securityStatus: 'pending',
        errors: []
      };

      this.uploadSessions.set(uploadId, session);
      this.emitProgress(session);

      await this.validateFile(file, session);
      await this.preSecurityScan(file, session);
      const fileRecord = await this.uploadWithProgress(file, options, session);
      await this.scheduleSecurityScan(fileRecord, session);

      this.uploadSessions.delete(uploadId);

      return {
        ...fileRecord,
        uploadId,
        securityStatus: session.securityStatus
      };

    } catch (error) {
      const session = this.uploadSessions.get(uploadId);
      if (session) {
        session.status = 'failed';
        session.errors.push(error.message);
        this.emitProgress(session);
        this.uploadSessions.delete(uploadId);
      }

      performanceMonitor.recordMetric('file_upload_error', 1, {
        service: 'file-storage',
        error: error.message,
        userId
      });

      throw error;
    }
  }

  async validateFile(file, session) {
    session.stage = 'validation';
    session.progress = 10;
    this.emitProgress(session);

    if (file.size > this.securityConfig.maxFileSize) {
      throw new Error(`File too large: ${file.size} bytes (max: ${this.securityConfig.maxFileSize})`);
    }

    const filename = file.originalname.toLowerCase();
    for (const pattern of this.securityConfig.suspiciousPatterns) {
      if (pattern.test(filename)) {
        session.securityStatus = 'suspicious';
        log.warn(`Suspicious file detected: ${filename} matches pattern ${pattern}`);
        break;
      }
    }

    session.progress = 20;
    this.emitProgress(session);
  }

  async preSecurityScan(file, session) {
    session.stage = 'security-prescan';
    session.progress = 30;
    this.emitProgress(session);

    const hash = crypto.createHash('sha256');
    hash.update(file.buffer);
    session.fileHash = hash.digest('hex');

    if (this.securityConfig.safeMimeTypes.includes(file.mimetype)) {
      session.securityStatus = 'safe';
    }

    await this.analyzeFileContent(file, session);

    session.progress = 40;
    this.emitProgress(session);
  }

  async analyzeFileContent(file, session) {
    try {
      const buffer = file.buffer;
      const contentStr = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));

      const suspiciousContent = [
        /<script[^>]*>/i,
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
        /%3Cscript/i
      ];

      for (const pattern of suspiciousContent) {
        if (pattern.test(contentStr)) {
          session.securityStatus = 'suspicious';
          session.errors.push('Suspicious content detected in file');
          break;
        }
      }

      const fileSignature = buffer.slice(0, 16).toString('hex');
      if (this.isExecutableSignature(fileSignature)) {
        session.securityStatus = 'suspicious';
        session.errors.push('Executable file signature detected');
      }

    } catch (error) {
      log.error('Content analysis error', error);
      session.errors.push('Content analysis failed');
    }
  }

  isExecutableSignature(signature) {
    const executableSignatures = [
      '4d5a',
      '7f454c46',
      'cafebabe',
      '504b0304',
      '526172211a07',
    ];

    return executableSignatures.some(sig => signature.startsWith(sig));
  }

  async uploadWithProgress(file, options, session) {
    session.stage = 'uploading';
    session.progress = 50;
    this.emitProgress(session);

    const fileRecord = await performanceMonitor.timeAsyncFunction(
      'file_upload_storage',
      () => this.baseStorage.uploadFile(file, options),
      { service: 'file-storage', userId: options.userId }
    );

    await query(`
      UPDATE files
      SET metadata = metadata || $1
      WHERE id = $2
    `, [
      JSON.stringify({
        uploadId: session.uploadId,
        fileHash: session.fileHash,
        securityStatus: session.securityStatus,
        uploadDuration: Date.now() - session.startTime
      }),
      fileRecord.id
    ]);

    session.progress = 80;
    session.fileId = fileRecord.id;
    this.emitProgress(session);

    return fileRecord;
  }

  async scheduleSecurityScan(fileRecord, session) {
    session.stage = 'security-scan';
    session.progress = 90;
    this.emitProgress(session);

    this.scanQueue.push({
      fileRecord,
      session: { ...session },
      timestamp: Date.now()
    });

    session.progress = 100;
    session.status = 'completed';
    this.emitProgress(session);

    if (!this.isProcessingScans) {
      this.processScanQueue();
    }
  }

  async processScanQueue() {
    if (this.isProcessingScans || this.scanQueue.length === 0) {
      return;
    }

    this.isProcessingScans = true;

    while (this.scanQueue.length > 0) {
      const scanItem = this.scanQueue.shift();
      await this.performSecurityScan(scanItem);
    }

    this.isProcessingScans = false;
  }

  async performSecurityScan(scanItem) {
    const { fileRecord, session } = scanItem;
    let scanResult = {
      status: 'clean',
      threats: [],
      scanTime: Date.now(),
      scanDuration: 0
    };

    try {
      const startTime = Date.now();

      if (await this.isClamAVAvailable()) {
        const clamResult = await this.runClamAVScan(fileRecord.file_path);
        if (clamResult.infected) {
          scanResult.status = 'infected';
          scanResult.threats.push(...clamResult.threats);
        }
      }

      await this.runCustomSecurityChecks(fileRecord, scanResult);

      scanResult.scanDuration = Date.now() - startTime;

      if (scanResult.status === 'infected') {
        await this.quarantineFile(fileRecord, scanResult);
      }

      await this.updateScanResults(fileRecord.id, scanResult);

      if (session.socketId) {
        this.io.to(session.socketId).emit('file_scan_complete', {
          fileId: fileRecord.id,
          uploadId: session.uploadId,
          scanResult
        });
      }

      performanceMonitor.recordMetric('file_security_scan', scanResult.scanDuration, {
        service: 'file-storage',
        status: scanResult.status,
        threatsFound: scanResult.threats.length
      });

    } catch (error) {
      log.error('Security scan error', error);
      scanResult.status = 'error';
      scanResult.threats.push(`Scan failed: ${error.message}`);

      await this.updateScanResults(fileRecord.id, scanResult);
    }
  }

  async isClamAVAvailable() {
    try {
      execSync('clamscan --version', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async runClamAVScan(filePath) {
    return new Promise((resolve) => {
      try {
        const fullPath = path.resolve(filePath);
        execSync(`clamscan --no-summary ${fullPath}`, {
          timeout: this.securityConfig.scanTimeout,
          encoding: 'utf8'
        });

        resolve({
          infected: false,
          threats: []
        });
      } catch (error) {
        const output = error.stdout || error.message;
        const infected = output.includes('FOUND');

        const threats = [];
        if (infected) {
          const matches = output.match(/: (.+) FOUND/g);
          if (matches) {
            threats.push(...matches.map(m => m.replace(/: (.+) FOUND/, '$1')));
          }
        }

        resolve({
          infected,
          threats
        });
      }
    });
  }

  async runCustomSecurityChecks(fileRecord, scanResult) {
    try {
      const entropy = await this.calculateFileEntropy(fileRecord.file_path);
      if (entropy > 7.5) {
        scanResult.threats.push('High entropy detected (possible packed/encrypted content)');
      }

      if (fileRecord.mime_type.includes('zip') || fileRecord.mime_type.includes('archive')) {
        const archiveCheck = await this.checkArchiveSafety(fileRecord.file_path);
        if (!archiveCheck.safe) {
          scanResult.status = 'suspicious';
          scanResult.threats.push(...archiveCheck.threats);
        }
      }

    } catch (error) {
      log.error('Custom security check error', error);
    }
  }

  async calculateFileEntropy(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const frequencies = new Array(256).fill(0);

      for (let i = 0; i < buffer.length; i++) {
        frequencies[buffer[i]]++;
      }

      let entropy = 0;
      for (let i = 0; i < 256; i++) {
        if (frequencies[i] > 0) {
          const p = frequencies[i] / buffer.length;
          entropy -= p * Math.log2(p);
        }
      }

      return entropy;
    } catch (error) {
      log.error('Entropy calculation error', error);
      return 0;
    }
  }

  async checkArchiveSafety(filePath) {
    return {
      safe: true,
      threats: []
    };
  }

  async quarantineFile(fileRecord, scanResult) {
    try {
      const quarantinePath = path.join(
        this.securityConfig.quarantineDir,
        `${fileRecord.id}_${Date.now()}`
      );

      await fs.rename(fileRecord.file_path, quarantinePath);

      await query(`
        UPDATE files
        SET
          status = 'quarantined',
          quarantine_path = $1,
          metadata = metadata || $2
        WHERE id = $3
      `, [
        quarantinePath,
        JSON.stringify({
          quarantineReason: scanResult.threats.join(', '),
          quarantineTime: new Date().toISOString()
        }),
        fileRecord.id
      ]);

      log.warn(`File quarantined: ${fileRecord.id} - ${scanResult.threats.join(', ')}`);

    } catch (error) {
      log.error('Quarantine error', error);
    }
  }

  async updateScanResults(fileId, scanResult) {
    await query(`
      UPDATE files
      SET
        security_status = $1,
        metadata = metadata || $2,
        updated_at = NOW()
      WHERE id = $3
    `, [
      scanResult.status,
      JSON.stringify({
        securityScan: scanResult,
        lastScanned: new Date().toISOString()
      }),
      fileId
    ]);
  }

  emitProgress(session) {
    if (session.socketId) {
      this.io.to(session.socketId).emit('upload_progress', {
        uploadId: session.uploadId,
        filename: session.filename,
        progress: session.progress,
        stage: session.stage,
        status: session.status,
        securityStatus: session.securityStatus,
        errors: session.errors
      });
    }

    performanceMonitor.recordMetric('file_upload_progress', session.progress, {
      service: 'file-storage',
      stage: session.stage,
      uploadId: session.uploadId
    });
  }

  getUploadStatus(uploadId) {
    return this.uploadSessions.get(uploadId) || null;
  }

  async cancelUpload(uploadId) {
    const session = this.uploadSessions.get(uploadId);
    if (session) {
      session.status = 'cancelled';
      this.emitProgress(session);
      this.uploadSessions.delete(uploadId);

      if (session.fileId) {
        try {
          await this.baseStorage.deleteFile(session.fileId);
        } catch (error) {
          log.error('Cleanup error during cancel', error);
        }
      }
    }
  }

  startScanProcessor() {
    setInterval(() => {
      if (this.scanQueue.length > 0 && !this.isProcessingScans) {
        this.processScanQueue();
      }
    }, 10000);
  }

  async getScanStatistics() {
    const result = await query(`
      SELECT
        security_status,
        COUNT(*) as count,
        AVG(CAST(metadata->>'securityScan'->>'scanDuration' AS INTEGER)) as avg_scan_time
      FROM files
      WHERE security_status IS NOT NULL
      GROUP BY security_status
    `);

    return result.rows;
  }
}

// ---------------------------------------------------------------------------
// Singleton instances
// ---------------------------------------------------------------------------

const storageAdapter = new StorageAdapter();
const fileStorage = new FileStorage();
const upload = fileStorage.getMulterConfig();

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Default export is the storageAdapter (backward compat with storage/index.js consumers)
module.exports = storageAdapter;

// Named exports for S3/DB storage and enhanced storage
module.exports.storageAdapter = storageAdapter;
module.exports.fileStorage = fileStorage;
module.exports.multerUpload = upload;
module.exports.FileStorage = FileStorage;
module.exports.EnhancedFileStorage = EnhancedFileStorage;
module.exports.StorageAdapter = StorageAdapter;
