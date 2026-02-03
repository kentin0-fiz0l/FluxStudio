/**
 * Rich Text Composer Component
 * Advanced message composer with formatting, mentions, and markdown support
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Strikethrough,
  Heading2,
  AtSign,
  Paperclip,
  Send,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { MessageUser, Priority } from '../../types/messaging';

interface RichTextComposerProps {
  placeholder?: string;
  onSend: (content: string, mentions: string[], attachments: File[]) => void;
  onTyping?: () => void;
  disabled?: boolean;
  participants?: MessageUser[];
  priority?: Priority;
  onPriorityChange?: (priority: Priority) => void;
  className?: string;
}

interface FormatButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: string;
  shortcut?: string;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { icon: Bold, label: 'Bold', action: '**text**', shortcut: 'Cmd+B' },
  { icon: Italic, label: 'Italic', action: '_text_', shortcut: 'Cmd+I' },
  { icon: Strikethrough, label: 'Strikethrough', action: '~~text~~' },
  { icon: Code, label: 'Code', action: '`code`', shortcut: 'Cmd+E' },
  { icon: Quote, label: 'Quote', action: '> quote' },
  { icon: List, label: 'Bullet List', action: '- item' },
  { icon: ListOrdered, label: 'Numbered List', action: '1. item' },
  { icon: Heading2, label: 'Heading', action: '## heading' },
  { icon: LinkIcon, label: 'Link', action: '[text](url)' },
];

export function RichTextComposer({
  placeholder = 'Type a message...',
  onSend,
  onTyping,
  disabled = false,
  participants = [],
  priority: _priority = 'medium',
  onPriorityChange: _onPriorityChange,
  className
}: RichTextComposerProps) {
  const [content, setContent] = useState('');
  const [showFormatting, setShowFormatting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle content change
  const handleContentChange = (value: string) => {
    setContent(value);
    onTyping?.();

    // Check for @ mentions
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentions(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    setCursorPosition(cursorPos);
  };

  // Apply formatting
  const applyFormatting = (format: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';
    let newCursorPos = start;

    if (format.startsWith('**') || format.startsWith('_') || format.startsWith('~~') || format.startsWith('`')) {
      // Inline formatting
      const marker = format.split('text')[0];
      newText = content.substring(0, start) + marker + selectedText + marker + content.substring(end);
      newCursorPos = end + marker.length * 2;
    } else if (format.startsWith('>') || format.startsWith('-') || format.startsWith('1.') || format.startsWith('##')) {
      // Block formatting
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      newText = content.substring(0, lineStart) + format.split(' ')[0] + ' ' + content.substring(lineStart);
      newCursorPos = start + format.split(' ')[0].length + 1;
    } else if (format.startsWith('[')) {
      // Link formatting
      newText = content.substring(0, start) + '[' + selectedText + '](url)' + content.substring(end);
      newCursorPos = end + 3;
    }

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Insert mention
  const insertMention = (user: MessageUser) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.substring(cursorPos);

    const newContent = content.substring(0, lastAtIndex) + `@${user.name} ` + textAfterCursor;
    setContent(newContent);
    setShowMentions(false);

    if (!mentions.includes(user.id)) {
      setMentions([...mentions, user.id]);
    }

    setTimeout(() => {
      const newPos = lastAtIndex + user.name.length + 2;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Format shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      applyFormatting('**text**');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      applyFormatting('_text_');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      applyFormatting('`code`');
    }

    // Mention navigation
    if (showMentions) {
      const filteredParticipants = participants.filter(p =>
        p.name.toLowerCase().includes(mentionSearch)
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredParticipants.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredParticipants.length - 1
        );
      } else if (e.key === 'Enter' && filteredParticipants[selectedMentionIndex]) {
        e.preventDefault();
        insertMention(filteredParticipants[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  // Handle send
  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSend(content.trim(), mentions, attachments);
    setContent('');
    setMentions([]);
    setAttachments([]);
    textareaRef.current?.focus();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Filter participants for mentions
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(mentionSearch)
  );

  return (
    <div className={cn('relative space-y-2', className)}>
      {/* Formatting Toolbar */}
      <AnimatePresence>
        {showFormatting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg border"
          >
            <TooltipProvider>
              {FORMAT_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Tooltip key={btn.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => applyFormatting(btn.action)}
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{btn.label}</p>
                      {btn.shortcut && (
                        <p className="text-[10px] text-muted-foreground">{btn.shortcut}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg border"
          >
            {attachments.map((file, index) => (
              <Badge key={index} variant="secondary" className="gap-2 pr-1">
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[150px] truncate text-xs">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => removeAttachment(index)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[100px] max-h-[300px] resize-none pr-24"
          rows={3}
        />

        {/* Mention Dropdown */}
        <AnimatePresence>
          {showMentions && filteredParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden z-50"
            >
              <div className="max-h-48 overflow-y-auto">
                {filteredParticipants.map((user, index) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                      index === selectedMentionIndex && 'bg-accent'
                    )}
                  >
                    <AtSign className="h-3 w-3 text-muted-foreground" />
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowFormatting(!showFormatting)}
            type="button"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            className="h-7"
            onClick={handleSend}
            disabled={!content.trim() && attachments.length === 0}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Markdown supported • @ to mention • Shift+Enter for new line</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}

export default RichTextComposer;
