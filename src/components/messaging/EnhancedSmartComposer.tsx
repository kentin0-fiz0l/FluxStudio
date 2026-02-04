/**
 * Enhanced SmartComposer Component - Advanced Message Creation with User Search
 * Integrates UserSearch for improved @ mentions and recipient selection
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  AtSign,
  X,
  FileText,
  Video,
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Message, MessageUser, Conversation, Priority, MessageType } from '../../types/messaging';
import { UserSearch, UserSearchResult } from '../search/UserSearch';
import { cn } from '../../lib/utils';

interface EnhancedSmartComposerProps {
  conversation?: Conversation;
  replyingTo?: Message;
  onSend: (content: string, options: SendMessageOptions) => Promise<void>;
  onCancelReply?: () => void;
  className?: string;
  placeholder?: string;
  participants?: MessageUser[];
}

interface SendMessageOptions {
  type: MessageType;
  priority: Priority;
  attachments?: File[];
  replyTo?: string;
  mentions?: string[];
  scheduledFor?: Date;
  projectId?: string;
}

interface MentionSuggestion extends UserSearchResult {
  isParticipant: boolean;
  lastMessageTime?: Date;
}

export const EnhancedSmartComposer: React.FC<EnhancedSmartComposerProps> = ({
  conversation,
  replyingTo,
  onSend,
  onCancelReply,
  className,
  placeholder = 'Type your message...',
  participants = []
}) => {
  // Core state
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [priority, setPriority] = useState<Priority>('medium');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Enhanced mention functionality
  const [mentions, setMentions] = useState<MentionSuggestion[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Scheduling and automation
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);

  // Smart features
  const [_showRecipientSelector, _setShowRecipientSelector] = useState(false);
  const [additionalRecipients, setAdditionalRecipients] = useState<UserSearchResult[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced mention detection and suggestions
  const detectMention = (text: string, position: number) => {
    const beforeCursor = text.slice(0, position);
    const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentionPicker(true);
      return query;
    }

    setShowMentionPicker(false);
    setMentionQuery('');
    return null;
  };

  // Smart recipient suggestions based on conversation context
  const getSmartRecipientSuggestions = useMemo(() => {
    const suggestions: MentionSuggestion[] = [];

    // Add current conversation participants
    participants.forEach(participant => {
      suggestions.push({
        ...participant,
        id: participant.id,
        name: participant.name,
        email: `${participant.name.toLowerCase().replace(' ', '.')}@fluxstudio.com`,
        isParticipant: true,
        role: participant.userType === 'client' ? 'Client' : 'Designer',
        isOnline: participant.isOnline
      });
    });

    // Filter by mention query if active
    if (mentionQuery) {
      return suggestions.filter(user =>
        user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(mentionQuery.toLowerCase())
      );
    }

    return suggestions;
  }, [participants, mentionQuery]);

  // Handle content changes and mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const position = e.target.selectionStart;

    setContent(newContent);
    setCursorPosition(position);

    // Detect mentions
    detectMention(newContent, position);

    // Auto-expand if needed
    if (newContent.length > 50 && !isExpanded) {
      setIsExpanded(true);
    }
  };

  // Insert mention into content
  const insertMention = (user: MentionSuggestion) => {
    const beforeCursor = content.slice(0, cursorPosition);
    const afterCursor = content.slice(cursorPosition);

    // Remove the partial @ mention and replace with full mention
    const beforeMention = beforeCursor.replace(/@[a-zA-Z0-9_]*$/, '');
    const mentionText = `@${user.name} `;
    const newContent = beforeMention + mentionText + afterCursor;

    setContent(newContent);
    setMentions(prev => [...prev.filter(m => m.id !== user.id), user]);
    setShowMentionPicker(false);

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeMention.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Enhanced send functionality
  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;

    setIsSending(true);

    try {
      const options: SendMessageOptions = {
        type: messageType,
        priority,
        attachments,
        replyTo: replyingTo?.id,
        mentions: mentions.map(m => m.id),
        scheduledFor: scheduledFor || undefined,
        projectId: conversation?.projectId
      };

      await onSend(content, options);

      // Reset form
      setContent('');
      setAttachments([]);
      setMentions([]);
      setAdditionalRecipients([]);
      setScheduledFor(null);
      setIsExpanded(false);

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);

    // Auto-detect message type based on file
    if (files.some(f => f.type.startsWith('image/'))) {
      setMessageType('image');
    } else if (files.some(f => f.type.startsWith('video/'))) {
      setMessageType('video');
    } else {
      setMessageType('file');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    if (attachments.length === 1) {
      setMessageType('text');
    }
  };

  // Smart suggestions based on conversation context
  useEffect(() => {
    if (conversation && content.length > 10) {
      // Generate smart suggestions based on conversation context
      const suggestions = [
        'Let me review this and get back to you',
        'Thanks for the feedback, I\'ll implement these changes',
        'Could you clarify what you mean by...',
        'I\'ve updated the design based on your comments',
        'When would be a good time to discuss this?'
      ];
      setSmartSuggestions(suggestions.slice(0, 3));
    } else {
      setSmartSuggestions([]);
    }
  }, [content, conversation]);

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

        {/* Scheduled message indicator */}
        {scheduledFor && (
          <div className="p-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                Scheduled for {scheduledFor.toLocaleDateString()} at {scheduledFor.toLocaleTimeString()}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setScheduledFor(null)}>
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Main composition area */}
        <div className="p-4 space-y-3">
          {/* Recipient selector for new conversations */}
          {!conversation && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <UserSearch
                placeholder="Search for recipients..."
                multiple={true}
                selectedUsers={additionalRecipients}
                onUserSelect={(user) => {
                  if (!additionalRecipients.find(u => u.id === user.id)) {
                    setAdditionalRecipients([...additionalRecipients, user]);
                  }
                }}
                onUserRemove={(userId) => {
                  setAdditionalRecipients(additionalRecipients.filter(u => u.id !== userId));
                }}
                onUsersChange={setAdditionalRecipients}
                allowInviteByEmail={true}
                theme="light"
              />
            </div>
          )}

          {/* Message input with mention support */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder={placeholder}
              className={cn(
                'min-h-[80px] resize-none border-0 focus:ring-0 focus-visible:ring-0 p-0',
                isExpanded && 'min-h-[120px]'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Mention picker overlay */}
            <AnimatePresence>
              {showMentionPicker && getSmartRecipientSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto z-50"
                >
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Mention someone</div>
                    {getSmartRecipientSuggestions.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {user.role}
                            {user.isParticipant && (
                              <Badge variant="secondary" className="text-xs">Participant</Badge>
                            )}
                            {user.isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Smart suggestions */}
          {smartSuggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Quick replies
              </div>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setContent(suggestion)}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <AttachmentPreview
                  key={index}
                  file={file}
                  onRemove={() => removeAttachment(index)}
                />
              ))}
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* File attachment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>

              {/* Image upload */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add image</TooltipContent>
              </Tooltip>

              {/* Voice recording */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-8 w-8 p-0", isRecording && "text-red-500")}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice message</TooltipContent>
              </Tooltip>

              {/* Mention button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const newContent = content + '@';
                      setContent(newContent);
                      setCursorPosition(newContent.length);
                      detectMention(newContent, newContent.length);
                      textareaRef.current?.focus();
                    }}
                  >
                    <AtSign className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mention someone</TooltipContent>
              </Tooltip>

              {/* Schedule message */}
              <Popover open={showScheduler} onOpenChange={setShowScheduler}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-8 w-8 p-0", scheduledFor && "text-orange-500")}
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Schedule message</TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <MessageScheduler
                    scheduledFor={scheduledFor}
                    onSchedule={setScheduledFor}
                    onClose={() => setShowScheduler(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              {/* Priority selector */}
              <Select value={priority} onValueChange={(value: Priority) => setPriority(value)}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Send button */}
              <Button
                onClick={handleSend}
                disabled={(!content.trim() && attachments.length === 0) || isSending}
                className="h-8 px-4"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </TooltipProvider>
  );
};

// Attachment preview component
const AttachmentPreview: React.FC<{ file: File; onRemove: () => void }> = ({
  file,
  onRemove
}) => {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  return (
    <div className="relative group">
      <Card className="w-16 h-16 overflow-hidden">
        <CardContent className="p-0 w-full h-full">
          {isImage ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : isVideo ? (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Video size={20} className="text-gray-400" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <FileText size={20} className="text-gray-400" />
            </div>
          )}
        </CardContent>
      </Card>
      <Button
        size="sm"
        variant="danger"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X size={10} />
      </Button>
    </div>
  );
};

// Message scheduler component
const MessageScheduler: React.FC<{
  scheduledFor: Date | null;
  onSchedule: (date: Date | null) => void;
  onClose: () => void;
}> = ({ scheduledFor, onSchedule, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(() =>
    scheduledFor || new Date(Date.now() + 60 * 60 * 1000) // Default to 1 hour from now
  );

  const quickOptions = [
    { label: 'In 1 hour', offset: 60 * 60 * 1000 },
    { label: 'Tomorrow 9 AM', offset: null, time: { hour: 9, minute: 0 } },
    { label: 'Next Monday 9 AM', offset: null, time: { weekday: 1, hour: 9, minute: 0 } },
  ];

  const handleQuickOption = (option: typeof quickOptions[0]) => {
    const now = new Date();
    let date: Date;

    if (option.offset) {
      date = new Date(now.getTime() + option.offset);
    } else if (option.time) {
      if ('weekday' in option.time) {
        // Next Monday
        date = new Date(now);
        const days = (1 + 7 - now.getDay()) % 7 || 7;
        date.setDate(now.getDate() + days);
        date.setHours(option.time.hour, option.time.minute, 0, 0);
      } else {
        // Tomorrow
        date = new Date(now);
        date.setDate(now.getDate() + 1);
        date.setHours(option.time.hour, option.time.minute, 0, 0);
      }
    } else {
      date = now;
    }

    setSelectedDate(date);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-900 mb-2">Schedule Message</h3>
        <p className="text-sm text-gray-600">Choose when to send this message</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Quick options</label>
        <div className="grid grid-cols-1 gap-2">
          {quickOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleQuickOption(option)}
              className="justify-start"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Custom date & time</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(selectedDate);
              newDate.setFullYear(
                parseInt(e.target.value.split('-')[0]),
                parseInt(e.target.value.split('-')[1]) - 1,
                parseInt(e.target.value.split('-')[2])
              );
              setSelectedDate(newDate);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="time"
            value={`${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number);
              const newDate = new Date(selectedDate);
              newDate.setHours(hours, minutes);
              setSelectedDate(newDate);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => onSchedule(null)}>
          Clear Schedule
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            onSchedule(selectedDate);
            onClose();
          }}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
};