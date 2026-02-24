/**
 * Organization Page - Flux Design Language
 *
 * Redesigned organization management using DashboardLayout and Card components.
 * Simplified from 836 lines to ~400 lines with clean modern design.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useAuth } from '@/store/slices/authSlice';
import {
  Building2,
  Users,
  MessageSquare,
  Target,
  TrendingUp,
  Activity,
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
} from 'lucide-react';

// Types
interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  createdAt: string;
}

interface OrganizationStats {
  totalMembers: number;
  activeTeams: number;
  totalMessages: number;
  activeProjects: number;
}

// Mock data
const mockOrganization: Organization = {
  id: '1',
  name: 'Flux Studio',
  description: 'A creative production studio focused on innovative design solutions',
  website: 'https://fluxstudio.art',
  industry: 'Design & Technology',
  size: 'small',
  createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
};

const mockStats: OrganizationStats = {
  totalMembers: 12,
  activeTeams: 3,
  totalMessages: 1247,
  activeProjects: 8
};

const mockRecentActivity = [
  {
    id: '1',
    type: 'team_created',
    description: 'Design Team was created',
    user: 'Sarah Chen',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: '2',
    type: 'member_joined',
    description: 'Mike Johnson joined the organization',
    user: 'Mike Johnson',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
  },
  {
    id: '3',
    type: 'project_started',
    description: 'Summer Show 2024 project was started',
    user: 'Alex Rodriguez',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
  },
  {
    id: '4',
    type: 'message_sent',
    description: '127 messages sent across all channels',
    user: 'Team',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
  }
];

interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  avatar?: string;
}

const mockMembers: OrgMember[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@fluxstudio.art', role: 'admin', status: 'active', joinedAt: '2024-01-15' },
  { id: '2', name: 'Mike Johnson', email: 'mike@fluxstudio.art', role: 'member', status: 'active', joinedAt: '2024-02-20' },
  { id: '3', name: 'Alex Rodriguez', email: 'alex@fluxstudio.art', role: 'member', status: 'active', joinedAt: '2024-03-10' },
  { id: '4', name: 'Emily Davis', email: 'emily@fluxstudio.art', role: 'member', status: 'active', joinedAt: '2024-04-05' },
  { id: '5', name: 'Jordan Lee', email: 'jordan@fluxstudio.art', role: 'viewer', status: 'active', joinedAt: '2024-05-18' },
  { id: '6', name: 'Chris Taylor', email: 'chris@fluxstudio.art', role: 'member', status: 'inactive', joinedAt: '2024-02-01' },
  { id: '7', name: 'Pending User', email: 'pending@example.com', role: 'member', status: 'pending', joinedAt: '2024-06-01' },
];

export function OrganizationNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [organization] = useState<Organization>(mockOrganization);
  const [stats] = useState<OrganizationStats>(mockStats);
  const [showSettings, setShowSettings] = useState(false);
  const [memberFilter, setMemberFilter] = useState<'all' | 'admin' | 'member' | 'viewer' | 'pending'>('all');
  const [memberSearch, setMemberSearch] = useState('');

  const filteredMembers = mockMembers.filter((m) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'team_created':
        return <Users className="w-4 h-4 text-primary-600" aria-hidden="true" />;
      case 'member_joined':
        return <Plus className="w-4 h-4 text-success-600" aria-hidden="true" />;
      case 'project_started':
        return <Target className="w-4 h-4 text-secondary-600" aria-hidden="true" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4 text-accent-600" aria-hidden="true" />;
      default:
        return <Activity className="w-4 h-4 text-neutral-600" aria-hidden="true" />;
    }
  };

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
                {organization.name}
              </h1>
              <p className="text-neutral-600 mt-1">
                {organization.description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                {organization.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                  >
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    {organization.website.replace('https://', '')}
                  </a>
                )}
                {organization.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" aria-hidden="true" />
                    {organization.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Since {formatDate(organization.createdAt)}
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="flex items-center text-sm text-success-600">
              <TrendingUp className="w-4 h-4 mr-1" aria-hidden="true" />
              <span>+3 this month</span>
            </div>
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
                <p className="text-sm text-neutral-600">Messages Today</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">
                  {stats.totalMessages}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-accent-600" aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-center text-sm text-success-600">
              <TrendingUp className="w-4 h-4 mr-1" aria-hidden="true" />
              <span>+18% vs yesterday</span>
            </div>
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
            <Button variant="outline" size="sm">
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
              {(['all', 'admin', 'member', 'viewer', 'pending'] as const).map((f) => (
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
                  {f === 'pending' && ` (${mockMembers.filter((m) => m.status === 'pending').length})`}
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
                    {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
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
                      {member.status === 'pending' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                          Pending
                        </span>
                      )}
                      {member.status === 'inactive' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</span>
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
          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary-600" aria-hidden="true" />
                Recent Activity
              </h2>
            </div>

            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900">{activity.description}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {activity.user} • {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors">
              View All Activity →
            </button>
          </Card>

          {/* Performance Metrics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary-600" aria-hidden="true" />
                Performance Metrics
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700">Team Efficiency</span>
                  <span className="text-sm font-semibold text-neutral-900">87%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full transition-all" style={{ width: '87%' }} />
                </div>
                <p className="text-xs text-success-600 mt-1">+12% vs last month</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700">Communication Volume</span>
                  <span className="text-sm font-semibold text-neutral-900">2.4k</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all" style={{ width: '74%' }} />
                </div>
                <p className="text-xs text-primary-600 mt-1">+18% this week</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-700">Project Completion</span>
                  <span className="text-sm font-semibold text-neutral-900">94%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 h-2 rounded-full transition-all" style={{ width: '94%' }} />
                </div>
                <p className="text-xs text-secondary-600 mt-1">On-time delivery rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                defaultValue={organization.name}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description
              </label>
              <textarea
                defaultValue={organization.description}
                rows={3}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Website
              </label>
              <input
                type="url"
                defaultValue={organization.website}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Industry
              </label>
              <input
                type="text"
                defaultValue={organization.industry}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Organization Size
              </label>
              <select
                defaultValue={organization.size}
                className="w-full px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="startup">Startup (1-10 people)</option>
                <option value="small">Small (11-50 people)</option>
                <option value="medium">Medium (51-200 people)</option>
                <option value="large">Large (201-1000 people)</option>
                <option value="enterprise">Enterprise (1000+ people)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowSettings(false)}>
                <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
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
