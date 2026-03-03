import React, { useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MobileAttachmentPicker } from './MobileAttachmentPicker';
import { motion } from 'framer-motion';
import type { MobileMessage } from './MobileMessageBubble';

interface MobileChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isRecording: boolean;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  showAttachments: boolean;
  setShowAttachments: (show: boolean) => void;
  replyingTo: MobileMessage | null;
  setReplyingTo: (msg: MobileMessage | null) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileUpload: (files: FileList | null) => void;
  onImageUpload: (files: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '😢', '😮', '👏', '🙏'];

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  inputText,
  setInputText,
  isRecording,
  showEmojiPicker,
  setShowEmojiPicker,
  showAttachments,
  setShowAttachments,
  replyingTo,
  setReplyingTo,
  onSend,
  onKeyPress,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onImageUpload,
  inputRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Replying to {replyingTo.sender.name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        {/* Attachment Options */}
        <AnimatePresence>
          {showAttachments && (
            <MobileAttachmentPicker
              onImageClick={() => imageInputRef.current?.click()}
              onCameraClick={() => {/* Handle camera */}}
              onFileClick={() => fileInputRef.current?.click()}
            />
          )}
        </AnimatePresence>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3 shadow-lg"
            >
              <div className="grid grid-cols-6 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputText(inputText + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
              showAttachments ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Paperclip className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onKeyPress}
              placeholder="Type a message..."
              className="w-full bg-gray-100 dark:bg-gray-800 dark:text-gray-100 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition-colors placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />

            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Smile className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {inputText.trim() ? (
            <button
              onClick={onSend}
              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              <Send className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              onMouseDown={onStartRecording}
              onMouseUp={onStopRecording}
              onTouchStart={onStartRecording}
              onTouchEnd={onStopRecording}
              className={cn(
                'p-2 rounded-full transition-colors',
                isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
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
        onChange={(e) => onFileUpload(e.target.files)}
      />

      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => onImageUpload(e.target.files)}
      />
    </>
  );
};
