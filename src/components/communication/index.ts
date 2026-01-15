/**
 * Communication Components - Flux Studio
 *
 * WebRTC-based voice, video, and screen sharing components.
 */

export { VideoCall } from './VideoCall';
export { VoiceCall } from './VoiceCall';
export { ScreenShare } from './ScreenShare';

// Re-export types from service for convenience
export type {
  CallType,
  CallState,
  CallParticipant,
  CallOptions,
  SignalingMessage,
} from '../../services/webrtcService';
