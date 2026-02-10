/**
 * WebRTC Service - Flux Studio
 *
 * Provides WebRTC infrastructure for peer-to-peer voice/video communication.
 * Handles connection establishment, media streams, and signaling via Socket.IO.
 */

import { io, Socket } from 'socket.io-client';
import { createLogger } from '@/services/logging';

const webrtcLogger = createLogger('WebRTC');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CallType = 'video' | 'voice' | 'screen-share';
export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'disconnected' | 'failed';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

export interface CallOptions {
  audio: boolean;
  video: boolean;
  screenShare?: boolean;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'mute' | 'video-off';
  from: string;
  to: string;
  payload: any;
}

export interface CallEvents {
  onStateChange: (state: CallState) => void;
  onParticipantJoined: (participant: CallParticipant) => void;
  onParticipantLeft: (participantId: string) => void;
  onParticipantUpdated: (participant: CallParticipant) => void;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (participantId: string, stream: MediaStream) => void;
  onError: (error: Error) => void;
}

// ============================================================================
// ICE SERVER CONFIGURATION
// ============================================================================

const defaultIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// ============================================================================
// WEBRTC SERVICE CLASS
// ============================================================================

class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private callState: CallState = 'idle';
  private participants: Map<string, CallParticipant> = new Map();
  private events: Partial<CallEvents> = {};
  private currentUserId: string | null = null;
  private currentCallId: string | null = null;
  private signalingSocket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private participantNames: Map<string, string> = new Map();

  /**
   * Initialize the service with user ID and connect to signaling server
   */
  initialize(userId: string): void {
    this.currentUserId = userId;
    this.connectSignaling();
  }

  /**
   * Connect to WebSocket signaling server
   */
  private connectSignaling(): void {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      webrtcLogger.warn('No auth token, cannot connect to signaling server');
      return;
    }

    // Use environment-based URL detection
    const isDevelopment = import.meta.env.DEV;
    const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;

    this.signalingSocket = io(`${socketUrl}/webrtc`, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupSignalingHandlers();
  }

  /**
   * Set up signaling socket event handlers
   */
  private setupSignalingHandlers(): void {
    if (!this.signalingSocket) return;

    this.signalingSocket.on('connect', () => {
      webrtcLogger.info('Connected to signaling server');
      this.reconnectAttempts = 0;
    });

    this.signalingSocket.on('disconnect', (reason: string) => {
      webrtcLogger.warn('Disconnected from signaling server', { reason });
    });

    this.signalingSocket.on('connect_error', (error: Error) => {
      webrtcLogger.error('Signaling connection error', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.events.onError?.(new Error('Failed to connect to signaling server'));
      }
    });

    // Handle incoming signaling messages
    this.signalingSocket.on('signal', async (message: SignalingMessage) => {
      webrtcLogger.debug('Received signaling message', { type: message.type, from: message.from });
      await this.handleSignalingMessage(message);
    });

    // Handle incoming call
    this.signalingSocket.on('call:incoming', (data: { callId: string; from: string; fromName: string; callType: CallType }) => {
      webrtcLogger.info('Incoming call', data);
      this.participantNames.set(data.from, data.fromName);
      // Notify UI of incoming call
      this.setCallState('ringing');
      this.currentCallId = data.callId;
    });

    // Handle call accepted
    this.signalingSocket.on('call:accepted', (data: { callId: string; by: string }) => {
      webrtcLogger.info('Call accepted', data);
      this.setCallState('connected');
    });

    // Handle call rejected
    this.signalingSocket.on('call:rejected', (data: { callId: string; by: string; reason?: string }) => {
      webrtcLogger.info('Call rejected', data);
      this.cleanup();
      this.setCallState('disconnected');
      setTimeout(() => this.setCallState('idle'), 1000);
    });

    // Handle call ended
    this.signalingSocket.on('call:ended', (data: { callId: string; by: string }) => {
      webrtcLogger.info('Call ended', data);
      this.handleParticipantLeft(data.by);
    });

    // Handle participant joined
    this.signalingSocket.on('call:participant-joined', (data: { callId: string; participantId: string; participantName: string }) => {
      webrtcLogger.info('Participant joined', data);
      this.participantNames.set(data.participantId, data.participantName);
    });

    // Handle participant left
    this.signalingSocket.on('call:participant-left', (data: { callId: string; participantId: string }) => {
      webrtcLogger.info('Participant left', data);
      this.handleParticipantLeft(data.participantId);
    });
  }

  /**
   * Check if signaling is connected
   */
  isSignalingConnected(): boolean {
    return this.signalingSocket?.connected ?? false;
  }

  /**
   * Disconnect from signaling server
   */
  disconnectSignaling(): void {
    this.signalingSocket?.disconnect();
    this.signalingSocket = null;
  }

  /**
   * Register event handlers
   */
  on<K extends keyof CallEvents>(event: K, handler: CallEvents[K]): void {
    this.events[event] = handler;
  }

  /**
   * Remove event handler
   */
  off<K extends keyof CallEvents>(event: K): void {
    delete this.events[event];
  }

  /**
   * Get current call state
   */
  getCallState(): CallState {
    return this.callState;
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get all participants
   */
  getParticipants(): CallParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Start a call
   */
  async startCall(callId: string, participantIds: string[], options: CallOptions): Promise<void> {
    if (this.callState !== 'idle') {
      throw new Error('Already in a call');
    }

    if (!this.signalingSocket?.connected) {
      throw new Error('Not connected to signaling server');
    }

    this.currentCallId = callId;
    this.setCallState('connecting');

    try {
      // Get local media
      await this.acquireLocalMedia(options);

      // Notify signaling server of outgoing call
      const callType: CallType = options.video ? 'video' : options.screenShare ? 'screen-share' : 'voice';
      this.signalingSocket.emit('call:initiate', {
        callId,
        participantIds,
        callType,
      });

      // Create peer connections for each participant
      for (const participantId of participantIds) {
        await this.createPeerConnection(participantId, true);
      }

      this.setCallState('ringing');
    } catch (error) {
      this.setCallState('failed');
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptIncomingCall(options: CallOptions): Promise<void> {
    if (this.callState !== 'ringing' || !this.currentCallId) {
      throw new Error('No incoming call to accept');
    }

    if (!this.signalingSocket?.connected) {
      throw new Error('Not connected to signaling server');
    }

    this.setCallState('connecting');

    try {
      // Get local media
      await this.acquireLocalMedia(options);

      // Notify signaling server that we accepted
      this.signalingSocket.emit('call:accept', {
        callId: this.currentCallId,
      });

      this.setCallState('connected');
    } catch (error) {
      this.setCallState('failed');
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  rejectIncomingCall(reason?: string): void {
    if (this.callState !== 'ringing' || !this.currentCallId) {
      return;
    }

    if (this.signalingSocket?.connected) {
      this.signalingSocket.emit('call:reject', {
        callId: this.currentCallId,
        reason,
      });
    }

    this.cleanup();
    this.setCallState('idle');
  }

  /**
   * Answer an incoming call
   */
  async answerCall(callId: string, fromUserId: string, offer: RTCSessionDescriptionInit, options: CallOptions): Promise<void> {
    if (this.callState !== 'idle' && this.callState !== 'ringing') {
      throw new Error('Cannot answer call in current state');
    }

    this.currentCallId = callId;
    this.setCallState('connecting');

    try {
      // Get local media
      await this.acquireLocalMedia(options);

      // Create peer connection and set remote description
      const pc = await this.createPeerConnection(fromUserId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer via signaling (would be done through WebSocket in production)
      this.sendSignalingMessage({
        type: 'answer',
        from: this.currentUserId!,
        to: fromUserId,
        payload: answer,
      });

      this.setCallState('connected');
    } catch (error) {
      this.setCallState('failed');
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    // Notify signaling server
    if (this.signalingSocket?.connected && this.currentCallId) {
      this.signalingSocket.emit('call:end', {
        callId: this.currentCallId,
      });
    }

    // Send hangup to all participants
    for (const participantId of this.participants.keys()) {
      this.sendSignalingMessage({
        type: 'hangup',
        from: this.currentUserId!,
        to: participantId,
        payload: { callId: this.currentCallId },
      });
    }

    await this.cleanup();
    this.setCallState('disconnected');

    // Reset to idle after a short delay
    setTimeout(() => {
      this.setCallState('idle');
    }, 1000);
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const newMuteState = !audioTracks[0]?.enabled;

    audioTracks.forEach((track) => {
      track.enabled = !newMuteState;
    });

    // Notify participants
    for (const participantId of this.participants.keys()) {
      this.sendSignalingMessage({
        type: 'mute',
        from: this.currentUserId!,
        to: participantId,
        payload: { muted: newMuteState },
      });
    }

    return newMuteState;
  }

  /**
   * Toggle video state
   */
  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    const newVideoOffState = !videoTracks[0]?.enabled;

    videoTracks.forEach((track) => {
      track.enabled = !newVideoOffState;
    });

    // Notify participants
    for (const participantId of this.participants.keys()) {
      this.sendSignalingMessage({
        type: 'video-off',
        from: this.currentUserId!,
        to: participantId,
        payload: { videoOff: newVideoOffState },
      });
    }

    return newVideoOffState;
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track in all peer connections
      const screenTrack = this.screenStream.getVideoTracks()[0];

      for (const pc of this.peerConnections.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
        }
      }

      // Listen for screen share stop
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      return this.screenStream;
    } catch (error) {
      webrtcLogger.error('Failed to start screen share', error as Error);
      return null;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.screenStream) return;

    // Stop screen stream tracks
    this.screenStream.getTracks().forEach((track) => track.stop());

    // Restore original video track
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];

      for (const pc of this.peerConnections.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    }

    this.screenStream = null;
  }

  /**
   * Handle incoming signaling message
   */
  async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    const { type, from, payload } = message;

    switch (type) {
      case 'offer':
        // Incoming call - handled by UI
        break;

      case 'answer': {
        const pc = this.peerConnections.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          this.setCallState('connected');
        }
        break;
      }

      case 'ice-candidate': {
        const peerConnection = this.peerConnections.get(from);
        if (peerConnection && payload) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload));
        }
        break;
      }

      case 'hangup':
        this.handleParticipantLeft(from);
        break;

      case 'mute':
        this.updateParticipant(from, { isMuted: payload.muted });
        break;

      case 'video-off':
        this.updateParticipant(from, { isVideoOff: payload.videoOff });
        break;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async acquireLocalMedia(options: CallOptions): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: options.audio,
        video: options.video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      });

      this.events.onLocalStream?.(this.localStream);
    } catch (error) {
      webrtcLogger.error('Failed to get user media', error as Error);
      throw new Error('Could not access camera/microphone');
    }
  }

  private async createPeerConnection(participantId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: defaultIceServers,
    });

    this.peerConnections.set(participantId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          from: this.currentUserId!,
          to: participantId,
          payload: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.events.onRemoteStream?.(participantId, event.streams[0]);

        // Add/update participant with actual name if available
        const participantName = this.participantNames.get(participantId) || `User ${participantId.slice(0, 6)}`;
        const participant: CallParticipant = {
          id: participantId,
          name: participantName,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          stream: event.streams[0],
        };

        this.participants.set(participantId, participant);
        this.events.onParticipantJoined?.(participant);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handleParticipantLeft(participantId);
      }
    };

    // If initiator, create and send offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        from: this.currentUserId!,
        to: participantId,
        payload: offer,
      });
    }

    return pc;
  }

  private handleParticipantLeft(participantId: string): void {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    this.participants.delete(participantId);
    this.events.onParticipantLeft?.(participantId);

    // If no participants left, end call
    if (this.participants.size === 0 && this.callState === 'connected') {
      this.endCall();
    }
  }

  private updateParticipant(participantId: string, updates: Partial<CallParticipant>): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      const updated = { ...participant, ...updates };
      this.participants.set(participantId, updated);
      this.events.onParticipantUpdated?.(updated);
    }
  }

  private setCallState(state: CallState): void {
    this.callState = state;
    this.events.onStateChange?.(state);
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (!this.signalingSocket?.connected) {
      webrtcLogger.warn('Cannot send signaling message - not connected');
      return;
    }

    webrtcLogger.debug('Sending signaling message', { type: message.type, to: message.to });
    this.signalingSocket.emit('signal', message);
  }

  private async cleanup(): Promise<void> {
    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop screen share
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    // Close all peer connections
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();

    // Clear participants
    this.participants.clear();

    // Reset state
    this.currentCallId = null;
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();
export default webrtcService;
