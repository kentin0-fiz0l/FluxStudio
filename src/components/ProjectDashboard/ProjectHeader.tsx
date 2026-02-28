import React from 'react';
import { FolderOpen, Upload, Settings } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { STATUS_BADGE_COLORS, PRIORITY_BADGE_COLORS } from './project-dashboard-constants';
import { ProjectStats } from '../../types/organization';

interface ProjectHeaderProps {
  currentProject: {
    name: string;
    status: string;
    priority: string;
    description?: string;
    createdAt: string;
    dueDate?: string;
    metadata: { projectType: string };
  };
  stats: ProjectStats | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProjectHeader({ currentProject, stats, handleFileUpload }: ProjectHeaderProps) {
  return (
    <div className="bg-white/10 rounded-2xl p-8 border border-white/10 mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="h-8 w-8 text-purple-400" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-white">
              {currentProject.name}
            </h1>
            <Badge
              className={STATUS_BADGE_COLORS[currentProject.status] || STATUS_BADGE_COLORS.default}
            >
              {currentProject.status}
            </Badge>
            <Badge
              className={PRIORITY_BADGE_COLORS[currentProject.priority] || PRIORITY_BADGE_COLORS.low}
            >
              {currentProject.priority}
            </Badge>
          </div>
          {currentProject.description && (
            <p className="text-gray-400 mb-4">{currentProject.description}</p>
          )}

          {/* Project Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-sm">
              <p className="text-gray-400">Created</p>
              <p className="text-white">{new Date(currentProject.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-400">Type</p>
              <p className="text-white capitalize">{currentProject.metadata.projectType}</p>
            </div>
            {currentProject.dueDate && (
              <div className="text-sm">
                <p className="text-gray-400">Due Date</p>
                <p className="text-white">{new Date(currentProject.dueDate).toLocaleDateString()}</p>
              </div>
            )}
            {stats && (
              <div className="text-sm">
                <p className="text-gray-400">Progress</p>
                <p className="text-white">{stats.completionPercentage}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              multiple
            />
            <Button className="bg-purple-500 hover:bg-purple-600 text-white">
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload Files
            </Button>
          </label>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
