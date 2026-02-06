/**
 * AgentPanel - AI Agent Chat Interface
 *
 * Main chat interface for the AI agent with:
 * - Message list with streaming support
 * - Quick action buttons
 * - Pending action cards
 * - Collapsible tool call display
 *
 * Date: 2026-02-06
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Calendar,
  Clock,
  FolderSearch,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useAgentSession, useAgentActions, useDailyBrief, useWhatChanged, useAgentPanel } from '@/hooks/useAgent';
import { cn } from '@/lib/utils';

// ============================================================================
// Sub-Components
// ============================================================================

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function QuickActionButton({ icon, label, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        'bg-slate-800 hover:bg-slate-700 text-slate-200',
        'border border-slate-700 hover:border-slate-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolsUsed?: string[];
  error?: string;
  timestamp: string;
}

function MessageBubble({ role, content, isStreaming, toolsUsed, error, timestamp }: MessageBubbleProps) {
  const [showTools, setShowTools] = useState(false);

  return (
    <div className={cn('flex gap-3', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          role === 'user'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-100 border border-slate-700'
        )}
      >
        {/* Content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content || (isStreaming ? '...' : '')}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse" />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* Tools used */}
        {toolsUsed && toolsUsed.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowTools(!showTools)}
              className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              {toolsUsed.length} tool{toolsUsed.length > 1 ? 's' : ''} used
              {showTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {showTools && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap gap-1">
                    {toolsUsed.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1 text-xs text-slate-500">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

interface PendingActionCardProps {
  action: {
    id: string;
    actionType: string;
    preview: string;
    status: string;
    createdAt: string;
  };
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

function PendingActionCard({ action, onApprove, onReject, isApproving, isRejecting }: PendingActionCardProps) {
  return (
    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending Approval
          </div>
          <p className="mt-1 text-sm text-slate-300">{action.preview}</p>
          <p className="mt-1 text-xs text-slate-500">
            {action.actionType} - {new Date(action.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={isApproving || isRejecting}
            className="p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
          >
            {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={onReject}
            disabled={isApproving || isRejecting}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
          >
            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface AgentPanelProps {
  projectId?: string;
}

export function AgentPanel({ projectId }: AgentPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isOpen, close } = useAgentPanel();
  const { messages, isStreaming, sendMessage } = useAgentSession({ projectId });
  const { pendingActions, approve, reject, isApproving, isRejecting } = useAgentActions();
  useDailyBrief(); // Pre-fetch brief data
  useWhatChanged(); // Pre-fetch changes data

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isStreaming, sendMessage]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Quick actions
  const handleDailyBrief = useCallback(() => {
    sendMessage("Give me a daily brief of all my project activity");
  }, [sendMessage]);

  const handleWhatChanged = useCallback(() => {
    sendMessage("What changed since yesterday?");
  }, [sendMessage]);

  const handleSearchProjects = useCallback(() => {
    sendMessage("Search for my active projects and show me their status");
  }, [sendMessage]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="fixed right-0 top-0 h-full w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-b border-slate-800 flex gap-2 overflow-x-auto">
          <QuickActionButton
            icon={<Calendar className="w-4 h-4" />}
            label="Daily Brief"
            onClick={handleDailyBrief}
            disabled={isStreaming}
          />
          <QuickActionButton
            icon={<Clock className="w-4 h-4" />}
            label="What Changed?"
            onClick={handleWhatChanged}
            disabled={isStreaming}
          />
          <QuickActionButton
            icon={<FolderSearch className="w-4 h-4" />}
            label="Projects"
            onClick={handleSearchProjects}
            disabled={isStreaming}
          />
        </div>

        {/* Pending Actions */}
        {pendingActions && pendingActions.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-800 space-y-2">
            {pendingActions.slice(0, 3).map((action: PendingActionCardProps['action']) => (
              <PendingActionCard
                key={action.id}
                action={action}
                onApprove={() => approve(action.id)}
                onReject={() => reject(action.id)}
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-400">Start a conversation</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs">
                Ask me about your projects, get summaries, or search for assets.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                isStreaming={msg.isStreaming}
                toolsUsed={msg.toolsUsed}
                error={msg.error}
                timestamp={msg.timestamp}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl px-4 py-3 text-sm',
                'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'max-h-32'
              )}
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'p-3 rounded-xl transition-colors',
                input.trim() && !isStreaming
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AgentPanel;
