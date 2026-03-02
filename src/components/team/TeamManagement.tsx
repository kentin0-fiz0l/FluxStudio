import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { UserSearchResult } from '../search/UserSearch';
import { TeamMember, roleConfig, statusConfig } from './teamConfig';
import { TeamMemberTable } from './TeamMemberTable';
import { InviteMemberModal } from './InviteMemberModal';
import { MemberDetailsModal } from './MemberDetailsModal';

interface TeamManagementProps {
  team: TeamMember[];
  currentUser: TeamMember;
  onInviteUser: (email: string, role: TeamMember['role']) => void;
  onInviteUsers?: (users: UserSearchResult[], role: TeamMember['role']) => void;
  onUpdateMember: (memberId: string, updates: Partial<TeamMember>) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (memberId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  currentUser,
  onInviteUser,
  onInviteUsers,
  onUpdateMember: _onUpdateMember,
  onRemoveMember,
  onResendInvite
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('designer');
  const [selectedUsersToInvite, setSelectedUsersToInvite] = useState<UserSearchResult[]>([]);
  const [inviteMode, setInviteMode] = useState<'search' | 'email'>('search');

  const filteredTeam = team.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const canManageTeam = currentUser.permissions.canManageTeam;

  const handleInvite = () => {
    if (inviteMode === 'email') {
      if (inviteEmail && canManageTeam) {
        onInviteUser(inviteEmail, inviteRole);
        setInviteEmail('');
        setInviteRole('designer');
        setShowInviteModal(false);
      }
    } else {
      if (selectedUsersToInvite.length > 0 && canManageTeam) {
        if (onInviteUsers) {
          onInviteUsers(selectedUsersToInvite, inviteRole);
        } else {
          selectedUsersToInvite.forEach(user => {
            onInviteUser(user.email, inviteRole);
          });
        }
        setSelectedUsersToInvite([]);
        setInviteRole('designer');
        setShowInviteModal(false);
      }
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setSelectedUsersToInvite([]);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your team members, roles, and permissions</p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {Object.entries(roleConfig).map(([role, config]) => (
              <option key={role} value={role}>{config.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {team.filter(m => m.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Invites</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {team.filter(m => m.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" aria-hidden="true" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(team.reduce((acc, m) => acc + m.workload.utilization, 0) / team.length)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <TeamMemberTable
        members={filteredTeam}
        currentUser={currentUser}
        canManageTeam={canManageTeam}
        onViewDetails={(member) => {
          setSelectedMember(member);
          setShowMemberDetails(true);
        }}
        onResendInvite={onResendInvite}
        onRemoveMember={onRemoveMember}
      />

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteMemberModal
            inviteMode={inviteMode}
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            selectedUsersToInvite={selectedUsersToInvite}
            teamMemberIds={team.map(m => m.id)}
            onInviteModeChange={setInviteMode}
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={setInviteRole}
            onSelectedUsersChange={setSelectedUsersToInvite}
            onInvite={handleInvite}
            onClose={handleCloseInviteModal}
          />
        )}
      </AnimatePresence>

      {/* Member Details Modal */}
      <AnimatePresence>
        {showMemberDetails && selectedMember && (
          <MemberDetailsModal
            member={selectedMember}
            onClose={() => setShowMemberDetails(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
export default TeamManagement;
