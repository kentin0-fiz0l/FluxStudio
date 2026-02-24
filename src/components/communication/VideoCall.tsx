/**
 * VideoCall Component - Flux Studio
 *
 * Full-featured video call UI with controls, participant grid, and screen sharing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebRTC } from '../../hooks/useWebRTC';
import { CallParticipant } from '../../services/webrtcService';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  Maximize2,
  Minimize2,
  Settings,
  MessageSquare,
  MoreVertical,
  X,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface VideoCallProps {
  callId: string;
  userId: string;
  userName: string;
  participantIds: string[];
  isIncoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  fromUserId?: string;
  onClose: () => void;
  onOpenChat?: () => void;
}

// ============================================================================
// PARTICIPANT VIDEO COMPONENT
// ============================================================================

const ParticipantVideo = React.memo(function ParticipantVideo({
  participant,
  stream,
  isLarge = false,
}: {
  participant: CallParticipant;
  stream?: MediaStream;
  isLarge?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative bg-gray-800 rounded-lg overflow-hidden ${
        isLarge ? 'col-span-2 row-span-2' : ''
      }`}
      role="group"
      aria-label={`${participant.name}'s video`}
    >
      {!participant.isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          aria-label={`${participant.name}'s video feed`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-medium">
            {participant.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
          </span>
          <div className="flex items-center gap-2" aria-label="Participant status">
            {participant.isMuted && (
              <MicOff className="w-4 h-4 text-red-400" aria-label="Muted" role="img" />
            )}
            {participant.isVideoOff && (
              <VideoOff className="w-4 h-4 text-red-400" aria-label="Camera off" role="img" />
            )}
            {participant.isScreenSharing && (
              <Monitor className="w-4 h-4 text-blue-400" aria-label="Sharing screen" role="img" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VideoCall({
  callId,
  userId,
  userName,
  participantIds,
  isIncoming = false,
  incomingOffer,
  fromUserId,
  onClose,
  onOpenChat,
}: VideoCallProps) {
  const { t } = useTranslation('common');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useWebRTC({ userId });

  // Start or answer call on mount -- intentionally runs only once to avoid re-initiating the call
  useEffect(() => {
    if (isIncoming && incomingOffer && fromUserId) {
      answerCall(callId, fromUserId, incomingOffer);
    } else {
      startCall(callId, participantIds);
    }

    return () => {
      // Cleanup handled by the hook
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only effect: call should be started/answered once
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status text
  const getStatusText = () => {
    switch (callState) {
      case 'connecting':
        return t('call.connecting', 'Connecting...');
      case 'ringing':
        return t('call.ringing', 'Ringing...');
      case 'connected':
        return formatDuration(callDuration);
      case 'disconnected':
        return t('call.ended', 'Call ended');
      case 'failed':
        return error || t('call.failed', 'Call failed');
      default:
        return '';
    }
  };

  const handleEndCall = async () => {
    await endCall();
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800/80 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">
              {participants.length + 1} {t('call.participants', 'participants')}
            </span>
          </div>
          <div className="text-gray-400 text-sm" aria-live="polite" aria-atomic="true">{getStatusText()}</div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              aria-label="Open chat"
            >
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            aria-label="Call settings"
            aria-expanded={showSettings}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            aria-label="Close call window"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        <div
          className={`h-full grid gap-4 ${
            participants.length === 0
              ? 'grid-cols-1'
              : participants.length <= 1
              ? 'grid-cols-2'
              : participants.length <= 3
              ? 'grid-cols-2 grid-rows-2'
              : 'grid-cols-3 grid-rows-2'
          }`}
        >
          {/* Local video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            {!isVideoOff && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Local info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {userName} ({t('call.you', 'You')})
                </span>
                <div className="flex items-center gap-2" aria-label="Your status">
                  {isMuted && <MicOff className="w-4 h-4 text-red-400" aria-label="Muted" role="img" />}
                  {isVideoOff && <VideoOff className="w-4 h-4 text-red-400" aria-label="Camera off" role="img" />}
                  {isScreenSharing && <Monitor className="w-4 h-4 text-blue-400" aria-label="Sharing screen" role="img" />}
                </div>
              </div>
            </div>
          </div>

          {/* Remote participants */}
          {participants.length === 0 && (callState === 'connecting' || callState === 'ringing') ? (
            <div className="relative bg-gray-800 rounded-lg overflow-hidden animate-pulse" role="status" aria-label="Connecting to participants">
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-gray-600" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div className="h-4 w-24 bg-gray-600 rounded" />
              </div>
              <p className="sr-only">Connecting to participants...</p>
            </div>
          ) : (
            participants.map((participant) => (
              <ParticipantVideo
                key={participant.id}
                participant={participant}
                stream={getParticipantStream(participant.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-6 bg-gray-800/80 backdrop-blur" role="toolbar" aria-label="Call controls">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={isMuted}
        >
          {isMuted ? <MicOff className="w-6 h-6" aria-hidden="true" /> : <Mic className="w-6 h-6" aria-hidden="true" />}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${
            isVideoOff
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          aria-pressed={isVideoOff}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" aria-hidden="true" /> : <Video className="w-6 h-6" aria-hidden="true" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`p-4 rounded-full transition-colors ${
            isScreenSharing
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          aria-label={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          aria-pressed={isScreenSharing}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Monitor className="w-6 h-6" aria-hidden="true" />
          )}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" aria-hidden="true" />
        </button>

        {/* More Options */}
        <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white" aria-label="More options">
          <MoreVertical className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div role="alert" className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Styles for mirrored video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

export default VideoCall;
