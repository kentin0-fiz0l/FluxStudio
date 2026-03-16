/**
 * Circuit Breaker Pattern
 *
 * Wraps external service calls with fail-fast behavior to prevent
 * cascading failures when a downstream service is unhealthy.
 *
 * States:
 *   CLOSED    -> Normal operation, requests pass through
 *   OPEN      -> Service is unhealthy, requests fail immediately
 *   HALF_OPEN -> Recovery probe: one request allowed through to test
 */

const { createLogger } = require('./logger');
const log = createLogger('CircuitBreaker');

const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreakerOpenError extends Error {
  constructor(name) {
    super(`Circuit breaker "${name}" is OPEN — request rejected`);
    this.name = 'CircuitBreakerOpenError';
    this.code = 'CIRCUIT_OPEN';
  }
}

/**
 * Create a circuit breaker instance for an external service.
 *
 * @param {Object} options
 * @param {string} options.name - Identifier for logging
 * @param {number} [options.failureThreshold=5] - Failures before tripping
 * @param {number} [options.recoveryTimeout=30000] - ms before trying half-open
 * @returns {{ execute: (fn: () => Promise<T>) => Promise<T>, getState: () => string, reset: () => void }}
 */
function createCircuitBreaker({
  name,
  failureThreshold = 5,
  recoveryTimeout = 30000,
} = {}) {
  let state = STATES.CLOSED;
  let failureCount = 0;
  let lastFailureTime = 0;

  function getState() {
    return state;
  }

  function reset() {
    state = STATES.CLOSED;
    failureCount = 0;
    lastFailureTime = 0;
  }

  function trip() {
    state = STATES.OPEN;
    lastFailureTime = Date.now();
    log.warn(`Circuit breaker "${name}" tripped to OPEN after ${failureCount} failures`);
  }

  function onSuccess() {
    if (state === STATES.HALF_OPEN) {
      log.info(`Circuit breaker "${name}" recovered — back to CLOSED`);
    }
    reset();
  }

  function onFailure(error) {
    failureCount++;
    lastFailureTime = Date.now();

    if (state === STATES.HALF_OPEN) {
      trip();
      return;
    }

    if (failureCount >= failureThreshold) {
      trip();
    } else {
      log.warn(`Circuit breaker "${name}" failure ${failureCount}/${failureThreshold}`, {
        error: error.message,
      });
    }
  }

  /**
   * Execute an async function through the circuit breaker.
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async function execute(fn) {
    if (state === STATES.OPEN) {
      // Check if recovery window has elapsed
      if (Date.now() - lastFailureTime >= recoveryTimeout) {
        state = STATES.HALF_OPEN;
        log.info(`Circuit breaker "${name}" entering HALF_OPEN — testing recovery`);
      } else {
        throw new CircuitBreakerOpenError(name);
      }
    }

    try {
      const result = await fn();
      onSuccess();
      return result;
    } catch (error) {
      onFailure(error);
      throw error;
    }
  }

  return { execute, getState, reset };
}

module.exports = { createCircuitBreaker, CircuitBreakerOpenError, STATES };
