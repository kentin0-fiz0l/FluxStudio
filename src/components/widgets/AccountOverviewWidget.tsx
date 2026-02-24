// React import not needed with JSX transform
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/slices/authSlice';
import { useOrganization } from '../../contexts/OrganizationContext';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { WidgetProps } from './types';
import {
  User,
  Settings,
  Calendar,
  Star,
  Shield,
  Mail,
} from 'lucide-react';

export function AccountOverviewWidget(props: WidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, projects } = useOrganization();

  // Calculate user stats - useState with lazy initializer avoids Date.now() during render
  const [{ memberSince, daysSinceMember }] = useState(() => {
    if (!user) return { memberSince: new Date(), daysSinceMember: 0 };
    const since = new Date(user.createdAt || Date.now());
    const days = Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
    return { memberSince: since, daysSinceMember: days };
  });

  if (!user) return null;

  const stats = {
    organizations: organizations.length,
    projects: projects.length,
    daysSinceMember,
    completedProjects: 0, // Would come from API
    rating: 4.8, // Would come from API for designers
  };

  const getRoleIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <Shield className="h-4 w-4 text-orange-400" aria-hidden="true" />;
      case 'designer':
        return <Star className="h-4 w-4 text-purple-400" aria-hidden="true" />;
      default:
        return <User className="h-4 w-4 text-blue-400" aria-hidden="true" />;
    }
  };

  const getRoleColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'designer':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'client':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Account Overview',
        description: 'Your profile and activity summary',
      }}
      headerAction={
        getRoleIcon(user.userType || 'designer')
      }
    >
      {/* User Profile Section */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{user.name}</h3>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.userType || 'designer')}`}>
              {getRoleIcon(user.userType || 'designer')}
              <span className="capitalize">{user.userType || 'designer'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Mail className="h-3 w-3" aria-hidden="true" />
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          <span>Member since {memberSince.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-lg font-bold text-white">{stats.organizations}</p>
          <p className="text-xs text-gray-400">Organizations</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-lg font-bold text-white">{stats.projects}</p>
          <p className="text-xs text-gray-400">Projects</p>
        </div>
      </div>

      {/* Role-specific stats */}
      {user.userType === 'designer' && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span className="text-white">Designer Rating</span>
            </div>
            <span className="font-semibold text-white">{stats.rating}/5.0</span>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Based on {stats.completedProjects} completed projects
          </div>
        </div>
      )}

      {/* Activity Summary */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <div className="flex-1">
            <p className="text-white">Account active</p>
            <p className="text-xs text-gray-400">Last seen 2 minutes ago</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <div className="flex-1">
            <p className="text-white">Profile updated</p>
            <p className="text-xs text-gray-400">{daysSinceMember} days ago</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/profile')}
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
        >
          <User className="h-4 w-4 mr-2" aria-hidden="true" />
          Edit Profile
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/settings')}
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
          Account Settings
        </Button>
      </div>
    </BaseWidget>
  );
}