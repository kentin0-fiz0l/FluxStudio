/**
 * Realtime Services Index
 *
 * Unified export for all real-time functionality.
 */

export {
  realtime,
  default as RealtimeManager,
  type ConnectionStatus,
  type RealtimeConfig,
  type ChannelSubscription,
  type EventHandler,
  type Message,
  type TypingEvent,
  type ProjectPresence,
  type PulseEvent,
  type Notification,
  type UserPresence,
  type CursorPosition,
  type CollaborationEdit,
} from './RealtimeManager';
