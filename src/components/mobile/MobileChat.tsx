import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image,
  Mic,
  MicOff,
  Camera,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: {
    type: 'image' | 'file' | 'audio';
    url: string;
    name?: string;
    size?: number;
  }[];
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
}

interface MobileChatProps {
  messages: Message[];
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  recipient: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
  onSendMessage: (content: string, type: 'text' | 'image' | 'file' | 'audio', attachments?: File[]) => void;
  onBack: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  isLoading?: boolean;
}

export const MobileChat: React.FC<MobileChatProps> = ({
  messages,
  currentUser,
  recipient,
  onSendMessage,
  onBack,
  onCall,
  onVideoCall,
  onSearch,
  isLoading = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim(), 'text');
      setInputText('');
      setReplyingTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
        onSendMessage('', 'audio', [file]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      onSendMessage('', 'file', fileArray);
    }
  };

  const handleImageUpload = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      onSendMessage('', 'image', fileArray);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const MessageStatus = ({ status }: { status: Message['status'] }) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '😢', '😮', '👏', '🙏'];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                {recipient.avatar ? (
                  <img
                    src={recipient.avatar}
                    alt={recipient.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium text-sm">
                    {recipient.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {recipient.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">{recipient.name}</h3>
              <p className="text-xs text-gray-500">
                {recipient.isOnline ? 'Online' :
                 recipient.lastSeen ? `Last seen ${formatLastSeen(recipient.lastSeen)}` : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {onCall && (
            <button
              onClick={onCall}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Video className="w-5 h-5 text-gray-600" />
            </button>
          )}

          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.sender.id === currentUser.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    'max-w-[80%] space-y-1',
                    isOwnMessage ? 'items-end' : 'items-start'
                  )}>
                    {/* Reply Context */}
                    {message.replyTo && (
                      <div className="bg-gray-100 rounded-lg p-2 mb-1 border-l-2 border-blue-500">
                        <p className="text-xs text-gray-600 font-medium">{message.replyTo.sender}</p>
                        <p className="text-xs text-gray-500 truncate">{message.replyTo.content}</p>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={cn(
                      'rounded-2xl px-4 py-2 break-words',
                      isOwnMessage
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                    )}>
                      {message.type === 'text' && (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}

                      {message.type === 'image' && message.attachments && (
                        <div className="space-y-2">
                          {message.content && (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {message.attachments.map((attachment, index) => (
                              <img
                                key={index}
                                src={attachment.url}
                                alt={attachment.name}
                                className="rounded-lg max-w-full h-auto"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {message.type === 'audio' && (
                        <div className="flex items-center space-x-2 py-1">
                          <button className="p-1 bg-white/20 rounded-full">
                            <Mic className="w-4 h-4" />
                          </button>
                          <div className="flex-1 bg-white/20 rounded-full h-1">
                            <div className="bg-white h-1 rounded-full w-1/3"></div>
                          </div>
                          <span className="text-xs">0:42</span>
                        </div>
                      )}
                    </div>

                    {/* Message Info */}
                    <div className={cn(
                      'flex items-center space-x-1 text-xs text-gray-500',
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    )}>
                      <span>{formatTime(message.timestamp)}</span>
                      {isOwnMessage && <MessageStatus status={message.status} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium">Replying to {replyingTo.sender.name}</p>
            <p className="text-sm text-gray-700 truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        {/* Attachment Options */}
        <AnimatePresence>
          {showAttachments && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-center space-x-4 mb-3 py-2"
            >
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Image className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs text-gray-600">Photo</span>
              </button>

              <button
                onClick={() => {/* Handle camera */}}
                className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs text-gray-600">Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs text-gray-600">File</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white border border-gray-200 rounded-lg p-3 mb-3 shadow-lg"
            >
              <div className="grid grid-cols-6 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputText(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="flex items-end space-x-2">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className={cn(
              'p-2 rounded-full transition-colors',
              showAttachments ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-gray-100 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />

            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={cn(
                'p-2 rounded-full transition-colors',
                isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files)}
      />
    </div>
  );
};