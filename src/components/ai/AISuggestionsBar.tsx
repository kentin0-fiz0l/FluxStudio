/**
 * AISuggestionsBar - Context-aware floating suggestions
 *
 * Shows real-time AI suggestions based on current user activity.
 * Appears as a floating bar above the current work area.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Sparkles,
  X,
  ChevronRight,
  Palette,
  Layout,
  Type,
  Eye,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useAISuggestions, useAI, type AISuggestion } from '@/store/slices/aiSlice';
import { cn } from '@/lib/utils';

interface AISuggestionsBarProps {
  position?: 'top' | 'bottom';
  maxSuggestions?: number;
  className?: string;
  onOpenChat?: () => void;
}

export function AISuggestionsBar({
  position = 'bottom',
  maxSuggestions = 3,
  className = '',
  onOpenChat,
}: AISuggestionsBarProps) {
  const suggestions = useAISuggestions();
  const ai = useAI();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  const visibleSuggestions = suggestions
    .filter((s) => !dismissedIds.has(s.id))
    .slice(0, isExpanded ? 10 : maxSuggestions);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    ai.dismissSuggestion(id);
  };

  const handleApply = (suggestion: AISuggestion) => {
    ai.applySuggestion(suggestion.id);
    // In a real app, this would trigger the actual action
    console.log('Applying suggestion:', suggestion);
  };

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const positionStyles = position === 'top'
    ? 'top-4 left-1/2 -translate-x-1/2'
    : 'bottom-20 left-1/2 -translate-x-1/2';

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
      className={cn(
        'fixed z-40 max-w-2xl w-full px-4',
        positionStyles,
        className
      )}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">AI Suggestions</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({suggestions.length} available)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {suggestions.length > maxSuggestions && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {isExpanded ? 'Show less' : `+${suggestions.length - maxSuggestions} more`}
              </button>
            )}
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Ask AI
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className={cn('divide-y divide-gray-100 dark:divide-gray-800', isExpanded && 'max-h-80 overflow-y-auto')}>
          <AnimatePresence mode="popLayout">
            {visibleSuggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                onDismiss={handleDismiss}
                onApply={handleApply}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface SuggestionItemProps {
  suggestion: AISuggestion;
  index: number;
  onDismiss: (id: string) => void;
  onApply: (suggestion: AISuggestion) => void;
}

function SuggestionItem({ suggestion, index, onDismiss, onApply }: SuggestionItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getIcon = () => {
    switch (suggestion.type) {
      case 'action':
        return <Zap className="w-4 h-4" />;
      case 'content':
        return <Type className="w-4 h-4" />;
      case 'optimization':
        return <Layout className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (suggestion.type) {
      case 'action':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'content':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
      case 'optimization':
        return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {/* Icon */}
        <div className={cn('flex-shrink-0 p-2 rounded-lg', getTypeColor())}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {suggestion.title}
            </h4>
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
              {Math.round(suggestion.confidence * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {suggestion.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {suggestion.actions && suggestion.actions.length > 0 && (
            <button
              onClick={() => onApply(suggestion)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
            >
              {suggestion.actions[0].label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onDismiss(suggestion.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default AISuggestionsBar;
