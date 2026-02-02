/**
 * Advanced Message Search Dialog
 * Comprehensive search with filters, suggestions, and history
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  FileText,
  Clock,
  Star,
  History,
  Trash2,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import { Message, MessageUser, MessageType, Priority } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';

interface SearchFilter {
  dateRange?: { from: Date; to: Date };
  authorId?: string;
  messageType?: MessageType;
  priority?: Priority;
  hasAttachments?: boolean;
  tags?: string[];
  conversationId?: string;
}

interface SearchResult {
  message: Message;
  matchScore: number;
  highlights: string[];
}

interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilter;
  name: string;
  createdAt: Date;
}

interface AdvancedMessageSearchDialogProps {
  participants?: MessageUser[];
  onSelectMessage?: (message: Message) => void;
  trigger?: React.ReactNode;
}

export function AdvancedMessageSearchDialog({
  participants = [],
  onSelectMessage,
  trigger
}: AdvancedMessageSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('message_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    const saved = localStorage.getItem('saved_searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newHistory = [
      searchQuery,
      ...searchHistory.filter(q => q !== searchQuery)
    ].slice(0, 10); // Keep last 10 searches

    setSearchHistory(newHistory);
    localStorage.setItem('message_search_history', JSON.stringify(newHistory));
  };

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilter) => {
    if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const messages = await messagingService.searchMessages({
        query: searchQuery,
        ...searchFilters,
        limit: 50
      });

      // Calculate match scores and highlights
      const searchResults: SearchResult[] = messages.map(message => {
        const highlights: string[] = [];
        let matchScore = 0;

        // Calculate score based on query match
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          const lowerContent = message.content.toLowerCase();

          if (lowerContent.includes(lowerQuery)) {
            matchScore += 10;

            // Extract highlight snippet
            const index = lowerContent.indexOf(lowerQuery);
            const start = Math.max(0, index - 30);
            const end = Math.min(message.content.length, index + lowerQuery.length + 30);
            highlights.push(message.content.substring(start, end));
          }

          // Author name match
          if (message.author.name.toLowerCase().includes(lowerQuery)) {
            matchScore += 5;
          }
        }

        // Boost for recent messages
        const ageInDays = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) matchScore += 3;
        if (ageInDays < 1) matchScore += 5;

        // Boost for priority
        if (message.metadata?.priority === 'high') matchScore += 2;
        if (message.metadata?.priority === 'critical') matchScore += 4;

        return { message, matchScore, highlights };
      });

      // Sort by match score
      searchResults.sort((a, b) => b.matchScore - a.matchScore);

      setResults(searchResults);
      saveToHistory(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query || Object.keys(filters).length > 0) {
        performSearch(query, filters);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, performSearch]);

  // Generate suggestions based on query
  useEffect(() => {
    if (query.length > 0) {
      const matchingHistory = searchHistory.filter(h =>
        h.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      setSuggestions(matchingHistory);
    } else {
      setSuggestions([]);
    }
  }, [query, searchHistory]);

  // Save current search
  const saveSearch = () => {
    if (!query.trim()) return;

    const newSearch: SavedSearch = {
      id: Math.random().toString(36).substr(2, 9),
      query,
      filters,
      name: query.substring(0, 50),
      createdAt: new Date()
    };

    const newSavedSearches = [newSearch, ...savedSearches];
    setSavedSearches(newSavedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(newSavedSearches));
  };

  // Load saved search
  const loadSavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query);
    setFilters(saved.filters);
  };

  // Delete saved search
  const deleteSavedSearch = (id: string) => {
    const newSavedSearches = savedSearches.filter(s => s.id !== id);
    setSavedSearches(newSavedSearches);
    localStorage.setItem('saved_searches', JSON.stringify(newSavedSearches));
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('message_search_history');
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResult(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResult(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedResult >= 0) {
      e.preventDefault();
      const result = results[selectedResult];
      if (result && onSelectMessage) {
        onSelectMessage(result.message);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search Messages</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Search Messages</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="px-6 py-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages, files, or mentions..."
                className="pl-10 pr-20"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-3 w-3" />
                Filters
                {Object.keys(filters).length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1">
                    {Object.keys(filters).length}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={saveSearch}
                disabled={!query.trim()}
                className="gap-2"
              >
                <Star className="h-3 w-3" />
                Save
              </Button>

              {results.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Suggestions */}
            <AnimatePresence>
              {suggestions.length > 0 && query && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1"
                >
                  {suggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setQuery(suggestion)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {suggestion}
                    </Badge>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-4 bg-muted/30 border-b space-y-3"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Author Filter */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Author</label>
                    <Select
                      value={filters.authorId}
                      onValueChange={(value) =>
                        setFilters({ ...filters, authorId: value || undefined })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Any author" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any author</SelectItem>
                        {participants.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Type</label>
                    <Select
                      value={filters.messageType}
                      onValueChange={(value) =>
                        setFilters({ ...filters, messageType: value as MessageType || undefined })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any type</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="voice">Voice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Priority</label>
                    <Select
                      value={filters.priority}
                      onValueChange={(value) =>
                        setFilters({ ...filters, priority: value as Priority || undefined })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Any priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any priority</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Has Attachments */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.hasAttachments}
                        onCheckedChange={(checked) =>
                          setFilters({ ...filters, hasAttachments: checked as boolean })
                        }
                      />
                      <span className="text-sm">Has attachments</span>
                    </label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({})}
                  disabled={Object.keys(filters).length === 0}
                >
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y">
                {results.map((result, index) => (
                  <motion.div
                    key={result.message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'p-4 hover:bg-accent cursor-pointer transition-colors',
                      selectedResult === index && 'bg-accent'
                    )}
                    onClick={() => {
                      if (onSelectMessage) {
                        onSelectMessage(result.message);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={result.message.author.avatar} />
                        <AvatarFallback className="text-xs">
                          {result.message.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {result.message.author.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(result.message.createdAt)}
                          </span>
                          {result.message.metadata?.priority && result.message.metadata.priority !== 'medium' && (
                            <Badge variant="outline" className="text-xs">
                              {result.message.metadata.priority}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-foreground line-clamp-2">
                          {result.highlights.length > 0
                            ? result.highlights[0]
                            : result.message.content}
                        </p>

                        {result.message.attachments && result.message.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {result.message.attachments.length} attachment{result.message.attachments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          Score: {result.matchScore}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : query || Object.keys(filters).length > 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No messages found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Recent Searches
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearHistory}
                        className="h-6 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((historyQuery, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setQuery(historyQuery)}
                        >
                          {historyQuery}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved Searches */}
                {savedSearches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Saved Searches
                    </h3>
                    <div className="space-y-2">
                      {savedSearches.map((saved) => (
                        <div
                          key={saved.id}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent cursor-pointer"
                          onClick={() => loadSavedSearch(saved)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{saved.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(saved.createdAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedSearch(saved.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchHistory.length === 0 && savedSearches.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Start typing to search messages
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdvancedMessageSearchDialog;
