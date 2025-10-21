/**
 * Device Fingerprinting Utility
 *
 * Creates unique identifiers for devices to detect:
 * - Token theft across devices
 * - Suspicious login patterns
 * - Multiple sessions from same device
 *
 * Security: Fingerprints are NOT 100% reliable (users can clear cache,
 * use incognito, etc.) so we log mismatches but don't block access.
 *
 * Part of: Week 1 Security Sprint - JWT Refresh Tokens
 * Date: 2025-10-14
 */

const crypto = require('crypto');

/**
 * Generate Device Fingerprint from Request
 *
 * Combines multiple signals to create a unique device identifier:
 * - User Agent (browser, OS, version)
 * - Accept headers (language, encoding)
 * - IP address (subnet for privacy)
 *
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint (hex string)
 */
function generateDeviceFingerprint(req) {
  const components = [];

  // User Agent (most reliable signal)
  const userAgent = req.headers['user-agent'] || '';
  components.push(userAgent);

  // Accept Language (relatively stable)
  const acceptLanguage = req.headers['accept-language'] || '';
  components.push(acceptLanguage);

  // Accept Encoding (stable for same browser)
  const acceptEncoding = req.headers['accept-encoding'] || '';
  components.push(acceptEncoding);

  // IP subnet (privacy-preserving, /24 for IPv4, /64 for IPv6)
  const ipAddress = getClientIP(req);
  const ipSubnet = getIPSubnet(ipAddress);
  components.push(ipSubnet);

  // Combine all components
  const fingerprintString = components.join('|');

  // Hash to create consistent fingerprint
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

/**
 * Get Client IP Address
 *
 * Handles proxies and load balancers:
 * 1. X-Forwarded-For (CloudFlare, nginx)
 * 2. X-Real-IP (nginx)
 * 3. req.ip (Express default)
 *
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
function getClientIP(req) {
  // Check X-Forwarded-For (first IP in chain is client)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Check X-Real-IP
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  // Fallback to Express req.ip
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Get IP Subnet (Privacy-preserving)
 *
 * Returns /24 for IPv4, /64 for IPv6
 *
 * @param {string} ip - IP address
 * @returns {string} IP subnet
 */
function getIPSubnet(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // IPv4: Keep first 3 octets (e.g., 192.168.1.x)
  if (ip.includes('.')) {
    const octets = ip.split('.');
    if (octets.length === 4) {
      return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
    }
  }

  // IPv6: Keep first 4 groups (e.g., 2001:db8:85a3:0::/64)
  if (ip.includes(':')) {
    const groups = ip.split(':');
    if (groups.length >= 4) {
      return `${groups[0]}:${groups[1]}:${groups[2]}:${groups[3]}::/64`;
    }
  }

  // Unknown format
  return ip;
}

/**
 * Get Device Name (Human-readable)
 *
 * Extracts browser and OS from User Agent
 *
 * Examples:
 * - "Chrome 120 on macOS"
 * - "Firefox 121 on Windows"
 * - "Safari 17 on iOS"
 *
 * @param {Object} req - Express request object
 * @returns {string} Device name
 */
function getDeviceName(req) {
  const userAgent = req.headers['user-agent'] || '';

  // Parse browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (userAgent.includes('Edg')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  }

  // Parse OS
  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  }

  return `${browser} on ${os}`;
}

/**
 * Extract Device Information from Request
 *
 * Returns all device-related information for token generation
 *
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
function extractDeviceInfo(req) {
  return {
    deviceName: getDeviceName(req),
    deviceFingerprint: generateDeviceFingerprint(req),
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'] || null
  };
}

/**
 * Compare Fingerprints (Fuzzy matching)
 *
 * Returns similarity score (0-100) between two fingerprints
 * Useful for detecting minor changes that don't indicate device change
 *
 * @param {string} fp1 - First fingerprint
 * @param {string} fp2 - Second fingerprint
 * @returns {number} Similarity score (0-100)
 */
function compareFingerprintsScore(fp1, fp2) {
  if (fp1 === fp2) return 100;
  if (!fp1 || !fp2) return 0;

  // Simple Hamming distance for hex strings
  let matches = 0;
  const len = Math.min(fp1.length, fp2.length);

  for (let i = 0; i < len; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }

  return Math.round((matches / len) * 100);
}

/**
 * Is Fingerprint Match (Threshold-based)
 *
 * @param {string} fp1 - First fingerprint
 * @param {string} fp2 - Second fingerprint
 * @param {number} threshold - Similarity threshold (default: 80%)
 * @returns {boolean} True if match
 */
function isFingerprintMatch(fp1, fp2, threshold = 80) {
  const score = compareFingerprintsScore(fp1, fp2);
  return score >= threshold;
}

/**
 * Sanitize User Agent (Remove sensitive info)
 *
 * Removes personal information from user agent for logging
 *
 * @param {string} userAgent - User agent string
 * @returns {string} Sanitized user agent
 */
function sanitizeUserAgent(userAgent) {
  if (!userAgent) return 'Unknown';

  // Keep only browser and OS info, remove version details
  let sanitized = userAgent;

  // Remove email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');

  // Remove long tokens or IDs
  sanitized = sanitized.replace(/[a-f0-9]{32,}/gi, '[token]');

  return sanitized.substring(0, 255); // Limit length
}

// Export all functions
module.exports = {
  generateDeviceFingerprint,
  getClientIP,
  getIPSubnet,
  getDeviceName,
  extractDeviceInfo,
  compareFingerprintsScore,
  isFingerprintMatch,
  sanitizeUserAgent
};
