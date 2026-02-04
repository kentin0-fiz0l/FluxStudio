/**
 * Enhanced MessageHub Component - Next-Generation Creative Messaging
 * Integrates AI-powered intelligence, visual collaboration, and workflow automation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Folder,
  Bell,
  Search,
  Plus,
  Zap,
  Clock,
  Star,
  Archive,
  Palette,
  FileImage,
  Activity,
  Brain,
  Target,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Conversation, Message, MessageUser } from '../../types/messaging';
import { MessageAnalysis, messageIntelligenceService } from '../../services/messageIntelligenceService';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../hooks/useMessaging';
import { cn } from '../../lib/utils';
import { VisualMessageThread } from './VisualMessageThread';
import { SmartComposer } from './SmartComposer';
import { QuickActionPanel } from './QuickActionPanel';
import { ActivityFeed } from './ActivityFeed';
import { PresenceIndicators } from './PresenceIndicators';
import { ConversationIntelligencePanel } from './ConversationIntelligencePanel';

interface EnhancedMessageHubProps {
  className?: string;
}

type ViewMode = 'unified' | 'projects' | 'clients' | 'teams' | 'activity' | 'intelligence';
type FilterType = 'all' | 'unread' | 'priority' | 'mentions' | 'files' | 'urgent' | 'pending';

export function EnhancedMessageHub({ className }: EnhancedMessageHubProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationMessages,
    setActiveConversation,
    filterConversations,
    sendMessage,
    createConversation,
    isLoading,
  } = useMessaging();

  // Suppress unused variable warnings - available for future use
  void createConversation;
  void isLoading;

  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);
  const [messageAnalyses, setMessageAnalyses] = useState<Record<string, MessageAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Convert conversationMessages array to Record<string, Message[]> for compatibility
  // This maps the active conversation's messages to its ID
  const messagesByConversation = useMemo((): Record<string, Message[]> => {
    if (!activeConversation) return {};
    return { [activeConversation.id]: conversationMessages };
  }, [activeConversation, conversationMessages]);

  // Analyze messages for intelligence features
  useEffect(() => {
    const analyzeAllMessages = async () => {
      if (!conversations.length) return;

      setIsAnalyzing(true);
      const newAnalyses: Record<string, MessageAnalysis> = {};

      try {
        for (const conversation of conversations) {
          const messages = messagesByConversation[conversation.id] || [];
          for (const message of messages) {
            if (!newAnalyses[message.id]) {
              const analysis = await messageIntelligenceService.analyzeMessage(message, conversation);
              newAnalyses[message.id] = analysis;
            }
          }
        }
        setMessageAnalyses(prev => ({ ...prev, ...newAnalyses }));
      } catch (error) {
        console.error('Failed to analyze messages:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeAllMessages();
  }, [conversations, messagesByConversation]);

  // Smart context detection - enhanced grouping with AI insights
  const contextualConversations = useMemo(() => {
    console.log('[EnhancedMessageHub] Starting contextualConversations filter');
    console.log('[EnhancedMessageHub] conversations:', conversations);

    const filtered = conversations.filter(conv => {
      if (!conv) {
        console.error('[EnhancedMessageHub] Undefined conversation in filter');
        return false;
      }
      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return conv.name.toLowerCase().includes(searchLower) ||
               conv.lastMessage?.content.toLowerCase().includes(searchLower);
      }
      return true;
    });

    // Apply type filters with AI enhancement
    filterConversations({
      hasUnread: filterType === 'unread',
      priority: filterType === 'priority' ? 'high' : undefined,
    });

    // Enhanced AI-powered filtering
    let aiFiltered = [...filtered];
    if (filterType === 'urgent') {
      aiFiltered = aiFiltered.filter(conv => {
        if (!conv || !conv.id) {
          console.error('[EnhancedMessageHub] Invalid conversation in urgent filter:', conv);
          return false;
        }
        const messages = messagesByConversation[conv.id] || [];
        return messages.some((msg: Message) => {
          if (!msg || !msg.id) {
            console.error('[EnhancedMessageHub] Invalid message in urgent filter for conv:', conv.id, msg);
            return false;
          }
          const analysis = messageAnalyses[msg.id];
          return analysis && (analysis.urgency === 'critical' || analysis.urgency === 'high');
        });
      });
    }

    if (filterType === 'pending') {
      aiFiltered = aiFiltered.filter(conv => {
        if (!conv || !conv.id) {
          console.error('[EnhancedMessageHub] Invalid conversation in pending filter:', conv);
          return false;
        }
        const messages = messagesByConversation[conv.id] || [];
        return messages.some((msg: Message) => {
          if (!msg || !msg.id) {
            console.error('[EnhancedMessageHub] Invalid message in pending filter for conv:', conv.id, msg);
            return false;
          }
          const analysis = messageAnalyses[msg.id];
          return analysis && (
            analysis.intent === 'action-required' ||
            analysis.category === 'approval-request' ||
            analysis.category === 'question'
          );
        });
      });
    }

    // Group by context with AI insights
    const grouped = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      thisWeek: [] as Conversation[],
      older: [] as Conversation[],
      pinned: [] as Conversation[],
      urgent: [] as Conversation[],
      pending: [] as Conversation[],
      projects: new Map<string, Conversation[]>(),
      clients: new Map<string, Conversation[]>()
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    aiFiltered.forEach(conv => {
      const lastActivity = new Date(conv.lastActivity);

      // Check for AI-detected urgency
      const hasUrgentMessages = (messagesByConversation[conv.id] || []).some((msg: Message) => {
        if (!msg || !msg.id) {
          console.error('[EnhancedMessageHub] Invalid message in urgency check:', msg);
          return false;
        }
        const analysis = messageAnalyses[msg.id];
        return analysis && (analysis.urgency === 'critical' || analysis.urgency === 'high');
      });

      // Check for pending actions
      const hasPendingActions = (messagesByConversation[conv.id] || []).some((msg: Message) => {
        if (!msg || !msg.id) {
          console.error('[EnhancedMessageHub] Invalid message in pending check:', msg);
          return false;
        }
        const analysis = messageAnalyses[msg.id];
        return analysis && (
          analysis.intent === 'action-required' ||
          analysis.category === 'approval-request' ||
          analysis.category === 'question'
        );
      });

      // Prioritize urgent and pending conversations
      if (hasUrgentMessages) {
        grouped.urgent.push(conv);
      } else if (hasPendingActions) {
        grouped.pending.push(conv);
      } else if (conv.metadata?.isPinned) {
        grouped.pinned.push(conv);
      } else if (lastActivity >= today) {
        grouped.today.push(conv);
      } else if (lastActivity >= yesterday) {
        grouped.yesterday.push(conv);
      } else if (lastActivity >= weekAgo) {
        grouped.thisWeek.push(conv);
      } else {
        grouped.older.push(conv);
      }

      // Group by projects
      if (conv.type === 'project' && conv.projectId) {
        if (!grouped.projects.has(conv.projectId)) {
          grouped.projects.set(conv.projectId, []);
        }
        grouped.projects.get(conv.projectId)!.push(conv);
      }

      // Group by clients - with comprehensive safety checks
      console.log('[EnhancedMessageHub] Filtering participants for conv:', conv.id, 'participants:', conv.participants);
      if (conv.participants && Array.isArray(conv.participants)) {
        const clientParticipants = conv.participants.filter(p => {
          if (!p) {
            console.error('[EnhancedMessageHub] Undefined participant in conv:', conv.id);
            return false;
          }
          if (!p.id && !p.name) {
            console.error('[EnhancedMessageHub] Participant missing both id and name:', p);
            return false;
          }
          return p.userType === 'client' || p.name?.includes('client') || p.name?.includes('director');
        });
        clientParticipants.forEach(client => {
          if (!client || (!client.id && !client.name)) {
            console.error('[EnhancedMessageHub] Invalid client participant:', client);
            return;
          }
          const clientKey = client.id || client.name || 'unknown';
          if (!grouped.clients.has(clientKey)) {
            grouped.clients.set(clientKey, []);
          }
          grouped.clients.get(clientKey)!.push(conv);
        });
      } else {
        console.error('[EnhancedMessageHub] Invalid participants array for conv:', conv.id, conv.participants);
      }
    });

    return grouped;
  }, [conversations, searchQuery, filterType, messagesByConversation, messageAnalyses, filterConversations]);

  const ConversationCard = ({ conversation, isActive }: {
    conversation: Conversation;
    isActive?: boolean;
  }) => {
    const messages = messagesByConversation[conversation.id] || [];
    const urgentCount = messages.filter((msg: Message) => {
      if (!msg || !msg.id) {
        console.error('[EnhancedMessageHub] Invalid message in urgentCount filter:', msg);
        return false;
      }
      const analysis = messageAnalyses[msg.id];
      return analysis && (analysis.urgency === 'critical' || analysis.urgency === 'high');
    }).length;

    const pendingCount = messages.filter((msg: Message) => {
      if (!msg || !msg.id) {
        console.error('[EnhancedMessageHub] Invalid message in pendingCount filter:', msg);
        return false;
      }
      const analysis = messageAnalyses[msg.id];
      return analysis && (
        analysis.intent === 'action-required' ||
        analysis.category === 'approval-request'
      );
    }).length;

    const questionCount = messages.filter((msg: Message) => {
      if (!msg || !msg.id) {
        console.error('[EnhancedMessageHub] Invalid message in questionCount filter:', msg);
        return false;
      }
      const analysis = messageAnalyses[msg.id];
      return analysis && analysis.category === 'question';
    }).length;

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'p-3 rounded-lg border cursor-pointer transition-all duration-200',
          isActive
            ? 'bg-blue-50 border-blue-200 shadow-sm'
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        )}
        onClick={() => setActiveConversation(conversation.id)}
      >
        <div className="flex gap-3">
          {/* Conversation Type Icon */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            conversation.type === 'project' ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
            conversation.type === 'direct' ? 'bg-gradient-to-br from-green-500 to-teal-600' :
            conversation.type === 'team' ? 'bg-gradient-to-br from-orange-500 to-red-600' :
            'bg-gradient-to-br from-gray-500 to-gray-600'
          )}>
            {conversation.type === 'project' && <Folder size={18} className="text-white" />}
            {conversation.type === 'direct' && <MessageSquare size={18} className="text-white" />}
            {conversation.type === 'team' && <Users size={18} className="text-white" />}
            {conversation.type === 'support' && <Bell size={18} className="text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with AI insights */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {conversation.name}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* AI-powered indicators */}
                {urgentCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs">
                    {urgentCount} urgent
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 text-xs">
                    {pendingCount} pending
                  </Badge>
                )}
                {questionCount > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                    {questionCount} ?
                  </Badge>
                )}
                {conversation.metadata?.isPinned && (
                  <Star size={12} className="text-yellow-500 fill-current" />
                )}
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(new Date(conversation.lastActivity))}
                </span>
              </div>
            </div>

            {/* Last message preview with sentiment */}
            {conversation.lastMessage && (
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={conversation.lastMessage.author?.avatar} />
                  <AvatarFallback className="text-xs">
                    {conversation.lastMessage.author?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-600 truncate flex-1">
                  {conversation.lastMessage.content}
                </p>
                {/* Sentiment indicator */}
                {messageAnalyses[conversation.lastMessage.id] && (
                  <div className="flex-shrink-0">
                    {messageAnalyses[conversation.lastMessage.id].extractedData.emotions?.includes('positive') && (
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    )}
                    {messageAnalyses[conversation.lastMessage.id].extractedData.emotions?.includes('concerned') && (
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    )}
                    {messageAnalyses[conversation.lastMessage.id].extractedData.emotions?.includes('negative') && (
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer with enhanced metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {conversation.type}
                </Badge>
                {conversation.lastMessage?.attachments && conversation.lastMessage.attachments.length > 0 && (
                  <FileImage size={12} className="text-gray-400" />
                )}
              </div>

              {conversation.unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const ConversationSection = ({ title, conversations, icon: Icon, color }: {
    title: string;
    conversations: Conversation[];
    icon?: React.ElementType;
    color?: string;
  }) => {
    if (conversations.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon size={16} className={cn('text-gray-600', color && `text-${color}`)} />}
          <h2 className={cn(
            'font-semibold text-sm uppercase tracking-wide',
            color ? `text-${color}` : 'text-gray-700'
          )}>
            {title}
          </h2>
          <Badge variant="outline" className="text-xs">
            {conversations.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {conversations.map(conv => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isActive={activeConversation?.id === conv.id}
            />
          ))}
        </div>
      </div>
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Used by ConversationIntelligencePanel for workflow automation
  const handleActionTrigger = (action: string, data?: unknown) => {
    // Handle workflow automation triggers
    console.log('Action triggered:', action, data);
  };

  return (
    <div className={cn('h-full bg-gray-50 flex', className)}>
      {/* Enhanced Sidebar with Intelligence Toggle */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Palette className="text-blue-600" size={20} />
              Creative Hub
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIntelligencePanel(!showIntelligencePanel)}
                className={cn(
                  'h-8 w-8 p-0',
                  showIntelligencePanel ? 'bg-blue-100 text-blue-600' : 'text-gray-400'
                )}
              >
                <Brain size={16} />
              </Button>
              {isAnalyzing && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw size={14} className="text-blue-500" />
                </motion.div>
              )}
            </div>
          </div>

          {/* View Mode Selector */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid grid-cols-3 w-full bg-gray-100">
              <TabsTrigger value="unified" className="text-xs">Unified</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
              <TabsTrigger value="intelligence" className="text-xs">AI</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {[
              { id: 'unified', label: 'All Messages', icon: MessageSquare, count: conversations.length },
              { id: 'projects', label: 'Projects', icon: Folder, count: contextualConversations.projects.size },
              { id: 'clients', label: 'Clients', icon: Users, count: contextualConversations.clients.size },
              { id: 'activity', label: 'Activity', icon: Activity, count: 0 },
              { id: 'intelligence', label: 'AI Insights', icon: Brain, count: Object.keys(messageAnalyses).length }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id as ViewMode)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    viewMode === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon size={16} />
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  {item.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Conversations List - Enhanced with AI */}
        {viewMode !== 'activity' && viewMode !== 'intelligence' && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <div className="flex items-center gap-2">
                  {/* Presence Indicators */}
                  {activeConversation && (
                    <PresenceIndicators
                      conversationId={activeConversation.id}
                      currentUser={user as MessageUser}
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => setShowQuickActions(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} className="mr-1" />
                    New
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Enhanced Filters with AI */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'unread', 'urgent', 'pending', 'priority', 'mentions'] as FilterType[]).map(filter => (
                  <Button
                    key={filter}
                    variant={filterType === filter ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setFilterType(filter)}
                    className="text-xs capitalize"
                  >
                    {filter === 'urgent' && <Zap size={12} className="mr-1" />}
                    {filter === 'pending' && <Clock size={12} className="mr-1" />}
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conversations with AI-Enhanced Grouping */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'unified' && (
                <>
                  <ConversationSection
                    title="Urgent"
                    conversations={contextualConversations.urgent}
                    icon={Zap}
                    color="red-600"
                  />
                  <ConversationSection
                    title="Pending Actions"
                    conversations={contextualConversations.pending}
                    icon={Target}
                    color="orange-600"
                  />
                  <ConversationSection
                    title="Pinned"
                    conversations={contextualConversations.pinned}
                    icon={Star}
                    color="yellow-600"
                  />
                  <ConversationSection
                    title="Today"
                    conversations={contextualConversations.today}
                    icon={Clock}
                  />
                  <ConversationSection
                    title="Yesterday"
                    conversations={contextualConversations.yesterday}
                  />
                  <ConversationSection
                    title="This Week"
                    conversations={contextualConversations.thisWeek}
                  />
                  <ConversationSection
                    title="Older"
                    conversations={contextualConversations.older}
                    icon={Archive}
                  />
                </>
              )}

              {viewMode === 'projects' && (
                <>
                  {Array.from(contextualConversations.projects.entries()).map(([projectId, convs]) => (
                    <ConversationSection
                      key={projectId}
                      title={`Project: ${projectId}`}
                      conversations={convs}
                      icon={Folder}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'activity' ? (
            <ActivityFeed />
          ) : viewMode === 'intelligence' ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <ConversationIntelligencePanel
                conversations={conversations}
                messages={messagesByConversation}
                messageAnalyses={messageAnalyses}
                currentUserId={user?.id || ''}
                onConversationSelect={(id) => {
                  setActiveConversation(id);
                  setViewMode('unified');
                }}
                onActionTrigger={handleActionTrigger}
              />
            </div>
          ) : activeConversation ? (
            <>
              {/* Enhanced Visual Message Thread */}
              <div className="flex-1 overflow-hidden">
                <VisualMessageThread
                  conversation={activeConversation}
                  messages={messagesByConversation[activeConversation.id] || []}
                  currentUser={user as MessageUser}
                />
              </div>

              {/* Smart Composer */}
              <div className="border-t border-gray-200 p-4">
                <SmartComposer
                  conversation={activeConversation}
                  currentUser={user as MessageUser}
                  onSendMessage={async (content, attachments) => {
                    try {
                      if (!user || !activeConversation) return;

                      await sendMessage(activeConversation.id, {
                        content,
                        type: attachments && attachments.length > 0 ? 'file' : 'text',
                        attachments: attachments || [],
                        priority: 'medium'
                      });
                    } catch (error) {
                      console.error('Failed to send message:', error);
                    }
                  }}
                  aiSuggestions={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  AI-Powered Creative Messaging
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Select a conversation to start collaborating with intelligent message analysis,
                  automated workflows, and visual design integration.
                </p>
                <Button
                  onClick={() => setShowQuickActions(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-2" />
                  Start New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Panel Sidebar */}
        <AnimatePresence>
          {showIntelligencePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white border-l border-gray-200 overflow-hidden"
            >
              <div className="p-4 h-full overflow-y-auto">
                <ConversationIntelligencePanel
                  conversations={conversations}
                  messages={messagesByConversation}
                  messageAnalyses={messageAnalyses}
                  currentUserId={user?.id || ''}
                  onConversationSelect={(id) => {
                    setActiveConversation(id);
                  }}
                  onActionTrigger={handleActionTrigger}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <QuickActionPanel
            isOpen={showQuickActions}
            onClose={() => setShowQuickActions(false)}
            currentUser={user as MessageUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnhancedMessageHub;