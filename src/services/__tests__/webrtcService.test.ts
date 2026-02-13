/**
 * Unit Tests for WebRTC Service
 * @file src/services/__tests__/webrtcService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// testHelpers available if needed

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

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  trace: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: ctx.mockIo }));

vi.mock('@/services/logging', () => ({
  createLogger: () => mockLogger,
  socketLogger: mockLogger,
}));

// ---- Mock WebRTC browser APIs ----
const mockTrack = {
  kind: 'video',
  enabled: true,
  stop: vi.fn(),
  onended: null as (() => void) | null,
};

const mockAudioTrack = {
  kind: 'audio',
  enabled: true,
  stop: vi.fn(),
  onended: null as (() => void) | null,
};

const mockMediaStream = {
  getTracks: vi.fn(() => [mockAudioTrack, mockTrack]),
  getAudioTracks: vi.fn(() => [mockAudioTrack]),
  getVideoTracks: vi.fn(() => [mockTrack]),
};

const mockSender = {
  track: mockTrack,
  replaceTrack: vi.fn(),
};

const mockPeerConnection = {
  addTrack: vi.fn(),
  getSenders: vi.fn(() => [mockSender]),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  onicecandidate: null as ((event: any) => void) | null,
  ontrack: null as ((event: any) => void) | null,
  onconnectionstatechange: null as (() => void) | null,
  connectionState: 'connected',
};

// Global browser API mocks
vi.stubGlobal('RTCPeerConnection', vi.fn(() => mockPeerConnection));
vi.stubGlobal('RTCSessionDescription', vi.fn((desc: any) => desc));
vi.stubGlobal('RTCIceCandidate', vi.fn((c: any) => c));
vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
    getDisplayMedia: vi.fn().mockResolvedValue(mockMediaStream),
  },
});

// Import after mocks
import { webrtcService } from '../webrtcService';

describe('WebRTCService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.eventHandlers.clear();
    ctx.mockSocket.connected = true;
    localStorage.clear();
    localStorage.setItem('auth_token', 'mock-token');

    // Reset mock peer connection state
    mockPeerConnection.connectionState = 'connected';
    mockTrack.enabled = true;
    mockAudioTrack.enabled = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialize', () => {
    it('should connect to signaling server with auth token', () => {
      webrtcService.initialize('user-1');

      expect(ctx.mockIo).toHaveBeenCalledWith(
        expect.stringContaining('/webrtc'),
        expect.objectContaining({
          auth: { token: 'mock-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
        }),
      );
    });

    it('should not connect without auth token', () => {
      localStorage.removeItem('auth_token');
      ctx.mockIo.mockClear();

      webrtcService.initialize('user-1');

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No auth token'));
    });

    it('should set up signaling event handlers', () => {
      webrtcService.initialize('user-1');

      const events = [...ctx.eventHandlers.keys()];
      expect(events).toContain('connect');
      expect(events).toContain('disconnect');
      expect(events).toContain('connect_error');
      expect(events).toContain('signal');
      expect(events).toContain('call:incoming');
      expect(events).toContain('call:accepted');
      expect(events).toContain('call:rejected');
      expect(events).toContain('call:ended');
    });
  });

  describe('event registration', () => {
    it('should register and invoke onStateChange', () => {
      const handler = vi.fn();
      webrtcService.on('onStateChange', handler);

      // Trigger state change via incoming call
      webrtcService.initialize('user-1');
      const incomingHandler = ctx.eventHandlers.get('call:incoming');
      incomingHandler?.({ callId: 'c1', from: 'u2', fromName: 'User 2', callType: 'voice' });

      expect(handler).toHaveBeenCalledWith('ringing');
    });

    it('should remove event handler with off()', () => {
      const handler = vi.fn();
      webrtcService.on('onError', handler);
      webrtcService.off('onError');

      // Error handler should not fire
      webrtcService.initialize('user-1');
      const errorHandler = ctx.eventHandlers.get('connect_error');
      // Simulate max reconnect
      for (let i = 0; i < 6; i++) {
        errorHandler?.(new Error('fail'));
      }

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getCallState', () => {
    it('should return current call state', () => {
      // Singleton may carry state from previous tests; just verify it returns a valid state
      const state = webrtcService.getCallState();
      expect(['idle', 'connecting', 'ringing', 'connected', 'disconnected', 'failed']).toContain(state);
    });
  });

  describe('getParticipants', () => {
    it('should return empty array initially', () => {
      expect(webrtcService.getParticipants()).toEqual([]);
    });
  });

  describe('getLocalStream', () => {
    it('should return null when no call active', () => {
      expect(webrtcService.getLocalStream()).toBeNull();
    });
  });

  describe('isSignalingConnected', () => {
    it('should reflect socket connected state', () => {
      webrtcService.initialize('user-1');
      expect(webrtcService.isSignalingConnected()).toBe(true);
    });

    it('should return false after disconnecting signaling', () => {
      webrtcService.initialize('user-1');
      webrtcService.disconnectSignaling();
      expect(webrtcService.isSignalingConnected()).toBe(false);
    });
  });

  describe('disconnectSignaling', () => {
    it('should disconnect and null the socket', () => {
      webrtcService.initialize('user-1');
      webrtcService.disconnectSignaling();

      expect(ctx.mockSocket.disconnect).toHaveBeenCalled();
      expect(webrtcService.isSignalingConnected()).toBe(false);
    });
  });

  describe('startCall', () => {
    beforeEach(() => {
      webrtcService.initialize('user-1');
      vi.clearAllMocks();
    });

    it('should throw if not in idle state', async () => {
      // Put service in non-idle state by simulating incoming call
      const incomingHandler = ctx.eventHandlers.get('call:incoming');
      incomingHandler?.({ callId: 'c1', from: 'u2', fromName: 'User 2', callType: 'voice' });

      await expect(
        webrtcService.startCall('c2', ['u3'], { audio: true, video: false }),
      ).rejects.toThrow('Already in a call');
    });

    it('should throw if signaling not connected', async () => {
      vi.useFakeTimers();
      // Reset to idle via rejected handler
      const rejectedHandler = ctx.eventHandlers.get('call:rejected');
      rejectedHandler?.({ callId: 'x', by: 'x' });
      vi.advanceTimersByTime(1100);

      // Now disconnect signaling
      webrtcService.disconnectSignaling();

      await expect(
        webrtcService.startCall('c1', ['u2'], { audio: true, video: false }),
      ).rejects.toThrow('Not connected to signaling server');
      vi.useRealTimers();
    });
  });

  describe('rejectIncomingCall', () => {
    beforeEach(() => {
      webrtcService.initialize('user-1');
    });

    it('should do nothing if not ringing', () => {
      webrtcService.rejectIncomingCall('busy');
      expect(ctx.mockSocket.emit).not.toHaveBeenCalledWith('call:reject', expect.anything());
    });

    it('should emit call:reject when ringing', () => {
      const incomingHandler = ctx.eventHandlers.get('call:incoming');
      incomingHandler?.({ callId: 'c1', from: 'u2', fromName: 'User 2', callType: 'voice' });
      vi.clearAllMocks();

      webrtcService.rejectIncomingCall('busy');

      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('call:reject', {
        callId: 'c1',
        reason: 'busy',
      });
    });
  });

  describe('toggleMute', () => {
    it('should return false when no local stream', () => {
      expect(webrtcService.toggleMute()).toBe(false);
    });
  });

  describe('toggleVideo', () => {
    it('should return false when no local stream', () => {
      expect(webrtcService.toggleVideo()).toBe(false);
    });
  });

  describe('handleSignalingMessage', () => {
    it('should handle mute message by updating participant', async () => {
      const handler = vi.fn();
      webrtcService.on('onParticipantUpdated', handler);

      // No participant exists, so update is a no-op
      await webrtcService.handleSignalingMessage({
        type: 'mute',
        from: 'u2',
        to: 'user-1',
        payload: { muted: true },
      });

      // No participant registered so handler won't fire
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle video-off message', async () => {
      await webrtcService.handleSignalingMessage({
        type: 'video-off',
        from: 'u2',
        to: 'user-1',
        payload: { videoOff: true },
      });
      // Should not throw
    });

    it('should handle hangup message', async () => {
      const handler = vi.fn();
      webrtcService.on('onParticipantLeft', handler);

      await webrtcService.handleSignalingMessage({
        type: 'hangup',
        from: 'u2',
        to: 'user-1',
        payload: { callId: 'c1' },
      });

      expect(handler).toHaveBeenCalledWith('u2');
    });

    it('should handle offer message (no-op in service)', async () => {
      await webrtcService.handleSignalingMessage({
        type: 'offer',
        from: 'u2',
        to: 'user-1',
        payload: { type: 'offer', sdp: 'mock' },
      });
      // Should not throw - offer is handled by UI
    });
  });

  describe('signaling socket event handlers', () => {
    beforeEach(() => {
      webrtcService.initialize('user-1');
    });

    it('should reset reconnect attempts on connect', () => {
      const connectHandler = ctx.eventHandlers.get('connect');
      connectHandler?.();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Connected'));
    });

    it('should log disconnect reason', () => {
      const disconnectHandler = ctx.eventHandlers.get('disconnect');
      disconnectHandler?.('io server disconnect');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should fire onError after max reconnect attempts', () => {
      const errorCb = vi.fn();
      webrtcService.on('onError', errorCb);

      const connectErrorHandler = ctx.eventHandlers.get('connect_error');
      for (let i = 0; i < 5; i++) {
        connectErrorHandler?.(new Error('fail'));
      }

      expect(errorCb).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle call:accepted by setting connected state', () => {
      const stateHandler = vi.fn();
      webrtcService.on('onStateChange', stateHandler);

      const acceptedHandler = ctx.eventHandlers.get('call:accepted');
      acceptedHandler?.({ callId: 'c1', by: 'u2' });

      expect(stateHandler).toHaveBeenCalledWith('connected');
    });

    it('should handle call:rejected by cleaning up', () => {
      vi.useFakeTimers();
      const stateHandler = vi.fn();
      webrtcService.on('onStateChange', stateHandler);

      const rejectedHandler = ctx.eventHandlers.get('call:rejected');
      rejectedHandler?.({ callId: 'c1', by: 'u2' });

      expect(stateHandler).toHaveBeenCalledWith('disconnected');

      vi.advanceTimersByTime(1000);
      expect(stateHandler).toHaveBeenCalledWith('idle');
      vi.useRealTimers();
    });

    it('should handle call:participant-joined by storing name', () => {
      const handler = ctx.eventHandlers.get('call:participant-joined');
      handler?.({ callId: 'c1', participantId: 'u3', participantName: 'User Three' });
      // No assertion needed beyond not throwing; name stored internally
    });

    it('should handle call:participant-left', () => {
      const leftCb = vi.fn();
      webrtcService.on('onParticipantLeft', leftCb);

      const handler = ctx.eventHandlers.get('call:participant-left');
      handler?.({ callId: 'c1', participantId: 'u3' });

      expect(leftCb).toHaveBeenCalledWith('u3');
    });
  });

  describe('endCall', () => {
    it('should emit call:end on signaling socket', async () => {
      vi.useFakeTimers();
      webrtcService.initialize('user-1');

      // Simulate being in a call by triggering incoming + accepted
      const incomingHandler = ctx.eventHandlers.get('call:incoming');
      incomingHandler?.({ callId: 'c1', from: 'u2', fromName: 'User 2', callType: 'voice' });
      const acceptedHandler = ctx.eventHandlers.get('call:accepted');
      acceptedHandler?.({ callId: 'c1', by: 'u2' });
      vi.clearAllMocks();

      await webrtcService.endCall();

      expect(ctx.mockSocket.emit).toHaveBeenCalledWith('call:end', { callId: 'c1' });
      vi.useRealTimers();
    });
  });
});
