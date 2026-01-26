/**
 * VoiceCall Component - Flux Studio
 *
 * Voice-only call UI with participant avatars and audio controls.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebRTC } from '../../hooks/useWebRTC';
import { CallParticipant } from '../../services/webrtcService';
import {
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Volume2,
  VolumeX,
  Phone,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface VoiceCallProps {
  callId: string;
  userId: string;
  userName: string;
  participantIds: string[];
  isIncoming?: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  fromUserId?: string;
  onClose: () => void;
}

// ============================================================================
// PARTICIPANT AVATAR COMPONENT
// ============================================================================

function ParticipantAvatar({
  participant,
  isSpeaking = false,
}: {
  participant: CallParticipant | { name: string; isMuted: boolean };
  isSpeaking?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-medium transition-all ${
          isSpeaking
            ? 'bg-green-500 ring-4 ring-green-400/50'
            : participant.isMuted
            ? 'bg-gray-500'
            : 'bg-blue-500'
        }`}
      >
        {participant.name.charAt(0).toUpperCase()}
        {participant.isMuted && (
          <div className="absolute -bottom-1 -right-1 p-1 bg-red-500 rounded-full">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <span className="text-white text-sm font-medium truncate max-w-[100px]">
        {participant.name}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VoiceCall({
  callId,
  userId,
  userName,
  participantIds,
  isIncoming = false,
  incomingOffer,
  fromUserId,
  onClose,
}: VoiceCallProps) {
  const { t } = useTranslation('common');
  const [callDuration, setCallDuration] = useState(0);
  const [speakerId, setSpeakerId] = useState<string | null>(null);

  const {
    callState,
    participants,
    isMuted,
    error,
    startCall,
    answerCall,
    endCall,
    toggleMute,
  } = useWebRTC({ userId });

  // Start or answer call on mount (voice only)
  useEffect(() => {
    if (isIncoming && incomingOffer && fromUserId) {
      answerCall(callId, fromUserId, incomingOffer, { audio: true, video: false });
    } else {
      startCall(callId, participantIds, { audio: true, video: false });
    }

    return () => {
      // Cleanup handled by the hook
    };
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

  // Simulate active speaker detection (in production, use audio analysis)
  useEffect(() => {
    if (callState !== 'connected') return;

    const interval = setInterval(() => {
      // Randomly select a speaker for demo
      const allParticipants = [userId, ...participants.map((p) => p.id)];
      const randomIdx = Math.floor(Math.random() * allParticipants.length);
      setSpeakerId(allParticipants[randomIdx]);
    }, 2000);

    return () => clearInterval(interval);
  }, [callState, participants, userId]);

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
    <div className="fixed inset-0 bg-gradient-to-b from-gray-800 to-gray-900 z-50 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <Phone className="w-5 h-5" />
          <span className="font-medium">{t('call.voiceCall', 'Voice Call')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-sm">{participants.length + 1}</span>
        </div>
      </div>

      {/* Call Status */}
      <div className="mb-8 text-center">
        <div className="text-white text-lg font-medium">{getStatusText()}</div>
      </div>

      {/* Participants Grid */}
      <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
        {/* Local user */}
        <ParticipantAvatar
          participant={{ name: userName, isMuted }}
          isSpeaking={speakerId === userId && !isMuted}
        />

        {/* Remote participants */}
        {participants.map((participant) => (
          <ParticipantAvatar
            key={participant.id}
            participant={participant}
            isSpeaking={speakerId === participant.id && !participant.isMuted}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`p-5 rounded-full transition-colors ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>

      {/* Audio Visualization */}
      {callState === 'connected' && (
        <div className="absolute bottom-32 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-blue-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceCall;
