/**
 * ConversationInfoPanel Component
 *
 * Slide-out right panel showing conversation details:
 * - Avatar, name, type
 * - Members with online status
 * - Mute/archive toggles
 */

import { useState, useEffect } from 'react';
import { X, Users, Bell, BellOff, Archive, ArchiveRestore } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { ChatAvatar } from './ChatMessageBubble';
import { apiService } from '@/services/apiService';
import type { Conversation, MessageUser } from './types';

export interface ConversationInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onMute: () => void;
  onArchive: () => void;
}

interface MemberInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
}

export function ConversationInfoPanel({
  conversation,
  onClose,
  onMute,
  onArchive,
}: ConversationInfoPanelProps) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      setIsLoadingMembers(true);
      try {
        const res = await apiService.get<{ members: Array<{ userId: string; role: string; user: { id: string; name: string; email: string; avatar_url?: string } }> }>(
          `/conversations/${conversation.id}/members`
        );
        const memberList = (res.data?.members || []).map(m => ({
          id: m.user?.id || m.userId,
          name: m.user?.name || m.user?.email?.split('@')[0] || 'Unknown',
          email: m.user?.email,
          avatar: m.user?.avatar_url,
          role: m.role,
          isOnline: false,
        }));
        setMembers(memberList);
      } catch {
        // Use participant data from the conversation as fallback
        const fallback: MemberInfo[] = conversation.participants?.map(p => ({
          id: p.id,
          name: p.name,
          isOnline: p.isOnline,
        })) || [];
        setMembers(fallback);
      } finally {
        setIsLoadingMembers(false);
      }
    }

    loadMembers();
  }, [conversation.id, conversation.participants]);

  return (
    <Card className="w-80 flex-shrink-0 flex flex-col border-l border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Conversation Info
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          aria-label="Close info panel"
        >
          <X className="w-4 h-4 text-neutral-500" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Conversation identity */}
        <div className="p-6 flex flex-col items-center text-center border-b border-neutral-200 dark:border-neutral-700">
          <ChatAvatar user={conversation.participant} size="lg" showStatus />
          <h4 className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100 text-lg">
            {conversation.title}
          </h4>
          <Badge variant="outline" className="mt-1">
            {conversation.type === 'group' ? 'Group' : 'Direct Message'}
          </Badge>
          {conversation.projectName && (
            <span className="mt-2 text-xs text-neutral-500">
              {conversation.projectName}
            </span>
          )}
        </div>

        {/* Members */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-neutral-500" aria-hidden="true" />
            <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Members ({members.length || conversation.participants?.length || 2})
            </h5>
          </div>

          {isLoadingMembers ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <ChatAvatar
                    user={{ id: member.id, name: member.name, initials: member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), avatar: member.avatar, isOnline: member.isOnline } as MessageUser}
                    size="sm"
                    showStatus
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {member.name}
                    </p>
                    {member.role && member.role !== 'member' && (
                      <Badge variant="outline" size="sm" className="text-[10px]">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  {member.isOnline && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-4">
          <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Settings
          </h5>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={onMute}
            >
              {conversation.isMuted ? (
                <>
                  <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-2" aria-hidden="true" />
                  Mute notifications
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={onArchive}
            >
              {conversation.isArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4 mr-2" aria-hidden="true" />
                  Unarchive conversation
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
                  Archive conversation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ConversationInfoPanel;
