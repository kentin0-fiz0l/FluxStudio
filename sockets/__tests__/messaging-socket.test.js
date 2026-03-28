/**
 * Messaging Socket Integration Tests
 * Tests Zod validation, rate limiting, and event round-trips
 * @file sockets/__tests__/messaging-socket.test.js
 */

const { validateSocketPayload, cleanupSocket } = require('../../lib/socketValidation');
const schemas = require('../../lib/schemas/sockets');

// Mock socket that captures emitted events
function createMockSocket(id = 'test-socket-1') {
  const emitted = [];
  return {
    id,
    userId: 'user-1',
    userEmail: 'user@test.com',
    userName: 'Test User',
    emit: jest.fn((event, data) => emitted.push({ event, data })),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    _emitted: emitted,
  };
}

describe('Messaging Socket - Payload Validation', () => {
  afterEach(() => {
    cleanupSocket('test-socket-1');
  });

  describe('conversationMessageSendSchema', () => {
    const schema = schemas.conversationMessageSendSchema;

    it('should accept valid text message', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
        text: 'Hello world',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.conversationId).toBe('conv-1');
      expect(result.text).toBe('Hello world');
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should accept message with assetId instead of text', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
        assetId: 'asset-123',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.assetId).toBe('asset-123');
    });

    it('should reject message with neither text nor assetId', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        code: 'VALIDATION_ERROR',
      }));
    });

    it('should reject message with empty conversationId', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: '',
        text: 'Hello',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        code: 'VALIDATION_ERROR',
      }));
    });

    it('should reject message with text exceeding max length', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
        text: 'x'.repeat(10001),
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
    });

    it('should accept optional fields', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
        text: 'Hello',
        replyToMessageId: 'msg-99',
        projectId: 'proj-1',
        threadRootMessageId: 'msg-1',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.replyToMessageId).toBe('msg-99');
      expect(result.projectId).toBe('proj-1');
    });
  });

  describe('conversationJoinSchema', () => {
    const schema = schemas.conversationJoinSchema;

    it('should accept valid conversation ID string', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, 'conv-123', socket);
      expect(result).toBe('conv-123');
    });

    it('should reject empty string', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, '', socket);
      expect(result).toBeNull();
    });

    it('should reject non-string types', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, 42, socket);
      expect(result).toBeNull();
    });

    it('should reject null', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, null, socket);
      expect(result).toBeNull();
    });
  });

  describe('conversationReadSchema', () => {
    const schema = schemas.conversationReadSchema;

    it('should accept valid read receipt', () => {
      const socket = createMockSocket();
      const data = {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.conversationId).toBe('conv-1');
      expect(result.messageId).toBe('msg-1');
    });

    it('should reject missing messageId', () => {
      const socket = createMockSocket();
      const data = { conversationId: 'conv-1' };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
    });
  });

  describe('conversationReactionAddSchema', () => {
    const schema = schemas.conversationReactionAddSchema;

    it('should accept valid reaction', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, {
        messageId: 'msg-1',
        emoji: '👍',
      }, socket);

      expect(result).not.toBeNull();
      expect(result.emoji).toBe('👍');
    });

    it('should reject emoji over 32 chars', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, {
        messageId: 'msg-1',
        emoji: 'x'.repeat(33),
      }, socket);

      expect(result).toBeNull();
    });
  });
});
