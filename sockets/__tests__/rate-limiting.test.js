/**
 * Socket Rate Limiting Tests
 * Tests per-event sliding window rate limiter thresholds
 * @file sockets/__tests__/rate-limiting.test.js
 */

const { checkSocketRateLimit, cleanupSocket } = require('../../lib/socketValidation');

function createMockSocket(id = 'test-socket-1') {
  return {
    id,
    emit: jest.fn(),
  };
}

describe('Socket Rate Limiting', () => {
  afterEach(() => {
    cleanupSocket('test-socket-1');
    cleanupSocket('test-socket-2');
  });

  describe('checkSocketRateLimit', () => {
    it('should allow requests within the limit', () => {
      const socket = createMockSocket();

      // 3 requests with limit of 5
      for (let i = 0; i < 3; i++) {
        expect(checkSocketRateLimit(socket, 'test:event', 5, 10000)).toBe(true);
      }

      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should block requests exceeding the limit', () => {
      const socket = createMockSocket();

      // Send exactly at the limit (5 allowed)
      for (let i = 0; i < 5; i++) {
        expect(checkSocketRateLimit(socket, 'test:event', 5, 10000)).toBe(true);
      }

      // 6th request should be blocked
      expect(checkSocketRateLimit(socket, 'test:event', 5, 10000)).toBe(false);

      // Should emit rate limit error
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        code: 'RATE_LIMIT',
      }));
    });

    it('should emit descriptive error message', () => {
      const socket = createMockSocket();

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        checkSocketRateLimit(socket, 'message:send', 3, 10000);
      }

      checkSocketRateLimit(socket, 'message:send', 3, 10000);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        code: 'RATE_LIMIT',
        message: 'Too many message:send events. Please slow down.',
      });
    });

    it('should track events independently per event name', () => {
      const socket = createMockSocket();

      // Exhaust limit for event A
      for (let i = 0; i < 3; i++) {
        checkSocketRateLimit(socket, 'event:a', 3, 10000);
      }
      expect(checkSocketRateLimit(socket, 'event:a', 3, 10000)).toBe(false);

      // Event B should still be allowed
      expect(checkSocketRateLimit(socket, 'event:b', 3, 10000)).toBe(true);
    });

    it('should track events independently per socket', () => {
      const socket1 = createMockSocket('test-socket-1');
      const socket2 = createMockSocket('test-socket-2');

      // Exhaust limit for socket 1
      for (let i = 0; i < 3; i++) {
        checkSocketRateLimit(socket1, 'test:event', 3, 10000);
      }
      expect(checkSocketRateLimit(socket1, 'test:event', 3, 10000)).toBe(false);

      // Socket 2 should still be allowed
      expect(checkSocketRateLimit(socket2, 'test:event', 3, 10000)).toBe(true);
    });

    it('should reset after window expires', async () => {
      const socket = createMockSocket();
      const shortWindow = 100; // 100ms window

      // Exhaust limit
      for (let i = 0; i < 3; i++) {
        checkSocketRateLimit(socket, 'test:event', 3, shortWindow);
      }
      expect(checkSocketRateLimit(socket, 'test:event', 3, shortWindow)).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      expect(checkSocketRateLimit(socket, 'test:event', 3, shortWindow)).toBe(true);
    });
  });

  describe('cleanupSocket', () => {
    it('should remove all rate limit entries for a socket', () => {
      const socket = createMockSocket('cleanup-test');

      // Create some rate limit entries
      checkSocketRateLimit(socket, 'event:a', 10, 10000);
      checkSocketRateLimit(socket, 'event:b', 10, 10000);
      checkSocketRateLimit(socket, 'event:c', 10, 10000);

      // Clean up
      cleanupSocket('cleanup-test');

      // After cleanup, all counters should be reset
      // Verify by checking that we can make requests up to the limit again
      for (let i = 0; i < 3; i++) {
        expect(checkSocketRateLimit(socket, 'event:a', 3, 10000)).toBe(true);
      }
    });

    it('should not affect other sockets', () => {
      const socket1 = createMockSocket('socket-1');
      const socket2 = createMockSocket('socket-2');

      // Add entries for both
      for (let i = 0; i < 3; i++) {
        checkSocketRateLimit(socket1, 'test:event', 5, 10000);
        checkSocketRateLimit(socket2, 'test:event', 5, 10000);
      }

      // Clean up socket 1 only
      cleanupSocket('socket-1');

      // Socket 2's entries should still be tracked
      // It already has 3 entries, adding 2 more should still be allowed
      expect(checkSocketRateLimit(socket2, 'test:event', 5, 10000)).toBe(true);
      expect(checkSocketRateLimit(socket2, 'test:event', 5, 10000)).toBe(true);
      // But 6th should be blocked
      expect(checkSocketRateLimit(socket2, 'test:event', 5, 10000)).toBe(false);

      cleanupSocket('socket-2');
    });
  });

  describe('Production rate limit thresholds', () => {
    it('should enforce messaging rate limits (10/10s)', () => {
      const socket = createMockSocket();

      for (let i = 0; i < 10; i++) {
        expect(checkSocketRateLimit(socket, 'message:send', 10, 10000)).toBe(true);
      }
      expect(checkSocketRateLimit(socket, 'message:send', 10, 10000)).toBe(false);
    });

    it('should enforce typing rate limits (5/5s)', () => {
      const socket = createMockSocket();

      for (let i = 0; i < 5; i++) {
        expect(checkSocketRateLimit(socket, 'typing:start', 5, 5000)).toBe(true);
      }
      expect(checkSocketRateLimit(socket, 'typing:start', 5, 5000)).toBe(false);
    });

    it('should enforce cursor move rate limits (30/5s)', () => {
      const socket = createMockSocket();

      for (let i = 0; i < 30; i++) {
        expect(checkSocketRateLimit(socket, 'cursor:move', 30, 5000)).toBe(true);
      }
      expect(checkSocketRateLimit(socket, 'cursor:move', 30, 5000)).toBe(false);
    });

    it('should enforce call initiation rate limits (5/10s)', () => {
      const socket = createMockSocket();

      for (let i = 0; i < 5; i++) {
        expect(checkSocketRateLimit(socket, 'call:initiate', 5, 10000)).toBe(true);
      }
      expect(checkSocketRateLimit(socket, 'call:initiate', 5, 10000)).toBe(false);
    });

    it('should enforce CRDT sync rate limits (60/5s)', () => {
      const socket = createMockSocket();

      for (let i = 0; i < 60; i++) {
        expect(checkSocketRateLimit(socket, 'yjs:update', 60, 5000)).toBe(true);
      }
      expect(checkSocketRateLimit(socket, 'yjs:update', 60, 5000)).toBe(false);
    });
  });
});
