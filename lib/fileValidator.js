/**
 * File Validation Utilities
 * Phase 4A Security: Magic Byte Validation
 *
 * Validates files based on their magic bytes (file signatures) to prevent
 * malicious files from being uploaded with misleading extensions.
 */

/**
 * Magic byte signatures for supported file types
 * Format: { extension: [[signature bytes], offset] }
 */
const FILE_SIGNATURES = {
  // 3D File Formats
  stl: [[0x73, 0x6F, 0x6C, 0x69, 0x64], 0], // ASCII: "solid"
  gltf: [[0x7B], 0], // JSON file starting with "{"
  glb: [[0x67, 0x6C, 0x54, 0x46], 0], // "glTF"
  '3mf': [[0x50, 0x4B], 0], // ZIP archive (PK)

  // Image Formats
  jpg: [[0xFF, 0xD8, 0xFF], 0],
  jpeg: [[0xFF, 0xD8, 0xFF], 0],
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 0],
  gif: [[0x47, 0x49, 0x46, 0x38], 0], // "GIF8"
  webp: [[0x52, 0x49, 0x46, 0x46], 0], // "RIFF"
  svg: [[0x3C, 0x73, 0x76, 0x67], 0], // "<svg" or "<?xml"

  // Document Formats
  pdf: [[0x25, 0x50, 0x44, 0x46], 0], // "%PDF"
  txt: null, // Text files have no specific magic bytes
  md: null, // Markdown files have no specific magic bytes

  // Microsoft Office formats (ZIP-based)
  docx: [[0x50, 0x4B, 0x03, 0x04], 0], // ZIP archive
  doc: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], 0], // OLE2
};

/**
 * Check if file matches expected magic bytes
 * @param {Buffer} buffer - File buffer to check
 * @param {string} extension - Expected file extension
 * @returns {boolean} - True if file matches expected signature
 */
function validateFileMagicBytes(buffer, extension) {
  const ext = extension.toLowerCase();
  const signature = FILE_SIGNATURES[ext];

  // No signature defined = allow (e.g., plain text)
  if (!signature) {
    return true;
  }

  const [bytes, offset] = signature;

  // Buffer too small to contain signature
  if (buffer.length < offset + bytes.length) {
    return false;
  }

  // Check each byte in the signature
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validate file type based on magic bytes and extension
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {{ valid: boolean, error?: string, detectedType?: string }}
 */
function validateFileType(buffer, filename) {
  const ext = filename.toLowerCase().split('.').pop();

  // Check if extension is supported
  if (!FILE_SIGNATURES.hasOwnProperty(ext)) {
    return {
      valid: false,
      error: `File type .${ext} is not supported`,
    };
  }

  // Special handling for STL files (can be ASCII or binary)
  if (ext === 'stl') {
    // ASCII STL starts with "solid"
    const isAscii = buffer.toString('ascii', 0, 5) === 'solid';
    // Binary STL is anything else (80 byte header + triangle count)
    const isBinary = buffer.length >= 84;

    if (!isAscii && !isBinary) {
      return {
        valid: false,
        error: 'Invalid STL file format',
      };
    }
    return { valid: true };
  }

  // Special handling for SVG (can start with <?xml or <svg)
  if (ext === 'svg') {
    const header = buffer.toString('utf8', 0, 100).toLowerCase();
    if (header.includes('<svg') || header.includes('<?xml')) {
      return { valid: true };
    }
    return {
      valid: false,
      error: 'Invalid SVG file format',
    };
  }

  // Standard magic byte validation
  const isValid = validateFileMagicBytes(buffer, ext);

  if (!isValid) {
    return {
      valid: false,
      error: `File content does not match .${ext} format`,
    };
  }

  return { valid: true };
}

/**
 * Express middleware to validate uploaded files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUploadedFiles(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    for (const file of req.files) {
      const validation = validateFileType(file.buffer, file.originalname);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'File validation failed',
          filename: file.originalname,
          message: validation.error,
        });
      }
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({
      error: 'Failed to validate file',
      message: 'Internal server error',
    });
  }
}

module.exports = {
  validateFileType,
  validateFileMagicBytes,
  validateUploadedFiles,
  FILE_SIGNATURES,
};
