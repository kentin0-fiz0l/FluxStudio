import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Clock,
  Check,
  CheckCheck,
  Edit,
  Trash2,
  Reply,
  Image,
  File,
} from 'lucide-react';
import { Message } from '../../types/messaging';

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

export function MessageBubble({ message, isOwn, showAvatar, onEdit, onDelete, onReply }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" aria-hidden="true" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" aria-hidden="true" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" aria-hidden="true" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid time';
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-white/20 text-white text-xs">
            {message.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && !isOwn && <div className="w-8" />}

      {/* Message content */}
      <div className={`flex-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Author name for non-own messages */}
        {!isOwn && showAvatar && (
          <div className="text-xs text-gray-400 mb-1 px-3">
            {message.author.name}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 relative ${
            isOwn
              ? 'bg-blue-500 text-white ml-auto'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className={`rounded-lg p-3 border ${
                    isOwn ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {attachment.isImage ? (
                      <Image className="h-4 w-4 text-white/70" aria-hidden="true" />
                    ) : (
                      <File className="h-4 w-4 text-white/70" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-white/70">
                        {(attachment.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time and status */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${
            isOwn ? 'text-white/70 justify-end' : 'text-gray-400'
          }`}>
            <span>{formatTime(message.createdAt)}</span>
            {message.isEdited && <span>(edited)</span>}
            {isOwn && getStatusIcon()}
          </div>

          {/* Quick actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute top-0 ${
                  isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                } flex gap-1 bg-slate-800 border border-white/20 rounded-lg p-1`}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReply?.(message.id)}
                  className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Reply className="h-3 w-3" aria-hidden="true" />
                </Button>
                {isOwn && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit?.(message.id)}
                      className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete?.(message.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
