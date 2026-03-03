import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { MobileChatHeader } from './MobileChatHeader';
import { MobileMessageBubble, type MobileMessage } from './MobileMessageBubble';
import { MobileChatInput } from './MobileChatInput';

interface MobileChatProps {
  messages: MobileMessage[];
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
  const [replyingTo, setReplyingTo] = useState<MobileMessage | null>(null);
  const [isTyping, _setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <MobileChatHeader
        recipient={recipient}
        onBack={onBack}
        onCall={onCall}
        onVideoCall={onVideoCall}
        onSearch={onSearch}
        formatLastSeen={formatLastSeen}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center py-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex w-full animate-pulse', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <div className="max-w-[70%] space-y-1.5">
                  <div className={cn('rounded-2xl px-4 py-3', i % 2 === 0 ? 'bg-blue-200 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-gray-700')}>
                    <div className="h-3 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
                    {i === 1 && <div className="h-3 w-48 bg-gray-300 dark:bg-gray-600 rounded mt-1.5" />}
                  </div>
                  <div className="h-2 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MobileMessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender.id === currentUser.id}
                formatTime={formatTime}
              />
            ))}
          </>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MobileChatInput
        inputText={inputText}
        setInputText={setInputText}
        isRecording={isRecording}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        showAttachments={showAttachments}
        setShowAttachments={setShowAttachments}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onFileUpload={handleFileUpload}
        onImageUpload={handleImageUpload}
        inputRef={inputRef}
      />
    </div>
  );
};
