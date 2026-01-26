/**
 * MessageComposer Component
 * Rich text message input with file attachments, emoji picker, and formatting
 *
 * Features:
 * - Auto-resizing textarea
 * - Markdown formatting toolbar (bold, italic, code, links)
 * - Emoji picker with categories
 * - File drag & drop with preview
 * - Pending attachments display
 * - Reply preview
 * - Voice message recording (UI only)
 * - Keyboard shortcuts
 */

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  X,
  File,
  Mic,
  MicOff,
  Link2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import type { PendingAttachment, ReplyContext } from './types';
import { EMOJI_CATEGORIES } from './types';
import { formatFileSize } from './utils';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Emoji picker with category tabs
 */
function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [category, setCategory] = useState<keyof typeof EMOJI_CATEGORIES>('recent');

  return (
    <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50">
      {/* Category tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-2 py-1">
        {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${
              category === cat
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {cat === 'recent' ? '🕒' : cat === 'smileys' ? '😀' : cat === 'gestures' ? '👍' : cat === 'objects' ? '❤️' : '🌸'}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[category].map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-transform hover:scale-125"
          >
            <span className="text-xl">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Reply preview showing quoted message
 */
function ReplyPreview({
  replyTo,
  onClear
}: {
  replyTo: ReplyContext | undefined;
  onClear?: () => void;
}) {
  if (!replyTo) return null;

  return (
    <div className="flex items-stretch gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border-l-4 border-primary-500">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
          {replyTo.author.name}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
          {replyTo.content}
        </p>
      </div>
      {onClear && (
        <button onClick={onClear} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main MessageComposer Component
// ============================================================================

export interface MessageComposerProps {
  /** Current input value */
  value: string;
  /** Called when input changes */
  onChange: (value: string) => void;
  /** Called when user sends message */
  onSend: () => void;
  /** Called when user clicks attach button */
  onAttach: () => void;
  /** Called when files are dropped */
  onFileDrop?: (files: FileList) => void;
  /** Reply context if replying to a message */
  replyTo?: ReplyContext;
  /** Called to clear reply */
  onClearReply?: () => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** List of pending attachments */
  pendingAttachments?: PendingAttachment[];
  /** Called to remove an attachment */
  onRemoveAttachment?: (id: string) => void;
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  onAttach,
  onFileDrop,
  replyTo,
  onClearReply,
  disabled,
  placeholder = 'Type a message...',
  pendingAttachments = [],
  onRemoveAttachment
}: MessageComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      return;
    }

    // Keyboard shortcuts for formatting (Cmd/Ctrl + key)
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertFormatting('**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('_');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('[', '](url)');
          break;
        case '`':
          e.preventDefault();
          insertFormatting('`');
          break;
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Insert formatting markers around selected text or at cursor
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newValue);

    // Move cursor after formatting
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && onFileDrop) {
      onFileDrop(files);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const hasContent = value.trim() || pendingAttachments.length > 0;

  return (
    <div
      ref={dropZoneRef}
      className={`relative p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 transition-colors ${
        isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary-100/80 dark:bg-primary-900/50 border-2 border-dashed border-primary-400 dark:border-primary-600 rounded-lg z-10 pointer-events-none">
          <div className="text-primary-600 dark:text-primary-400 font-medium flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Drop files to attach
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3">
          <ReplyPreview replyTo={replyTo} onClear={onClearReply} />
        </div>
      )}

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              {/* Preview or icon */}
              {attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 rounded">
                  <File className="w-5 h-5 text-neutral-500" />
                </div>
              )}

              {/* File info */}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                  {attachment.file.name}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {formatFileSize(attachment.file.size)}
                </span>
              </div>

              {/* Upload progress */}
              {attachment.uploading && (
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => onRemoveAttachment?.(attachment.id)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Error indicator */}
              {attachment.error && (
                <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => insertFormatting('**')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">B</span>
        </button>
        <button
          onClick={() => insertFormatting('_')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <span className="text-sm italic text-neutral-600 dark:text-neutral-400">I</span>
        </button>
        <button
          onClick={() => insertFormatting('`')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Code (Ctrl+`)"
        >
          <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">{'<>'}</span>
        </button>
        <button
          onClick={() => insertFormatting('[', '](url)')}
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Link (Ctrl+K)"
        >
          <Link2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-neutral-400">Markdown supported</span>
      </div>

      <div className="flex items-end gap-2">
        {/* Attach button */}
        <button
          onClick={onAttach}
          className="flex-shrink-0 p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50"
          />

          {/* Emoji button */}
          <div className="absolute right-3 bottom-3">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </div>

        {/* Voice message button (when empty) or Send button */}
        {hasContent ? (
          <button
            onClick={onSend}
            disabled={disabled}
            className="flex-shrink-0 p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg hover:shadow-xl"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex-shrink-0 p-2.5 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            )}
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">
        <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}

export default MessageComposer;
