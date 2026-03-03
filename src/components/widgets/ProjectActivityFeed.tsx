import { motion } from 'framer-motion';
import {
  MessageSquare,
  Paperclip,
} from 'lucide-react';
import { useMessaging } from '../../hooks/useMessaging';
import { LazyImage } from '../LazyImage';

export function ProjectActivityFeed({ projectId }: { projectId: string }) {
  const { conversations, conversationMessages } = useMessaging();

  // Get project-related conversations
  const projectConversations = conversations.filter(conv =>
    conv.projectId === projectId || conv.type === 'project'
  );

  // conversationMessages is for the active conversation only (Message[])
  // Filter to show only messages from project conversations
  const projectConversationIds = new Set(projectConversations.map(c => c.id));
  const recentMessages = conversationMessages
    .filter(msg => projectConversationIds.has(msg.conversationId))
    .sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
    })
    .slice(0, 5);

  if (recentMessages.length === 0) {
    return (
      <div className="p-6 text-center">
        <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
        <p className="text-gray-500 text-sm">No recent project activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentMessages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {message.author.avatar ? (
              <LazyImage
                src={message.author.avatar}
                alt={message.author.name}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">
                {message.author.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">{message.author.name}</span>
              <span className="text-xs text-gray-500">
                {(() => {
                  const dateObj = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
                  return isNaN(dateObj.getTime()) ? 'Invalid time' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>

            {message.attachments && message.attachments.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Paperclip size={12} className="text-gray-400" aria-hidden="true" />
                <span className="text-xs text-gray-500">
                  {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
