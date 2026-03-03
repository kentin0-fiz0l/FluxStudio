import React from 'react';
import {
  Phone,
  Video,
  Search,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';

interface MobileChatHeaderProps {
  recipient: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
  onBack: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  formatLastSeen: (date: Date) => string;
}

export const MobileChatHeader: React.FC<MobileChatHeaderProps> = ({
  recipient,
  onBack,
  onCall,
  onVideoCall,
  onSearch,
  formatLastSeen,
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              {recipient.avatar ? (
                <img
                  src={recipient.avatar}
                  alt={recipient.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-sm">
                  {recipient.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {recipient.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{recipient.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {recipient.isOnline ? 'Online' :
               recipient.lastSeen ? `Last seen ${formatLastSeen(recipient.lastSeen)}` : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {onSearch && (
          <button
            onClick={onSearch}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Search messages"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        )}

        {onCall && (
          <button
            onClick={onCall}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Voice call"
          >
            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        )}

        {onVideoCall && (
          <button
            onClick={onVideoCall}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Video call"
          >
            <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        )}

        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" aria-label="More options">
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
