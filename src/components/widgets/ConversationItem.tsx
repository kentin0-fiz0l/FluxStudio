import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import {
  MessageSquare,
  Pin,
  VolumeX,
  Users,
  Hash,
  Globe,
} from 'lucide-react';
import { Conversation } from '../../types/messaging';

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const getConversationIcon = () => {
    switch (conversation.type) {
      case 'direct':
        return <Users className="h-4 w-4" aria-hidden="true" />;
      case 'project':
        return <Hash className="h-4 w-4" aria-hidden="true" />;
      case 'team':
        return <Users className="h-4 w-4" aria-hidden="true" />;
      case 'broadcast':
        return <Globe className="h-4 w-4" aria-hidden="true" />;
      default:
        return <MessageSquare className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const diffMs = now.getTime() - dateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return `${Math.floor(diffMs / (1000 * 60))}m`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return dateObj.toLocaleDateString();
    }
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      className={`p-3 cursor-pointer border-l-2 transition-colors ${
        isActive
          ? 'bg-white/10 border-l-blue-500'
          : 'border-l-transparent hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Conversation icon/avatar */}
        <div className={`p-2 rounded-lg ${
          isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/70'
        }`}>
          {getConversationIcon()}
        </div>

        {/* Conversation details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-white text-sm truncate">
              {conversation.name}
            </h4>
            <div className="flex items-center gap-2">
              {conversation.metadata.isPinned && (
                <Pin className="h-3 w-3 text-yellow-400" aria-hidden="true" />
              )}
              {conversation.metadata.isMuted && (
                <VolumeX className="h-3 w-3 text-gray-400" aria-hidden="true" />
              )}
              <span className="text-xs text-gray-400">
                {formatLastActivity(conversation.lastActivity)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400 truncate max-w-[180px]">
              {conversation.lastMessage?.content || 'No messages yet'}
            </p>
            {conversation.unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
