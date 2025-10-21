/**
 * Enhanced File Storage with Progress Tracking and Security Scanning
 * Extends the base storage system with real-time progress updates and security features
 */

const { fileStorage } = require('./storage');
const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../database/config');
const { performanceMonitor } = require('../monitoring/performance');

class EnhancedFileStorage {
  constructor(io) {
    this.baseStorage = fileStorage;
    this.io = io; // Socket.IO instance for progress updates
    this.uploadSessions = new Map(); // Track active uploads
    this.scanQueue = []; // Queue for security scanning
    this.isProcessingScans = false;

    // File type security configurations
    this.securityConfig = {
      allowedExecutables: [], // No executables allowed by default
      maxFileSize: 100 * 1024 * 1024, // 100MB
      scanTimeout: 30000, // 30 seconds
      quarantineDir: path.join(process.cwd(), 'quarantine'),

      // Suspicious file patterns
      suspiciousPatterns: [
        /\.(exe|bat|cmd|scr|pif|com|vbs|vbe|js|jar|app|deb|rpm)$/i,
        /\.pdf\.exe$/i,
        /\.doc\.exe$/i,
        /password|virus|malware|trojan/i
      ],

      // Safe MIME types that can skip intensive scanning
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

  /**
   * Enhanced file upload with progress tracking and security scanning
   */
  async uploadFileWithProgress(file, options = {}, socketId = null) {
    const uploadId = crypto.randomUUID();
    const { userId, projectId, organizationId } = options;

    try {
      // Initialize upload session
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

      // Stage 1: Pre-upload validation
      await this.validateFile(file, session);

      // Stage 2: Security pre-scan
      await this.preSecurityScan(file, session);

      // Stage 3: Upload file
      const fileRecord = await this.uploadWithProgress(file, options, session);

      // Stage 4: Post-upload security scan
      await this.scheduleSecurityScan(fileRecord, session);

      // Cleanup session
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

  /**
   * Validate file before upload
   */
  async validateFile(file, session) {
    session.stage = 'validation';
    session.progress = 10;
    this.emitProgress(session);

    // Check file size
    if (file.size > this.securityConfig.maxFileSize) {
      throw new Error(`File too large: ${file.size} bytes (max: ${this.securityConfig.maxFileSize})`);
    }

    // Check for suspicious file extensions
    const filename = file.originalname.toLowerCase();
    for (const pattern of this.securityConfig.suspiciousPatterns) {
      if (pattern.test(filename)) {
        session.securityStatus = 'suspicious';
        console.warn(`Suspicious file detected: ${filename} matches pattern ${pattern}`);
        break;
      }
    }

    session.progress = 20;
    this.emitProgress(session);
  }

  /**
   * Quick pre-upload security scan
   */
  async preSecurityScan(file, session) {
    session.stage = 'security-prescan';
    session.progress = 30;
    this.emitProgress(session);

    // Calculate file hash for duplicate detection
    const hash = crypto.createHash('sha256');
    hash.update(file.buffer);
    session.fileHash = hash.digest('hex');

    // Check if file is in safe MIME type list
    if (this.securityConfig.safeMimeTypes.includes(file.mimetype)) {
      session.securityStatus = 'safe';
    }

    // Basic content analysis
    await this.analyzeFileContent(file, session);

    session.progress = 40;
    this.emitProgress(session);
  }

  /**
   * Analyze file content for security threats
   */
  async analyzeFileContent(file, session) {
    try {
      const buffer = file.buffer;

      // Check for embedded scripts in uploads
      const contentStr = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));

      // Look for suspicious patterns
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

      // Check file headers/magic numbers
      const fileSignature = buffer.slice(0, 16).toString('hex');
      if (this.isExecutableSignature(fileSignature)) {
        session.securityStatus = 'suspicious';
        session.errors.push('Executable file signature detected');
      }

    } catch (error) {
      console.error('Content analysis error:', error);
      session.errors.push('Content analysis failed');
    }
  }

  /**
   * Check if file signature indicates executable
   */
  isExecutableSignature(signature) {
    const executableSignatures = [
      '4d5a', // PE (Windows executable)
      '7f454c46', // ELF (Linux executable)
      'cafebabe', // Java class file
      '504b0304', // ZIP (could contain executables)
      '526172211a07', // RAR archive
    ];

    return executableSignatures.some(sig => signature.startsWith(sig));
  }

  /**
   * Upload file with progress tracking
   */
  async uploadWithProgress(file, options, session) {
    session.stage = 'uploading';
    session.progress = 50;
    this.emitProgress(session);

    // Use base storage for actual upload
    const fileRecord = await performanceMonitor.timeAsyncFunction(
      'file_upload_storage',
      () => this.baseStorage.uploadFile(file, options),
      { service: 'file-storage', userId: options.userId }
    );

    // Update file record with security info
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

  /**
   * Schedule comprehensive security scan
   */
  async scheduleSecurityScan(fileRecord, session) {
    session.stage = 'security-scan';
    session.progress = 90;
    this.emitProgress(session);

    // Add to scan queue
    this.scanQueue.push({
      fileRecord,
      session: { ...session },
      timestamp: Date.now()
    });

    session.progress = 100;
    session.status = 'completed';
    this.emitProgress(session);

    // Start processing if not already running
    if (!this.isProcessingScans) {
      this.processScanQueue();
    }
  }

  /**
   * Process security scan queue
   */
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

  /**
   * Perform comprehensive security scan
   */
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

      // Run ClamAV scan if available
      if (await this.isClamAVAvailable()) {
        const clamResult = await this.runClamAVScan(fileRecord.file_path);
        if (clamResult.infected) {
          scanResult.status = 'infected';
          scanResult.threats.push(...clamResult.threats);
        }
      }

      // Run custom security checks
      await this.runCustomSecurityChecks(fileRecord, scanResult);

      scanResult.scanDuration = Date.now() - startTime;

      // Handle infected files
      if (scanResult.status === 'infected') {
        await this.quarantineFile(fileRecord, scanResult);
      }

      // Update database with scan results
      await this.updateScanResults(fileRecord.id, scanResult);

      // Emit scan completion to user
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
      console.error('Security scan error:', error);
      scanResult.status = 'error';
      scanResult.threats.push(`Scan failed: ${error.message}`);

      await this.updateScanResults(fileRecord.id, scanResult);
    }
  }

  /**
   * Check if ClamAV is available
   */
  async isClamAVAvailable() {
    try {
      execSync('clamscan --version', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run ClamAV antivirus scan
   */
  async runClamAVScan(filePath) {
    return new Promise((resolve) => {
      try {
        const fullPath = path.resolve(filePath);
        const result = execSync(`clamscan --no-summary ${fullPath}`, {
          timeout: this.securityConfig.scanTimeout,
          encoding: 'utf8'
        });

        resolve({
          infected: false,
          threats: []
        });
      } catch (error) {
        // ClamAV returns non-zero exit code for infected files
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

  /**
   * Run custom security checks
   */
  async runCustomSecurityChecks(fileRecord, scanResult) {
    try {
      // Check file entropy (high entropy might indicate encryption/packing)
      const entropy = await this.calculateFileEntropy(fileRecord.file_path);
      if (entropy > 7.5) {
        scanResult.threats.push('High entropy detected (possible packed/encrypted content)');
      }

      // Check for embedded files (ZIP bombs, etc.)
      if (fileRecord.mime_type.includes('zip') || fileRecord.mime_type.includes('archive')) {
        const archiveCheck = await this.checkArchiveSafety(fileRecord.file_path);
        if (!archiveCheck.safe) {
          scanResult.status = 'suspicious';
          scanResult.threats.push(...archiveCheck.threats);
        }
      }

    } catch (error) {
      console.error('Custom security check error:', error);
    }
  }

  /**
   * Calculate file entropy to detect packed/encrypted files
   */
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
      console.error('Entropy calculation error:', error);
      return 0;
    }
  }

  /**
   * Check archive file safety
   */
  async checkArchiveSafety(filePath) {
    // Placeholder for archive analysis
    // In production, you'd use libraries like yauzl for ZIP analysis
    return {
      safe: true,
      threats: []
    };
  }

  /**
   * Quarantine infected file
   */
  async quarantineFile(fileRecord, scanResult) {
    try {
      const quarantinePath = path.join(
        this.securityConfig.quarantineDir,
        `${fileRecord.id}_${Date.now()}`
      );

      // Move file to quarantine
      await fs.rename(fileRecord.file_path, quarantinePath);

      // Update database
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

      console.warn(`File quarantined: ${fileRecord.id} - ${scanResult.threats.join(', ')}`);

    } catch (error) {
      console.error('Quarantine error:', error);
    }
  }

  /**
   * Update scan results in database
   */
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

  /**
   * Emit progress update to client
   */
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

    // Log progress for monitoring
    performanceMonitor.recordMetric('file_upload_progress', session.progress, {
      service: 'file-storage',
      stage: session.stage,
      uploadId: session.uploadId
    });
  }

  /**
   * Get upload session status
   */
  getUploadStatus(uploadId) {
    return this.uploadSessions.get(uploadId) || null;
  }

  /**
   * Cancel upload
   */
  async cancelUpload(uploadId) {
    const session = this.uploadSessions.get(uploadId);
    if (session) {
      session.status = 'cancelled';
      this.emitProgress(session);
      this.uploadSessions.delete(uploadId);

      // Clean up partial files if any
      if (session.fileId) {
        try {
          await this.baseStorage.deleteFile(session.fileId);
        } catch (error) {
          console.error('Cleanup error during cancel:', error);
        }
      }
    }
  }

  /**
   * Start background scan processor
   */
  startScanProcessor() {
    // Process scans every 10 seconds
    setInterval(() => {
      if (this.scanQueue.length > 0 && !this.isProcessingScans) {
        this.processScanQueue();
      }
    }, 10000);
  }

  /**
   * Get security scan statistics
   */
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

module.exports = { EnhancedFileStorage };