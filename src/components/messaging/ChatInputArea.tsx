/**
 * ChatInputArea Component
 * Bottom section of the chat panel containing the connection status
 * indicator and the message composer
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ChatInputAreaProps {
  /** Whether connected to real-time */
  isConnected: boolean;
  /** Message composer component (rendered externally) */
  composer: React.ReactNode;
}

export function ChatInputArea({ isConnected, composer }: ChatInputAreaProps) {
  return (
    <>
      {/* Connection status */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Reconnecting...
          </div>
        </div>
      )}

      {/* Message Composer */}
      {composer}
    </>
  );
}

export default ChatInputArea;
