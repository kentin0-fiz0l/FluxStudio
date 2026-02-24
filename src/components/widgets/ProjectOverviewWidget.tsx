import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProjectsData } from '../../hooks/useRealTimeData';
import { BaseWidget } from './BaseWidget';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { WidgetProps } from './types';
import {
  FolderOpen,
  ChevronRight,
  Clock,
  Calendar,
  Plus,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate: string;
  team: string;
  priority: string;
  lastActivity: string;
}

export function ProjectOverviewWidget(props: WidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects: _projects, navigateTo } = useOrganization();
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  // Real-time project data
  const { data: realTimeProjects, isLoading, error, lastUpdated, refresh } = useProjectsData();

  if (!user) return null;

  // Use real-time data or fallback to empty array
  const projectsData = realTimeProjects || [];

  const filteredProjects = projectsData.filter((project: ProjectData) => {
    if (filter === 'all') return true;
    if (filter === 'active') return project.status === 'active';
    if (filter === 'pending') return project.status === 'review' || project.status === 'planning';
    if (filter === 'completed') return project.status === 'completed';
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <TrendingUp className="h-3 w-3 text-blue-400" aria-hidden="true" />;
      case 'review':
        return <AlertCircle className="h-3 w-3 text-orange-400" aria-hidden="true" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-400" aria-hidden="true" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" aria-hidden="true" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'review':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'planning':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const stats = {
    total: projectsData.length,
    active: projectsData.filter((p: ProjectData) => p.status === 'active').length,
    pending: projectsData.filter((p: ProjectData) => p.status === 'review' || p.status === 'planning').length,
    avgProgress: projectsData.length > 0
      ? Math.round(projectsData.reduce((sum: number, p: ProjectData) => sum + p.progress, 0) / projectsData.length)
      : 0,
  };

  return (
    <BaseWidget
      {...props}
      config={{
        ...props.config,
        title: 'Project Overview',
        description: 'Track progress across your active projects',
      }}
      headerAction={
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            {error ? (
              <span title={`Error: ${error}`}>
                <WifiOff className="h-3 w-3 text-red-400" aria-hidden="true" />
              </span>
            ) : (
              <span title={`Last updated: ${lastUpdated?.toLocaleTimeString()}`}>
                <Wifi className="h-3 w-3 text-green-400" aria-hidden="true" />
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>

          {/* Filter Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter(filter === 'all' ? 'active' : 'all')}
            className="h-7 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <Filter className="h-3 w-3 mr-1" aria-hidden="true" />
            {filter}
          </Button>

          <FolderOpen className="h-4 w-4 text-purple-400" aria-hidden="true" />
        </div>
      }
    >
      {/* Loading State */}
      {isLoading && projectsData.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-white/50" aria-hidden="true" />
          <span className="ml-2 text-white/70">Loading projects...</span>
        </div>
      )}

      {/* Error State */}
      {error && projectsData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <WifiOff className="h-8 w-8 text-red-400 mb-2" aria-hidden="true" />
          <p className="text-red-400 text-sm font-medium">Connection Error</p>
          <p className="text-gray-400 text-xs mb-3">{error}</p>
          <Button
            size="sm"
            onClick={refresh}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Content - only show if we have data or if we're not in an error state */}
      {(!error || projectsData.length > 0) && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xl font-bold text-white">{stats.active}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xl font-bold text-white">{stats.pending}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.slice(0, 3).map((project: ProjectData) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
            onClick={() => navigateTo('project', project.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('project', project.id); } }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white text-sm truncate">{project.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="ml-1">{project.status}</span>
                  </Badge>
                  <div className={`px-1.5 py-0.5 rounded text-xs ${getPriorityColor(project.priority)}`}>
                    {project.priority}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>{project.lastActivity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/projects')}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          View All Projects
        </Button>
        <Button
          size="sm"
          onClick={() => {/* Open create project modal */}}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
          New
        </Button>
      </div>
        </>
      )}
    </BaseWidget>
  );
}