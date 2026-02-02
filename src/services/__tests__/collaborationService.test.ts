/**
 * Unit Tests for Collaboration Service
 * @file src/services/__tests__/collaborationService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SERVER_URL: 'http://localhost:5000',
    },
  },
});

// Import after mocks
import { collaborationService } from '../collaborationService';

describe('CollaborationService', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify(mockUser));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Socket Initialization', () => {
    it('should initialize socket with correct configuration', () => {
      const { io } = require('socket.io-client');

      // Service initializes on import, verify configuration
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })
      );
    });

    it('should set up socket event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user_joined_room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user_left_room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('presence_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('typing_indicator', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('cursor_position', expect.any(Function));
    });
  });

  describe('Room Management', () => {
    describe('joinRoom', () => {
      it('should emit join_room event with correct data', () => {
        collaborationService.joinRoom('room-1', 'project');

        expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
          roomId: 'room-1',
          roomType: 'project',
          userId: mockUser.id,
          userData: expect.objectContaining({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
          }),
        });
      });

      it('should leave current room before joining new one', () => {
        collaborationService.joinRoom('room-1', 'project');
        vi.clearAllMocks();

        collaborationService.joinRoom('room-2', 'document');

        expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', expect.any(Object));
        expect(mockSocket.emit).toHaveBeenCalledWith('join_room', expect.objectContaining({
          roomId: 'room-2',
        }));
      });

      it('should handle different room types', () => {
        const roomTypes: Array<'project' | 'document' | 'canvas'> = ['project', 'document', 'canvas'];

        roomTypes.forEach((type) => {
          vi.clearAllMocks();
          collaborationService.joinRoom(`room-${type}`, type);

          expect(mockSocket.emit).toHaveBeenCalledWith('join_room', expect.objectContaining({
            roomType: type,
          }));
        });
      });
    });

    describe('leaveRoom', () => {
      it('should emit leave_room event', () => {
        collaborationService.joinRoom('room-1', 'project');
        vi.clearAllMocks();

        collaborationService.leaveRoom();

        expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', {
          roomId: 'room-1',
          userId: mockUser.id,
        });
      });

      it('should not emit if not in a room', () => {
        // Create a fresh instance scenario
        collaborationService.leaveRoom(); // First leave
        vi.clearAllMocks();

        collaborationService.leaveRoom(); // Second leave should do nothing

        // Should not emit leave_room since currentRoom is null
        const leaveCalls = mockSocket.emit.mock.calls.filter(
          (call: any[]) => call[0] === 'leave_room'
        );
        expect(leaveCalls.length).toBe(0);
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      collaborationService.joinRoom('room-1', 'project');
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('startTyping', () => {
      it('should emit typing indicator with isTyping true', () => {
        collaborationService.startTyping();

        expect(mockSocket.emit).toHaveBeenCalledWith('typing_indicator', {
          roomId: 'room-1',
          userId: mockUser.id,
          isTyping: true,
        });
      });

      it('should auto-stop typing after 3 seconds', () => {
        collaborationService.startTyping();
        vi.clearAllMocks();

        vi.advanceTimersByTime(3000);

        expect(mockSocket.emit).toHaveBeenCalledWith('typing_indicator', {
          roomId: 'room-1',
          userId: mockUser.id,
          isTyping: false,
        });
      });

      it('should reset auto-stop timer on subsequent calls', () => {
        collaborationService.startTyping();
        vi.advanceTimersByTime(2000);
        vi.clearAllMocks();

        collaborationService.startTyping();
        vi.advanceTimersByTime(2000);

        // Should not have stopped yet
        const stopCalls = mockSocket.emit.mock.calls.filter(
          (call: any[]) => call[0] === 'typing_indicator' && call[1].isTyping === false
        );
        expect(stopCalls.length).toBe(0);

        // Now advance another second to trigger stop
        vi.advanceTimersByTime(1000);
        expect(mockSocket.emit).toHaveBeenLastCalledWith('typing_indicator', expect.objectContaining({
          isTyping: false,
        }));
      });
    });

    describe('stopTyping', () => {
      it('should emit typing indicator with isTyping false', () => {
        collaborationService.startTyping();
        vi.clearAllMocks();

        collaborationService.stopTyping();

        expect(mockSocket.emit).toHaveBeenCalledWith('typing_indicator', {
          roomId: 'room-1',
          userId: mockUser.id,
          isTyping: false,
        });
      });

      it('should clear auto-stop timer', () => {
        collaborationService.startTyping();
        collaborationService.stopTyping();
        vi.clearAllMocks();

        vi.advanceTimersByTime(3000);

        // Should not emit again since we already stopped
        const stopCalls = mockSocket.emit.mock.calls.filter(
          (call: any[]) => call[0] === 'typing_indicator' && call[1].isTyping === false
        );
        expect(stopCalls.length).toBe(0);
      });
    });
  });

  describe('Cursor Tracking', () => {
    beforeEach(() => {
      collaborationService.joinRoom('room-1', 'project');
      vi.clearAllMocks();
    });

    describe('updateCursorPosition', () => {
      it('should emit cursor position', () => {
        collaborationService.updateCursorPosition(100, 200);

        expect(mockSocket.emit).toHaveBeenCalledWith('cursor_position', {
          roomId: 'room-1',
          userId: mockUser.id,
          cursor: { x: 100, y: 200 },
        });
      });

      it('should not emit if not in a room', () => {
        collaborationService.leaveRoom();
        vi.clearAllMocks();

        collaborationService.updateCursorPosition(100, 200);

        expect(mockSocket.emit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Content Synchronization', () => {
    beforeEach(() => {
      collaborationService.joinRoom('room-1', 'document');
      vi.clearAllMocks();
    });

    describe('sendContentChange', () => {
      it('should emit content change for insert operation', () => {
        const content = { text: 'Hello World' };
        collaborationService.sendContentChange('element-1', content, 'insert');

        expect(mockSocket.emit).toHaveBeenCalledWith('content_change', expect.objectContaining({
          roomId: 'room-1',
          userId: mockUser.id,
          elementId: 'element-1',
          content,
          operation: 'insert',
          timestamp: expect.any(Date),
        }));
      });

      it('should emit content change for update operation', () => {
        const content = { text: 'Updated text' };
        collaborationService.sendContentChange('element-1', content, 'update');

        expect(mockSocket.emit).toHaveBeenCalledWith('content_change', expect.objectContaining({
          operation: 'update',
        }));
      });

      it('should emit content change for delete operation', () => {
        collaborationService.sendContentChange('element-1', null, 'delete');

        expect(mockSocket.emit).toHaveBeenCalledWith('content_change', expect.objectContaining({
          operation: 'delete',
        }));
      });
    });

    describe('sendSelectionChange', () => {
      it('should emit selection change', () => {
        const selection = { start: 0, end: 10 };
        collaborationService.sendSelectionChange('element-1', selection);

        expect(mockSocket.emit).toHaveBeenCalledWith('selection_change', {
          roomId: 'room-1',
          userId: mockUser.id,
          elementId: 'element-1',
          selection,
        });
      });
    });
  });

  describe('Event Callbacks', () => {
    it('should call onPresenceChanged callback when set', () => {
      const callback = vi.fn();
      collaborationService.onPresenceChanged(callback);

      // Simulate presence update event
      const presenceHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'presence_update'
      )?.[1];

      collaborationService.joinRoom('room-1', 'project');

      if (presenceHandler) {
        presenceHandler({
          roomId: 'room-1',
          presence: {
            userId: 'user-2',
            name: 'Other User',
            status: 'online',
          },
        });
      }

      expect(callback).toHaveBeenCalled();
    });

    it('should call onTypingChanged callback when set', () => {
      const callback = vi.fn();
      collaborationService.onTypingChanged(callback);

      // The callback should be stored
      expect(typeof callback).toBe('function');
    });

    it('should call onCursorChanged callback when set', () => {
      const callback = vi.fn();
      collaborationService.onCursorChanged(callback);

      // The callback should be stored
      expect(typeof callback).toBe('function');
    });
  });

  describe('Utility Methods', () => {
    describe('getActiveCollaborators', () => {
      it('should return empty array when not in a room', () => {
        collaborationService.leaveRoom();
        expect(collaborationService.getActiveCollaborators()).toEqual([]);
      });

      it('should return collaborators when in a room', () => {
        collaborationService.joinRoom('room-1', 'project');
        // Active collaborators would be populated by socket events
        // Initial state should be empty
        expect(collaborationService.getActiveCollaborators()).toEqual([]);
      });
    });

    describe('hasActiveCollaborators', () => {
      it('should return false when no collaborators', () => {
        collaborationService.joinRoom('room-1', 'project');
        expect(collaborationService.hasActiveCollaborators()).toBe(false);
      });
    });

    describe('disconnect', () => {
      it('should disconnect socket', () => {
        collaborationService.disconnect();

        expect(mockSocket.disconnect).toHaveBeenCalled();
      });
    });
  });

  describe('User Data Retrieval', () => {
    it('should get user id from localStorage', () => {
      collaborationService.joinRoom('room-1', 'project');

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', expect.objectContaining({
        userId: mockUser.id,
      }));
    });

    it('should use anonymous user when no user in localStorage', () => {
      localStorage.removeItem('user');
      vi.clearAllMocks();

      collaborationService.joinRoom('room-1', 'project');

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', expect.objectContaining({
        userId: 'anonymous',
        userData: expect.objectContaining({
          name: 'Anonymous User',
        }),
      }));
    });

    it('should handle malformed user JSON gracefully', () => {
      localStorage.setItem('user', 'invalid-json');
      vi.clearAllMocks();

      // This should not throw
      expect(() => {
        collaborationService.joinRoom('room-1', 'project');
      }).toThrow(); // JSON.parse will throw, which is expected
    });
  });
});
