/**
 * Project Messaging Integration Component
 * Integrates messaging system with existing project and user management
 */

import { useEffect, useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMessaging, CreateConversationDialog } from './index';
import { MessageUser, ConversationType } from '../../types/messaging';

interface ProjectMessagingIntegrationProps {
  projectId?: string;
  projectName?: string;
  projectMembers?: any[];
  currentUser: MessageUser;
  onOpenMessaging: () => void;
  className?: string;
}

export function ProjectMessagingIntegration({
  projectId,
  projectName,
  projectMembers = [],
  currentUser,
  onOpenMessaging,
  className
}: ProjectMessagingIntegrationProps) {
  const { state, actions } = useMessaging();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectConversations, setProjectConversations] = useState<any[]>([]);

  useEffect(() => {
    if (projectId) {
      // Use async IIFE to properly handle async setState
      (async () => {
        try {
          await actions.loadConversations();
          const filtered = state.conversations.filter(conv => conv.projectId === projectId);
          setProjectConversations(filtered);
        } catch (_error) {
          // Error handled silently - load failures are non-critical
        }
      })();
    }
  }, [projectId, actions, state.conversations]);

  const handleCreateProjectChannel = async () => {
    if (!projectId || !projectName) return;

    try {
      const conversation = await actions.createConversation({
        type: 'project' as ConversationType,
        name: `${projectName} - General`,
        description: `Main discussion channel for ${projectName}`,
        participants: [currentUser.id, ...projectMembers.map(m => m.id)],
        projectId,
        metadata: {
          priority: 'medium',
          isArchived: false,
          isMuted: false,
          isPinned: true,
          tags: ['project', 'general'],
        },
      });

      setProjectConversations(prev => [conversation, ...prev]);
      onOpenMessaging();
    } catch (error) {
      console.error('Failed to create project channel:', error);
    }
  };

  const unreadProjectMessages = projectConversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Project Communication
          </div>

          {unreadProjectMessages > 0 && (
            <Badge className="bg-blue-500 text-white">
              {unreadProjectMessages} unread
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold text-primary">
              {projectConversations.length}
            </div>
            <div className="text-xs text-muted-foreground">Channels</div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {projectMembers.filter(m => m.isOnline).length}
            </div>
            <div className="text-xs text-muted-foreground">Online</div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold text-orange-600">
              {unreadProjectMessages}
            </div>
            <div className="text-xs text-muted-foreground">Unread</div>
          </div>
        </div>

        {/* Project Channels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Project Channels</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>

          {projectConversations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">No project channels yet</p>
              <Button onClick={handleCreateProjectChannel} size="sm">
                Create General Channel
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projectConversations.slice(0, 3).map(conversation => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={onOpenMessaging}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{conversation.name}</div>
                    {conversation.lastMessage && (
                      <div className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </div>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              ))}

              {projectConversations.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenMessaging}
                  className="w-full"
                >
                  View all {projectConversations.length} channels
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Online Team Members */}
        <div>
          <h4 className="font-medium text-sm mb-3">Online Team Members</h4>

          {projectMembers.filter(m => m.isOnline).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No team members online
            </p>
          ) : (
            <div className="flex -space-x-2">
              {projectMembers
                .filter(m => m.isOnline)
                .slice(0, 5)
                .map(member => (
                  <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}

              {projectMembers.filter(m => m.isOnline).length > 5 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{projectMembers.filter(m => m.isOnline).length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button onClick={onOpenMessaging} className="flex-1">
            <MessageCircle className="w-4 h-4 mr-2" />
            Open Messages
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Create Conversation Dialog */}
        <CreateConversationDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onConversationCreated={(conversation) => {
            setProjectConversations(prev => [conversation, ...prev]);
            setShowCreateDialog(false);
            onOpenMessaging();
          }}
          currentUser={currentUser}
          initialType="project"
          initialParticipants={projectMembers}
        />
      </CardContent>
    </Card>
  );
}

export default ProjectMessagingIntegration;