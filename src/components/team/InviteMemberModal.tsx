import { motion } from 'framer-motion';
import { UserPlus, Users, Mail, X } from 'lucide-react';
import { UserSearch, UserSearchResult } from '../search/UserSearch';
import { TeamMember, roleConfig } from './teamConfig';

interface InviteMemberModalProps {
  inviteMode: 'search' | 'email';
  inviteEmail: string;
  inviteRole: TeamMember['role'];
  selectedUsersToInvite: UserSearchResult[];
  teamMemberIds: string[];
  onInviteModeChange: (mode: 'search' | 'email') => void;
  onInviteEmailChange: (email: string) => void;
  onInviteRoleChange: (role: TeamMember['role']) => void;
  onSelectedUsersChange: (users: UserSearchResult[]) => void;
  onInvite: () => void;
  onClose: () => void;
}

export function InviteMemberModal({
  inviteMode,
  inviteEmail,
  inviteRole,
  selectedUsersToInvite,
  teamMemberIds,
  onInviteModeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onSelectedUsersChange,
  onInvite,
  onClose,
}: InviteMemberModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invite Team Member</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add new members to your team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close invite modal"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onInviteModeChange('search')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                inviteMode === 'search'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              Search Users
            </button>
            <button
              type="button"
              onClick={() => onInviteModeChange('email')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                inviteMode === 'email'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
              }`}
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              Invite by Email
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {inviteMode === 'search' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search and select users to invite
              </label>
              <UserSearch
                placeholder="Search for users to invite..."
                multiple={true}
                selectedUsers={selectedUsersToInvite}
                excludeUserIds={teamMemberIds}
                onUserSelect={(user) => {
                  if (!selectedUsersToInvite.find(u => u.id === user.id)) {
                    onSelectedUsersChange([...selectedUsersToInvite, user]);
                  }
                }}
                onUserRemove={(userId) => {
                  onSelectedUsersChange(selectedUsersToInvite.filter(u => u.id !== userId));
                }}
                onUsersChange={onSelectedUsersChange}
                allowInviteByEmail={true}
                theme="light"
              />
              {selectedUsersToInvite.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedUsersToInvite.length} user{selectedUsersToInvite.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => onInviteEmailChange(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus={inviteMode === 'email'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(roleConfig).map(([role, config]) => {
                const RoleIcon = config.icon;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onInviteRoleChange(role as TeamMember['role'])}
                    className={`px-3 py-3 rounded-lg border text-sm transition-all text-left ${
                      inviteRole === role
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <RoleIcon className="w-4 h-4" aria-hidden="true" />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs opacity-75">{config.description.split(' ').slice(0, 3).join(' ')}...</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onInvite}
            disabled={inviteMode === 'email' ? !inviteEmail : selectedUsersToInvite.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Send Invite</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
