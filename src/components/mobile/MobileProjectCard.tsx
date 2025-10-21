import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileProjectCardProps {
  project: {
    id: string;
    name: string;
    client: string;
    status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    progress: number;
    dueDate: string;
    budget: number;
    teamMembers: number;
    thumbnail?: string;
    recentActivity?: string;
    service_category: string;
  };
  onClick: (projectId: string) => void;
  onQuickAction?: (projectId: string, action: string) => void;
}

const statusConfig = {
  planning: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Planning' },
  active: { color: 'bg-green-100 text-green-800', icon: PlayCircle, label: 'Active' },
  'on-hold': { color: 'bg-orange-100 text-orange-800', icon: PauseCircle, label: 'On Hold' },
  completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Cancelled' }
};

const priorityConfig = {
  low: { color: 'border-l-gray-300', bg: 'bg-gray-50' },
  medium: { color: 'border-l-yellow-400', bg: 'bg-yellow-50' },
  high: { color: 'border-l-orange-400', bg: 'bg-orange-50' },
  urgent: { color: 'border-l-red-500', bg: 'bg-red-50' }
};

export const MobileProjectCard: React.FC<MobileProjectCardProps> = ({
  project,
  onClick,
  onQuickAction
}) => {
  const statusInfo = statusConfig[project.status];
  const priorityInfo = priorityConfig[project.priority];
  const StatusIcon = statusInfo.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `${diffDays} days left`;
    return `${Math.abs(diffDays)} days overdue`;
  };

  const isOverdue = new Date(project.dueDate) < new Date() && project.status !== 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden',
        'transition-all duration-200 hover:shadow-md active:shadow-sm',
        priorityInfo.color,
        'border-l-4'
      )}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-5 mb-1 truncate">
              {project.name}
            </h3>
            <p className="text-xs text-gray-600 truncate">{project.client}</p>
          </div>

          {project.thumbnail && (
            <div className="w-12 h-12 ml-3 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={project.thumbnail}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Status and Priority */}
        <div className="flex items-center justify-between mb-3">
          <div className={cn('flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium', statusInfo.color)}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusInfo.label}</span>
          </div>

          <div className="text-xs text-gray-500 capitalize">
            {project.service_category.replace('-', ' ')}
          </div>
        </div>

        {/* Progress Bar */}
        {project.status === 'active' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="px-4 pb-4">
        {/* Project Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-400 mb-1">
              <Calendar className="w-3 h-3" />
            </div>
            <div className={cn(
              'text-xs font-medium',
              isOverdue ? 'text-red-600' : 'text-gray-900'
            )}>
              {formatDate(project.dueDate)}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center text-gray-400 mb-1">
              <DollarSign className="w-3 h-3" />
            </div>
            <div className="text-xs font-medium text-gray-900">
              {formatCurrency(project.budget)}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center text-gray-400 mb-1">
              <Users className="w-3 h-3" />
            </div>
            <div className="text-xs font-medium text-gray-900">
              {project.teamMembers} member{project.teamMembers !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {project.recentActivity && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 leading-4">
              <span className="font-medium">Recent:</span> {project.recentActivity}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => onClick(project.id)}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors active:bg-blue-800"
          >
            <span>View Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {onQuickAction && project.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction(project.id, 'message');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors active:bg-gray-300"
            >
              Message
            </button>
          )}
        </div>
      </div>

      {/* Priority Indicator */}
      {project.priority === 'urgent' && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </motion.div>
  );
};