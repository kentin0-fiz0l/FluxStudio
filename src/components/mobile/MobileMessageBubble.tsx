import React from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MobileMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'audio';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: {
    type: 'image' | 'file' | 'audio';
    url: string;
    name?: string;
    size?: number;
  }[];
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
}

function MessageStatus({ status }: { status: MobileMessage['status'] }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-gray-400" aria-hidden="true" />;
    case 'sent':
      return <Check className="w-3 h-3 text-gray-400" aria-hidden="true" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-gray-400" aria-hidden="true" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" aria-hidden="true" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-500" aria-hidden="true" />;
    default:
      return null;
  }
}

interface MobileMessageBubbleProps {
  message: MobileMessage;
  isOwnMessage: boolean;
  formatTime: (date: Date) => string;
}

export const MobileMessageBubble: React.FC<MobileMessageBubbleProps> = ({
  message,
  isOwnMessage,
  formatTime,
}) => {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={cn(
        'max-w-[80%] space-y-1',
        isOwnMessage ? 'items-end' : 'items-start'
      )}>
        {/* Reply Context */}
        {message.replyTo && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 mb-1 border-l-2 border-blue-500">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{message.replyTo.sender}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{message.replyTo.content}</p>
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-2 break-words',
          isOwnMessage
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-200 dark:border-gray-700'
        )}>
          {message.type === 'text' && (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}

          {message.type === 'image' && message.attachments && (
            <div className="space-y-2">
              {message.content && (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {message.attachments.map((attachment, index) => (
                  <img
                    key={index}
                    src={attachment.url}
                    alt={attachment.name}
                    className="rounded-lg max-w-full h-auto"
                  />
                ))}
              </div>
            </div>
          )}

          {message.type === 'audio' && (
            <div className="flex items-center space-x-2 py-1">
              <button className="p-1 bg-white/20 rounded-full">
                <Mic className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex-1 bg-white/20 rounded-full h-1">
                <div className="bg-white h-1 rounded-full w-1/3"></div>
              </div>
              <span className="text-xs">0:42</span>
            </div>
          )}
        </div>

        {/* Message Info */}
        <div className={cn(
          'flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400',
          isOwnMessage ? 'justify-end' : 'justify-start'
        )}>
          <span>{formatTime(message.timestamp)}</span>
          {isOwnMessage && <MessageStatus status={message.status} />}
        </div>
      </div>
    </motion.div>
  );
};
