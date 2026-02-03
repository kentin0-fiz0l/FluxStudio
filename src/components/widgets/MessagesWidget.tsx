import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../contexts/AuthContext';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { WidgetProps } from './types';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Paperclip,
  Smile,
  Phone,
  Video,
  Info,
  VolumeX,
  Pin,
  RefreshCw,
  Clock,
  Check,
  CheckCheck,
  Edit,
  Trash2,
  Reply,
  ArrowRight,
  Image,
  File,
  Users,
  Hash,
  Globe,
} from 'lucide-react';
import { Message, Conversation } from '../../types/messaging';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

function MessageBubble({ message, isOwn, showAvatar, onEdit, onDelete, onReply }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid time';
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-white/20 text-white text-xs">
            {message.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && !isOwn && <div className="w-8" />}

      {/* Message content */}
      <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Author name for non-own messages */}
        {!isOwn && showAvatar && (
          <div className="text-xs text-gray-400 mb-1 px-3">
            {message.author.name}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 relative ${
            isOwn
              ? 'bg-blue-500 text-white ml-auto'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className={`rounded-lg p-3 border ${
                    isOwn ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {attachment.isImage ? (
                      <Image className="h-4 w-4 text-white/70" />
                    ) : (
                      <File className="h-4 w-4 text-white/70" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-white/70">
                        {(attachment.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time and status */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${
            isOwn ? 'text-white/70 justify-end' : 'text-gray-400'
          }`}>
            <span>{formatTime(message.createdAt)}</span>
            {message.isEdited && <span>(edited)</span>}
            {isOwn && getStatusIcon()}
          </div>

          {/* Quick actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute top-0 ${
                  isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                } flex gap-1 bg-slate-800 border border-white/20 rounded-lg p-1`}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReply?.(message.id)}
                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Reply className="h-3 w-3" />
                </Button>
                {isOwn && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit?.(message.id)}
                      className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete?.(message.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const getConversationIcon = () => {
    switch (conversation.type) {
      case 'direct':
        return <Users className="h-4 w-4" />;
      case 'project':
        return <Hash className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'broadcast':
        return <Globe className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const diffMs = now.getTime() - dateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return `${Math.floor(diffMs / (1000 * 60))}m`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return dateObj.toLocaleDateString();
    }
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      className={`p-3 cursor-pointer border-l-2 transition-colors ${
        isActive
          ? 'bg-white/10 border-l-blue-500'
          : 'border-l-transparent hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Conversation icon/avatar */}
        <div className={`p-2 rounded-lg ${
          isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/70'
        }`}>
          {getConversationIcon()}
        </div>

        {/* Conversation details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-white text-sm truncate">
              {conversation.name}
            </h4>
            <div className="flex items-center gap-2">
              {conversation.metadata.isPinned && (
                <Pin className="h-3 w-3 text-yellow-400" />
              )}
              {conversation.metadata.isMuted && (
                <VolumeX className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-xs text-gray-400">
                {formatLastActivity(conversation.lastActivity)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400 truncate max-w-[180px]">
              {conversation.lastMessage?.content || 'No messages yet'}
            </p>
            {conversation.unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function MessagesWidget(_props: WidgetProps) {
  useNavigate(); // Reserved for navigation features
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationMessages,
    sendMessage,
    setActiveConversation,
    editMessage,
    deleteMessage,
    setTyping,
    isLoading,
  } = useMessaging();

  const [messageText, setMessageText] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);
  const [, setEditingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Handle typing indicators
  useEffect(() => {
    if (activeConversation && messageText.trim()) {
      setTyping(activeConversation.id, true);
    }
  }, [messageText, activeConversation, setTyping]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation) return;

    try {
      await sendMessage(activeConversation.id, {
        content: messageText.trim(),
        type: 'text',
      });
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const shouldShowAvatar = (message: Message, index: number): boolean => {
    if (index === 0) return true;
    const prevMessage = conversationMessages[index - 1];
    return prevMessage.author.id !== message.author.id;
  };

  if (!user) return null;

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Messages',
        description: 'Team communication and project discussions',
      }}
      headerAction={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('Opening messaging sidepanel...')}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Full View
          </Button>
          <MessageSquare className="h-4 w-4 text-green-400" />
        </div>
      }
      className="flex flex-col"
    >
      <div className="flex-1 flex min-h-[400px]">
        {/* Conversation List */}
        <AnimatePresence mode="wait">
          {showConversationList && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-64 border-r border-white/10 flex flex-col"
            >
              {/* Search */}
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 h-8"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-white/50" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-gray-500 mb-3" />
                    <p className="text-gray-400 text-sm">No conversations yet</p>
                    <Button
                      size="sm"
                      className="mt-3 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Chat
                    </Button>
                  </div>
                ) : (
                  conversations.map(conversation => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={activeConversation?.id === conversation.id}
                      onClick={() => {
                        setActiveConversation(conversation.id);
                        if (window.innerWidth < 768) {
                          setShowConversationList(false);
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversationList(true)}
                    className="md:hidden h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <div>
                    <h3 className="font-medium text-white text-sm">
                      {activeConversation.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {activeConversation.participants.length} participants
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationMessages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.author.id === user.id}
                    showAvatar={shouldShowAvatar(message, index)}
                    onEdit={(messageId) => setEditingMessageId(messageId)}
                    onDelete={deleteMessage}
                    onReply={(messageId) => {
                      // Handle reply functionality
                      console.log('Reply to message:', messageId);
                    }}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-white/10">
                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        // Auto-resize
                        const textarea = e.target;
                        textarea.style.height = '40px';
                        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none min-h-[40px] max-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={1}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Choose from existing conversations or start a new one
                </p>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}