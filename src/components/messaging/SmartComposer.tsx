/**
 * SmartComposer Component - Context-Aware Message Creation
 * Intelligent message input with templates, file uploads, and creative workflow integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Smile,
  AtSign,
  Hash,
  Calendar,
  Zap,
  X,
  Plus,
  FileText,
  Camera,
  Video,
  Volume2,
  Palette,
  CheckCircle,
  AlertCircle,
  Clock,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Message, MessageUser, Conversation, Priority, MessageType } from '../../types/messaging';
import { useMessaging } from '../../hooks/useMessaging';
import { contextDetectionService, ContextAnalysis, MessageIntent } from '../../services/contextDetectionService';
import { VisualFeedbackTemplates } from './VisualFeedbackTemplates';
import { realtimeCollaborationService } from '../../services/realtimeCollaborationService';
import { cn } from '../../lib/utils';

interface SmartComposerProps {
  conversation: Conversation;
  currentUser?: MessageUser;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  onSendMessage?: (content: string, attachments?: File[]) => Promise<void>;
  aiSuggestions?: boolean;
  className?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: MessageType;
  priority: Priority;
  icon: React.ElementType;
  category: 'feedback' | 'approval' | 'question' | 'update';
}

const messageTemplates: MessageTemplate[] = [
  {
    id: 'request-feedback',
    name: 'Request Feedback',
    content: 'Hi! I\'d love to get your thoughts on this design. What do you think about the overall direction?',
    type: 'text',
    priority: 'medium',
    icon: Palette,
    category: 'feedback'
  },
  {
    id: 'approval-request',
    name: 'Approval Request',
    content: 'Please review this design for final approval. I believe it meets all the requirements we discussed.',
    type: 'approval',
    priority: 'high',
    icon: CheckCircle,
    category: 'approval'
  },
  {
    id: 'quick-question',
    name: 'Quick Question',
    content: 'Quick question: ',
    type: 'text',
    priority: 'medium',
    icon: AlertCircle,
    category: 'question'
  },
  {
    id: 'project-update',
    name: 'Project Update',
    content: 'Here\'s the latest update on the project: ',
    type: 'milestone',
    priority: 'medium',
    icon: Star,
    category: 'update'
  },
  {
    id: 'schedule-meeting',
    name: 'Schedule Meeting',
    content: 'Could we schedule a meeting to discuss this further? I have some ideas I\'d like to explore.',
    type: 'consultation',
    priority: 'medium',
    icon: Calendar,
    category: 'question'
  }
];

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700', icon: Clock },
  medium: { label: 'Normal', color: 'bg-blue-100 text-blue-700', icon: Zap },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  critical: { label: 'Urgent', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

export function SmartComposer({
  conversation,
  currentUser,
  replyingTo,
  onCancelReply,
  onSendMessage,
  aiSuggestions = false,
  className
}: SmartComposerProps) {
  const { sendMessage } = useMessaging();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageIntent, setMessageIntent] = useState<MessageIntent | null>(null);
  const [contextAnalysis, setContextAnalysis] = useState<ContextAnalysis | null>(null);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [showFeedbackTemplates, setShowFeedbackTemplates] = useState(false);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Handle typing indicators
  useEffect(() => {
    if (content.length > 0) {
      // Send typing start indicator
      realtimeCollaborationService.sendTypingIndicator(conversation.id, true);

      // Clear existing timer
      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      // Set new timer to stop typing indicator
      const newTimer = setTimeout(() => {
        realtimeCollaborationService.sendTypingIndicator(conversation.id, false);
      }, 1000);
      setTypingTimer(newTimer);
    } else {
      // Send typing stop indicator immediately when content is empty
      realtimeCollaborationService.sendTypingIndicator(conversation.id, false);
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
    }

    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
    };
  }, [content, conversation.id]);

  // Smart context analysis when content changes
  useEffect(() => {
    if (content.length > 10) {
      const intent = contextDetectionService.analyzeMessageIntent(content);
      setMessageIntent(intent);

      // Show smart suggestions if confidence is high
      if (intent.confidence > 0.6 && intent.intent !== 'general') {
        setShowSmartSuggestions(true);
      } else {
        setShowSmartSuggestions(false);
      }

      // Auto-adjust priority based on detected intent
      if (intent.intent === 'urgent' && priority !== 'high') {
        setPriority('high');
      } else if (intent.intent === 'approval' && priority === 'medium') {
        setPriority('high');
      }
    } else {
      setMessageIntent(null);
      setShowSmartSuggestions(false);
    }
  }, [content, priority]);

  // Smart suggestions based on conversation context
  const getSmartSuggestions = () => {
    const suggestions = [];

    // If it's a project conversation, suggest project-related templates
    if (conversation.type === 'project') {
      suggestions.push(
        messageTemplates.find(t => t.id === 'project-update'),
        messageTemplates.find(t => t.id === 'approval-request')
      );
    }

    // If it's a direct message, suggest feedback templates
    if (conversation.type === 'direct') {
      suggestions.push(
        messageTemplates.find(t => t.id === 'request-feedback'),
        messageTemplates.find(t => t.id === 'quick-question')
      );
    }

    return suggestions.filter(Boolean) as MessageTemplate[];
  };

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;

    setIsSending(true);

    try {
      // Use external onSendMessage prop if provided, otherwise use internal sendMessage
      if (onSendMessage) {
        await onSendMessage(content.trim(), attachments);
      } else {
        await sendMessage(conversation.id, {
          content: content.trim(),
          type: 'text',
          priority,
          attachments,
          replyTo: replyingTo?.id,
          mentions
        });
      }

      // Reset form
      setContent('');
      setAttachments([]);
      setMentions([]);
      setPriority('medium');
      setIsExpanded(false);
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - attachments.length);
    setAttachments(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const insertTemplate = (template: MessageTemplate) => {
    setContent(template.content);
    setPriority(template.priority);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const FilePreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    return (
      <div className="relative group">
        <Card className="w-20 h-20 overflow-hidden">
          <CardContent className="p-0 h-full">
            {isImage ? (
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : isVideo ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Video size={24} className="text-gray-400" />
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <FileText size={24} className="text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>
        <Button
          size="sm"
          variant="destructive"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X size={12} />
        </Button>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn('bg-white border border-gray-200 rounded-lg', className)}>
        {/* Reply indicator */}
        {replyingTo && (
          <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded-full" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Replying to {replyingTo.author.name}
                </p>
                <p className="text-xs text-blue-700 truncate max-w-md">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onCancelReply}>
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Smart suggestions */}
        {!replyingTo && content.length === 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 bg-gray-50 border-b border-gray-200"
            >
              <p className="text-xs text-gray-600 mb-2">Quick suggestions:</p>
              <div className="flex gap-2 flex-wrap">
                {getSmartSuggestions().map(template => {
                  const Icon = template.icon;
                  return (
                    <Button
                      key={template.id}
                      size="sm"
                      variant="outline"
                      onClick={() => insertTemplate(template)}
                      className="text-xs h-7"
                    >
                      <Icon size={12} className="mr-1" />
                      {template.name}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Context-aware smart suggestions */}
        {showSmartSuggestions && messageIntent && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 bg-blue-50 border-b border-blue-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-800">
                  Smart Detection: {messageIntent.intent} message detected
                </p>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(messageIntent.confidence * 100)}% confidence
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {messageIntent.intent === 'approval' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContent(content + '\n\nPlease let me know if this meets your expectations and if you\'re ready to approve.');
                      setPriority('high');
                    }}
                    className="text-xs h-7 border-blue-300 hover:bg-blue-100"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    Add approval request
                  </Button>
                )}
                {messageIntent.intent === 'feedback' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContent(content + '\n\nI\'d especially appreciate your thoughts on the overall direction and any specific areas for improvement.');
                    }}
                    className="text-xs h-7 border-blue-300 hover:bg-blue-100"
                  >
                    <Palette size={12} className="mr-1" />
                    Add feedback details
                  </Button>
                )}
                {messageIntent.intent === 'urgent' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContent(content + '\n\nPlease respond as soon as possible - this is time-sensitive.');
                      setPriority('critical');
                    }}
                    className="text-xs h-7 border-red-300 hover:bg-red-100"
                  >
                    <AlertCircle size={12} className="mr-1" />
                    Mark as urgent
                  </Button>
                )}
                {messageIntent.intent === 'meeting' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContent(content + '\n\nI\'m flexible with timing - what works best for your schedule?');
                    }}
                    className="text-xs h-7 border-blue-300 hover:bg-blue-100"
                  >
                    <Calendar size={12} className="mr-1" />
                    Add scheduling flexibility
                  </Button>
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs text-blue-600">
                  Keywords detected: {messageIntent.keywords.join(', ')}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="p-3 border-b border-gray-200">
            <div className="flex gap-2 flex-wrap">
              {attachments.map((file, index) => (
                <FilePreview
                  key={index}
                  file={file}
                  onRemove={() => removeAttachment(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main input area */}
        <div className="p-3">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
              placeholder={
                replyingTo
                  ? 'Write a reply...'
                  : conversation.type === 'project'
                  ? 'Share your design thoughts...'
                  : 'Type a message...'
              }
              className="flex-1 min-h-[40px] max-h-32 resize-none border-0 p-0 focus:ring-0 focus:border-0"
              rows={isExpanded ? 3 : 1}
            />

            <div className="flex items-end gap-1">
              <Button
                size="sm"
                onClick={handleSend}
                disabled={(!content.trim() && attachments.length === 0) || isSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <Clock size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded toolbar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 p-3"
            >
              <div className="flex items-center justify-between">
                {/* Left side - Attachments and tools */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach files</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <ImageIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload image</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsRecording(!isRecording)}
                        className={isRecording ? 'text-red-600' : ''}
                      >
                        <Mic size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Voice message</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFeedbackTemplates(true)}
                      >
                        <Star size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Feedback Templates</TooltipContent>
                  </Tooltip>

                  <Popover open={showTemplates} onOpenChange={setShowTemplates}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Zap size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium mb-2">Message Templates</h4>
                        {messageTemplates.map(template => {
                          const Icon = template.icon;
                          return (
                            <Button
                              key={template.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => insertTemplate(template)}
                              className="w-full justify-start h-auto p-2"
                            >
                              <Icon size={16} className="mr-2 flex-shrink-0" />
                              <div className="text-left">
                                <p className="font-medium">{template.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {template.content}
                                </p>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Right side - Priority and actions */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="text-xs">
                        <div className={cn(
                          'w-2 h-2 rounded-full mr-1',
                          priorityConfig[priority].color.split(' ')[0]
                        )} />
                        {priorityConfig[priority].label}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="space-y-1">
                        {(Object.entries(priorityConfig) as [Priority, typeof priorityConfig[Priority]][]).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <Button
                              key={key}
                              variant={priority === key ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setPriority(key)}
                              className="w-full justify-start"
                            >
                              <Icon size={14} className="mr-2" />
                              {config.label}
                            </Button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* Visual Feedback Templates Modal */}
        <VisualFeedbackTemplates
          isOpen={showFeedbackTemplates}
          onClose={() => setShowFeedbackTemplates(false)}
          onSubmitFeedback={(feedback) => {
            // Convert feedback to a structured message
            const feedbackMessage = `**${feedback.templateName} Feedback**

**Overall Rating:** ${feedback.overallRating}/5 stars
**Weighted Score:** ${feedback.weightedScore.toFixed(1)}/5.0

**Detailed Ratings:**
${Object.entries(feedback.criteriaRatings).map(([criteria, rating]) => `• ${criteria}: ${rating}/5`).join('\n')}

${feedback.customFieldValues && Object.keys(feedback.customFieldValues).length > 0 ?
`**Additional Information:**
${Object.entries(feedback.customFieldValues).map(([field, value]) => `• ${field}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n')}

` : ''}
${feedback.additionalComments ? `**Comments:**
${feedback.additionalComments}` : ''}`;

            setContent(feedbackMessage);
            setPriority(feedback.overallRating >= 4 ? 'medium' : feedback.overallRating >= 2 ? 'high' : 'critical');
            setShowFeedbackTemplates(false);
            textareaRef.current?.focus();
          }}
          currentUser={currentUser}
          attachmentUrl={attachments.length > 0 ? URL.createObjectURL(attachments[0]) : undefined}
        />
      </div>
    </TooltipProvider>
  );
}

export default SmartComposer;