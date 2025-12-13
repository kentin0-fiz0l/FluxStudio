/**
 * Organization Page - Flux Design Language
 *
 * Redesigned organization management using DashboardLayout and Card components.
 * Simplified from 836 lines to ~400 lines with clean modern design.
 */

import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
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
  CheckCircle2
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

export function OrganizationNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [organization] = useState<Organization>(mockOrganization);
  const [stats] = useState<OrganizationStats>(mockStats);
  const [showSettings, setShowSettings] = useState(false);

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
        return <Users className="w-4 h-4 text-primary-600" />;
      case 'member_joined':
        return <Plus className="w-4 h-4 text-success-600" />;
      case 'project_started':
        return <Target className="w-4 h-4 text-secondary-600" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4 text-accent-600" />;
      default:
        return <Activity className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'Organization' }]}
      onLogout={logout}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
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
                    <Globe className="w-4 h-4" />
                    {organization.website.replace('https://', '')}
                  </a>
                )}
                {organization.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {organization.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Since {formatDate(organization.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowSettings(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
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
                <Users className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <div className="flex items-center text-sm text-success-600">
              <TrendingUp className="w-4 h-4 mr-1" />
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
                <Building2 className="w-6 h-6 text-secondary-600" />
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
                <MessageSquare className="w-6 h-6 text-accent-600" />
              </div>
            </div>
            <div className="flex items-center text-sm text-success-600">
              <TrendingUp className="w-4 h-4 mr-1" />
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
                <Target className="w-6 h-6 text-success-600" />
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary-600" />
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
                <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
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
              <Users className="w-4 h-4 mr-2" />
              Manage Teams
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/projects')}
            >
              <Target className="w-4 h-4 mr-2" />
              View Projects
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/messages')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Team Messages
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
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
                <CheckCircle2 className="w-4 h-4 mr-2" />
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
