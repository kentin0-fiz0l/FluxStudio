/**
 * useWebRTC Hook - Flux Studio
 *
 * React hook for WebRTC-based voice/video communication.
 * Provides state management and controls for calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  webrtcService,
  CallState,
  CallParticipant,
  CallOptions,
  SignalingMessage,
} from '../services/webrtcService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseWebRTCOptions {
  userId: string;
  onIncomingCall?: (callId: string, fromUserId: string, offer: RTCSessionDescriptionInit) => void;
}

export interface UseWebRTCReturn {
  // State
  callState: CallState;
  localStream: MediaStream | null;
  participants: CallParticipant[];
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  error: string | null;

  // Actions
  startCall: (callId: string, participantIds: string[], options?: Partial<CallOptions>) => Promise<void>;
  answerCall: (callId: string, fromUserId: string, offer: RTCSessionDescriptionInit, options?: Partial<CallOptions>) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;

  // Refs for video elements
  localVideoRef: React.RefObject<HTMLVideoElement>;
  getParticipantStream: (participantId: string) => MediaStream | undefined;
}

// ============================================================================
// HOOK
// ============================================================================

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const { userId, onIncomingCall } = options;

  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  // Initialize service
  useEffect(() => {
    webrtcService.initialize(userId);

    // Set up event handlers
    webrtcService.on('onStateChange', (state) => {
      setCallState(state);
      if (state === 'idle') {
        setParticipants([]);
        setLocalStream(null);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsScreenSharing(false);
        remoteStreamsRef.current.clear();
      }
    });

    webrtcService.on('onLocalStream', (stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    webrtcService.on('onRemoteStream', (participantId, stream) => {
      remoteStreamsRef.current.set(participantId, stream);
    });

    webrtcService.on('onParticipantJoined', (participant) => {
      setParticipants((prev) => [...prev.filter((p) => p.id !== participant.id), participant]);
    });

    webrtcService.on('onParticipantLeft', (participantId) => {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      remoteStreamsRef.current.delete(participantId);
    });

    webrtcService.on('onParticipantUpdated', (participant) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participant.id ? participant : p))
      );
    });

    webrtcService.on('onError', (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      // Cleanup
      webrtcService.off('onStateChange');
      webrtcService.off('onLocalStream');
      webrtcService.off('onRemoteStream');
      webrtcService.off('onParticipantJoined');
      webrtcService.off('onParticipantLeft');
      webrtcService.off('onParticipantUpdated');
      webrtcService.off('onError');
    };
  }, [userId]);

  // Start a call
  const startCall = useCallback(
    async (callId: string, participantIds: string[], opts?: Partial<CallOptions>) => {
      try {
        setError(null);
        await webrtcService.startCall(callId, participantIds, {
          audio: opts?.audio ?? true,
          video: opts?.video ?? true,
          screenShare: opts?.screenShare,
        });
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  // Answer an incoming call
  const answerCall = useCallback(
    async (
      callId: string,
      fromUserId: string,
      offer: RTCSessionDescriptionInit,
      opts?: Partial<CallOptions>
    ) => {
      try {
        setError(null);
        await webrtcService.answerCall(callId, fromUserId, offer, {
          audio: opts?.audio ?? true,
          video: opts?.video ?? true,
        });
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  // End the call
  const endCall = useCallback(async () => {
    try {
      await webrtcService.endCall();
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = webrtcService.toggleMute();
    setIsMuted(newMuted);
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newVideoOff = webrtcService.toggleVideo();
    setIsVideoOff(newVideoOff);
  }, []);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    const stream = await webrtcService.startScreenShare();
    if (stream) {
      setIsScreenSharing(true);
    }
  }, []);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    await webrtcService.stopScreenShare();
    setIsScreenSharing(false);
  }, []);

  // Get participant stream
  const getParticipantStream = useCallback((participantId: string) => {
    return remoteStreamsRef.current.get(participantId);
  }, []);

  return {
    callState,
    localStream,
    participants,
    isMuted,
    isVideoOff,
    isScreenSharing,
    error,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    localVideoRef,
    getParticipantStream,
  };
}

export default useWebRTC;
