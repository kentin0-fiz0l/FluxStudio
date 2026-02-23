import React, { useState } from 'react';
import { X, Mail, Send, UserPlus, Users } from 'lucide-react';
import { UserSearch, UserSearchResult } from './search/UserSearch';

interface InviteMembersProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onInvite: (teamId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  onInviteUsers?: (teamId: string, users: UserSearchResult[], role: 'admin' | 'member') => Promise<void>;
  existingMemberIds?: string[];
}

export function InviteMembers({
  teamId,
  teamName,
  onClose,
  onInvite,
  onInviteUsers,
  existingMemberIds = []
}: InviteMembersProps) {
  const [email, setEmail] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<'search' | 'email'>('search');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inviteMode === 'email') {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        await onInvite(teamId, email.trim(), role);
        setSuccessMessage(`Invitation sent to ${email}`);
        setEmail('');
        setRole('member');

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invitation');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle user search mode
      if (selectedUsers.length === 0) {
        setError('Please select at least one user to invite');
        return;
      }

      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        if (onInviteUsers) {
          await onInviteUsers(teamId, selectedUsers, role);
        } else {
          // Fallback: invite each user individually via email
          for (const user of selectedUsers) {
            await onInvite(teamId, user.email, role);
          }
        }

        const userCount = selectedUsers.length;
        setSuccessMessage(
          `Invitation${userCount > 1 ? 's' : ''} sent to ${userCount} user${userCount > 1 ? 's' : ''}`
        );
        setSelectedUsers([]);
        setRole('member');

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invitations');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      setError(null);
    }
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleUsersChange = (users: UserSearchResult[]) => {
    setSelectedUsers(users);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-purple-400" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Invite Members</h2>
              <p className="text-sm text-white/60">to {teamName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close invite dialog"
          >
            <X className="w-5 h-5 text-white/60" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setInviteMode('search')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                inviteMode === 'search'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
              aria-pressed={inviteMode === 'search'}
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              Search Users
            </button>
            <button
              type="button"
              onClick={() => setInviteMode('email')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                inviteMode === 'email'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
              aria-pressed={inviteMode === 'email'}
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              Invite by Email
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {inviteMode === 'search' ? (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Search and select users to invite
              </label>
              <UserSearch
                placeholder="Search for users to invite..."
                multiple={true}
                selectedUsers={selectedUsers}
                excludeUserIds={existingMemberIds}
                onUserSelect={handleUserSelect}
                onUserRemove={handleUserRemove}
                onUsersChange={handleUsersChange}
                allowInviteByEmail={true}
                theme="dark"
              />
              {selectedUsers.length > 0 && (
                <p className="text-xs text-white/60 mt-2">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="colleague@example.com"
                  autoFocus={inviteMode === 'email'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('member')}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  role === 'member'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
                aria-pressed={role === 'member'}
              >
                <div className="font-medium">Member</div>
                <div className="text-xs mt-1 opacity-80">Can view and edit</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  role === 'admin'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
                aria-pressed={role === 'admin'}
              >
                <div className="font-medium">Admin</div>
                <div className="text-xs mt-1 opacity-80">Can manage team</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg" role="alert">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg" role="status">
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Send className="w-5 h-5" aria-hidden="true" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}