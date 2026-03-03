import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  FileText,
  Star,
  Search,
  Plus,
  MoreVertical,
  Zap,
  Target
} from 'lucide-react';
import type { Priority } from '../../types/messaging';
import { mockProjectMilestones, mockProjectFiles } from './projectCommunicationMockData';
import { MilestoneCard } from './MilestoneCard';
import { FileCard } from './FileCard';
import { ProjectActivityFeed } from './ProjectActivityFeed';

interface ProjectCommunicationWidgetProps {
  projectId: string;
  projectName?: string;
  className?: string;
  allowExpand?: boolean;
}

interface ProjectTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  count?: number;
  priority?: Priority;
}

export function ProjectCommunicationWidget({
  projectId,
  projectName = 'Fall 2024 Show',
  className = '',
  allowExpand = true
}: ProjectCommunicationWidgetProps) {
  const [activeTab, setActiveTab] = useState<string>('activity');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabs: ProjectTab[] = [
    {
      id: 'activity',
      label: 'Activity',
      icon: Zap,
      count: 12
    },
    {
      id: 'milestones',
      label: 'Milestones',
      icon: Target,
      count: mockProjectMilestones.filter(m => m.status !== 'completed').length,
      priority: 'high'
    },
    {
      id: 'files',
      label: 'Files',
      icon: FileText,
      count: mockProjectFiles.length
    },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      count: 4
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return <ProjectActivityFeed projectId={projectId} />;

      case 'milestones':
        return (
          <div className="space-y-3">
            {mockProjectMilestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </div>
        );

      case 'files':
        return (
          <div className="space-y-3">
            {mockProjectFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        );

      case 'team':
        return (
          <div className="p-6 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-gray-500 text-sm">Team management coming soon</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star size={16} className="text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{projectName}</h3>
              <p className="text-sm text-gray-500">Project Communication</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Search size={16} aria-hidden="true" />
            </button>

            {allowExpand && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-200 text-blue-800'
                    : tab.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`${isExpanded ? 'h-96' : 'h-64'} overflow-y-auto transition-all duration-300`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageSquare size={16} aria-hidden="true" />
            <span className="text-sm font-medium">New Message</span>
          </button>

          <button className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus size={16} aria-hidden="true" />
            <span className="text-sm font-medium">Add File</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectCommunicationWidget;
