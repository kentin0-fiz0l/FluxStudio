// React import not needed with JSX transform
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { WidgetProps } from './types';
import {
  Plus,
  Search,
  MessageSquare,
  Palette,
  Users,
  BarChart3,
  Building2,
  FolderOpen,
  Target,
  Mail,
  ChevronRight,
  Zap,
} from 'lucide-react';

export function QuickActionsWidget(props: WidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open: openCommandPalette } = useCommandPalette();

  if (!user) return null;

  // Quick actions based on user type
  const getQuickActions = () => {
    const baseActions = [
      { icon: Building2, label: 'Browse Organizations', action: () => navigate('/dashboard/organizations') },
      { icon: FolderOpen, label: 'My Projects', action: () => navigate('/dashboard/projects') },
      { icon: Search, label: 'Search Everything', action: () => openCommandPalette() },
    ];

    switch (user.userType) {
      case 'client':
        return [
          ...baseActions,
          { icon: Plus, label: 'New Project Request', action: () => navigate('/dashboard/client') },
          { icon: MessageSquare, label: 'Messages', action: () => console.log('Opening messaging sidepanel...') },
          { icon: Mail, label: 'Contact Support', action: () => {} },
        ];
      case 'designer':
        return [
          ...baseActions,
          { icon: Palette, label: 'Creative Workspace', action: () => navigate('/dashboard/designer') },
          { icon: Users, label: 'My Teams', action: () => navigate('/dashboard/teams') },
          { icon: Plus, label: 'New Design', action: () => {} },
        ];
      case 'admin':
        return [
          ...baseActions,
          { icon: Users, label: 'User Management', action: () => navigate('/dashboard/admin') },
          { icon: BarChart3, label: 'Analytics Dashboard', action: () => navigate('/dashboard/analytics') },
          { icon: Plus, label: 'Create Organization', action: () => navigate('/dashboard/organizations/create') },
        ];
      default:
        return [
          ...baseActions,
          { icon: Target, label: 'Get Started', action: () => {} },
          { icon: Mail, label: 'Contact Support', action: () => {} },
        ];
    }
  };

  const quickActions = getQuickActions();

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Quick Actions',
        description: 'Fast access to your most-used features',
      }}
      headerAction={
        <Zap className="h-4 w-4 text-yellow-400" />
      }
    >
      <div className="space-y-2">
        {quickActions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={action.action}
              className="w-full justify-start text-white hover:bg-white/10 p-3 h-auto group"
            >
              <IconComponent className="h-4 w-4 mr-3 text-white/70 group-hover:text-white transition-colors" />
              <span className="flex-1 text-left">{action.label}</span>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          );
        })}
      </div>

      {/* Quick stats or additional info */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Role: {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</span>
          <span className="text-green-400">● Online</span>
        </div>
      </div>
    </BaseWidget>
  );
}