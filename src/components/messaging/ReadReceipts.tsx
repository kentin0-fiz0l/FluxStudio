/**
 * Read Receipts Component
 * Shows who has read a message with visual indicators and detailed view
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Eye, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { MessageUser, MessageStatus } from '../../types/messaging';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../ui/hover-card';

interface ReadReceipt {
  userId: string;
  user: MessageUser;
  readAt: Date;
  status: 'sent' | 'delivered' | 'read';
}

interface ReadReceiptsProps {
  messageId: string;
  messageStatus: MessageStatus;
  author: MessageUser;
  readBy?: ReadReceipt[];
  conversationParticipants: MessageUser[];
  createdAt: Date;
  isOwn: boolean;
  className?: string;
}

export function ReadReceipts({
  messageId,
  messageStatus,
  author,
  readBy = [],
  conversationParticipants,
  createdAt,
  isOwn,
  className
}: ReadReceiptsProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Filter out the author from read receipts
  const receipts = readBy.filter(receipt => receipt.userId !== author.id);

  // Calculate read percentage
  const totalParticipants = conversationParticipants.length - 1; // Exclude author
  const readCount = receipts.filter(r => r.status === 'read').length;
  const readPercentage = totalParticipants > 0 ? (readCount / totalParticipants) * 100 : 0;

  // Format time
  const formatTime = (date: Date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return messageDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (messageStatus) {
      case 'sending':
        return <Clock className="w-3 h-3 animate-pulse text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <span className="text-xs text-red-500">!</span>;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = () => {
    if (messageStatus === 'failed') return 'Failed to send';
    if (messageStatus === 'sending') return 'Sending...';
    if (receipts.length === 0) {
      if (messageStatus === 'sent') return 'Sent';
      if (messageStatus === 'delivered') return 'Delivered';
      return null;
    }

    const readUsers = receipts.filter(r => r.status === 'read');
    if (readUsers.length === 0) return 'Delivered';
    if (readUsers.length === 1) return `Read by ${readUsers[0].user.name}`;
    if (readUsers.length === 2) return `Read by ${readUsers[0].user.name} and ${readUsers[1].user.name}`;
    return `Read by ${readUsers.length} people`;
  };

  // Group receipts by status
  const readReceipts = receipts.filter(r => r.status === 'read');
  const deliveredReceipts = receipts.filter(r => r.status === 'delivered');
  const unreadParticipants = conversationParticipants.filter(
    p => p.id !== author.id && !receipts.some(r => r.userId === p.id)
  );

  if (!isOwn) return null; // Only show for own messages

  return (
    <div className={cn('flex items-center gap-2 mt-1', className)}>
      {/* Status Icon with Hover Card */}
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="cursor-pointer"
          >
            {getStatusIcon()}
          </motion.div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="top" align="end">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Message Status</h4>
              <Badge variant="outline" className="text-xs">
                {messageStatus}
              </Badge>
            </div>

            {/* Status Timeline */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-3 h-3" />
                <span>Sent {formatTime(createdAt)}</span>
              </div>

              {receipts.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCheck className="w-3 h-3" />
                  <span>Delivered to {receipts.length} {receipts.length === 1 ? 'person' : 'people'}</span>
                </div>
              )}

              {readReceipts.length > 0 && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Eye className="w-3 h-3" />
                  <span>Read by {readReceipts.length} {readReceipts.length === 1 ? 'person' : 'people'}</span>
                </div>
              )}
            </div>

            {/* Read Percentage */}
            {totalParticipants > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Read by</span>
                  <span className="font-medium">{Math.round(readPercentage)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${readPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Detailed Receipts */}
            <div className="border-t pt-2 max-h-48 overflow-y-auto">
              {/* Read */}
              {readReceipts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Read ({readReceipts.length})
                  </div>
                  <div className="space-y-1.5">
                    {readReceipts.map((receipt) => (
                      <div key={receipt.userId} className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={receipt.user.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {receipt.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{receipt.user.name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(receipt.readAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivered but not read */}
              {deliveredReceipts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />
                    Delivered ({deliveredReceipts.length})
                  </div>
                  <div className="space-y-1.5">
                    {deliveredReceipts.map((receipt) => (
                      <div key={receipt.userId} className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={receipt.user.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {receipt.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate opacity-60">
                            {receipt.user.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not delivered */}
              {unreadParticipants.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Not delivered ({unreadParticipants.length})
                  </div>
                  <div className="space-y-1.5">
                    {unreadParticipants.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Avatar className="w-5 h-5 opacity-50">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate opacity-50">
                            {user.name}
                          </p>
                        </div>
                        {!user.isOnline && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1">
                            Offline
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Status Text */}
      <span className="text-xs text-muted-foreground">
        {getStatusText()}
      </span>

      {/* Read Avatars (compact view) */}
      {readReceipts.length > 0 && readReceipts.length <= 3 && (
        <div className="flex -space-x-1.5">
          {readReceipts.slice(0, 3).map((receipt) => (
            <motion.div
              key={receipt.userId}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Avatar className="w-4 h-4 border border-background">
                <AvatarImage src={receipt.user.avatar} />
                <AvatarFallback className="text-[8px]">
                  {receipt.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReadReceipts;
