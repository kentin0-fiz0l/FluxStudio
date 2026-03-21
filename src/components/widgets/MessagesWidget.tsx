import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessaging } from '../../hooks/messaging/useMessaging';
import { useAuth } from '@/store/slices/authSlice';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Message } from '../../types/messaging';
import { MessageBubble } from './MessageBubble';
import { ConversationItem } from './ConversationItem';

export function MessagesWidget(props: WidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationMessages,
    sendMessage,
    setActiveConversation,
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
            onClick={() => navigate('/messages')}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowRight className="h-3 w-3 mr-1" aria-hidden="true" />
            Full View
          </Button>
          <MessageSquare className="h-4 w-4 text-green-400" aria-hidden="true" />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
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
                    <RefreshCw className="h-6 w-6 animate-spin text-white/50" aria-hidden="true" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-gray-500 mb-3" aria-hidden="true" />
                    <p className="text-gray-400 text-sm">No conversations yet</p>
                    <Button
                      size="sm"
                      className="mt-3 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
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
                    <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
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
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Video className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
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
                    onReply={(_messageId) => {
                      // Handle reply functionality
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
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
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
                    <Smile className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-500 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Choose from existing conversations or start a new one
                </p>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
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
