/**
 * ContextualSidebar Component - Project/Client-Aware Navigation
 * Smart navigation sidebar that adapts to current context and user role
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Folder,
  Bell,
  Star,
  Clock,
  Activity,
  Settings,
  Search,
  Plus,
  Filter,
  BarChart3,
  UserCircle,
  Building,
  Palette,
  Archive,
  Bookmark,
  Zap,
  Eye,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../hooks/useMessaging';
import { useOrganization } from '../../contexts/OrganizationContext';

interface ContextualSidebarProps {
  viewMode: 'unified' | 'projects' | 'clients' | 'teams' | 'activity';
  onViewModeChange: (mode: 'unified' | 'projects' | 'clients' | 'teams' | 'activity') => void;
  className?: string;
}

interface ContextItem {
  id: string;
  name: string;
  type: 'project' | 'client' | 'team';
  avatar?: string;
  unreadCount: number;
  lastActivity: Date;
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'pending' | 'completed';
}

export function ContextualSidebar({
  viewMode,
  onViewModeChange,
  className
}: ContextualSidebarProps) {
  const { user } = useAuth();
  const { conversations } = useMessaging();
  const { projects, teams, organizations } = useOrganization();
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Generate contextual data from conversations
  const contextualData = useMemo(() => {
    const projectMap = new Map<string, ContextItem>();
    const clientMap = new Map<string, ContextItem>();
    const teamMap = new Map<string, ContextItem>();

    conversations.forEach(conv => {
      // Project contexts
      if (conv.projectId && conv.type === 'project') {
        const existing = projectMap.get(conv.projectId);
        const project = projects?.find(p => p.id === conv.projectId);

        projectMap.set(conv.projectId, {
          id: conv.projectId,
          name: project?.name || conv.name,
          type: 'project',
          avatar: project?.avatar,
          unreadCount: (existing?.unreadCount || 0) + conv.unreadCount,
          lastActivity: new Date(Math.max(
            existing?.lastActivity.getTime() || 0,
            new Date(conv.lastActivity).getTime()
          )),
          isActive: project?.status === 'active',
          priority: conv.metadata.priority === 'high' ? 'high' : 'medium',
          status: project?.status || 'active'
        });
      }

      // Client contexts
      const clientParticipant = conv.participants.find(p => p.userType === 'client');
      if (clientParticipant) {
        const existing = clientMap.get(clientParticipant.id);

        clientMap.set(clientParticipant.id, {
          id: clientParticipant.id,
          name: clientParticipant.name,
          type: 'client',
          avatar: clientParticipant.avatar,
          unreadCount: (existing?.unreadCount || 0) + conv.unreadCount,
          lastActivity: new Date(Math.max(
            existing?.lastActivity.getTime() || 0,
            new Date(conv.lastActivity).getTime()
          )),
          isActive: clientParticipant.isOnline || false,
          priority: conv.metadata.priority === 'high' ? 'high' : 'medium',
          status: 'active'
        });
      }

      // Team contexts
      if (conv.teamId && conv.type === 'team') {
        const existing = teamMap.get(conv.teamId);
        const team = teams?.find(t => t.id === conv.teamId);

        teamMap.set(conv.teamId, {
          id: conv.teamId,
          name: team?.name || conv.name,
          type: 'team',
          avatar: team?.avatar,
          unreadCount: (existing?.unreadCount || 0) + conv.unreadCount,
          lastActivity: new Date(Math.max(
            existing?.lastActivity.getTime() || 0,
            new Date(conv.lastActivity).getTime()
          )),
          isActive: true,
          priority: conv.metadata.priority === 'high' ? 'high' : 'medium',
          status: 'active'
        });
      }
    });

    return {
      projects: Array.from(projectMap.values()).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()),
      clients: Array.from(clientMap.values()).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()),
      teams: Array.from(teamMap.values()).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    };
  }, [conversations, projects, teams]);

  const viewModes = [
    {
      id: 'unified' as const,
      name: 'All Messages',
      icon: MessageSquare,
      description: 'Unified inbox'
    },
    {
      id: 'activity' as const,
      name: 'Activity Feed',
      icon: Activity,
      description: 'Unified activity stream'
    },
    {
      id: 'projects' as const,
      name: 'Projects',
      icon: Folder,
      description: 'Project-specific channels',
      count: contextualData.projects.length
    },
    {
      id: 'clients' as const,
      name: 'Clients',
      icon: UserCircle,
      description: 'Client conversations',
      count: contextualData.clients.length
    },
    {
      id: 'teams' as const,
      name: 'Teams',
      icon: Users,
      description: 'Team collaboration',
      count: contextualData.teams.length
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-400';
      case 'medium': return 'border-l-blue-400';
      case 'low': return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  const ContextItem = ({ item }: { item: ContextItem }) => {
    const isSelected = selectedContext === item.id;
    const Icon = item.type === 'project' ? Folder : item.type === 'client' ? UserCircle : Users;

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedContext(isSelected ? null : item.id)}
        className={cn(
          'p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200',
          getPriorityColor(item.priority),
          isSelected
            ? 'bg-blue-50 border-blue-200 shadow-sm'
            : 'bg-white hover:bg-gray-50 border-gray-200'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {item.avatar ? (
              <Avatar className="w-8 h-8">
                <AvatarImage src={item.avatar} />
                <AvatarFallback>
                  {item.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Icon size={14} className="text-white" />
              </div>
            )}

            {item.type === 'client' && (
              <div className={cn(
                'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
                item.isActive ? 'bg-green-500' : 'bg-gray-400'
              )} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {item.name}
              </h4>
              {item.unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                  {item.unreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', getStatusColor(item.status))} />
                <span className="text-xs text-gray-500 capitalize">{item.status}</span>
              </div>

              <span className="text-xs text-gray-400">
                {formatLastActivity(item.lastActivity)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getTotalUnread = () => {
    return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  };

  const getCurrentContextData = () => {
    switch (viewMode) {
      case 'projects': return contextualData.projects;
      case 'clients': return contextualData.clients;
      case 'teams': return contextualData.teams;
      default: return [];
    }
  };

  return (
    <div className={cn('bg-white border-r border-gray-200 flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Palette size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Flux Studio</h2>
            <p className="text-xs text-gray-500">Creative Hub</p>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="space-y-1">
          {viewModes.map(mode => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;

            return (
              <Button
                key={mode.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange(mode.id)}
                className="w-full justify-start h-9"
              >
                <Icon size={16} className="mr-2" />
                <span className="flex-1 text-left">{mode.name}</span>
                {mode.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {mode.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Context-specific content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'unified' && (
          <div className="space-y-4">
            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Activity Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unread Messages</span>
                  <Badge className="bg-blue-600 text-white">
                    {getTotalUnread()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Projects</span>
                  <span className="text-sm font-medium">
                    {contextualData.projects.filter(p => p.status === 'active').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Online Clients</span>
                  <span className="text-sm font-medium">
                    {contextualData.clients.filter(c => c.isActive).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Quick Actions</h3>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <Star size={14} className="mr-2" />
                Starred Conversations
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <Archive size={14} className="mr-2" />
                Archived Messages
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start">
                <BarChart3 size={14} className="mr-2" />
                Activity Report
              </Button>
            </div>
          </div>
        )}

        {viewMode !== 'unified' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 capitalize">
                {viewMode}
              </h3>
              <Button size="sm" variant="ghost" className="p-1">
                <Plus size={14} />
              </Button>
            </div>

            {getCurrentContextData().length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  {viewMode === 'projects' && <Folder size={20} className="text-gray-400" />}
                  {viewMode === 'clients' && <UserCircle size={20} className="text-gray-400" />}
                  {viewMode === 'teams' && <Users size={20} className="text-gray-400" />}
                </div>
                <p className="text-sm text-gray-500">No {viewMode} found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getCurrentContextData().map(item => (
                  <ContextItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button size="sm" variant="ghost" className="w-full justify-start">
          <Settings size={14} className="mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}

export default ContextualSidebar;