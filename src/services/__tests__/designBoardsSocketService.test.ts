/**
 * Unit Tests for Design Boards Socket Service
 * @file src/services/__tests__/designBoardsSocketService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mocks ----
const ctx = vi.hoisted(() => {
  const eventHandlers = new Map<string, Function>();
  const mockSocket = {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
      return mockSocket;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  };
  const mockIo = vi.fn(() => mockSocket);
  return { mockSocket, mockIo, eventHandlers };
});

vi.mock('socket.io-client', () => ({ io: ctx.mockIo }));

import { designBoardsSocketService } from '../designBoardsSocketService';

describe('DesignBoardsSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.eventHandlers.clear();
    ctx.mockSocket.connected = true;
    localStorage.clear();
    localStorage.setItem('auth_token', 'mock-token');
    // Disconnect to reset internal state
    designBoardsSocketService.disconnect();
  });

  describe('connect', () => {
    it('should connect with auth token and correct namespace', () => {
      designBoardsSocketService.connect();

      expect(ctx.mockIo).toHaveBeenCalledWith(
        expect.stringContaining('/design-boards'),
        expect.objectContaining({
          auth: { token: 'mock-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
        }),
      );
    });

    it('should not connect without auth token', () => {
      localStorage.removeItem('auth_token');
      designBoardsSocketService.connect();

      expect(ctx.mockIo).not.toHaveBeenCalled();
    });

    it('should not reconnect if already connected', () => {
      designBoardsSocketService.connect();
      ctx.mockIo.mockClear();

      // Simulate socket.connected = true
      designBoardsSocketService.connect();

      expect(ctx.mockIo).not.toHaveBeenCalled();
    });

    it('should register socket event handlers on connect', () => {
      designBoardsSocketService.connect();

      const events = [...ctx.eventHandlers.keys()];
      expect(events).toContain('connect');
      expect(events).toContain('disconnect');
      expect(events).toContain('error');
      expect(events).toContain('board:joined');
      expect(events).toContain('board:user-joined');
      expect(events).toContain('board:user-left');
      expect(events).toContain('board:updated');
      expect(events).toContain('node:created');
      expect(events).toContain('node:updated');
      expect(events).toContain('node:deleted');
      expect(events).toContain('nodes:bulk-updated');
      expect(events).toContain('cursor:moved');
      expect(events).toContain('node:selected');
      expect(events).toContain('node:deselected');
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and reset state', () => {
      designBoardsSocketService.connect();
      designBoardsSocketService.disconnect();

      expect(ctx.mockSocket.disconnect).toHaveBeenCalled();
      expect(designBoardsSocketService.getConnectionStatus()).toBe(false);
    });

    it('should leave current board before disconnecting', () => {
      designBoardsSocketService.connect();
      designBoardsSocketService.joinBoard('board-1');
      vi.clearAllMocks();

      designBoardsSocketService.disconnect();

      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('board:leave', 'board-1');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return false when not connected', () => {
      expect(designBoardsSocketService.getConnectionStatus()).toBe(false);
    });

    it('should return true after connect event fires', () => {
      designBoardsSocketService.connect();
      const connectHandler = ctx.eventHandlers.get('connect');
      connectHandler?.();

      expect(designBoardsSocketService.getConnectionStatus()).toBe(true);
    });
  });

  describe('Board actions', () => {
    beforeEach(() => {
      designBoardsSocketService.connect();
    });

    it('joinBoard should emit board:join', () => {
      designBoardsSocketService.joinBoard('board-1');
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('board:join', 'board-1');
    });

    it('joinBoard should not emit when disconnected', () => {
      ctx.mockSocket.connected = false;
      designBoardsSocketService.joinBoard('board-1');
      expect(ctx.mockSocket.emit).not.toHaveBeenCalledWith('board:join', expect.anything());
    });

    it('leaveBoard should emit board:leave', () => {
      designBoardsSocketService.joinBoard('board-1');
      designBoardsSocketService.leaveBoard('board-1');
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('board:leave', 'board-1');
    });

    it('leaveBoard should clear currentBoardId if matching', () => {
      designBoardsSocketService.joinBoard('board-1');
      designBoardsSocketService.leaveBoard('board-1');
      // After leaving, disconnect should not try to leave again
      vi.clearAllMocks();
      designBoardsSocketService.disconnect();
      expect(ctx.mockSocket.emit).not.toHaveBeenCalledWith('board:leave', expect.anything());
    });

    it('updateBoard should emit board:update with patch', () => {
      designBoardsSocketService.updateBoard('board-1', { name: 'New Name' });
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('board:update', {
        boardId: 'board-1',
        patch: { name: 'New Name' },
      });
    });
  });

  describe('Node actions', () => {
    beforeEach(() => {
      designBoardsSocketService.connect();
    });

    it('createNode should emit node:create', () => {
      designBoardsSocketService.createNode('board-1', { type: 'text', x: 10, y: 20 } as any);
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('node:create', {
        boardId: 'board-1',
        node: { type: 'text', x: 10, y: 20 },
      });
    });

    it('updateNode should emit node:update', () => {
      designBoardsSocketService.updateNode('board-1', 'node-1', { x: 50 });
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('node:update', {
        boardId: 'board-1',
        nodeId: 'node-1',
        patch: { x: 50 },
      });
    });

    it('deleteNode should emit node:delete', () => {
      designBoardsSocketService.deleteNode('board-1', 'node-1');
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('node:delete', {
        boardId: 'board-1',
        nodeId: 'node-1',
      });
    });

    it('bulkUpdateNodePositions should emit nodes:bulk-position', () => {
      const updates = [{ nodeId: 'n1', x: 10, y: 20 }];
      designBoardsSocketService.bulkUpdateNodePositions('board-1', updates);
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('nodes:bulk-position', {
        boardId: 'board-1',
        updates,
      });
    });

    it('should not emit node actions when disconnected', () => {
      ctx.mockSocket.connected = false;
      vi.clearAllMocks();

      designBoardsSocketService.createNode('board-1', {} as any);
      designBoardsSocketService.updateNode('board-1', 'n1', {});
      designBoardsSocketService.deleteNode('board-1', 'n1');

      expect(ctx.mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Cursor and selection', () => {
    beforeEach(() => {
      designBoardsSocketService.connect();
    });

    it('moveCursor should emit cursor:move', () => {
      designBoardsSocketService.moveCursor('board-1', 100, 200);
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('cursor:move', {
        boardId: 'board-1',
        x: 100,
        y: 200,
      });
    });

    it('selectNode should emit node:select', () => {
      designBoardsSocketService.selectNode('board-1', 'node-1');
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('node:select', {
        boardId: 'board-1',
        nodeId: 'node-1',
      });
    });

    it('deselectNode should emit node:deselect', () => {
      designBoardsSocketService.deselectNode('board-1', 'node-1');
      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('node:deselect', {
        boardId: 'board-1',
        nodeId: 'node-1',
      });
    });
  });

  describe('Event system (on/emit)', () => {
    it('should register and invoke local event listeners', () => {
      const callback = vi.fn();
      designBoardsSocketService.on('board:joined', callback);

      designBoardsSocketService.connect();
      const socketHandler = ctx.eventHandlers.get('board:joined');
      const mockData = { board: {}, nodes: [], users: [] };
      socketHandler?.(mockData);

      expect(callback).toHaveBeenCalledWith(mockData);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = designBoardsSocketService.on('node:created', callback);

      unsub();

      designBoardsSocketService.connect();
      const socketHandler = ctx.eventHandlers.get('node:created');
      socketHandler?.({ node: {}, userId: 'u1' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      designBoardsSocketService.on('connect', cb1);
      designBoardsSocketService.on('connect', cb2);

      designBoardsSocketService.connect();
      const connectHandler = ctx.eventHandlers.get('connect');
      connectHandler?.();

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('should emit error events to listeners', () => {
      const errorCb = vi.fn();
      designBoardsSocketService.on('error', errorCb);

      designBoardsSocketService.connect();
      const errorHandler = ctx.eventHandlers.get('error');
      errorHandler?.({ message: 'test error' });

      expect(errorCb).toHaveBeenCalledWith({ message: 'test error' });
    });

    it('should forward disconnect event to listeners', () => {
      const disconnectCb = vi.fn();
      designBoardsSocketService.on('disconnect', disconnectCb);

      designBoardsSocketService.connect();
      const disconnectHandler = ctx.eventHandlers.get('disconnect');
      disconnectHandler?.('io server disconnect');

      expect(disconnectCb).toHaveBeenCalled();
    });
  });
});
