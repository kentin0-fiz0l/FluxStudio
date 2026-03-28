const { z } = require('zod');

// ============================================================
// Messaging Socket Schemas (/messaging)
// ============================================================

// -- Conversation-based events --

const conversationJoinSchema = z.string().min(1, 'conversationId is required');

const conversationLeaveSchema = z.string().min(1, 'conversationId is required');

const conversationMessageSendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().max(10000).optional(),
  replyToMessageId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  threadRootMessageId: z.string().optional().nullable(),
}).refine(data => data.text || data.assetId, {
  message: 'Either text or assetId is required',
});

const conversationTypingStartSchema = z.string().min(1, 'conversationId is required');

const conversationTypingStopSchema = z.string().min(1, 'conversationId is required');

const conversationReadSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

const threadMarkReadSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().optional(),
});

const conversationMessageDeleteSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

const conversationReactionAddSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(32),
});

const conversationReactionRemoveSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(32),
});

const conversationPinSchema = z.object({
  messageId: z.string().min(1),
});

const conversationUnpinSchema = z.object({
  messageId: z.string().min(1),
});

const conversationMessageEditSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().min(1).max(10000),
});

const conversationMessageForwardSchema = z.object({
  sourceConversationId: z.string().min(1),
  targetConversationId: z.string().min(1),
  messageId: z.string().min(1),
});

// -- Legacy channel-based events --

const channelJoinSchema = z.string().min(1, 'channelId is required');

const channelLeaveSchema = z.string().min(1, 'channelId is required');

const messageSendSchema = z.object({
  channelId: z.string().min(1),
  text: z.string().max(10000).optional(),
  replyTo: z.string().optional().nullable(),
  file: z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
    size: z.number().optional(),
  }).optional().nullable(),
}).refine(data => data.text || data.file, {
  message: 'Either text or file is required',
});

const messageEditSchema = z.object({
  messageId: z.string().min(1),
  text: z.string().min(1).max(10000),
});

const messageDeleteSchema = z.string().min(1, 'messageId is required');

const messageReactSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(32),
});

const typingStartSchema = z.string().min(1, 'channelId is required');

const typingStopSchema = z.string().min(1, 'channelId is required');

const dmSendSchema = z.object({
  recipientId: z.string().min(1),
  text: z.string().min(1).max(10000),
});

const messageReadSchema = z.string().min(1, 'messageId is required');

const notificationMarkReadSchema = z.string().min(1, 'notificationId is required');

// ============================================================
// Design Boards Socket Schemas (/design-boards)
// ============================================================

const boardJoinSchema = z.string().min(1, 'boardId is required');

const boardLeaveSchema = z.string().min(1, 'boardId is required');

const cursorMoveSchema = z.object({
  boardId: z.string().min(1),
  x: z.number(),
  y: z.number(),
});

const nodeCreateSchema = z.object({
  boardId: z.string().min(1),
  node: z.object({
    type: z.string().min(1),
    assetId: z.string().optional().nullable(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    zIndex: z.number().optional(),
    rotation: z.number().optional(),
    locked: z.boolean().optional(),
    data: z.record(z.unknown()).optional(),
  }),
});

const nodeUpdateSchema = z.object({
  boardId: z.string().min(1),
  nodeId: z.string().min(1),
  patch: z.record(z.unknown()).refine(obj => Object.keys(obj).length > 0, {
    message: 'patch must have at least one key',
  }),
});

const nodeDeleteSchema = z.object({
  boardId: z.string().min(1),
  nodeId: z.string().min(1),
});

const nodesBulkPositionSchema = z.object({
  boardId: z.string().min(1),
  updates: z.array(z.object({
    nodeId: z.string().min(1),
    x: z.number(),
    y: z.number(),
  })).min(1),
});

const nodeSelectSchema = z.object({
  boardId: z.string().min(1),
  nodeId: z.string().min(1),
});

const nodeDeselectSchema = z.object({
  boardId: z.string().min(1),
  nodeId: z.string().min(1),
});

const boardUpdateSchema = z.object({
  boardId: z.string().min(1),
  patch: z.record(z.unknown()).refine(obj => Object.keys(obj).length > 0, {
    message: 'patch must have at least one key',
  }),
});

// ============================================================
// MetMap Collab Socket Schemas (/metmap-collab)
// ============================================================

const yjsJoinSchema = z.object({
  room: z.string().min(1),
});

const yjsLeaveSchema = z.object({
  room: z.string().min(1),
});

const yjsSyncRequestSchema = z.object({
  room: z.string().min(1),
  stateVector: z.array(z.number()).optional(),
});

const yjsUpdateSchema = z.object({
  room: z.string().min(1),
  update: z.array(z.number()).min(1),
});

const yjsAwarenessUpdateSchema = z.object({
  room: z.string().min(1),
  update: z.array(z.number()).min(1),
});

const yjsCreateSnapshotSchema = z.object({
  room: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});

const yjsRestoreSnapshotSchema = z.object({
  room: z.string().min(1),
  snapshotId: z.string().min(1),
});

// ============================================================
// WebRTC Socket Schemas (/webrtc)
// ============================================================

const callInitiateSchema = z.object({
  callId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1),
  callType: z.enum(['audio', 'video']).optional(),
});

const callAcceptSchema = z.object({
  callId: z.string().min(1),
});

const callRejectSchema = z.object({
  callId: z.string().min(1),
});

const callEndSchema = z.object({
  callId: z.string().min(1),
});

const signalSchema = z.object({
  callId: z.string().min(1),
  targetUserId: z.string().min(1),
  signal: z.unknown(),
});

// ============================================================
// Printing Socket Schemas (/printing)
// ============================================================

const projectJoinSchema = z.string().min(1, 'projectId is required');

const projectLeaveSchema = z.string().min(1, 'projectId is required');

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Messaging — conversation-based
  conversationJoinSchema,
  conversationLeaveSchema,
  conversationMessageSendSchema,
  conversationTypingStartSchema,
  conversationTypingStopSchema,
  conversationReadSchema,
  threadMarkReadSchema,
  conversationMessageDeleteSchema,
  conversationReactionAddSchema,
  conversationReactionRemoveSchema,
  conversationPinSchema,
  conversationUnpinSchema,
  conversationMessageEditSchema,
  conversationMessageForwardSchema,

  // Messaging — legacy channel-based
  channelJoinSchema,
  channelLeaveSchema,
  messageSendSchema,
  messageEditSchema,
  messageDeleteSchema,
  messageReactSchema,
  typingStartSchema,
  typingStopSchema,
  dmSendSchema,
  messageReadSchema,
  notificationMarkReadSchema,

  // Design boards
  boardJoinSchema,
  boardLeaveSchema,
  cursorMoveSchema,
  nodeCreateSchema,
  nodeUpdateSchema,
  nodeDeleteSchema,
  nodesBulkPositionSchema,
  nodeSelectSchema,
  nodeDeselectSchema,
  boardUpdateSchema,

  // MetMap collab
  yjsJoinSchema,
  yjsLeaveSchema,
  yjsSyncRequestSchema,
  yjsUpdateSchema,
  yjsAwarenessUpdateSchema,
  yjsCreateSnapshotSchema,
  yjsRestoreSnapshotSchema,

  // WebRTC
  callInitiateSchema,
  callAcceptSchema,
  callRejectSchema,
  callEndSchema,
  signalSchema,

  // Printing
  projectJoinSchema,
  projectLeaveSchema,
};
