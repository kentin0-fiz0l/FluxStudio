/**
 * Mobile Messaging Interface
 * Touch-optimized messaging experience for mobile devices
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Search,
  Send,
  Plus,
  Mic,
  Camera,
  Image,
  Paperclip,
  Reply,
  Forward,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Message, Conversation } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface MobileMessagingInterfaceProps {
  conversation?: Conversation | null;
  onBack: () => void;
  onCall?: (conversationId: string) => void;
  onVideoCall?: (conversationId: string) => void;
  className?: string;
}

interface SwipeAction {
  type: 'reply' | 'forward' | 'delete' | 'star';
  icon: React.ElementType;
  color: string;
  threshold: number;
}

export const MobileMessagingInterface: React.FC<MobileMessagingInterfaceProps> = ({
  conversation,
  onBack,
  onCall,
  onVideoCall,
  className
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [_showComposer, _setShowComposer] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [isTyping, _setIsTyping] = useState(false);
  const [draggedMessage, setDraggedMessage] = useState<string | null>(null);
  const [swipeAction, setSwipeAction] = useState<SwipeAction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Mock messages for demonstration
  const mockMessages: Message[] = [
    {
      id: '1',
      content: 'Hey! How\'s the project coming along?',
      author: {
        id: 'user1',
        name: 'Sarah Chen',
        userType: 'client',
        avatar: undefined,
        isOnline: true
      },
      createdAt: new Date('2024-01-15T09:30:00'),
      updatedAt: new Date('2024-01-15T09:30:00'),
      type: 'text',
      status: 'read',
      metadata: { priority: 'medium' },
      conversationId: conversation?.id || 'conv1',
      mentions: [],
      isEdited: false
    },
    {
      id: '2',
      content: 'Making great progress! The design mockups are almost ready for review.',
      author: {
        id: 'user2',
        name: 'You',
        userType: 'designer',
        avatar: undefined,
        isOnline: true
      },
      createdAt: new Date('2024-01-15T09:35:00'),
      updatedAt: new Date('2024-01-15T09:35:00'),
      type: 'text',
      status: 'read',
      metadata: { priority: 'medium' },
      conversationId: conversation?.id || 'conv1',
      mentions: [],
      isEdited: false
    },
    {
      id: '3',
      content: 'Perfect! Can you share them when you\'re ready? I\'m excited to see what you\'ve created.',
      author: {
        id: 'user1',
        name: 'Sarah Chen',
        userType: 'client',
        avatar: undefined,
        isOnline: true
      },
      createdAt: new Date('2024-01-15T09:40:00'),
      updatedAt: new Date('2024-01-15T09:40:00'),
      type: 'text',
      status: 'read',
      metadata: { priority: 'medium' },
      conversationId: conversation?.id || 'conv1',
      mentions: [],
      isEdited: false
    }
  ];

  useEffect(() => {
    queueMicrotask(() => setMessages(mockMessages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Swipe actions configuration
  const swipeActions: SwipeAction[] = [
    { type: 'reply', icon: Reply, color: 'bg-blue-500', threshold: 80 },
    { type: 'forward', icon: Forward, color: 'bg-green-500', threshold: 80 },
    { type: 'star', icon: Star, color: 'bg-yellow-500', threshold: 80 },
    { type: 'delete', icon: Trash2, color: 'bg-red-500', threshold: 120 }
  ];

  // Handle message actions - must be defined before handleMessageSwipe
  const handleMessageAction = useCallback((messageId: string, action: string) => {
    switch (action) {
      case 'reply':
        // Handle reply
        console.log('Reply to message:', messageId);
        break;
      case 'forward':
        // Handle forward
        console.log('Forward message:', messageId);
        break;
      case 'star':
        // Handle star/bookmark
        console.log('Star message:', messageId);
        break;
      case 'delete':
        // Handle delete
        setMessages(prev => prev.filter(m => m.id !== messageId));
        break;
    }
  }, []);

  // Handle message swipe
  const handleMessageSwipe = useCallback((messageId: string, info: PanInfo) => {
    const swipeDistance = Math.abs(info.offset.x);
    const swipeDirection = info.offset.x > 0 ? 'right' : 'left';

    // Find appropriate action based on swipe distance
    const action = swipeActions.find(a => swipeDistance >= a.threshold);

    if (action && swipeDirection === 'right') {
      setSwipeAction(action);

      // Execute action after a brief delay
      setTimeout(() => {
        handleMessageAction(messageId, action.type);
        setSwipeAction(null);
        setDraggedMessage(null);
      }, 200);
    } else {
      setDraggedMessage(null);
      setSwipeAction(null);
    }
  }, [handleMessageAction, swipeActions]);

  // Long press handler for message options
  const handleLongPress = (messageId: string) => {
    setSelectedMessage(messageId);
    setShowMessageActions(true);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isMyMessage = (message: Message) => {
    return message.author.name === 'You';
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col bg-white', className)}>
      {/* Mobile header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={conversation.participants[0]?.avatar} />
                <AvatarFallback>
                  {conversation.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {conversation.participants[0]?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{conversation.name}</h2>
              <p className="text-sm text-gray-500">
                {isTyping ? 'typing...' : 'last seen 2m ago'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCall && (
            <Button variant="ghost" size="sm" onClick={() => onCall(conversation.id)}>
              <Phone className="w-5 h-5" />
            </Button>
          )}
          {onVideoCall && (
            <Button variant="ghost" size="sm" onClick={() => onVideoCall(conversation.id)}>
              <Video className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            drag="x"
            dragConstraints={{ left: -200, right: 200 }}
            dragElastic={0.2}
            onDragStart={() => setDraggedMessage(message.id)}
            onDragEnd={(_, info) => handleMessageSwipe(message.id, info)}
            className={cn(
              'flex',
              isMyMessage(message) ? 'justify-end' : 'justify-start'
            )}
          >
            <div className="relative max-w-xs lg:max-w-md">
              {/* Swipe action indicator */}
              <AnimatePresence>
                {draggedMessage === message.id && swipeAction && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      'absolute inset-y-0 left-full ml-2 w-12 h-12 rounded-full flex items-center justify-center',
                      swipeAction.color
                    )}
                  >
                    <swipeAction.icon className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                onTapStart={() => handleLongPress(message.id)}
                className={cn(
                  'rounded-2xl px-4 py-2 relative group cursor-pointer',
                  isMyMessage(message)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {!isMyMessage(message) && (
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {message.author.name}
                  </p>
                )}

                <p className="text-sm">{message.content}</p>

                <div className={cn(
                  'flex items-center justify-end gap-1 mt-1',
                  isMyMessage(message) ? 'text-blue-100' : 'text-gray-500'
                )}>
                  <span className="text-xs">{formatTime(message.createdAt)}</span>
                  {isMyMessage(message) && (
                    <div className="flex">
                      {message.status === 'read' ? (
                        <div className="w-3 h-3 text-blue-200">✓✓</div>
                      ) : message.status === 'delivered' ? (
                        <div className="w-3 h-3 text-blue-200">✓</div>
                      ) : (
                        <div className="w-3 h-3 text-blue-200">○</div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Mobile composer */}
      <div ref={composerRef} className="border-t border-gray-200 bg-white">
        <MobileComposer
          onSend={(content, options) => {
            const newMessage: Message = {
              id: `msg-${Date.now()}`,
              content,
              author: {
                id: 'current-user',
                name: 'You',
                userType: 'designer',
                isOnline: true
              },
              createdAt: new Date(),
              updatedAt: new Date(),
              type: options.type,
              status: 'sending',
              metadata: { priority: options.priority },
              conversationId: conversation.id,
              mentions: options.mentions || [],
              isEdited: false
            };

            setMessages(prev => [...prev, newMessage]);

            // Simulate message delivery
            setTimeout(() => {
              setMessages(prev => prev.map(m =>
                m.id === newMessage.id ? { ...m, status: 'delivered' } : m
              ));
            }, 1000);

            return Promise.resolve();
          }}
          conversation={conversation}
        />
      </div>

      {/* Message actions modal */}
      <AnimatePresence>
        {showMessageActions && selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
            onClick={() => setShowMessageActions(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full bg-white rounded-t-xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />

              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => {
                    handleMessageAction(selectedMessage, 'reply');
                    setShowMessageActions(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Reply className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Reply</span>
                </button>

                <button
                  onClick={() => {
                    handleMessageAction(selectedMessage, 'forward');
                    setShowMessageActions(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Forward className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Forward</span>
                </button>

                <button
                  onClick={() => {
                    handleMessageAction(selectedMessage, 'star');
                    setShowMessageActions(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3"
                >
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-700">Star</span>
                </button>

                <button
                  onClick={() => {
                    handleMessageAction(selectedMessage, 'delete');
                    setShowMessageActions(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-700">Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mobile-optimized composer component
interface MobileComposerProps {
  conversation: Conversation;
  onSend: (content: string, options: any) => Promise<void>;
}

const MobileComposer: React.FC<MobileComposerProps> = ({ conversation: _conversation, onSend }) => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;

    await onSend(content, {
      type: 'text',
      priority: 'medium'
    });

    setContent('');
    setIsExpanded(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Attachment options */}
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex justify-center gap-6 pb-4"
          >
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-gray-600">Camera</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Image className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600">Photo</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-gray-600">File</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAttachments(!showAttachments)}
          className="flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsExpanded(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className={cn(
              'w-full resize-none border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              isExpanded ? 'min-h-[80px]' : 'h-12'
            )}
            rows={isExpanded ? 3 : 1}
          />

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {content.trim() ? (
          <Button onClick={handleSend} size="sm" className="rounded-full w-12 h-12 p-0">
            <Send className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={() => setIsRecording(true)}
            onMouseUp={() => setIsRecording(false)}
            onMouseLeave={() => setIsRecording(false)}
            className={cn(
              'rounded-full w-12 h-12 p-0',
              isRecording && 'bg-red-500 text-white'
            )}
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center gap-2 text-red-600"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};