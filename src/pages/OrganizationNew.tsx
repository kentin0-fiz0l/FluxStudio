/**
 * Organization Page - Flux Design Language
 *
 * Redesigned organization management using DashboardLayout and Card components.
 * Uses real data from useOrganizations, useTeams, and useOrganization hooks.
 */

import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useAuth } from '@/store/slices/authSlice';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useTeams, type TeamMember, type TeamInvite } from '@/hooks/useTeams';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  Building2,
  Users,
  MessageSquare,
  Target,
  Settings,
  Plus,
  BarChart3,
  Globe,
  Calendar,
  CheckCircle2,
  Shield,
  MoreHorizontal,
  Mail,
  Search,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';

// Unified member type derived from team data
interface DisplayMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
  joinedAt: string;
}

export function OrganizationNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Real data hooks
  const {
    currentOrganization,
    loading: orgLoading,
    error: orgError,
    updateOrganization,
    inviteToOrganization,
  } = useOrganizations();
  const { teams, loading: teamsLoading } = useTeams();
  const { projects } = useOrganization();

  // State
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [memberFilter, setMemberFilter] = useState<'all' | 'admin' | 'member' | 'owner' | 'pending'>('all');
  const [memberSearch, setMemberSearch] = useState('');

  // Settings form refs
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLSelectElement>(null);

  const loading = orgLoading || teamsLoading;

  // Derive members from teams data
  const members: DisplayMember[] = useMemo(() => {
    const memberMap = new Map<string, DisplayMember>();

    teams.forEach((team) => {
      // Active members
      team.members?.forEach((m: TeamMember) => {
        if (!memberMap.has(m.userId)) {
          memberMap.set(m.userId, {
            id: m.userId,
            name: m.userId, // userId is the best we have without a users lookup
            email: '',
            role: m.role,
            status: 'active',
            joinedAt: m.joinedAt,
          });
        }
      });

      // Pending invites
      team.invites?.forEach((inv: TeamInvite) => {
        if (inv.status === 'pending' && !memberMap.has(`invite-${inv.id}`)) {
          memberMap.set(`invite-${inv.id}`, {
            id: `invite-${inv.id}`,
            name: inv.email.split('@')[0],
            email: inv.email,
            role: (inv.role as 'admin' | 'member') || 'member',
            status: 'pending',
            joinedAt: inv.invitedAt,
          });
        }
      });
    });

    return Array.from(memberMap.values());
  }, [teams]);

  const filteredMembers = members.filter((m) => {
    const matchesFilter = memberFilter === 'all'
      ? true
      : memberFilter === 'pending'
        ? m.status === 'pending'
        : m.role === memberFilter;
    const matchesSearch = !memberSearch
      || m.name.toLowerCase().includes(memberSearch.toLowerCase())
      || m.email.toLowerCase().includes(memberSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = members.filter((m) => m.status === 'pending').length;

  // Computed stats from real data
  const stats = {
    totalMembers: members.filter((m) => m.status === 'active').length,
    activeTeams: teams.length,
    activeProjects: projects?.length ?? 0,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleInvite = async () => {
    if (!currentOrganization || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      await inviteToOrganization(currentOrganization.id, inviteEmail.trim(), inviteRole);
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentOrganization) return;
    setSettingsSaving(true);
    try {
      await updateOrganization(currentOrganization.id, {
        name: nameRef.current?.value || currentOrganization.name,
        description: descRef.current?.value,
        website: websiteRef.current?.value,
        industry: industryRef.current?.value,
        size: (sizeRef.current?.value as 'startup' | 'small' | 'medium' | 'large' | 'enterprise') || currentOrganization.size,
      });
      setShowSettings(false);
    } catch {
      // Error is handled by the hook
    } finally {
      setSettingsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[{ label: 'Organization' }]}
        onLogout={logout}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-4 w-80 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (orgError) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[{ label: 'Organization' }]}
        onLogout={logout}
      >
        <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Something went wrong</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">{orgError}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Empty state — no organization found
  if (!currentOrganization) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[{ label: 'Organization' }]}
        onLogout={logout}
      >
        <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
          <Building2 className="w-12 h-12 text-neutral-400 mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">No organization found</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Create an organization to get started.</p>
          <Button onClick={() => navigate('/organization/create')}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Create Organization
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Organization' }]}
      onLogout={logout}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {currentOrganization.name}
              </h1>
              <p className="text-neutral-600 mt-1">
                {currentOrganization.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                {currentOrganization.website && (
                  <a
                    href={currentOrganization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                  >
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    {currentOrganization.website.replace('https://', '')}
                  </a>
                )}
                {currentOrganization.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" aria-hidden="true" />
                    {currentOrganization.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Since {formatDate(currentOrganization.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowSettings(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Total Members</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {stats.totalMembers}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" aria-hidden="true" />
              </div>
            </div>
            {currentOrganization.subscription && (
              <p className="text-sm text-neutral-500">
                Limit: {currentOrganization.subscription.memberLimit}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Active Teams</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {stats.activeTeams}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-secondary-600" aria-hidden="true" />
              </div>
            </div>
            <button
              onClick={() => navigate('/team')}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              View Teams →
            </button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-600">Active Projects</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {stats.activeProjects}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-success-600" aria-hidden="true" />
              </div>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              View Projects →
            </button>
          </Card>
        </div>

        {/* Members Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary-600" aria-hidden="true" />
              Members
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
              <Mail className="w-4 h-4 mr-1" aria-hidden="true" />
              Invite
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'admin', 'member', 'owner', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMemberFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    memberFilter === f
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">No members match the filter</p>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{member.name}</span>
                      {member.role === 'admin' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                          <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                          Admin
                        </span>
                      )}
                      {member.role === 'owner' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                          <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                          Owner
                        </span>
                      )}
                      {member.status === 'pending' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</span>
                    )}
                  </div>

                  {/* Role badge */}
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize hidden sm:block">{member.role}</span>

                  {/* Actions */}
                  <button className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity — Coming Soon */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                <Info className="w-5 h-5 mr-2 text-primary-600" aria-hidden="true" />
                Recent Activity
              </h2>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-neutral-500 dark:text-neutral-400">
              <MessageSquare className="w-10 h-10 mb-3 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
              <p className="text-sm font-medium">Coming soon</p>
              <p className="text-xs mt-1">Activity feed will be available in a future update.</p>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary-600" aria-hidden="true" />
                Organization Overview
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Member Capacity</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {stats.totalMembers}/{currentOrganization.subscription?.memberLimit ?? '?'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all"
                    style={{
                      width: currentOrganization.subscription?.memberLimit
                        ? `${Math.min(100, (stats.totalMembers / currentOrganization.subscription.memberLimit) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Teams</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {stats.activeTeams}/{currentOrganization.subscription?.teamLimit ?? '?'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-secondary-500 to-secondary-600 h-2 rounded-full transition-all"
                    style={{
                      width: currentOrganization.subscription?.teamLimit
                        ? `${Math.min(100, (stats.activeTeams / currentOrganization.subscription.teamLimit) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Plan</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                    {currentOrganization.subscription?.plan ?? 'Free'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  Status: {currentOrganization.subscription?.status ?? 'Unknown'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/team')}
            >
              <Users className="w-4 h-4 mr-2" aria-hidden="true" />
              Manage Teams
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/projects')}
            >
              <Target className="w-4 h-4 mr-2" aria-hidden="true" />
              View Projects
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/messages')}
            >
              <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
              Team Messages
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
              Settings
            </Button>
          </div>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Organization Name
              </label>
              <input
                ref={nameRef}
                type="text"
                defaultValue={currentOrganization.name}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                ref={descRef}
                defaultValue={currentOrganization.description}
                rows={3}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Website
              </label>
              <input
                ref={websiteRef}
                type="url"
                defaultValue={currentOrganization.website}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Industry
              </label>
              <input
                ref={industryRef}
                type="text"
                defaultValue={currentOrganization.industry}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Organization Size
              </label>
              <select
                ref={sizeRef}
                defaultValue={currentOrganization.size}
                className="w-full px-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="startup">Startup (1-10 people)</option>
                <option value="small">Small (11-50 people)</option>
                <option value="medium">Medium (51-200 people)</option>
                <option value="large">Large (201-1000 people)</option>
                <option value="enterprise">Enterprise (1000+ people)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                {settingsSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default OrganizationNew;
