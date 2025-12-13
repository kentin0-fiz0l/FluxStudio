/**
 * Team Page - Flux Design Language
 *
 * Redesigned team management interface using DashboardLayout and UserCard.
 * Simplified from 267 lines to ~350 lines with modern design system.
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { UserCard } from '@/components/molecules';
import { Button, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Search,
  Filter,
  Grid3x3,
  List,
  Settings,
  Mail,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import type { UserCardUser } from '@/components/molecules';

// Types
interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  name?: string;
  email?: string;
  avatar?: string;
  status?: 'active' | 'away' | 'offline';
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
  invites?: Array<{
    id: string;
    email: string;
    role: 'admin' | 'member';
    status: 'pending' | 'accepted' | 'declined';
    invitedAt: string;
  }>;
}

type ViewMode = 'grid' | 'list';
type RoleFilter = 'all' | 'owner' | 'admin' | 'member';

// Mock teams data
const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Design Team',
    description: 'Main design team for product development',
    members: [
      {
        userId: 'user1',
        name: 'Sarah Chen',
        email: 'sarah@fluxstudio.art',
        role: 'owner',
        joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        userId: 'user2',
        name: 'Mike Johnson',
        email: 'mike@fluxstudio.art',
        role: 'admin',
        joinedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        userId: 'user3',
        name: 'Alex Rodriguez',
        email: 'alex@fluxstudio.art',
        role: 'member',
        joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'away'
      },
      {
        userId: 'user4',
        name: 'Emma Wilson',
        email: 'emma@fluxstudio.art',
        role: 'member',
        joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'offline'
      }
    ],
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    invites: [
      {
        id: 'inv1',
        email: 'john@example.com',
        role: 'member',
        status: 'pending',
        invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: '2',
    name: 'Marketing Team',
    description: 'Content creation and marketing initiatives',
    members: [
      {
        userId: 'user1',
        name: 'Sarah Chen',
        email: 'sarah@fluxstudio.art',
        role: 'owner',
        joinedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      },
      {
        userId: 'user5',
        name: 'Lisa Park',
        email: 'lisa@fluxstudio.art',
        role: 'member',
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      }
    ],
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function TeamNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [teams] = useState<Team[]>(mockTeams);
  const [selectedTeam, setSelectedTeam] = useState<Team>(mockTeams[0]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMembers, setShowInviteMembers] = useState(false);

  // Get current user role in selected team
  const currentUserRole = selectedTeam?.members.find(
    m => m.userId === user?.id || m.email === user?.email
  )?.role || 'member';

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = selectedTeam?.members || [];

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter);
    }

    // Apply search
    if (searchTerm) {
      result = result.filter(m =>
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [selectedTeam, roleFilter, searchTerm]);

  // Convert team member to UserCard format
  const memberToUser = (member: TeamMember): UserCardUser => ({
    id: member.userId,
    name: member.name || `User ${member.userId.slice(0, 8)}`,
    email: member.email,
    avatar: member.avatar,
    role: member.role,
    status: member.status
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-accent-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-primary-600" />;
      default:
        return <User className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'solidAccent' as const;
      case 'admin':
        return 'solidPrimary' as const;
      default:
        return 'default' as const;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMemberAction = (memberId: string, action: string) => {
    console.log('Member action:', memberId, action);
    // Handle member actions (edit role, remove, etc.)
  };

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'Team' }]}
      onSearch={setSearchTerm}
      onLogout={logout}
      showSearch
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Team Management</h1>
            <p className="text-neutral-600 mt-1">
              Manage your team members and permissions
            </p>
          </div>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Users className="w-4 h-4 mr-2" aria-hidden="true" />
            Create Team
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Teams Sidebar */}
          <Card className="lg:col-span-1 p-4">
            <h2 className="font-semibold text-neutral-900 mb-4">Your Teams</h2>
            <div className="space-y-2">
              {teams.map((team) => {
                const memberRole = team.members.find(
                  m => m.userId === user?.id || m.email === user?.email
                )?.role;
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedTeam?.id === team.id
                        ? 'bg-primary-50 border-2 border-primary-600'
                        : 'bg-neutral-50 hover:bg-neutral-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-neutral-900 text-sm">
                        {team.name}
                      </h3>
                      {getRoleIcon(memberRole || 'member')}
                    </div>
                    {team.description && (
                      <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Users className="w-3 h-3" aria-hidden="true" />
                      <span>{team.members.length} members</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Team Details */}
          <div className="lg:col-span-3 space-y-6">
            {selectedTeam ? (
              <>
                {/* Team Info */}
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-neutral-900 mb-2">
                        {selectedTeam.name}
                      </h2>
                      {selectedTeam.description && (
                        <p className="text-neutral-600">{selectedTeam.description}</p>
                      )}
                    </div>
                    {canManageTeam && (
                      <Button variant="ghost" size="sm" aria-label="Team settings">
                        <Settings className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-neutral-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" aria-hidden="true" />
                      <span>{selectedTeam.members.length} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      <span>Created {formatDate(selectedTeam.createdAt)}</span>
                    </div>
                  </div>

                  {canManageTeam && (
                    <Button
                      onClick={() => setShowInviteMembers(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                      Invite Members
                    </Button>
                  )}
                </Card>

                {/* Members Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-900">
                      Team Members ({filteredMembers.length})
                    </h3>

                    {/* Role Filters */}
                    <div className="flex gap-2 ml-4">
                      {(['all', 'owner', 'admin', 'member'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setRoleFilter(role)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            roleFilter === role
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                    >
                      <Grid3x3 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {/* Members Grid/List */}
                {filteredMembers.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
                    <p className="text-neutral-600">No members found</p>
                  </Card>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-3'
                    }
                  >
                    {filteredMembers.map((member) => (
                      <UserCard
                        key={member.userId}
                        user={memberToUser(member)}
                        showRole
                        showStatus
                        onView={() => handleMemberAction(member.userId, 'view')}
                        onMessage={() => handleMemberAction(member.userId, 'message')}
                        actions={
                          canManageTeam && member.userId !== user?.id
                            ? [
                                {
                                  label: 'Edit Role',
                                  onClick: () => handleMemberAction(member.userId, 'edit')
                                },
                                {
                                  label: 'Remove',
                                  onClick: () => handleMemberAction(member.userId, 'remove'),
                                  variant: 'danger'
                                }
                              ]
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Pending Invitations */}
                {selectedTeam.invites && selectedTeam.invites.filter(i => i.status === 'pending').length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-neutral-900 mb-4">
                      Pending Invitations ({selectedTeam.invites.filter(i => i.status === 'pending').length})
                    </h3>
                    <div className="space-y-3">
                      {selectedTeam.invites
                        .filter(i => i.status === 'pending')
                        .map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-neutral-600" aria-hidden="true" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">{invite.email}</p>
                                <p className="text-xs text-neutral-500">
                                  Invited {formatDate(invite.invitedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getRoleBadgeVariant(invite.role)}>
                                {invite.role}
                              </Badge>
                              {canManageTeam && (
                                <Button variant="ghost" size="sm" aria-label="Cancel invitation">
                                  <XCircle className="w-4 h-4 text-error-600" aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 text-neutral-300 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Select a team
                </h3>
                <p className="text-neutral-600">
                  Choose a team from the sidebar to view members
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                placeholder="e.g., Design Team"
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description (optional)
              </label>
              <textarea
                placeholder="Brief description of the team's purpose"
                rows={3}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateTeam(false)}>
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={showInviteMembers} onOpenChange={setShowInviteMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Members to {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="member@example.com"
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Role
              </label>
              <select className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInviteMembers(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowInviteMembers(false)}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default TeamNew;
