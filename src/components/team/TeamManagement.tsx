import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Search,
  Crown,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Award,
  Activity,
  Eye,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserSearch, UserSearchResult } from '../search/UserSearch';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'lead_designer' | 'designer' | 'intern' | 'client_viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: Date;
  lastActive: Date;
  permissions: {
    canCreateProjects: boolean;
    canEditProjects: boolean;
    canDeleteProjects: boolean;
    canManageTeam: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canExportFiles: boolean;
    canManageClients: boolean;
  };
  workload: {
    activeProjects: number;
    completedProjects: number;
    hoursThisWeek: number;
    utilization: number; // percentage
  };
  skills: string[];
  specialties: string[];
  location?: string;
  timezone?: string;
}

interface TeamManagementProps {
  team: TeamMember[];
  currentUser: TeamMember;
  onInviteUser: (email: string, role: TeamMember['role']) => void;
  onInviteUsers?: (users: UserSearchResult[], role: TeamMember['role']) => void;
  onUpdateMember: (memberId: string, updates: Partial<TeamMember>) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (memberId: string) => void;
}

const roleConfig = {
  admin: {
    label: 'Administrator',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    icon: Crown,
    description: 'Full platform access and team management'
  },
  lead_designer: {
    label: 'Lead Designer',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    icon: Star,
    description: 'Project leadership and design oversight'
  },
  designer: {
    label: 'Designer',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    icon: Award,
    description: 'Design creation and project collaboration'
  },
  intern: {
    label: 'Intern',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
    icon: Users,
    description: 'Limited access for learning and assistance'
  },
  client_viewer: {
    label: 'Client Viewer',
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    icon: Eye,
    description: 'View-only access for client collaboration'
  }
};

const statusConfig = {
  active: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle, label: 'Active' },
  pending: { color: 'text-yellow-600 dark:text-yellow-400', icon: Clock, label: 'Pending' },
  inactive: { color: 'text-gray-600 dark:text-gray-400', icon: XCircle, label: 'Inactive' }
};

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

  // Filter team members
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
          // Fallback: invite each user individually via email
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

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600 bg-red-50 dark:bg-red-900/30';
    if (utilization >= 70) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30';
    if (utilization >= 40) return 'text-green-600 bg-green-50 dark:bg-green-900/30';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
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
          {/* Search */}
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

          {/* Role Filter */}
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

          {/* Status Filter */}
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

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Workload
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeam.map((member) => {
                const roleInfo = roleConfig[member.role];
                const statusInfo = statusConfig[member.status];
                const RoleIcon = roleInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium text-sm">
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className={cn(
                        'inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border',
                        roleInfo.color
                      )}>
                        <RoleIcon className="w-3 h-3" aria-hidden="true" />
                        <span>{roleInfo.label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className={cn('flex items-center space-x-2', statusInfo.color)}>
                        <StatusIcon className="w-4 h-4" aria-hidden="true" />
                        <span className="text-sm font-medium">{statusInfo.label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Utilization:</span>
                          <span className={cn(
                            'font-medium px-2 py-1 rounded-full text-xs',
                            getUtilizationColor(member.workload.utilization)
                          )}>
                            {member.workload.utilization}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {member.workload.activeProjects} active projects
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatLastActive(member.lastActive)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowMemberDetails(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          aria-label={`View details for ${member.name}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {canManageTeam && member.id !== currentUser.id && (
                          <>
                            {member.status === 'pending' && (
                              <button
                                onClick={() => onResendInvite(member.id)}
                                className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                                aria-label="Resend invite"
                              >
                                <Mail className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}

                            <button
                              onClick={() => {/* Handle edit */}}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              aria-label={`Edit ${member.name}`}
                            >
                              <Edit className="w-4 h-4" aria-hidden="true" />
                            </button>

                            <button
                              onClick={() => onRemoveMember(member.id)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors"
                              aria-label={`Remove ${member.name}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
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
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedUsersToInvite([]);
                    setInviteEmail('');
                  }}
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
                    onClick={() => setInviteMode('search')}
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
                    onClick={() => setInviteMode('email')}
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
                      excludeUserIds={team.map(member => member.id)}
                      onUserSelect={(user) => {
                        if (!selectedUsersToInvite.find(u => u.id === user.id)) {
                          setSelectedUsersToInvite([...selectedUsersToInvite, user]);
                        }
                      }}
                      onUserRemove={(userId) => {
                        setSelectedUsersToInvite(selectedUsersToInvite.filter(u => u.id !== userId));
                      }}
                      onUsersChange={setSelectedUsersToInvite}
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
                        onChange={(e) => setInviteEmail(e.target.value)}
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
                          onClick={() => setInviteRole(role as TeamMember['role'])}
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
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedUsersToInvite([]);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteMode === 'email' ? !inviteEmail : selectedUsersToInvite.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Send Invite</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Details Modal */}
      <AnimatePresence>
        {showMemberDetails && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Member Details</h3>
                <button
                  onClick={() => setShowMemberDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Close member details"
                >
                  <XCircle className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>

              {/* Member info, permissions, workload details, etc. */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    {selectedMember.avatar ? (
                      <img
                        src={selectedMember.avatar}
                        alt={selectedMember.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium text-xl">
                        {selectedMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedMember.name}</h4>
                    <p className="text-gray-600 dark:text-gray-400">{selectedMember.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={cn(
                        'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border',
                        roleConfig[selectedMember.role].color
                      )}>
                        <span>{roleConfig[selectedMember.role].label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed content would continue here... */}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default TeamManagement;
