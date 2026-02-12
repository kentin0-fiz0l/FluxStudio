/**
 * Enhanced Messages Page - Next-Generation Messaging Interface
 * Integrates all new messaging features: user search, advanced search, mobile optimization, and automation
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Zap,
  Users,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { EnhancedMessageHub } from '../components/messaging/EnhancedMessageHub';
import { AdvancedMessageSearch } from '../components/messaging/AdvancedMessageSearch';
import { MobileMessagingInterface } from '../components/messaging/MobileMessagingInterface';
import { MessageAutomationHub } from '../components/messaging/MessageAutomationHub';
import { UserDirectory } from '../components/UserDirectory';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../hooks/useMessaging';
import { Conversation } from '../types/messaging';
import { cn } from '../lib/utils';

interface EnhancedMessagesProps {
  initialView?: 'conversations' | 'search' | 'automation' | 'directory';
  isMobile?: boolean;
}

export const EnhancedMessages: React.FC<EnhancedMessagesProps> = ({
  initialView = 'conversations',
  isMobile: _isMobile = false
}) => {
  const { user } = useAuth();
  const { conversations: _conversations } = useMessaging();

  const [currentView, setCurrentView] = useState(initialView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Stable timestamp for mock data - computed once on mount
  const [initialTimestamp] = useState(() => Date.now());

  // Mock conversations for demonstration - wrapped in useMemo to avoid recreating on every render
  const mockConversations: Conversation[] = useMemo(() => {
    const now = initialTimestamp;
    return [
      {
        id: 'conv1',
        name: 'Brand Redesign Project',
        type: 'project',
        projectId: 'project1',
        participants: [
          {
            id: 'user1',
            name: 'Sarah Chen',
            userType: 'client',
            avatar: undefined,
            isOnline: true,
            lastSeen: new Date()
          },
          {
            id: 'user2',
            name: 'Mike Johnson',
            userType: 'designer',
            avatar: undefined,
            isOnline: false,
            lastSeen: new Date(now - 30 * 60 * 1000)
          }
        ],
        lastMessage: {
          id: 'msg1',
          content: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
          author: {
            id: 'user1',
            name: 'Sarah Chen',
            userType: 'client'
          },
          createdAt: new Date(now - 15 * 60 * 1000),
          updatedAt: new Date(now - 15 * 60 * 1000),
          type: 'text',
          status: 'read',
          conversationId: 'conv1',
          mentions: [],
          isEdited: false
        },
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 15 * 60 * 1000),
        lastActivity: new Date(now - 15 * 60 * 1000),
        unreadCount: 2,
        metadata: {
          isArchived: false,
          isMuted: false,
          isPinned: false,
          priority: 'medium',
          tags: ['design', 'branding']
        },
        permissions: {
          canWrite: true,
          canAddMembers: true,
          canArchive: true,
          canDelete: false
        },
        createdBy: {
          id: 'user1',
          name: 'Sarah Chen',
          userType: 'client'
        }
      },
      {
        id: 'conv2',
        name: 'Mobile App Design',
        type: 'project',
        projectId: 'project2',
        participants: [
          {
            id: 'user3',
            name: 'Alex Rodriguez',
            userType: 'designer',
            avatar: undefined,
            isOnline: true,
            lastSeen: new Date()
          }
        ],
        lastMessage: {
          id: 'msg2',
          content: 'I\'ve uploaded the wireframes for the checkout flow. Please review when you have a chance.',
          author: {
            id: 'user3',
            name: 'Alex Rodriguez',
            userType: 'designer'
          },
          createdAt: new Date(now - 2 * 60 * 60 * 1000),
          updatedAt: new Date(now - 2 * 60 * 60 * 1000),
          type: 'text',
          status: 'delivered',
          conversationId: 'conv2',
          mentions: [],
          isEdited: false
        },
        createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now - 2 * 60 * 60 * 1000),
        lastActivity: new Date(now - 2 * 60 * 60 * 1000),
        unreadCount: 0,
        metadata: {
          isArchived: false,
          isMuted: false,
          isPinned: false,
          priority: 'medium',
          tags: ['mobile', 'app', 'ux']
        },
        permissions: {
          canWrite: true,
          canAddMembers: true,
          canArchive: true,
          canDelete: false
        },
        createdBy: {
          id: 'user3',
          name: 'Alex Rodriguez',
          userType: 'designer'
        }
      }
    ];
  }, [initialTimestamp]);

  const [activeConversations, _setActiveConversations] = useState(mockConversations);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  // Auto-detect mobile view based on screen size
  useEffect(() => {
    const checkViewMode = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };

    checkViewMode();
    window.addEventListener('resize', checkViewMode);
    return () => window.removeEventListener('resize', checkViewMode);
  }, []);

  // Filter conversations based on search query
  const filteredConversations = activeConversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConv(conversation);
    if (viewMode === 'mobile') {
      setShowMobileMenu(false);
    }
  };

  const formatLastMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return timestamp.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Please log in to access messages
          </h2>
          <p className="text-gray-600">
            You need to be authenticated to view your conversations
          </p>
        </div>
      </div>
    );
  }

  // Mobile view
  if (viewMode === 'mobile') {
    return (
      <div className="h-screen overflow-hidden bg-gray-50">
        {selectedConv ? (
          <MobileMessagingInterface
            conversation={selectedConv}
            onBack={() => setSelectedConv(null)}
            onCall={(_conversationId) => {}}
            onVideoCall={(_conversationId) => {}}
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Mobile header */}
            <header className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(true)}
                    aria-label="Open navigation menu"
                    aria-expanded={showMobileMenu}
                  >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </Button>
                  <h1 className="text-lg font-semibold">Messages</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" aria-label="Search messages">
                    <Search className="w-5 h-5" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Start new conversation">
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Search bar */}
              <div className="mt-3">
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  aria-label="Search conversations"
                  type="search"
                />
              </div>
            </header>

            {/* Conversations list */}
            <nav className="flex-1 overflow-y-auto" aria-label="Conversations">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 text-left min-h-[44px]"
                  aria-label={`${conversation.name}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread messages` : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.participants[0]?.avatar} />
                        <AvatarFallback>
                          {conversation.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.participants[0]?.isOnline && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"
                          aria-label="Online"
                          role="status"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatLastMessageTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Mobile menu overlay */}
            <AnimatePresence>
              {showMobileMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50"
                  onClick={() => setShowMobileMenu(false)}
                  aria-hidden="true"
                >
                  <motion.div
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    exit={{ x: -300 }}
                    className="w-80 h-full bg-white p-6"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation menu"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold">Menu</h2>
                      <Button variant="ghost" size="sm" onClick={() => setShowMobileMenu(false)} aria-label="Close menu">
                        <X className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </div>

                    <nav className="space-y-4" aria-label="Message views">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setCurrentView('conversations');
                          setShowMobileMenu(false);
                        }}
                        aria-current={currentView === 'conversations' ? 'page' : undefined}
                      >
                        <MessageSquare className="w-5 h-5 mr-3" aria-hidden="true" />
                        Conversations
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setCurrentView('search');
                          setShowMobileMenu(false);
                        }}
                        aria-current={currentView === 'search' ? 'page' : undefined}
                      >
                        <Search className="w-5 h-5 mr-3" aria-hidden="true" />
                        Advanced Search
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setCurrentView('automation');
                          setShowMobileMenu(false);
                        }}
                        aria-current={currentView === 'automation' ? 'page' : undefined}
                      >
                        <Zap className="w-5 h-5 mr-3" aria-hidden="true" />
                        Automation
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setCurrentView('directory');
                          setShowMobileMenu(false);
                        }}
                        aria-current={currentView === 'directory' ? 'page' : undefined}
                      >
                        <Users className="w-5 h-5 mr-3" aria-hidden="true" />
                        User Directory
                      </Button>
                    </nav>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 80 : 320 }}
          className="bg-white border-r border-gray-200 flex flex-col"
          aria-label="Messages sidebar"
        >
          {/* Sidebar header */}
          <header className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
              </Button>
            </div>

            {!sidebarCollapsed && (
              <div className="mt-4 space-y-3">
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  aria-label="Search conversations"
                  type="search"
                />

                <div className="flex gap-2">
                  <Select value={currentView} onValueChange={(value) => setCurrentView(value as 'conversations' | 'search' | 'automation' | 'directory')}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversations">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Conversations
                        </div>
                      </SelectItem>
                      <SelectItem value="search">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          Advanced Search
                        </div>
                      </SelectItem>
                      <SelectItem value="automation">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Automation
                        </div>
                      </SelectItem>
                      <SelectItem value="directory">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          User Directory
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" aria-label="Start new conversation">
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </header>

          {/* Sidebar content */}
          {!sidebarCollapsed && currentView === 'conversations' && (
            <nav className="flex-1 overflow-y-auto" aria-label="Conversation list">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className={cn(
                    'w-full p-4 border-b border-gray-100 hover:bg-gray-50 text-left transition-colors min-h-[44px]',
                    selectedConv?.id === conversation.id && 'bg-blue-50 border-r-2 border-r-blue-500'
                  )}
                  aria-current={selectedConv?.id === conversation.id ? 'true' : undefined}
                  aria-label={`${conversation.name}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread messages` : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conversation.participants[0]?.avatar} />
                        <AvatarFallback>
                          {conversation.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.participants[0]?.isOnline && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                          aria-label="Online"
                          role="status"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate text-sm">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatLastMessageTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {filteredConversations.length === 0 && (
                <div className="p-8 text-center" role="status">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-gray-600 mb-4">No conversations found</p>
                  <Button size="sm">Start New Conversation</Button>
                </div>
              )}
            </nav>
          )}

          {sidebarCollapsed && (
            <nav className="flex-1 p-2 space-y-2" aria-label="Quick navigation">
              <Button variant="ghost" size="sm" className="w-full" aria-label="Conversations" onClick={() => { setSidebarCollapsed(false); setCurrentView('conversations'); }}>
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="w-full" aria-label="Search" onClick={() => { setSidebarCollapsed(false); setCurrentView('search'); }}>
                <Search className="w-5 h-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="w-full" aria-label="Automation" onClick={() => { setSidebarCollapsed(false); setCurrentView('automation'); }}>
                <Zap className="w-5 h-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="w-full" aria-label="User Directory" onClick={() => { setSidebarCollapsed(false); setCurrentView('directory'); }}>
                <Users className="w-5 h-5" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden" id="main-content" role="main" aria-label="Message content">
          {currentView === 'conversations' && (
            selectedConv ? (
              <EnhancedMessageHub />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center" role="status">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h2>
                  <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )
          )}

          {currentView === 'search' && (
            <AdvancedMessageSearch
              conversations={activeConversations}
              onClose={() => setCurrentView('conversations')}
            />
          )}

          {currentView === 'automation' && (
            <MessageAutomationHub
              conversations={activeConversations}
              onClose={() => setCurrentView('conversations')}
            />
          )}

          {currentView === 'directory' && (
            <UserDirectory
              currentUserId={user?.id}
              onConnect={(_userId) => {}}
              onMessage={(_userId) => {
                // Create new conversation with user
                setCurrentView('conversations');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};