/**
 * Design Boards Socket Integration Tests
 * Tests board collaboration event validation and round-trips
 * @file sockets/__tests__/design-boards-socket.test.js
 */

const { validateSocketPayload, cleanupSocket } = require('../../lib/socketValidation');
const schemas = require('../../lib/schemas/sockets');

function createMockSocket(id = 'test-socket-1') {
  const emitted = [];
  return {
    id,
    userId: 'user-1',
    userEmail: 'user@test.com',
    userName: 'Test User',
    emit: vi.fn((event, data) => emitted.push({ event, data })),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
    _emitted: emitted,
  };
}

describe('Design Boards Socket - Payload Validation', () => {
  afterEach(() => {
    cleanupSocket('test-socket-1');
  });

  describe('boardJoinSchema', () => {
    const schema = schemas.boardJoinSchema;

    it('should accept valid board ID', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, 'board-123', socket);
      expect(result).toBe('board-123');
    });

    it('should reject empty board ID', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, '', socket);
      expect(result).toBeNull();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        code: 'VALIDATION_ERROR',
      }));
    });

    it('should reject non-string types', () => {
      const socket = createMockSocket();
      expect(validateSocketPayload(schema, 123, socket)).toBeNull();
      expect(validateSocketPayload(schema, null, socket)).toBeNull();
      expect(validateSocketPayload(schema, undefined, socket)).toBeNull();
    });
  });

  describe('cursorMoveSchema', () => {
    const schema = schemas.cursorMoveSchema;

    it('should accept valid cursor position', () => {
      const socket = createMockSocket();
      const data = {
        boardId: 'board-1',
        x: 100.5,
        y: 200.3,
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.x).toBe(100.5);
      expect(result.y).toBe(200.3);
    });

    it('should reject missing coordinates', () => {
      const socket = createMockSocket();
      expect(validateSocketPayload(schema, { boardId: 'board-1', x: 100 }, socket)).toBeNull();
      expect(validateSocketPayload(schema, { boardId: 'board-1', y: 200 }, socket)).toBeNull();
    });

    it('should reject non-numeric coordinates', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, {
        boardId: 'board-1',
        x: 'abc',
        y: 200,
      }, socket);
      expect(result).toBeNull();
    });
  });

  describe('nodeCreateSchema', () => {
    const schema = schemas.nodeCreateSchema;

    it('should accept valid node creation', () => {
      const socket = createMockSocket();
      const data = {
        boardId: 'board-1',
        node: {
          id: 'node-1',
          type: 'text',
          x: 50,
          y: 100,
          data: { content: 'Hello' },
        },
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.node.type).toBe('text');
    });

    it('should reject missing boardId', () => {
      const socket = createMockSocket();
      const data = {
        node: { id: 'node-1', type: 'text', x: 0, y: 0, data: {} },
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
    });
  });

  describe('nodeDeleteSchema', () => {
    const schema = schemas.nodeDeleteSchema;

    it('should accept valid node deletion', () => {
      const socket = createMockSocket();
      const data = {
        boardId: 'board-1',
        nodeId: 'node-1',
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.nodeId).toBe('node-1');
    });

    it('should reject missing nodeId', () => {
      const socket = createMockSocket();
      const result = validateSocketPayload(schema, { boardId: 'board-1' }, socket);
      expect(result).toBeNull();
    });
  });

  describe('nodesBulkPositionSchema', () => {
    const schema = schemas.nodesBulkPositionSchema;

    it('should accept valid bulk position update', () => {
      const socket = createMockSocket();
      const data = {
        boardId: 'board-1',
        updates: [
          { nodeId: 'node-1', x: 10, y: 20 },
          { nodeId: 'node-2', x: 30, y: 40 },
        ],
      };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).not.toBeNull();
      expect(result.updates).toHaveLength(2);
    });

    it('should reject empty updates array', () => {
      const socket = createMockSocket();
      const data = { boardId: 'board-1', updates: [] };

      const result = validateSocketPayload(schema, data, socket);
      expect(result).toBeNull();
    });
  });
});
