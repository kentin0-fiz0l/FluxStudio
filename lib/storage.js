const AWS = require('aws-sdk');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/config');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fluxstudio-files';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

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

  // Configure multer for file uploads
  getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10
      },
      fileFilter: (req, file, cb) => {
        // Allow common file types
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

  // Upload file to S3 or local storage
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

      // Process images
      if (file.mimetype.startsWith('image/')) {
        const { buffer, thumbnail } = await this.processImage(file.buffer, fileName);
        processedBuffer = buffer;

        if (thumbnail) {
          thumbnailUrl = await this.uploadToStorage(`thumbnails/${fileId}_thumb.jpg`, thumbnail, 'image/jpeg', isPublic);
        }
      }

      // Upload main file
      if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
        filePath = await this.uploadToS3(fileName, processedBuffer, file.mimetype, isPublic);
        fileUrl = `${CLOUDFRONT_URL}/${filePath}`;
      } else {
        filePath = await this.uploadToLocal(fileName, processedBuffer);
        fileUrl = `/uploads/${fileName}`;
      }

      // Get file metadata
      const metadata = await this.getFileMetadata(processedBuffer, file.mimetype);

      // Save to database
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
      console.error('File upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Upload multiple files
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

  // Process images (resize, optimize, generate thumbnails)
  async processImage(buffer, filename) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Optimize main image
      let optimized = image;

      // Resize if too large (max 2048px on longest side)
      if (metadata.width > 2048 || metadata.height > 2048) {
        optimized = optimized.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to JPEG with optimization
      const processedBuffer = await optimized
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Generate thumbnail (max 300px)
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
      console.error('Image processing error:', error);
      return { buffer, thumbnail: null };
    }
  }

  // Upload to AWS S3
  async uploadToS3(fileName, buffer, mimeType, isPublic = false) {
    const key = `files/${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: isPublic ? 'public-read' : 'private',
      CacheControl: 'max-age=31536000', // 1 year
    };

    await s3.upload(params).promise();
    return key;
  }

  // Upload to local storage (development)
  async uploadToLocal(fileName, buffer) {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    return fileName;
  }

  // Generic storage upload (handles S3 or local)
  async uploadToStorage(key, buffer, mimeType, isPublic = false) {
    if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
      return await this.uploadToS3(key, buffer, mimeType, isPublic);
    } else {
      return await this.uploadToLocal(path.basename(key), buffer);
    }
  }

  // Get file metadata
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
        // For PDF files, we'd need a PDF library like pdf-parse
        // For now, just return basic info
        metadata.pages = 1; // Placeholder
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }

    return metadata;
  }

  // Sanitize filename
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Delete file
  async deleteFile(fileId) {
    try {
      // Get file info
      const fileResult = await query('SELECT * FROM files WHERE id = $1', [fileId]);
      if (fileResult.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = fileResult.rows[0];

      // Delete from storage
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

      // Delete from database
      await query('DELETE FROM files WHERE id = $1', [fileId]);

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  // Delete from S3
  async deleteFromS3(key) {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
  }

  // Delete from local storage
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

  // Get file versions
  async getFileVersions(fileId) {
    const result = await query(`
      SELECT * FROM files
      WHERE id = $1 OR parent_file_id = $1
      ORDER BY version DESC
    `, [fileId]);

    return result.rows;
  }

  // Create new file version
  async createFileVersion(originalFileId, newFile, options = {}) {
    // Get original file
    const originalResult = await query('SELECT * FROM files WHERE id = $1', [originalFileId]);
    if (originalResult.rows.length === 0) {
      throw new Error('Original file not found');
    }

    const originalFile = originalResult.rows[0];

    // Mark original as not latest
    await query('UPDATE files SET is_latest = false WHERE id = $1', [originalFileId]);

    // Upload new version
    const newVersion = await this.uploadFile(newFile, {
      ...options,
      category: originalFile.category,
      projectId: originalFile.project_id,
      organizationId: originalFile.organization_id
    });

    // Update new file with version info
    await query(`
      UPDATE files
      SET parent_file_id = $1, version = $2, is_latest = true
      WHERE id = $3
    `, [originalFileId, originalFile.version + 1, newVersion.id]);

    return newVersion;
  }

  // Get signed URL for private files
  async getSignedUrl(filePath, expiresIn = 3600) {
    if (process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID) {
      const params = {
        Bucket: BUCKET_NAME,
        Key: filePath,
        Expires: expiresIn
      };

      return s3.getSignedUrl('getObject', params);
    } else {
      // For local files, return direct URL
      return `/uploads/${path.basename(filePath)}`;
    }
  }

  // Search files
  async searchFiles(query, options = {}) {
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

    if (query) {
      paramCount++;
      sql += ` AND (f.name ILIKE $${paramCount} OR f.description ILIKE $${paramCount})`;
      params.push(`%${query}%`);
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

// Create singleton instance
const fileStorage = new FileStorage();

module.exports = {
  fileStorage,
  upload: fileStorage.getMulterConfig()
};