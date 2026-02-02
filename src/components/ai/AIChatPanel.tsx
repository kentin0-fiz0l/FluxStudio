/**
 * AIChatPanel - Floating conversational AI assistant
 *
 * Features:
 * - Real-time chat with AI
 * - Message streaming
 * - Context awareness
 * - File attachments
 * - Code generation
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Paperclip,
  Sparkles,
  User,
  Bot,
  Loader2,
  Copy,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { useAI, useActiveConversation, useAIUsage, type AIMessage } from '@/store';
import { useProjectContextOptional } from '@/contexts/ProjectContext';
import { useAIContext } from '@/hooks/useAIContext';
import { cn } from '@/lib/utils';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'right' | 'bottom';
  className?: string;
}

export function AIChatPanel({
  isOpen,
  onClose,
  position = 'right',
  className = '',
}: AIChatPanelProps) {
  const ai = useAI();
  const conversation = useActiveConversation();
  const usage = useAIUsage();
  const projectContext = useProjectContextOptional();
  const { context: aiContext, addAction } = useAIContext();
  const [input, setInput] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Build context for AI requests
  const buildAIContext = React.useCallback(() => {
    return {
      project: projectContext?.currentProject ? {
        id: projectContext.currentProject.id,
        name: projectContext.currentProject.name,
        description: projectContext.currentProject.description,
        status: projectContext.currentProject.status,
      } : undefined,
      page: aiContext.page,
      recentActions: aiContext.recentActions.slice(0, 5),
    };
  }, [projectContext?.currentProject, aiContext.page, aiContext.recentActions]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Create conversation if none exists
  React.useEffect(() => {
    if (isOpen && !conversation) {
      const context = buildAIContext();
      const projectName = context.project?.name;
      ai.createConversation({
        title: projectName ? `Chat: ${projectName}` : 'New Chat',
        projectId: context.project?.id,
      });
    }
  }, [isOpen, conversation, ai, buildAIContext]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || ai.isProcessing) return;

    const message = input.trim();
    setInput('');

    // Track the action for context
    addAction(`Sent message: "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}"`);

    // Pass context with the message
    await ai.sendMessage(conversation.id, message, buildAIContext());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    const context = buildAIContext();
    const projectName = context.project?.name;
    ai.createConversation({
      title: projectName ? `Chat: ${projectName}` : 'New Chat',
      projectId: context.project?.id,
    });
    setInput('');
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const panelStyles = position === 'right'
    ? 'right-0 top-0 h-full w-96 border-l'
    : 'bottom-0 left-0 right-0 h-96 border-t';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: position === 'right' ? 384 : 0, y: position === 'bottom' ? 384 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: position === 'right' ? 384 : 0, y: position === 'bottom' ? 384 : 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col',
            panelStyles,
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">AI Co-Pilot</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="New chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Usage bar */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span>{usage.requestsRemaining} requests remaining</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${100 - (usage.tokensUsed / usage.tokensLimit) * 100}%` }}
                />
              </div>
              <span>{Math.round((usage.tokensLimit - usage.tokensUsed) / 1000)}k tokens</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!conversation?.messages.length ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <Sparkles className="w-12 h-12 mb-4 text-indigo-400" />
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hi! I'm your AI Co-Pilot
                </h3>
                <p className="text-sm max-w-xs">
                  I can help with design ideas, code generation, content writing, and creative inspiration.
                </p>
                <div className="mt-6 grid gap-2 w-full max-w-xs">
                  {[
                    'Help me design a landing page',
                    'Generate a color palette for tech',
                    'Write copy for a hero section',
                    'Improve my component code',
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="text-left px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyMessage}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full px-4 py-2.5 pr-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  className="absolute right-2 bottom-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || ai.isProcessing}
                className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  input.trim() && !ai.isProcessing
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
              >
                {ai.isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-gray-400">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MessageBubbleProps {
  message: AIMessage;
  onCopy: (content: string) => void;
}

function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : '')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-indigo-100 dark:bg-indigo-900/30'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 max-w-[80%]', isUser ? 'text-right' : '')}>
        <div
          className={cn(
            'inline-block px-4 py-2.5 rounded-2xl text-sm',
            isUser
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
          )}
        >
          {message.isStreaming ? (
            <span className="flex items-center gap-2">
              {message.content || 'Thinking...'}
              <span className="inline-block w-2 h-4 bg-current animate-pulse" />
            </span>
          ) : message.error ? (
            <span className="text-red-500">{message.error}</span>
          ) : (
            <MessageContent content={message.content} />
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {showActions && !isUser && !message.isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-1 flex items-center gap-1"
            >
              <button
                onClick={() => onCopy(message.content)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3);
          const [lang, ...lines] = code.split('\n');
          const codeContent = lines.join('\n');

          return (
            <pre
              key={i}
              className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs"
            >
              {lang && (
                <div className="text-gray-400 text-xs mb-2">{lang}</div>
              )}
              <code>{codeContent || lang}</code>
            </pre>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default AIChatPanel;
