/**
 * VisualMessageThread Component - Design-Optimized Conversation View
 * Enhanced message interface with inline design preview and visual collaboration tools
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Reply,
  MoreHorizontal,
  Heart,
  Eye,
  Download,
  Play,
  Maximize2,
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  Zap,
  Star,
  AlertCircle,
  FileText,
  Camera,
  History,
  Brain,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Message, MessageUser, Conversation, MessageAttachment, Priority } from '../../types/messaging';
import { cn } from '../../lib/utils';
import { SmartComposer } from './SmartComposer';
import { ImageAnnotationTool } from './ImageAnnotationTool';
import { EnhancedImageViewer } from './EnhancedImageViewer';
import { InlineAnnotationViewer } from './InlineAnnotationViewer';
import { FileVersionTracker } from './FileVersionTracker';
import { CollaborativeAnnotationTool } from './CollaborativeAnnotationTool';
import { AIDesignFeedbackPanel } from './AIDesignFeedbackPanel';
import { ConversationInsightsPanel } from './ConversationInsightsPanel';
import { WorkflowAutomationPanel } from './WorkflowAutomationPanel';
import { useRealtimeMessages } from '../../hooks/useRealtimeMessages';

interface VisualMessageThreadProps {
  conversation: Conversation;
  messages?: Message[]; // Made optional since we'll use real-time hook
  currentUser: MessageUser;
  className?: string;
}

interface MessageReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[];
}

const _commonReactions = ['👍', '❤️', '🎨', '✨', '🔥', '💯'];

export function VisualMessageThread({
  conversation,
  messages: initialMessages = [],
  currentUser,
  className
}: VisualMessageThreadProps) {
  // Real-time messaging
  const {
    messages: realtimeMessages,
    isConnected: _isConnected,
    syncStatus: _syncStatus,
    sendMessage: _sendMessage,
    retryMessage: _retryMessage
  } = useRealtimeMessages({
    conversationId: conversation.id,
    currentUser,
    enabled: true
  });

  // Use real-time messages or fallback to initial messages
  const messages = realtimeMessages.length > 0 ? realtimeMessages : initialMessages;
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showEnhancedViewer, setShowEnhancedViewer] = useState(false);
  const [inlinePreviewMode, setInlinePreviewMode] = useState<'simple' | 'enhanced' | 'annotations'>('simple');
  const [showVersionTracker, setShowVersionTracker] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now.getTime() - messageDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return messageDate.toLocaleDateString();
  };

  const getMessageStatus = (message: Message) => {
    switch (message.status) {
      case 'sending':
        return <Clock size={14} className="text-gray-400" />;
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      return null;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    const configs = {
      critical: { label: 'URGENT', className: 'bg-red-100 text-red-800 border-red-200' },
      high: { label: 'HIGH', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      medium: { label: 'NORMAL', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      low: { label: 'LOW', className: 'bg-gray-100 text-gray-600 border-gray-200' }
    };

    const config = configs[priority] || configs.medium;
    return (
      <Badge variant="outline" className={cn('text-xs border', config.className)}>
        {config.label}
      </Badge>
    );
  };

  const AttachmentPreview = ({ attachment }: { attachment: MessageAttachment }) => {
    if (attachment.isImage) {
      return (
        <div className="space-y-2">
          {/* Enhanced inline preview toggle */}
          <div className="flex items-center gap-1 mb-2">
            <Button
              size="sm"
              variant={inlinePreviewMode === 'simple' ? 'primary' : 'outline'}
              onClick={() => setInlinePreviewMode('simple')}
              className="text-xs h-7"
            >
              Simple
            </Button>
            <Button
              size="sm"
              variant={inlinePreviewMode === 'enhanced' ? 'primary' : 'outline'}
              onClick={() => setInlinePreviewMode('enhanced')}
              className="text-xs h-7"
            >
              Enhanced
            </Button>
            {(attachment.annotations && attachment.annotations.length > 0) && (
              <Button
                size="sm"
                variant={inlinePreviewMode === 'annotations' ? 'primary' : 'outline'}
                onClick={() => setInlinePreviewMode('annotations')}
                className="text-xs h-7"
              >
                Annotations ({attachment.annotations.length})
              </Button>
            )}
          </div>

          {inlinePreviewMode === 'simple' ? (
            <div
              className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 max-w-sm"
              onClick={() => {
                setSelectedAttachment(attachment);
                setShowEnhancedViewer(true);
              }}
            >
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-auto max-h-64 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAttachment(attachment);
                      setShowEnhancedViewer(true);
                    }}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAttachment(attachment);
                      setShowAnnotationTool(true);
                    }}
                  >
                    <Camera size={16} />
                  </Button>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black bg-opacity-50 text-white text-xs p-1 rounded">
                  {attachment.name}
                </div>
              </div>
            </div>
          ) : inlinePreviewMode === 'enhanced' ? (
            <div className="border border-gray-200 rounded-lg bg-white p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{attachment.name}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAttachment(attachment);
                      setShowEnhancedViewer(true);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Maximize2 size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAttachment(attachment);
                      setShowAnnotationTool(true);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Camera size={12} />
                  </Button>
                </div>
              </div>
              <div className="h-48 relative">
                <EnhancedImageViewer
                  attachment={attachment}
                  className="rounded"
                  showMinimap={false}
                  showGrid={false}
                />
              </div>
            </div>
          ) : (
            <InlineAnnotationViewer
              attachment={attachment}
              onOpenFullAnnotationTool={() => {
                setSelectedAttachment(attachment);
                setShowAnnotationTool(true);
              }}
              onOpenEnhancedViewer={() => {
                setSelectedAttachment(attachment);
                setShowEnhancedViewer(true);
              }}
            />
          )}
        </div>
      );
    }

    if (attachment.isVideo) {
      return (
        <div className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 max-w-sm">
          <video
            src={attachment.url}
            className="w-full h-auto max-h-64 object-cover"
            controls
            preload="metadata"
          />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black bg-opacity-50 text-white text-xs p-1 rounded flex items-center gap-2">
              <Play size={12} />
              {attachment.name}
            </div>
          </div>
        </div>
      );
    }

    // Other file types
    return (
      <Card className="max-w-sm hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{attachment.name}</p>
              <p className="text-xs text-gray-500">
                {(attachment.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <Download size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MessageBubble = ({ message, isOwn, showAvatar }: {
    message: Message;
    isOwn: boolean;
    showAvatar: boolean;
  }) => {
    const [reactions, _setReactions] = useState<MessageReaction[]>([
      { emoji: '👍', count: 0, hasReacted: false, users: [] }
    ]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 group relative',
          isOwn ? 'flex-row-reverse' : 'flex-row'
        )}
        onMouseEnter={() => setHoveredMessage(message.id)}
        onMouseLeave={() => setHoveredMessage(null)}
      >
        {/* Avatar */}
        {showAvatar && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={message.author.avatar} />
            <AvatarFallback className="text-xs">
              {message.author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn('flex-1 max-w-lg', isOwn ? 'items-end' : 'items-start')}>
          {/* Message Header */}
          {showAvatar && (
            <div className={cn('flex items-center gap-2 mb-1', isOwn ? 'flex-row-reverse' : '')}>
              <span className="font-medium text-sm text-gray-900">
                {message.author.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatMessageTime(message.createdAt)}
              </span>
              {message.metadata?.priority && message.metadata.priority !== 'medium' && (
                getPriorityBadge(message.metadata.priority)
              )}
            </div>
          )}

          {/* Message Content */}
          <div
            className={cn(
              'relative rounded-2xl p-3 shadow-sm',
              isOwn
                ? 'bg-blue-600 text-white ml-8'
                : 'bg-white border border-gray-200 mr-8'
            )}
          >
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="mb-2 p-2 bg-gray-100 rounded-lg border-l-2 border-blue-500">
                <p className="text-xs text-gray-600">Replying to a message</p>
              </div>
            )}

            {/* Content */}
            <p className={cn('text-sm', isOwn ? 'text-white' : 'text-gray-900')}>
              {message.content}
            </p>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map(attachment => (
                  <AttachmentPreview key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}

            {/* Message Status */}
            {isOwn && (
              <div className="flex justify-end mt-1">
                {getMessageStatus(message)}
              </div>
            )}
          </div>

          {/* Reactions */}
          {reactions.some(r => r.count > 0) && (
            <div className="flex gap-1 mt-1">
              {reactions.filter(r => r.count > 0).map(reaction => (
                <Button
                  key={reaction.emoji}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'h-6 px-2 text-xs rounded-full border',
                    reaction.hasReacted
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-gray-100 border-gray-200'
                  )}
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <AnimatePresence>
          {hoveredMessage === message.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'absolute top-0 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1',
                isOwn ? 'left-0' : 'right-0'
              )}
            >
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Heart size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setReplyingTo(message)}
              >
                <Reply size={14} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Copy</DropdownMenuItem>
                  <DropdownMenuItem>Forward</DropdownMenuItem>
                  <DropdownMenuItem>Star</DropdownMenuItem>
                  {isOwn && <DropdownMenuItem>Edit</DropdownMenuItem>}
                  {isOwn && <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Group messages by day
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Thread Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{conversation.name}</h2>
              <p className="text-sm text-gray-500">
                {conversation.participants.length} participants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showVersionTracker ? "primary" : "ghost"}
              onClick={() => setShowVersionTracker(!showVersionTracker)}
            >
              <History size={16} />
            </Button>
            <Button
              size="sm"
              variant={showAIFeedback ? "primary" : "ghost"}
              onClick={() => setShowAIFeedback(!showAIFeedback)}
              title="AI Design Feedback"
            >
              <Brain size={16} />
            </Button>
            <Button
              size="sm"
              variant={showInsights ? "primary" : "ghost"}
              onClick={() => setShowInsights(!showInsights)}
              title="Conversation Insights"
            >
              <Sparkles size={16} />
            </Button>
            <Button
              size="sm"
              variant={showAutomation ? "primary" : "ghost"}
              onClick={() => setShowAutomation(!showAutomation)}
              title="Workflow Automation"
            >
              <Zap size={16} />
            </Button>
            <Button size="sm" variant="ghost">
              <Star size={16} />
            </Button>
            <Button size="sm" variant="ghost">
              <MoreHorizontal size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* File Version Tracker Panel */}
      {showVersionTracker && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <FileVersionTracker
            conversationId={conversation.id}
            onVersionSelect={(version) => {
              console.log('Version selected:', version);
              // In a real app, this could open the file or show detailed view
            }}
            onCompareVersions={(v1, v2) => {
              console.log('Comparing versions:', v1, v2);
              // In a real app, this could open a comparison view
            }}
          />
        </div>
      )}

      {/* AI Design Feedback Panel */}
      {showAIFeedback && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          {/* Find the first image attachment in recent messages */}
          {(() => {
            const recentImageMessage = messages
              .slice(-10)
              .reverse()
              .find(msg => msg.attachments?.some(att => att.isImage));

            const imageAttachment = recentImageMessage?.attachments?.find(att => att.isImage);

            if (imageAttachment) {
              return (
                <AIDesignFeedbackPanel
                  imageUrl={imageAttachment.url}
                  currentUser={currentUser}
                  onFeedbackGenerated={(feedback) => {
                    // Auto-populate the composer with AI feedback
                    console.log('AI Feedback generated:', feedback);
                  }}
                  onInsertSuggestion={(suggestion) => {
                    console.log('AI Suggestion inserted:', suggestion);
                  }}
                />
              );
            } else {
              return (
                <div className="text-center py-8">
                  <Brain size={32} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="font-medium text-gray-700 mb-2">AI Design Feedback</h3>
                  <p className="text-sm text-gray-600">Share an image to get AI-powered design analysis and feedback.</p>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Messages for the day */}
            <div className="space-y-4">
              {dayMessages.map((message, index) => {
                const isOwn = message.author.id === currentUser.id;
                const prevMessage = index > 0 ? dayMessages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.author.id !== message.author.id;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Start the conversation
              </h3>
              <p className="text-gray-500">
                Be the first to send a message in this conversation
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <SmartComposer
          conversation={conversation}
          currentUser={currentUser}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Enhanced Image Viewer Modal */}
      {showEnhancedViewer && selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEnhancedViewer(false);
                setSelectedAttachment(null);
              }}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </Button>
            <div className="h-full">
              <CollaborativeAnnotationTool
                imageUrl={selectedAttachment.url}
                annotations={selectedAttachment.annotations || []}
                currentUser={currentUser}
                conversationId={conversation.id}
                onAnnotationsChange={(annotations) => {
                  console.log('Collaborative annotations updated:', annotations);
                  // In a real app, this would update the attachment
                }}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Annotation Modal */}
      {showAnnotationTool && selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex">
          <div className="w-full h-full relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAnnotationTool(false);
                setSelectedAttachment(null);
              }}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20"
            >
              ✕
            </Button>
            <ImageAnnotationTool
              imageUrl={selectedAttachment.url}
              annotations={selectedAttachment.annotations || []}
              currentUser={currentUser}
              onAnnotationsChange={(annotations) => {
                // Update the attachment with new annotations
                console.log('Annotations updated:', annotations);
                // In a real app, this would update the message attachment
              }}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Conversation Insights Panel */}
      <ConversationInsightsPanel
        conversation={conversation}
        messages={messages}
        currentUser={currentUser}
        isVisible={showInsights}
        onToggleVisibility={() => setShowInsights(!showInsights)}
      />

      {/* Workflow Automation Panel */}
      <WorkflowAutomationPanel
        conversation={conversation}
        messages={messages}
        currentUser={currentUser}
        isVisible={showAutomation}
        onToggleVisibility={() => setShowAutomation(!showAutomation)}
      />
    </div>
  );
}

export default VisualMessageThread;