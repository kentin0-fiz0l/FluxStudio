/**
 * Messaging Hooks
 *
 * Extracted from MessagesNew.tsx for Phase 4.2 Technical Debt Resolution
 */

export { useMessageActions } from './useMessageActions';
export { useNewConversation } from './useNewConversation';
export { useFileUpload } from './useFileUpload';
export { useThreadMessages } from './useThreadMessages';

// Re-export types
export type { default as useMessageActionsType } from './useMessageActions';
export type { default as useNewConversationType } from './useNewConversation';
export type { default as useFileUploadType } from './useFileUpload';
export type { default as useThreadMessagesType } from './useThreadMessages';
