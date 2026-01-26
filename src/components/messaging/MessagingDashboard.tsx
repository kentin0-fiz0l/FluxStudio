/**
 * Messaging Dashboard Component
 * Main dashboard that combines all messaging features into a unified interface
 */

import { useState, useEffect } from 'react';
import { Plus, Bell, Search, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Conversation, MessageUser, ConversationType } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import ConversationList from './ConversationList';
import MessageInterface from './MessageInterface';
import NotificationCenter from './NotificationCenter';
import CreateConversationDialog from './CreateConversationDialog';
import UserPresenceIndicator from './UserPresenceIndicator';
import { cn } from '../../lib/utils';

interface MessagingDashboardProps {
  currentUser: MessageUser;
  className?: string;
}

export function MessagingDashboard({ currentUser, className }: MessagingDashboardProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<MessageUser[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');

  useEffect(() => {
    // Set current user in messaging service
    messagingService.setCurrentUser(currentUser);

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Load initial data
    loadUnreadNotifications();

    // Set up real-time listeners
    setupRealtimeListeners();

    return () => {
      window.removeEventListener('resize', checkMobile);
      cleanupRealtimeListeners();
    };
  }, [currentUser]);

  const loadUnreadNotifications = async () => {
    try {
      const notifications = await messagingService.getNotifications({
        unreadOnly: true,
        limit: 1,
      });
      setUnreadNotifications(notifications.length);
    } catch (error) {
      console.error('Failed to load unread notifications:', error);
    }
  };

  const setupRealtimeListeners = () => {
    // Listen for new notifications
    messagingService.onMentionReceived((notification) => {
      setUnreadNotifications(prev => prev + 1);
    });

    // Listen for user presence updates
    messagingService.onUserOnline((user) => {
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.id !== user.userId);
        return [...filtered, user];
      });
    });

    messagingService.onUserOffline((user) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== user.userId));
    });
  };

  const cleanupRealtimeListeners = () => {
    // Remove listeners when component unmounts
    messagingService.off('notification:mention', () => {});
    messagingService.off('user:online', () => {});
    messagingService.off('user:offline', () => {});
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setActiveTab('messages');
    }
  };

  const handleCreateConversation = () => {
    setShowCreateDialog(true);
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowCreateDialog(false);
    if (isMobile) {
      setActiveTab('messages');
    }
  };

  // Mobile layout with tabs
  if (isMobile) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[16px] h-4">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCreateConversation}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conversations">Chats</TabsTrigger>
            <TabsTrigger value="messages">
              {selectedConversation ? selectedConversation.name : 'Messages'}
            </TabsTrigger>
            <TabsTrigger value="presence">Online</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="flex-1 mt-0">
            <ConversationList
              selectedConversationId={selectedConversation?.id}
              onConversationSelect={handleConversationSelect}
              onCreateConversation={handleCreateConversation}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="messages" className="flex-1 mt-0">
            <MessageInterface
              conversation={selectedConversation}
              currentUser={currentUser}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="presence" className="flex-1 mt-0">
            <UserPresenceIndicator
              onlineUsers={onlineUsers}
              currentUser={currentUser}
              className="h-full"
            />
          </TabsContent>
        </Tabs>

        {/* Mobile Dialogs */}
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

        <CreateConversationDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onConversationCreated={handleConversationCreated}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <div className={cn("h-full flex", className)}>
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[16px] h-4">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCreateConversation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-lg font-semibold text-primary">
                {onlineUsers.length}
              </div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="text-lg font-semibold text-green-600">
                {unreadNotifications}
              </div>
              <div className="text-xs text-muted-foreground">Unread</div>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="conversations" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="presence">
                <Users className="w-4 h-4 mr-2" />
                Online ({onlineUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="flex-1 mt-4">
              <ConversationList
                selectedConversationId={selectedConversation?.id}
                onConversationSelect={handleConversationSelect}
                onCreateConversation={handleCreateConversation}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="presence" className="flex-1 mt-4">
              <UserPresenceIndicator
                onlineUsers={onlineUsers}
                currentUser={currentUser}
                className="h-full"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <MessageInterface
          conversation={selectedConversation}
          currentUser={currentUser}
          className="h-full"
        />
      </div>

      {/* Dialogs */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <CreateConversationDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConversationCreated={handleConversationCreated}
        currentUser={currentUser}
      />
    </div>
  );
}

export default MessagingDashboard;