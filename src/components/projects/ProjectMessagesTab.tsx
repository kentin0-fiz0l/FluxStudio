/**
 * ProjectMessagesTab - Flux Studio
 *
 * Implements the Messages tab for project detail pages with:
 * - Lazy channel creation (creates channel on first access)
 * - Silent channel creation with loading skeleton
 * - Member sidebar showing all project participants
 * - Reusable ChatMessage components
 * - Toast notifications for channel creation
 * - Mobile responsive design
 *
 * UX Pattern:
 * 1. Show loading skeleton while checking/creating channel
 * 2. Auto-create channel if not exists (silent background operation)
 * 3. Show toast notification when channel is ready
 * 4. Display chat interface with member sidebar
 * 5. Handle errors gracefully with recovery options
 */

import * as React from 'react';
import { Send, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useProjectChannel } from '@/hooks/useProjectChannel';
import { useMessaging } from '@/hooks/useMessaging';
import { ChatMessage, ChatMessageSender } from '@/components/molecules/ChatMessage';
import { Button, Card, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Project } from '@/hooks/useProjects';
import { Message } from '@/types/messaging';

export interface ProjectMessagesTabProps {
  project: Project;
  className?: string;
}

export const ProjectMessagesTab = React.forwardRef<HTMLDivElement, ProjectMessagesTabProps>(
  ({ project, className }, ref) => {
    const { channel, loading, error, createChannel, refresh } = useProjectChannel(project.id);
    const messaging = useMessaging();
    const [messageInput, setMessageInput] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const [channelCreated, setChannelCreated] = React.useState(false);

    // Auto-create channel on mount if it doesn't exist (lazy creation)
    React.useEffect(() => {
      const initializeChannel = async () => {
        if (!channel && !loading && !error && !channelCreated) {
          try {
            const newChannel = await createChannel(project.name, project.members || []);
            if (newChannel) {
              setChannelCreated(true);
              toast.success(`${project.name} chat is ready!`, { duration: 2000 });
            }
          } catch (err) {
            console.error('[ProjectMessagesTab] Failed to create channel:', err);
          }
        }
      };

      initializeChannel();
    }, [channel, loading, error, channelCreated, createChannel, project.name, project.members]);

    // Load messages when channel is ready
    React.useEffect(() => {
      if (channel) {
        messaging.setActiveConversation(channel.id);
      }
      return () => {
        messaging.setActiveConversation(null);
      };
    }, [channel, messaging]);

    // Auto-scroll to bottom when new messages arrive
    React.useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messaging.conversationMessages]);

    // Handle send message
    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageInput.trim() || !channel || sending) return;

      setSending(true);
      try {
        await messaging.sendMessage(channel.id, {
          content: messageInput.trim(),
          type: 'text',
          projectId: project.id,
        });
        setMessageInput('');
      } catch (err) {
        console.error('[ProjectMessagesTab] Failed to send message:', err);
        toast.error('Failed to send message. Please try again.');
      } finally {
        setSending(false);
      }
    };

    // Convert messaging Message to ChatMessage format
    const convertToChatMessage = (msg: Message) => {
      const sender: ChatMessageSender = {
        id: msg.author.id,
        name: msg.author.name,
        avatar: msg.author.avatar,
      };

      return {
        id: msg.id,
        text: msg.content,
        sender,
        timestamp: new Date(msg.createdAt),
        isCurrentUser: msg.author.id === messaging.conversationMessages[0]?.author?.id, // Simple check
        read: msg.status === 'read',
        attachments: msg.attachments?.map((att) => ({
          id: att.id,
          name: att.name,
          size: att.size,
          type: att.type,
          url: att.url,
        })),
      };
    };

    // Loading skeleton during channel creation
    if (loading || (!channel && !error)) {
      return (
        <div ref={ref} className={cn('h-full flex', className)}>
          <div className="flex-1 flex flex-col">
            {/* Loading skeleton */}
            <div className="flex-1 p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-neutral-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-1/4" />
                    <div className="h-16 bg-neutral-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4">
              <div className="h-10 bg-neutral-200 rounded animate-pulse" />
            </div>
          </div>
          {/* Member sidebar skeleton */}
          <div className="hidden lg:block w-60 border-l p-4 space-y-3">
            <div className="h-6 bg-neutral-200 rounded animate-pulse w-1/2" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-neutral-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Error state with recovery option
    if (error) {
      return (
        <div ref={ref} className={cn('h-full flex items-center justify-center p-6', className)}>
          <Card className="max-w-md w-full p-6 text-center">
            <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Failed to Load Chat
            </h3>
            <p className="text-sm text-neutral-600 mb-4">{error}</p>
            <Button
              onClick={() => refresh()}
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              variant="primary"
            >
              Try Again
            </Button>
          </Card>
        </div>
      );
    }

    // Main chat interface
    return (
      <div ref={ref} className={cn('h-full flex', className)}>
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messaging.conversationMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    Start the Conversation
                  </h3>
                  <p className="text-sm text-neutral-600">
                    This is the beginning of the {project.name} project chat. Share updates,
                    ask questions, and collaborate with your team.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messaging.conversationMessages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={convertToChatMessage(msg)}
                    showAvatar
                    showSenderName
                    showTimestamp
                    showReadReceipt
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message ${project.name}...`}
                disabled={sending}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!messageInput.trim() || sending}
                icon={<Send className="h-4 w-4" aria-hidden="true" />}
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </div>

        {/* Member Sidebar - Desktop Only */}
        <div className="hidden lg:block w-60 xl:w-72 border-l bg-white overflow-y-auto">
          <div className="p-4 border-b bg-neutral-50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-neutral-900">Members</h3>
              <Badge variant="outline" size="sm">
                {channel?.participants?.length || project.members?.length || 0}
              </Badge>
            </div>
            <p className="text-xs text-neutral-600">
              Everyone in this project can view messages
            </p>
          </div>

          <div className="p-4 space-y-2">
            {channel?.participants && channel.participants.length > 0 ? (
              channel.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {participant.name}
                    </p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {participant.role || participant.userType || 'Member'}
                    </p>
                  </div>
                  {participant.isOnline && (
                    <div className="w-2 h-2 rounded-full bg-success-500 flex-shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 text-center py-8">
                No members in this channel yet.
              </p>
            )}
          </div>
        </div>

        {/* Mobile Member Sheet - Future Enhancement */}
        {/* Can add a bottom sheet component here for mobile view */}
      </div>
    );
  }
);

ProjectMessagesTab.displayName = 'ProjectMessagesTab';
