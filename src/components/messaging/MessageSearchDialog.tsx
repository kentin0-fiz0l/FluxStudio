/**
 * Message Search Dialog Component
 * Advanced search functionality for messages across conversations
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, User, FileText, Image, Video, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { Message, MessageSearchOptions, MessageType, Priority } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import { cn } from '../../lib/utils';

interface MessageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageSelect: (message: Message) => void;
  className?: string;
}

const messageTypeIcons = {
  text: FileText,
  file: FileText,
  image: Image,
  video: Video,
  voice: FileText,
  system: FileText,
  announcement: FileText,
  milestone: FileText,
  approval: FileText,
  feedback: FileText,
  consultation: FileText,
};

export function MessageSearchDialog({
  isOpen,
  onClose,
  onMessageSelect,
  className
}: MessageSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOptions, setSearchOptions] = useState<MessageSearchOptions>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchOptions]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const results = await messagingService.searchMessages({
        query: searchQuery,
        ...searchOptions,
        limit: 50,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof MessageSearchOptions, value: any) => {
    setSearchOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setSearchOptions({});
    setShowAdvancedFilters(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const MessageSearchResult = ({ message }: { message: Message }) => {
    const IconComponent = messageTypeIcons[message.type];

    return (
      <button
        className="flex items-start gap-3 p-4 hover:bg-accent rounded-lg cursor-pointer transition-colors text-left w-full"
        onClick={() => {
          onMessageSelect(message);
          onClose();
        }}
      >
        {/* Message Type Icon */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="w-4 h-4">
              <AvatarImage src={message.author.avatar} />
              <AvatarFallback className="text-xs">
                {message.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{message.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
            </span>
            {message.metadata?.priority && message.metadata.priority !== 'medium' && (
              <Badge variant={message.metadata.priority === 'high' ? 'error' : 'secondary'} className="text-xs">
                {message.metadata.priority}
              </Badge>
            )}
          </div>

          <div className="text-sm mb-2">
            {highlightText(message.content, searchQuery)}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex gap-2 mb-2">
              {message.attachments.map((attachment, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {attachment.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags */}
          {message.metadata?.tags && message.metadata.tags.length > 0 && (
            <div className="flex gap-1">
              {message.metadata.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Go to Message Arrow */}
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  };

  const activeFiltersCount = Object.values(searchOptions).filter(value =>
    value !== undefined && value !== null && value !== ''
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[80vh] flex flex-col", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Messages
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary text-primary-foreground ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Message Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Message Type</label>
                  <Select
                    value={searchOptions.messageType || 'all'}
                    onValueChange={(value) =>
                      handleFilterChange('messageType', value === 'all' ? undefined : value as MessageType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={searchOptions.priority || 'all'}
                    onValueChange={(value) =>
                      handleFilterChange('priority', value === 'all' ? undefined : value as Priority)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <DatePicker
                    selected={searchOptions.dateFrom}
                    onSelect={(date) => handleFilterChange('dateFrom', date)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <DatePicker
                    selected={searchOptions.dateTo}
                    onSelect={(date) => handleFilterChange('dateTo', date)}
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.hasAttachments || false}
                    onChange={(e) => handleFilterChange('hasAttachments', e.target.checked || undefined)}
                    className="rounded"
                  />
                  Has attachments
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions.isUnread || false}
                    onChange={(e) => handleFilterChange('isUnread', e.target.checked || undefined)}
                    className="rounded"
                  />
                  Unread only
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Searching...</p>
              </div>
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No messages found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            ) : !searchQuery ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Search Messages</p>
                <p className="text-muted-foreground">
                  Enter a search term to find messages across all conversations
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                <div className="text-sm text-muted-foreground mb-4">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
                {searchResults.map(message => (
                  <MessageSearchResult key={message.id} message={message} />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MessageSearchDialog;