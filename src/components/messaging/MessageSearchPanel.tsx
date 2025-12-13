/**
 * Message Search Panel Component
 * Provides UI for searching messages within a conversation or globally
 */

import React, { useRef, useEffect } from 'react';
import { Search, X, Loader2, Globe, MessageCircle, ChevronRight, Hash } from 'lucide-react';
import { useMessageSearch, MessageSearchResult } from '../../hooks/useMessageSearch';
import { cn } from '../../lib/utils';

interface MessageSearchPanelProps {
  /** Current conversation ID for scoped search (null for global) */
  conversationId?: string | null;
  /** Whether to start with global search enabled */
  defaultGlobal?: boolean;
  /** Callback when a search result is clicked */
  onResultClick: (result: MessageSearchResult) => void;
  /** Callback to close the panel */
  onClose: () => void;
  /** Additional class names */
  className?: string;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function MessageSearchPanel({
  conversationId,
  defaultGlobal = false,
  onResultClick,
  onClose,
  className,
}: MessageSearchPanelProps) {
  const [isGlobalSearch, setIsGlobalSearch] = React.useState(defaultGlobal || !conversationId);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    debouncedQuery,
    results,
    isLoading,
    error,
    clearSearch,
    resultCount,
    isSearchActive,
    loadMore,
    hasMore,
  } = useMessageSearch({
    conversationId: isGlobalSearch ? null : conversationId,
    debounceDelay: 300,
    limit: 30,
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleResultClick = (result: MessageSearchResult) => {
    onResultClick(result);
  };

  return (
    <div className={cn(
      'flex flex-col bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700',
      className
    )}>
      {/* Search Header */}
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={isGlobalSearch ? 'Search all messages...' : 'Search in this conversation...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            title="Close search"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Search scope toggle */}
        {conversationId && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setIsGlobalSearch(false)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors',
                !isGlobalSearch
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              This conversation
            </button>
            <button
              onClick={() => setIsGlobalSearch(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors',
                isGlobalSearch
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              All conversations
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto max-h-80">
        {isLoading && results.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="ml-2 text-sm text-neutral-500">Searching...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : !isSearchActive ? (
          <div className="p-6 text-center">
            <Search className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Type to search messages
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Minimum 2 characters required
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              No messages found for "{debouncedQuery}"
            </p>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {resultCount} result{resultCount !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Results list */}
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full p-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {result.userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {result.userName || 'Unknown User'}
                    </span>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {formatTime(result.createdAt)}
                    </span>
                  </div>
                  {isGlobalSearch && result.conversationName && (
                    <div className="flex items-center gap-1 mb-1">
                      <Hash className="w-3 h-3 text-neutral-400" />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {result.conversationName}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {highlightMatch(result.text, debouncedQuery)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-2" />
              </button>
            ))}

            {/* Load more button */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="w-full py-3 text-sm text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more results'
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MessageSearchPanel;
