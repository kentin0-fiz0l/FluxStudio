/**
 * Authentication and Rate Limiting for MCP Server
 */

// Valid authentication tokens
const VALID_TOKENS = new Set<string>();

// Initialize from environment
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
if (MCP_AUTH_TOKEN) {
  VALID_TOKENS.add(MCP_AUTH_TOKEN);
}

/**
 * Validate authentication token
 *
 * In development mode (NODE_ENV !== 'production' and no tokens configured),
 * authentication is disabled for easy local testing.
 *
 * In production, authentication is REQUIRED.
 */
export function validateAuth(token: string | undefined): boolean {
  // Development mode: allow all connections if no tokens are configured
  if (process.env.NODE_ENV !== 'production' && VALID_TOKENS.size === 0) {
    console.log('[Auth] Development mode: authentication disabled');
    return true;
  }

  // Production or tokens configured: validate token
  if (!token) {
    console.warn('[Auth] No token provided');
    return false;
  }

  const isValid = VALID_TOKENS.has(token);
  if (!isValid) {
    console.warn('[Auth] Invalid token provided');
  }

  return isValid;
}

/**
 * Add a token to the valid tokens set
 * Useful for dynamic token management
 */
export function addToken(token: string): void {
  VALID_TOKENS.add(token);
  console.log(`[Auth] Token added (total: ${VALID_TOKENS.size})`);
}

/**
 * Remove a token from the valid tokens set
 */
export function removeToken(token: string): boolean {
  const removed = VALID_TOKENS.delete(token);
  if (removed) {
    console.log(`[Auth] Token removed (total: ${VALID_TOKENS.size})`);
  }
  return removed;
}

// Rate limiting types
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Simple in-memory rate limiter
 * Uses sliding window algorithm
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed for identifier
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No entry or window expired - reset
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.limits.set(identifier, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Within window - check limit
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.windowStart + this.windowMs,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.windowStart + this.windowMs,
    };
  }

  /**
   * Reset rate limit for identifier
   * Useful for cleanup on disconnect
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Get current stats for identifier
   */
  getStats(identifier: string): { count: number; resetAt: number } | null {
    const entry = this.limits.get(identifier);
    if (!entry) return null;

    return {
      count: entry.count,
      resetAt: entry.windowStart + this.windowMs,
    };
  }
}
