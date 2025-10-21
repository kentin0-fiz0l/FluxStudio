import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MoreVertical,
  Search,
  Filter,
  Crown,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Award,
  Calendar,
  Activity,
  Settings,
  Eye,
  EyeOff,
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
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Crown,
    description: 'Full platform access and team management'
  },
  lead_designer: {
    label: 'Lead Designer',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Star,
    description: 'Project leadership and design oversight'
  },
  designer: {
    label: 'Designer',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Award,
    description: 'Design creation and project collaboration'
  },
  intern: {
    label: 'Intern',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Users,
    description: 'Limited access for learning and assistance'
  },
  client_viewer: {
    label: 'Client Viewer',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Eye,
    description: 'View-only access for client collaboration'
  }
};

const statusConfig = {
  active: { color: 'text-green-600', icon: CheckCircle, label: 'Active' },
  pending: { color: 'text-yellow-600', icon: Clock, label: 'Pending' },
  inactive: { color: 'text-gray-600', icon: XCircle, label: 'Inactive' }
};

export const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  currentUser,
  onInviteUser,
  onInviteUsers,
  onUpdateMember,
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
    if (utilization >= 90) return 'text-red-600 bg-red-50';
    if (utilization >= 70) return 'text-yellow-600 bg-yellow-50';
    if (utilization >= 40) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Manage your team members, roles, and permissions</p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{team.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {team.filter(m => m.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold text-gray-900">
                {team.filter(m => m.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(team.reduce((acc, m) => acc + m.workload.utilization, 0) / team.length)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workload
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTeam.map((member) => {
                const roleInfo = roleConfig[member.role];
                const statusInfo = statusConfig[member.status];
                const RoleIcon = roleInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={member.id} className="hover:bg-gray-50">
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
                          <p className="font-medium text-gray-900 truncate">{member.name}</p>
                          <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className={cn(
                        'inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border',
                        roleInfo.color
                      )}>
                        <RoleIcon className="w-3 h-3" />
                        <span>{roleInfo.label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className={cn('flex items-center space-x-2', statusInfo.color)}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{statusInfo.label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Utilization:</span>
                          <span className={cn(
                            'font-medium px-2 py-1 rounded-full text-xs',
                            getUtilizationColor(member.workload.utilization)
                          )}>
                            {member.workload.utilization}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.workload.activeProjects} active projects
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
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
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManageTeam && member.id !== currentUser.id && (
                          <>
                            {member.status === 'pending' && (
                              <button
                                onClick={() => onResendInvite(member.id)}
                                className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                                title="Resend invite"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {/* Handle edit */}}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onRemoveMember(member.id)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
                    <p className="text-sm text-gray-600">Add new members to your team</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedUsersToInvite([]);
                    setInviteEmail('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setInviteMode('search')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                      inviteMode === 'search'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Search Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteMode('email')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                      inviteMode === 'email'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Invite by Email
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {inviteMode === 'search' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus={inviteMode === 'email'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <RoleIcon className="w-4 h-4" />
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteMode === 'email' ? !inviteEmail : selectedUsersToInvite.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
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
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Member Details</h3>
                <button
                  onClick={() => setShowMemberDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
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
                    <h4 className="text-xl font-bold text-gray-900">{selectedMember.name}</h4>
                    <p className="text-gray-600">{selectedMember.email}</p>
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