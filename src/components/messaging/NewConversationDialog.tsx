/**
 * NewConversationDialog Component
 * Dialog for creating new direct or group conversations
 *
 * Features:
 * - User search and selection
 * - Multi-user selection for group chats
 * - Group name input
 * - Real-time user search
 */

import {
  MessageCircle,
  Search,
  X,
  Users,
  Check,
  Loader2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import { Button } from '@/components/ui';
import { ChatAvatar } from './ChatMessageBubble';
import type { MessageUser } from './types';

export interface NewConversationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Currently selected users */
  selectedUsers: MessageUser[];
  /** Toggle user selection */
  onToggleUser: (user: MessageUser) => void;
  /** Search term for filtering users */
  searchTerm: string;
  /** Called when search term changes */
  onSearchChange: (term: string) => void;
  /** Group name for multi-user conversations */
  groupName: string;
  /** Called when group name changes */
  onGroupNameChange: (name: string) => void;
  /** Available users to select from */
  availableUsers: MessageUser[];
  /** Whether users are loading */
  isLoading: boolean;
  /** Called when user confirms creating the conversation */
  onCreateConversation: () => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  selectedUsers,
  onToggleUser,
  searchTerm,
  onSearchChange,
  groupName,
  onGroupNameChange,
  availableUsers,
  isLoading,
  onCreateConversation,
}: NewConversationDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-600" />
            New Conversation
          </DialogTitle>
          <DialogDescription>
            Search for team members to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected users chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <div
                  key={u.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  <span>{u.name}</span>
                  <button
                    onClick={() => onToggleUser(u)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Group name input (when multiple users selected) */}
          {selectedUsers.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Group Name (optional)
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* User list */}
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              {searchTerm ? 'Search Results' : 'Team Members'}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {searchTerm ? 'No users found' : 'No team members available'}
                  </p>
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedUsers.some(s => s.id === u.id);
                  return (
                    <button
                      key={u.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                      onClick={() => onToggleUser(u)}
                    >
                      <ChatAvatar user={u} size="md" showStatus />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{u.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {u.isOnline ? (
                            <span className="text-green-600 dark:text-green-400">Online</span>
                          ) : (
                            'Offline'
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={onCreateConversation}
              disabled={selectedUsers.length === 0}
            >
              {selectedUsers.length > 1 ? (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create Group
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Chat
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewConversationDialog;
