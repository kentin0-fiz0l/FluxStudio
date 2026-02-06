/**
 * Advanced Message Search Component
 * Semantic search, analytics, and intelligent filtering for messages
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  MessageSquare,
  Hash,
  X,
  Brain,
  Heart,
  CheckCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { DatePicker } from '../ui/date-picker';
import { Message, MessageType, Priority, Conversation } from '../../types/messaging';
import { UserSearch } from '../search/UserSearch';
import { MessageAnalysis } from '../../services/messageIntelligenceService';
import { cn } from '../../lib/utils';

interface SearchFilters {
  query: string;
  authors: string[];
  messageTypes: MessageType[];
  priorities: Priority[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  conversations: string[];
  hasAttachments: boolean | null;
  hasMentions: boolean | null;
  categories: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | null;
}

interface SearchResult {
  message: Message;
  conversation: Conversation;
  relevanceScore: number;
  highlights: string[];
  context: {
    before: Message[];
    after: Message[];
  };
  analysis?: MessageAnalysis;
}

interface MessageAnalytics {
  totalMessages: number;
  messagesByType: Record<MessageType, number>;
  messagesByUser: Record<string, number>;
  averageResponseTime: number;
  mostActiveHours: number[];
  topKeywords: { word: string; count: number }[];
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  engagementMetrics: {
    reactions: number;
    replies: number;
    mentions: number;
  };
}

interface AdvancedMessageSearchProps {
  onClose?: () => void;
  initialQuery?: string;
  conversations?: Conversation[];
  className?: string;
}

export const AdvancedMessageSearch: React.FC<AdvancedMessageSearchProps> = ({
  onClose,
  initialQuery = '',
  conversations: _conversations = [],
  className
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'analytics'>('search');
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialQuery,
    authors: [],
    messageTypes: [],
    priorities: [],
    dateRange: { from: null, to: null },
    conversations: [],
    hasAttachments: null,
    hasMentions: null,
    categories: [],
    sentiment: null
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [analytics, setAnalytics] = useState<MessageAnalytics | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'author'>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Mock search results for demonstration
  const mockSearchResults: SearchResult[] = [
    {
      message: {
        id: '1',
        content: 'Can we update the color scheme to match the brand guidelines?',
        author: {
          id: 'user1',
          name: 'Sarah Chen',
          userType: 'client',
          avatar: undefined
        },
        createdAt: new Date('2024-01-15T10:30:00'),
        updatedAt: new Date('2024-01-15T10:30:00'),
        type: 'text',
        status: 'read',
        metadata: { priority: 'medium' },
        conversationId: 'conv1',
        mentions: [],
        isEdited: false
      },
      conversation: {
        id: 'conv1',
        name: 'Brand Redesign Project',
        type: 'project',
        participants: [],
        lastMessage: {
          id: '1',
          content: 'Can we update the color scheme to match the brand guidelines?',
          author: {
            id: 'user1',
            name: 'Sarah Chen',
            userType: 'client'
          },
          createdAt: new Date('2024-01-15T10:30:00'),
          updatedAt: new Date('2024-01-15T10:30:00'),
          type: 'text',
          status: 'read',
          metadata: { priority: 'medium' },
          conversationId: 'conv1',
          mentions: [],
          isEdited: false
        },
        metadata: { priority: 'medium', tags: [], isArchived: false, isMuted: false, isPinned: false },
        lastActivity: new Date('2024-01-15T10:30:00'),
        unreadCount: 0,
        permissions: { canWrite: true, canAddMembers: true, canArchive: true, canDelete: true },
        createdBy: { id: 'user1', name: 'Sarah Chen', userType: 'designer' },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15T10:30:00')
      },
      relevanceScore: 0.95,
      highlights: ['color scheme', 'brand guidelines'],
      context: { before: [], after: [] },
      analysis: {
        category: 'design-feedback',
        intent: 'feedback-request',
        urgency: 'medium',
        confidence: 0.9,
        extractedData: {
          actionItems: ['Update color scheme'],
          designReferences: ['brand guidelines']
        }
      }
    },
    {
      message: {
        id: '2',
        content: 'The latest mockups look great! Just need to adjust the font size on mobile.',
        author: {
          id: 'user2',
          name: 'Mike Johnson',
          userType: 'designer',
          avatar: undefined
        },
        createdAt: new Date('2024-01-14T15:45:00'),
        updatedAt: new Date('2024-01-14T15:45:00'),
        type: 'text',
        status: 'read',
        metadata: { priority: 'low' },
        conversationId: 'conv2',
        mentions: [],
        isEdited: false
      },
      conversation: {
        id: 'conv2',
        name: 'Mobile App Design',
        type: 'project',
        participants: [],
        lastMessage: {
          id: '2',
          content: 'The latest mockups look great! Just need to adjust the font size on mobile.',
          author: {
            id: 'user2',
            name: 'Mike Johnson',
            userType: 'designer'
          },
          createdAt: new Date('2024-01-14T15:45:00'),
          updatedAt: new Date('2024-01-14T15:45:00'),
          type: 'text',
          status: 'read',
          metadata: { priority: 'low' },
          conversationId: 'conv2',
          mentions: [],
          isEdited: false
        },
        metadata: { priority: 'low', tags: [], isArchived: false, isMuted: false, isPinned: false },
        lastActivity: new Date('2024-01-14T15:45:00'),
        unreadCount: 0,
        permissions: { canWrite: true, canAddMembers: true, canArchive: true, canDelete: true },
        createdBy: { id: 'user2', name: 'Mike Johnson', userType: 'designer' },
        createdAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-14T15:45:00')
      },
      relevanceScore: 0.87,
      highlights: ['mockups', 'font size', 'mobile'],
      context: { before: [], after: [] },
      analysis: {
        category: 'design-feedback',
        intent: 'feedback-request',
        urgency: 'low',
        confidence: 0.85,
        extractedData: {
          actionItems: ['Adjust font size on mobile'],
          designReferences: ['mockups']
        }
      }
    }
  ];

  // Mock analytics data
  const mockAnalytics: MessageAnalytics = {
    totalMessages: 1247,
    messagesByType: {
      text: 892,
      image: 245,
      file: 87,
      voice: 23,
      video: 15,
      system: 8,
      announcement: 3,
      milestone: 2,
      approval: 12,
      feedback: 156,
      consultation: 4
    },
    messagesByUser: {
      'user1': 324,
      'user2': 289,
      'user3': 198,
      'user4': 156,
      'user5': 134,
      'user6': 89,
      'user7': 57
    },
    averageResponseTime: 2.4, // hours
    mostActiveHours: [9, 10, 11, 14, 15, 16],
    topKeywords: [
      { word: 'design', count: 156 },
      { word: 'feedback', count: 134 },
      { word: 'update', count: 98 },
      { word: 'review', count: 87 },
      { word: 'project', count: 76 },
      { word: 'deadline', count: 54 },
      { word: 'approval', count: 43 },
      { word: 'meeting', count: 38 }
    ],
    sentimentDistribution: {
      positive: 0.62,
      negative: 0.18,
      neutral: 0.20
    },
    engagementMetrics: {
      reactions: 456,
      replies: 892,
      mentions: 234
    }
  };

  // Perform search
  const performSearch = async () => {
    setIsSearching(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Filter and sort mock results based on filters
    let results = mockSearchResults;

    if (filters.query) {
      results = results.filter(result =>
        result.message.content.toLowerCase().includes(filters.query.toLowerCase()) ||
        result.conversation.name.toLowerCase().includes(filters.query.toLowerCase())
      );
    }

    if (filters.authors.length > 0) {
      results = results.filter(result =>
        filters.authors.includes(result.message.author.id)
      );
    }

    if (filters.messageTypes.length > 0) {
      results = results.filter(result =>
        filters.messageTypes.includes(result.message.type)
      );
    }

    // Sort results
    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = b.message.createdAt.getTime() - a.message.createdAt.getTime();
          break;
        case 'author':
          comparison = a.message.author.name.localeCompare(b.message.author.name);
          break;
      }

      return sortDirection === 'desc' ? comparison : -comparison;
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  // Load analytics - using useMemo to avoid setState in effect
  const analyticsData = useMemo(() => mockAnalytics, []);

  useEffect(() => {
    setAnalytics(analyticsData);
  }, [analyticsData]);

  // Trigger search when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (filters.query || filters.authors.length > 0 || filters.messageTypes.length > 0) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [filters, sortBy, sortDirection]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      authors: [],
      messageTypes: [],
      priorities: [],
      dateRange: { from: null, to: null },
      conversations: [],
      hasAttachments: null,
      hasMentions: null,
      categories: [],
      sentiment: null
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== null);
    }
    return value !== null && value !== '';
  });

  return (
    <div className={cn('h-full flex flex-col bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Message Search & Analytics</h2>
            <p className="text-sm text-gray-600">
              Search across all conversations and analyze communication patterns
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full">
          <div className="px-4 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="h-full p-4 pt-0">
            <div className="space-y-4 h-full flex flex-col">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search messages, conversations, and content..."
                    value={filters.query}
                    onChange={(e) => updateFilter('query', e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(hasActiveFilters && 'border-blue-500 text-blue-600')}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).reduce((count, value) => {
                        if (Array.isArray(value)) return count + value.length;
                        if (typeof value === 'object' && value !== null) {
                          return count + Object.values(value).filter(v => v !== null).length;
                        }
                        return count + (value !== null && value !== '' ? 1 : 0);
                      }, 0)}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Filters panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-gray-200 rounded-lg p-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Author filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Authors</label>
                        <UserSearch
                          placeholder="Filter by author..."
                          multiple={true}
                          selectedUsers={filters.authors.map(id => ({ id, name: `User ${id}`, email: `user${id}@example.com` }))}
                          onUsersChange={(users) => updateFilter('authors', users.map(u => u.id))}
                          theme="light"
                        />
                      </div>

                      {/* Message type filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message Types</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['text', 'image', 'file', 'voice'].map(type => (
                            <label key={type} className="flex items-center space-x-2">
                              <Checkbox
                                checked={filters.messageTypes.includes(type as MessageType)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFilter('messageTypes', [...filters.messageTypes, type]);
                                  } else {
                                    updateFilter('messageTypes', filters.messageTypes.filter(t => t !== type));
                                  }
                                }}
                              />
                              <span className="text-sm capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Date range filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <div className="space-y-2">
                          <DatePicker
                            selected={filters.dateRange.from ?? undefined}
                            onSelect={(date: Date | undefined) => updateFilter('dateRange', { ...filters.dateRange, from: date ?? null })}
                            placeholder="From date"
                          />
                          <DatePicker
                            selected={filters.dateRange.to ?? undefined}
                            onSelect={(date: Date | undefined) => updateFilter('dateRange', { ...filters.dateRange, to: date ?? null })}
                            placeholder="To date"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        {searchResults.length} results found
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear All
                        </Button>
                        <Select value={`${sortBy}-${sortDirection}`} onValueChange={(value) => {
                          const [sort, direction] = value.split('-');
                          setSortBy(sort as any);
                          setSortDirection(direction as any);
                        }}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relevance-desc">Most Relevant</SelectItem>
                            <SelectItem value="date-desc">Newest First</SelectItem>
                            <SelectItem value="date-asc">Oldest First</SelectItem>
                            <SelectItem value="author-asc">Author A-Z</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search results */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-600">Searching messages...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <SearchResultCard key={result.message.id} result={result} />
                  ))
                ) : filters.query || hasActiveFilters ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No messages found matching your criteria</p>
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Enter a search query to find messages</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="h-full p-4 pt-0">
            {analytics && <MessageAnalyticsPanel analytics={analytics} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Search result card component
const SearchResultCard: React.FC<{ result: SearchResult }> = ({ result }) => {
  const { message, conversation, relevanceScore, highlights, analysis } = result;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {message.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{message.author.name}</p>
              <p className="text-sm text-gray-500">
                in {conversation.name} • {message.createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {Math.round(relevanceScore * 100)}% match
            </Badge>
            {analysis && (
              <Badge variant="outline" className="text-xs">
                {analysis.category}
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-gray-800">
            {highlights.length > 0 ? (
              // Highlight search terms
              message.content.split(new RegExp(`(${highlights.join('|')})`, 'gi')).map((part, index) =>
                highlights.some(h => h.toLowerCase() === part.toLowerCase()) ? (
                  <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
                ) : part
              )
            ) : (
              message.content
            )}
          </p>
        </div>

        {analysis?.extractedData && (
          <div className="flex flex-wrap gap-2 text-xs">
            {analysis.extractedData.actionItems?.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {item}
              </Badge>
            ))}
            {analysis.extractedData.designReferences?.map((ref, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {ref}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Analytics panel component
const MessageAnalyticsPanel: React.FC<{ analytics: MessageAnalytics }> = ({ analytics }) => {
  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.totalMessages.toLocaleString()}</div>
            <div className="text-sm text-green-600 flex items-center mt-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.averageResponseTime}h</div>
            <div className="text-sm text-green-600 flex items-center mt-1">
              <Clock className="w-4 h-4 mr-1" />
              Improved by 8%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(analytics.engagementMetrics.reactions + analytics.engagementMetrics.replies).toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 flex items-center mt-1">
              <Heart className="w-4 h-4 mr-1" />
              Reactions & replies
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message types chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Message Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.messagesByType)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([type, count]) => {
                const percentage = (count / analytics.totalMessages) * 100;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Top keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Top Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analytics.topKeywords.map((keyword, index) => (
              <Badge
                key={keyword.word}
                variant={index < 3 ? 'primary' : 'secondary'}
                className="flex items-center gap-1"
              >
                {keyword.word}
                <span className="text-xs opacity-75">({keyword.count})</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.sentimentDistribution).map(([sentiment, value]) => {
              const percentage = value * 100;
              const color = sentiment === 'positive' ? 'bg-green-500' :
                           sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500';

              return (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${color} rounded-full`} />
                    <span className="text-sm font-medium capitalize">{sentiment}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};