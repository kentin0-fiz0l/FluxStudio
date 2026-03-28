const { createLogger } = require('./logger');
const log = createLogger('SocketValidation');

// Per-event rate limiting
const rateLimitMap = new Map();

/**
 * Validate a socket event payload against a Zod schema.
 * Returns the parsed data on success, or null on failure (emits error to client).
 */
function validateSocketPayload(schema, data, socket) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    log.warn('Socket validation failed', { socketId: socket.id, errors });
    socket.emit('error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload',
      errors,
    });
    return null;
  }
  return result.data;
}

/**
 * Per-event sliding-window rate limiter.
 * Returns true if within limit, false if exceeded (emits error to client).
 */
function checkSocketRateLimit(socket, event, maxPerWindow = 10, windowMs = 10000) {
  const key = `${socket.id}:${event}`;
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const timestamps = rateLimitMap.get(key);
  // Remove expired timestamps
  const valid = timestamps.filter(t => t > now - windowMs);
  valid.push(now);
  rateLimitMap.set(key, valid);

  if (valid.length > maxPerWindow) {
    socket.emit('error', {
      code: 'RATE_LIMIT',
      message: `Too many ${event} events. Please slow down.`,
    });
    return false;
  }
  return true;
}

/**
 * Clean up all rate-limit entries for a disconnected socket.
 */
function cleanupSocket(socketId) {
  for (const [key] of rateLimitMap) {
    if (key.startsWith(socketId + ':')) {
      rateLimitMap.delete(key);
    }
  }
}

module.exports = { validateSocketPayload, checkSocketRateLimit, cleanupSocket };
